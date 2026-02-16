from fastapi import FastAPI, Depends, HTTPException, Query, UploadFile, File, Request, WebSocket, WebSocketDisconnect
from email.message import EmailMessage
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4
import hashlib
import hmac
import secrets
import smtplib
import requests
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from anyio import from_thread
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import Base, engine, SessionLocal
from models import (
    User,
    CoursePurchase,
    PaymentOrder,
    Course,
    CourseLesson,
    LessonSlide,
    LessonResource,
    LessonAssignment,
    AssignmentSubmission,
    LessonMessage,
    LessonMessageAttachment,
    LessonNotification,
    PrivateLessonChat,
    PrivateLessonMessage,
    PrivateLessonMessageAttachment,
    Role,
    EmailOTP,
    CourseRating,
    TeacherRating,
)
from schemas import (
    UserCreate,
    UserLogin,
    Token,
    UserOut,
    CourseOut,
    PaymentOut,
    LessonDetailOut,
    LessonMessageOut,
    PrivateChatThreadOut,
    PrivateChatRecipientOut,
    PrivateChatMessageOut,
    PrivateChatMessageCreate,
    MessageCreate,
    MessageUpdate,
    LessonNotificationOut,
    EmailCodeRequest,
    EmailCodeVerify,
    LessonAssignmentOut,
    LessonAssignmentCreate,
    LessonAssignmentBulkCreate,
    AssignmentSubmissionOut,
    AssignmentSubmissionCreate,
    AssignmentGradeCreate,
    RatingCreate,
    RatingSummary,
)
from config import (
    ADMIN_EMAIL,
    ADMIN_USERNAME,
    ADMIN_PASSWORD,
    ADMIN_ROLES,
    TEACHER_EMAIL,
    TEACHER_USERNAME,
    TEACHER_PASSWORD,
    TEACHER_ROLES,
    SECRET_KEY,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASSWORD,
    SMTP_FROM,
    SMTP_TLS,
    OTP_EXPIRE_MINUTES,
    FIREBASE_REQUIRE_EMAIL_CODE,
    RESEND_API_KEY,
    RESEND_FROM,
)
from auth import (
    get_db,
    get_password_hash,
    authenticate_user,
    create_access_token,
    get_current_user,
    get_or_create_role,
    get_optional_user,
    create_firebase_custom_token_for_user,
    _get_user_from_jwt,
    _get_user_from_firebase,
)
from seed_courses import COURSE_SEED

app = FastAPI(title="New Project API")

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_ROOT = BASE_DIR / "uploads"
CHAT_UPLOAD_ROOT = UPLOAD_ROOT / "chat"
CHAT_UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=str(UPLOAD_ROOT)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

FREE_LESSON_COUNT = 2
CHAT_UPLOAD_MAX_BYTES = 30 * 1024 * 1024


class PrivateChatSocketHub:
    def __init__(self) -> None:
        self.connections: dict[int, set[WebSocket]] = {}

    async def connect(self, chat_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self.connections.setdefault(chat_id, set()).add(websocket)

    def disconnect(self, chat_id: int, websocket: WebSocket) -> None:
        sockets = self.connections.get(chat_id)
        if not sockets:
            return
        sockets.discard(websocket)
        if not sockets:
            self.connections.pop(chat_id, None)

    async def broadcast(self, chat_id: int, payload: dict) -> None:
        sockets = list(self.connections.get(chat_id, set()))
        if not sockets:
            return
        stale: list[WebSocket] = []
        for websocket in sockets:
            try:
                await websocket.send_json(payload)
            except Exception:
                stale.append(websocket)
        for websocket in stale:
            self.disconnect(chat_id, websocket)


private_chat_socket_hub = PrivateChatSocketHub()
private_thread_socket_hub = PrivateChatSocketHub()
assignment_socket_hub = PrivateChatSocketHub()


def publish_assignment_event(lesson_id: int, event_name: str, extra: dict | None = None) -> None:
    payload = {"event": event_name, "lesson_id": lesson_id}
    if extra:
        payload.update(extra)
    try:
        from_thread.run(assignment_socket_hub.broadcast, lesson_id, payload)
    except Exception:
        # Assignment realtime is best-effort; API response should not fail if socket broadcast fails.
        pass


def get_user_by_ws_token(db: Session, token: str | None) -> User | None:
    if not token:
        return None
    user = _get_user_from_jwt(db, token)
    if user:
        return user
    try:
        return _get_user_from_firebase(db, token)
    except HTTPException:
        return None


def is_purchased(db: Session, user: User | None, course_id: str) -> bool:
    if not user:
        return False
    return (
        db.query(CoursePurchase)
        .filter(CoursePurchase.user_id == user.id, CoursePurchase.course_id == course_id)
        .first()
        is not None
    )


def _rating_stats(value: tuple) -> tuple[float | None, int]:
    avg, count = value
    avg_value = float(avg) if avg is not None else None
    return avg_value, int(count or 0)


def get_course_rating_summary(db: Session, course_id: str, user_id: int | None = None) -> dict:
    avg_value, count = _rating_stats(
        db.query(func.avg(CourseRating.rating), func.count(CourseRating.id))
        .filter(CourseRating.course_id == course_id)
        .one()
    )
    my_rating = None
    if user_id:
        row = (
            db.query(CourseRating)
            .filter(CourseRating.course_id == course_id, CourseRating.user_id == user_id)
            .first()
        )
        if row:
            my_rating = row.rating
    return {"average": avg_value or 0.0, "count": count, "my_rating": my_rating}


def get_teacher_rating_summary(db: Session, teacher_name: str, user_id: int | None = None) -> dict:
    avg_value, count = _rating_stats(
        db.query(func.avg(TeacherRating.rating), func.count(TeacherRating.id))
        .filter(TeacherRating.teacher_name == teacher_name)
        .one()
    )
    my_rating = None
    if user_id:
        row = (
            db.query(TeacherRating)
            .filter(TeacherRating.teacher_name == teacher_name, TeacherRating.user_id == user_id)
            .first()
        )
        if row:
            my_rating = row.rating
    return {"average": avg_value or 0.0, "count": count, "my_rating": my_rating}


def course_to_payload(course: Course, db: Session) -> dict:
    lessons = sorted(course.lessons, key=lambda item: item.position or 0)
    lesson_payload = []
    for idx, lesson in enumerate(lessons, start=1):
        is_free = idx <= FREE_LESSON_COUNT
        lesson_payload.append(
            {
                "id": lesson.id,
                "title": lesson.title,
                "duration": lesson.duration,
                "type": lesson.type,
                "video_url": lesson.video_url,
                "position": lesson.position or idx,
                "is_free": is_free,
            }
        )

    rating_summary = get_course_rating_summary(db, course.id)
    teacher_summary = get_teacher_rating_summary(db, course.instructor)
    return {
        "id": course.id,
        "title": course.title,
        "image": course.image,
        "category": course.category,
        "duration": course.duration,
        "price": course.price,
        "old_price": course.old_price,
        "instructor": course.instructor,
        "summary": course.summary,
        "topics": course.topics or [],
        "level": course.level,
        "rating": rating_summary["average"] or course.rating,
        "rating_count": rating_summary["count"],
        "teacher_rating": teacher_summary["average"],
        "teacher_rating_count": teacher_summary["count"],
        "students": course.students,
        "language": course.language,
        "lessons": lesson_payload,
        "code_samples": course.code_samples or [],
    }


def apply_locks(course: dict, db: Session, user: User | None) -> dict:
    purchased = is_purchased(db, user, course["id"])
    lessons_out = []
    for idx, lesson in enumerate(course.get("lessons", []), start=1):
        is_free = idx <= FREE_LESSON_COUNT
        locked = not (is_free or purchased)
        lesson_copy = {
            **lesson,
            "position": lesson.get("position") or idx,
            "is_free": is_free,
            "locked": locked,
            "video_url": lesson.get("video_url") if not locked else None,
        }
        lessons_out.append(lesson_copy)
    course_copy = {**course}
    course_copy["lessons"] = lessons_out
    course_copy["free_lessons"] = FREE_LESSON_COUNT
    course_copy["is_purchased"] = purchased
    return course_copy


def parse_price_to_cents(value: str | None) -> int:
    if not value:
        return 0
    digits = "".join(ch for ch in value if ch.isdigit() or ch == ".")
    if not digits:
        return 0
    return int(float(digits) * 100)


def _hash_code(code: str) -> str:
    return hmac.new(SECRET_KEY.encode(), code.encode(), hashlib.sha256).hexdigest()


def _send_email_code(email: str, code: str) -> None:
    if RESEND_API_KEY:
        payload = {
            "from": RESEND_FROM,
            "to": [email],
            "subject": "Tasdiqlash kodi",
            "text": f"Ro'yxatdan o'tish kodi: {code}\nKod {OTP_EXPIRE_MINUTES} daqiqa amal qiladi.",
        }
        try:
            resp = requests.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=10,
            )
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Resend error: {exc}") from exc
        if resp.status_code >= 300:
            raise HTTPException(status_code=500, detail=f"Resend error: {resp.text}")
        return

    if not SMTP_HOST or not SMTP_FROM:
        raise HTTPException(status_code=500, detail="SMTP not configured")
    if not SMTP_USER or not SMTP_PASSWORD:
        raise HTTPException(status_code=500, detail="SMTP credentials missing")
    message = EmailMessage()
    message["From"] = SMTP_FROM
    message["To"] = email
    message["Subject"] = "Tasdiqlash kodi"
    message.set_content(f"Ro'yxatdan o'tish kodi: {code}\nKod {OTP_EXPIRE_MINUTES} daqiqa amal qiladi.")

    try:
        if SMTP_TLS:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.send_message(message)
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
                server.ehlo()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.send_message(message)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"SMTP error: {exc}") from exc


def _issue_email_code(db: Session, email: str) -> None:
    code = f"{secrets.randbelow(1000000):06d}"
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=OTP_EXPIRE_MINUTES)
    code_hash = _hash_code(code)
    record = db.query(EmailOTP).filter(EmailOTP.email == email).first()
    if record:
        record.code_hash = code_hash
        record.expires_at = expires_at
        record.verified_at = None
    else:
        record = EmailOTP(
            email=email,
            code_hash=code_hash,
            expires_at=expires_at,
        )
        db.add(record)
    db.commit()
    _send_email_code(email, code)


def _verify_email_code(db: Session, email: str, code: str) -> None:
    now = datetime.now(timezone.utc)
    record = db.query(EmailOTP).filter(EmailOTP.email == email).first()
    if not record:
        raise HTTPException(status_code=400, detail="Kod topilmadi")
    if record.expires_at < now:
        raise HTTPException(status_code=400, detail="Kod muddati tugagan")
    if record.code_hash != _hash_code(code):
        raise HTTPException(status_code=400, detail="Kod noto'g'ri")
    record.verified_at = now
    db.commit()


def _email_code_verified(db: Session, email: str) -> bool:
    record = (
        db.query(EmailOTP)
        .filter(EmailOTP.email == email, EmailOTP.verified_at.isnot(None))
        .first()
    )
    return record is not None


def lesson_access(db: Session, user: User | None, lesson: CourseLesson) -> tuple[bool, bool]:
    is_free = (lesson.position or 0) <= FREE_LESSON_COUNT
    purchased = is_purchased(db, user, lesson.course_id)
    if user and (user_has_role(user, "teacher") or user_has_role(user, "admin")):
        return is_free, False
    locked = not (is_free or purchased)
    return is_free, locked


def normalize_message_content(content: str | None) -> str:
    return (content or "").strip()


def detect_attachment_kind(mime_type: str | None) -> str:
    if not mime_type:
        return "file"
    lower_mime = mime_type.lower()
    if lower_mime.startswith("image/"):
        return "image"
    if lower_mime.startswith("video/"):
        return "video"
    if lower_mime.startswith("audio/"):
        return "audio"
    return "file"


def serialize_message_attachment(attachment: LessonMessageAttachment | None) -> dict | None:
    if not attachment:
        return None
    return {
        "id": attachment.id,
        "kind": attachment.kind,
        "url": attachment.url,
        "file_name": attachment.file_name,
        "mime_type": attachment.mime_type,
        "size_bytes": attachment.size_bytes,
        "duration_seconds": attachment.duration_seconds,
    }


def attachment_preview_text(attachment: LessonMessageAttachment | None) -> str:
    if not attachment:
        return ""
    kind = (attachment.kind or "").lower()
    if kind == "sticker":
        return "Sticker yuborildi"
    if kind == "image":
        return "Rasm yuborildi"
    if kind == "video":
        return "Video yuborildi"
    if kind == "audio":
        return "Ovozli xabar yuborildi"
    return f"Fayl yuborildi: {attachment.file_name or 'attachment'}"


def attachment_preview_text_from_payload(
    kind: str | None,
    file_name: str | None = None,
) -> str:
    normalized = (kind or "").strip().lower()
    if normalized == "sticker":
        return "Sticker yuborildi"
    if normalized == "image":
        return "Rasm yuborildi"
    if normalized == "video":
        return "Video yuborildi"
    if normalized == "audio":
        return "Ovozli xabar yuborildi"
    return f"Fayl yuborildi: {file_name or 'attachment'}"


def upsert_message_attachment(db: Session, message: LessonMessage, payload: MessageCreate) -> None:
    has_attachment = bool(
        payload.attachment_kind or payload.attachment_url or payload.attachment_name
    )
    if not has_attachment:
        if message.attachment:
            db.delete(message.attachment)
        return

    kind = (payload.attachment_kind or "file").strip().lower()
    if kind not in {"sticker", "image", "video", "audio", "file"}:
        kind = "file"

    attachment = message.attachment
    if not attachment:
        attachment = LessonMessageAttachment(message_id=message.id)
        db.add(attachment)

    attachment.kind = kind
    attachment.url = payload.attachment_url
    attachment.file_name = payload.attachment_name
    attachment.mime_type = payload.attachment_mime
    attachment.size_bytes = payload.attachment_size
    attachment.duration_seconds = payload.attachment_duration


async def store_chat_upload(file: UploadFile, request: Request) -> dict:
    original_name = Path(file.filename or "attachment.bin").name
    suffix = Path(original_name).suffix[:12]
    content_type = file.content_type or "application/octet-stream"
    raw = await file.read(CHAT_UPLOAD_MAX_BYTES + 1)
    size_bytes = len(raw)
    if size_bytes == 0:
        raise HTTPException(status_code=400, detail="Empty file")
    if size_bytes > CHAT_UPLOAD_MAX_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 30MB)")

    date_path = datetime.now(timezone.utc).strftime("%Y/%m/%d")
    folder = CHAT_UPLOAD_ROOT / date_path
    folder.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid4().hex}{suffix}"
    saved_path = folder / stored_name
    saved_path.write_bytes(raw)

    relative_path = saved_path.relative_to(UPLOAD_ROOT).as_posix()
    public_url = f"{str(request.base_url).rstrip('/')}/uploads/{relative_path}"
    return {
        "kind": detect_attachment_kind(content_type),
        "url": public_url,
        "file_name": original_name,
        "mime_type": content_type,
        "size_bytes": size_bytes,
    }


def serialize_message(message: LessonMessage) -> dict:
    created_at = message.created_at.isoformat() if message.created_at else None
    username = message.user.username if message.user else None
    return {
        "id": message.id,
        "user_id": message.user_id,
        "username": username,
        "sender": message.sender,
        "content": message.content,
        "created_at": created_at,
        "attachment": serialize_message_attachment(message.attachment),
    }


def serialize_submission(submission: AssignmentSubmission) -> dict:
    created_at = submission.created_at.isoformat() if submission.created_at else None
    graded_at = submission.graded_at.isoformat() if submission.graded_at else None
    return {
        "id": submission.id,
        "assignment_id": submission.assignment_id,
        "student_id": submission.student_id,
        "student_username": submission.student.username if submission.student else None,
        "content": submission.content,
        "created_at": created_at,
        "rating": submission.rating,
        "feedback": submission.feedback,
        "graded_by": submission.graded_by,
        "graded_by_username": submission.grader.username if submission.grader else None,
        "graded_at": graded_at,
    }


def serialize_assignment_payload(
    assignment: LessonAssignment,
    submission: AssignmentSubmission | None = None,
    submission_count: int | None = None,
    graded_count: int | None = None,
) -> dict:
    return {
        "id": assignment.id,
        "lesson_id": assignment.lesson_id,
        "title": assignment.title,
        "description": assignment.description,
        "max_rating": assignment.max_rating or 5,
        "submission": serialize_submission(submission) if submission else None,
        "submission_count": submission_count,
        "graded_count": graded_count,
    }


def user_has_role(user: User, role_name: str) -> bool:
    return any(role.name == role_name for role in user.roles)


def can_manage_messages(user: User) -> bool:
    return user_has_role(user, "teacher") or user_has_role(user, "admin")


def serialize_private_chat_message(message: PrivateLessonMessage) -> dict:
    created_at = message.created_at.isoformat() if message.created_at else None
    return {
        "id": message.id,
        "chat_id": message.chat_id,
        "sender_id": message.sender_id,
        "sender_username": message.sender.username if message.sender else None,
        "content": message.content,
        "is_read": bool(message.is_read),
        "created_at": created_at,
        "attachment": serialize_private_attachment(message.attachment),
    }


def serialize_private_attachment(
    attachment: PrivateLessonMessageAttachment | None,
) -> dict | None:
    if not attachment:
        return None
    return {
        "id": attachment.id,
        "kind": attachment.kind,
        "url": attachment.url,
        "file_name": attachment.file_name,
        "mime_type": attachment.mime_type,
        "size_bytes": attachment.size_bytes,
        "duration_seconds": attachment.duration_seconds,
    }


def upsert_private_message_attachment(
    db: Session,
    message: PrivateLessonMessage,
    payload: PrivateChatMessageCreate,
) -> None:
    has_attachment = bool(
        payload.attachment_kind or payload.attachment_url or payload.attachment_name
    )
    if not has_attachment:
        if message.attachment:
            db.delete(message.attachment)
        return

    kind = (payload.attachment_kind or "file").strip().lower()
    if kind not in {"sticker", "image", "video", "audio", "file"}:
        kind = "file"

    attachment = message.attachment
    if not attachment:
        attachment = PrivateLessonMessageAttachment(message_id=message.id)
        db.add(attachment)

    attachment.kind = kind
    attachment.url = payload.attachment_url
    attachment.file_name = payload.attachment_name
    attachment.mime_type = payload.attachment_mime
    attachment.size_bytes = payload.attachment_size
    attachment.duration_seconds = payload.attachment_duration


def serialize_private_chat_thread(
    db: Session,
    chat: PrivateLessonChat,
    current_user_id: int,
) -> dict:
    last_message = (
        db.query(PrivateLessonMessage)
        .filter(PrivateLessonMessage.chat_id == chat.id)
        .order_by(PrivateLessonMessage.created_at.desc(), PrivateLessonMessage.id.desc())
        .first()
    )
    unread_count = (
        db.query(PrivateLessonMessage)
        .filter(
            PrivateLessonMessage.chat_id == chat.id,
            PrivateLessonMessage.sender_id != current_user_id,
            PrivateLessonMessage.is_read == False,
        )
        .count()
    )
    last_message_preview = None
    if last_message:
        last_message_preview = (
            last_message.content or attachment_preview_text(last_message.attachment)
        )
    return {
        "id": chat.id,
        "lesson_id": chat.lesson_id,
        "student_id": chat.student_id,
        "student_username": chat.student.username if chat.student else None,
        "teacher_id": chat.teacher_id,
        "teacher_username": chat.teacher.username if chat.teacher else None,
        "last_message": last_message_preview,
        "last_message_at": last_message.created_at.isoformat() if last_message and last_message.created_at else None,
        "unread_count": unread_count,
    }


def resolve_lesson_teacher(
    db: Session,
    lesson: CourseLesson,
    student_id: int | None = None,
) -> User | None:
    # Reuse existing teacher dialog for the same student+lesson.
    if student_id:
        existing_chats = (
            db.query(PrivateLessonChat)
            .filter(
                PrivateLessonChat.lesson_id == lesson.id,
                PrivateLessonChat.student_id == student_id,
            )
            .order_by(PrivateLessonChat.updated_at.desc(), PrivateLessonChat.id.desc())
            .all()
        )
        for existing in existing_chats:
            teacher_user = db.query(User).filter(User.id == existing.teacher_id).first()
            if teacher_user and user_has_role(teacher_user, "teacher"):
                return teacher_user

    course = db.query(Course).filter(Course.id == lesson.course_id).first()
    if course and course.instructor:
        normalized = course.instructor.strip().lower()
        candidate = (
            db.query(User)
            .filter(func.lower(User.username) == normalized)
            .first()
        )
        if candidate and user_has_role(candidate, "teacher"):
            return candidate

    teacher = (
        db.query(User)
        .join(User.roles)
        .filter(Role.name == "teacher")
        .order_by(User.id.asc())
        .first()
    )
    return teacher


def resolve_lesson_admin(db: Session, lesson: CourseLesson) -> User | None:
    course = db.query(Course).filter(Course.id == lesson.course_id).first()
    if course and course.instructor:
        normalized = course.instructor.strip().lower()
        candidate = (
            db.query(User)
            .filter(func.lower(User.username) == normalized)
            .first()
        )
        if candidate and user_has_role(candidate, "admin"):
            return candidate

    admin = (
        db.query(User)
        .join(User.roles)
        .filter(Role.name == "admin")
        .order_by(User.id.asc())
        .first()
    )
    return admin


def list_private_chat_recipients(
    db: Session,
    lesson: CourseLesson,
    student_id: int,
    target: str,
) -> list[dict]:
    role_name = "admin" if target == "admin" else "teacher"
    users = (
        db.query(User)
        .join(User.roles)
        .filter(Role.name == role_name, User.is_active.is_(True))
        .order_by(func.lower(User.username).asc(), User.id.asc())
        .all()
    )
    if not users:
        return []

    existing_chats = (
        db.query(PrivateLessonChat)
        .filter(
            PrivateLessonChat.lesson_id == lesson.id,
            PrivateLessonChat.student_id == student_id,
        )
        .all()
    )
    chat_by_recipient_id = {chat.teacher_id: chat.id for chat in existing_chats}

    items: list[dict] = []
    for user in users:
        if user.id == student_id:
            continue
        items.append(
            {
                "id": user.id,
                "username": user.username,
                "role": role_name,
                "chat_id": chat_by_recipient_id.get(user.id),
            }
        )
    return items


def get_or_create_private_chat(
    db: Session,
    lesson_id: int,
    student_id: int,
    teacher_id: int,
) -> PrivateLessonChat:
    chat = (
        db.query(PrivateLessonChat)
        .filter(
            PrivateLessonChat.lesson_id == lesson_id,
            PrivateLessonChat.student_id == student_id,
            PrivateLessonChat.teacher_id == teacher_id,
        )
        .first()
    )
    if chat:
        return chat

    chat = PrivateLessonChat(
        lesson_id=lesson_id,
        student_id=student_id,
        teacher_id=teacher_id,
    )
    db.add(chat)
    db.commit()
    db.refresh(chat)
    return chat


def can_access_private_chat(chat: PrivateLessonChat, user: User) -> bool:
    return user.id in {chat.student_id, chat.teacher_id}


def serialize_notification(notification: LessonNotification) -> dict:
    created_at = notification.created_at.isoformat() if notification.created_at else None
    return {
        "id": notification.id,
        "recipient_id": notification.recipient_id,
        "sender_id": notification.sender_id,
        "sender_username": notification.sender.username if notification.sender else None,
        "course_id": notification.course_id,
        "course_title": notification.course_title,
        "lesson_id": notification.lesson_id,
        "lesson_title": notification.lesson_title,
        "message_id": notification.message_id,
        "message_content": notification.message_content,
        "is_read": notification.is_read,
        "created_at": created_at,
    }


def ensure_teacher(db: Session) -> None:
    role_names = [r.strip() for r in TEACHER_ROLES.split(",") if r.strip()] or ["teacher"]
    teacher_role = get_or_create_role(db, "teacher")
    existing = (
        db.query(User)
        .filter((User.email == TEACHER_EMAIL) | (User.username == TEACHER_USERNAME))
        .first()
    )
    if existing:
        return
    user = User(
        email=TEACHER_EMAIL,
        username=TEACHER_USERNAME,
        hashed_password=get_password_hash(TEACHER_PASSWORD),
    )
    user.roles = [get_or_create_role(db, name) for name in role_names] or [teacher_role]
    db.add(user)
    db.commit()

def ensure_admin(db: Session) -> None:
    existing = (
        db.query(User)
        .filter((User.email == ADMIN_EMAIL) | (User.username == ADMIN_USERNAME))
        .first()
    )
    if existing:
        return
    user = User(
        email=ADMIN_EMAIL,
        username=ADMIN_USERNAME,
        hashed_password=get_password_hash(ADMIN_PASSWORD),
    )
    role_names = [r.strip() for r in ADMIN_ROLES.split(",") if r.strip()]
    user.roles = [get_or_create_role(db, name) for name in role_names] or [
        get_or_create_role(db, "admin")
    ]
    db.add(user)
    db.commit()


def ensure_courses(db: Session) -> None:
    existing = db.query(Course).first()
    if not existing:
        for raw in COURSE_SEED:
            course = Course(
                id=raw["id"],
                title=raw["title"],
                image=raw["image"],
                category=raw["category"],
                duration=raw["duration"],
                price=raw["price"],
                old_price=raw.get("old_price"),
                instructor=raw["instructor"],
                summary=raw["summary"],
                topics=raw.get("topics", []),
                level=raw.get("level"),
                rating=raw.get("rating"),
                students=raw.get("students"),
                language=raw.get("language"),
                code_samples=raw.get("code_samples", []),
            )
            lessons = []
            for idx, lesson in enumerate(raw.get("lessons", []), start=1):
                lessons.append(
                    CourseLesson(
                        title=lesson["title"],
                        duration=lesson["duration"],
                        type=lesson.get("type"),
                        video_url=lesson.get("video_url"),
                        position=idx,
                        is_free=idx <= FREE_LESSON_COUNT,
                    )
                )
            course.lessons = lessons
            db.add(course)
        db.commit()

    # Backfill slides/resources for each lesson (even if courses already exist)
    lessons = db.query(CourseLesson).all()
    for lesson in lessons:
        if (
            db.query(LessonSlide).filter(LessonSlide.lesson_id == lesson.id).first()
            is None
        ):
            for idx in range(1, 6):
                db.add(
                    LessonSlide(
                        lesson_id=lesson.id,
                        title=f"{lesson.title} - Slide {idx}",
                        image_url=None,
                        content=(
                            "Key idea, definitions, and a short example. "
                            "This slide summarizes the concept clearly."
                        ),
                        position=idx,
                    )
                )
        if (
            db.query(LessonResource)
            .filter(LessonResource.lesson_id == lesson.id)
            .first()
            is None
        ):
            db.add(
                LessonResource(
                    lesson_id=lesson.id,
                    title="Lesson notes",
                    url="https://example.com/lesson-notes",
                    kind="pdf",
                )
            )
            db.add(
                LessonResource(
                    lesson_id=lesson.id,
                    title="Starter code",
                    url="https://example.com/starter-code",
                    kind="code",
                )
            )

        if (
            db.query(LessonAssignment)
            .filter(LessonAssignment.lesson_id == lesson.id)
            .first()
            is None
        ):
            db.add(
                LessonAssignment(
                    lesson_id=lesson.id,
                    title=f"{lesson.title} - Vazifa",
                    description=(
                        "Asosiy tushunchalarni mustahkamlash uchun qisqa vazifa. "
                        "Natijani 3-5 jumlada izohlang."
                    ),
                )
            )

    db.commit()


@app.on_event("startup")
def startup_seed():
    db = next(get_db())
    try:
        ensure_admin(db)
        ensure_teacher(db)
        ensure_courses(db)
    finally:
        db.close()


@app.get("/")
def root():
    return {"status": "ok"}
@app.post("/auth/email-code/request")
def request_email_code(payload: EmailCodeRequest, db: Session = Depends(get_db)):
    _issue_email_code(db, payload.email.strip().lower())
    return {"status": "ok", "message": "Code sent"}


@app.post("/auth/email-code/verify")
def verify_email_code(payload: EmailCodeVerify, db: Session = Depends(get_db)):
    _verify_email_code(
        db,
        payload.email.strip().lower(),
        payload.code.strip(),
    )
    return {"status": "ok", "message": "Email verified"}

@app.post("/auth/register", response_model=UserOut)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    raw_username = payload.username.strip()
    username = raw_username or email.split("@")[0]
    existing = (
        db.query(User)
        .filter((User.email == email) | (User.username == username))
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    require_email_code = FIREBASE_REQUIRE_EMAIL_CODE or bool(payload.require_email_code)
    if require_email_code and not _email_code_verified(db, email):
        raise HTTPException(status_code=400, detail="Email code required")

    candidate = username
    counter = 1
    while db.query(User).filter(User.username == candidate).first():
        candidate = f"{username}{counter}"
        counter += 1
    username = candidate

    user = User(
        email=email,
        username=username,
        hashed_password=get_password_hash(payload.password),
    )
    role_names = payload.roles or ["user"]
    user.roles = [get_or_create_role(db, name) for name in role_names]
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut(
        id=user.id,
        email=user.email,
        username=user.username,
        roles=[role.name for role in user.roles],
    )


@app.post("/auth/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(db, payload.username, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}


@app.post("/auth/token", response_model=Token)
def token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token_value = create_access_token({"sub": str(user.id)})
    return {"access_token": token_value, "token_type": "bearer"}


@app.get("/auth/me", response_model=UserOut | None)
def me(current_user: User | None = Depends(get_optional_user)):
    if not current_user:
        return None
    return UserOut(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        roles=[role.name for role in current_user.roles],
    )


@app.post("/auth/firebase/custom-token")
def create_firebase_custom_token(current_user: User = Depends(get_current_user)):
    token = create_firebase_custom_token_for_user(current_user)
    if not token:
        raise HTTPException(status_code=503, detail="Firebase backend not configured")
    return {"custom_token": token}


@app.get("/courses/categories", response_model=list[str])
def list_course_categories(db: Session = Depends(get_db)):
    rows = db.query(Course.category).distinct().all()
    return [row[0] for row in rows if row[0]]


@app.get("/courses", response_model=list[CourseOut])
def list_courses(
    category: str | None = Query(default=None),
    current_user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    query = db.query(Course)
    if category:
        query = query.filter(Course.category == category)
    courses = query.all()
    return [apply_locks(course_to_payload(course, db), db, current_user) for course in courses]


@app.get("/courses/{course_id}", response_model=CourseOut)
def get_course(course_id: str, current_user: User | None = Depends(get_optional_user), db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return apply_locks(course_to_payload(course, db), db, current_user)


@app.get("/courses/{course_id}/ratings", response_model=RatingSummary)
def get_course_rating(
    course_id: str,
    current_user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return get_course_rating_summary(db, course_id, current_user.id if current_user else None)


@app.post("/courses/{course_id}/ratings", response_model=RatingSummary)
def set_course_rating(
    course_id: str,
    payload: RatingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    rating_value = int(payload.rating)
    if rating_value < 1 or rating_value > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    row = (
        db.query(CourseRating)
        .filter(CourseRating.course_id == course_id, CourseRating.user_id == current_user.id)
        .first()
    )
    if row:
        row.rating = rating_value
        row.review = payload.review
    else:
        row = CourseRating(
            course_id=course_id,
            user_id=current_user.id,
            rating=rating_value,
            review=payload.review,
        )
        db.add(row)
    db.commit()
    return get_course_rating_summary(db, course_id, current_user.id)


@app.get("/teachers/{teacher_name}/ratings", response_model=RatingSummary)
def get_teacher_rating(
    teacher_name: str,
    current_user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    name = teacher_name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Teacher name required")
    return get_teacher_rating_summary(db, name, current_user.id if current_user else None)


@app.post("/teachers/{teacher_name}/ratings", response_model=RatingSummary)
def set_teacher_rating(
    teacher_name: str,
    payload: RatingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    name = teacher_name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Teacher name required")
    rating_value = int(payload.rating)
    if rating_value < 1 or rating_value > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    row = (
        db.query(TeacherRating)
        .filter(TeacherRating.teacher_name == name, TeacherRating.user_id == current_user.id)
        .first()
    )
    if row:
        row.rating = rating_value
        row.review = payload.review
    else:
        row = TeacherRating(
            teacher_name=name,
            user_id=current_user.id,
            rating=rating_value,
            review=payload.review,
        )
        db.add(row)
    db.commit()
    return get_teacher_rating_summary(db, name, current_user.id)


@app.get("/lessons/{lesson_id}", response_model=LessonDetailOut)
def get_lesson_detail(
    lesson_id: int,
    current_user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    lesson = db.query(CourseLesson).filter(CourseLesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    is_free, locked = lesson_access(db, current_user, lesson)
    if locked:
        return {
            "id": lesson.id,
            "title": lesson.title,
            "duration": lesson.duration,
            "type": lesson.type,
            "video_url": None,
            "position": lesson.position or 0,
            "is_free": is_free,
            "locked": True,
            "slides": [],
            "resources": [],
            "messages": [],
        }

    slides = (
        db.query(LessonSlide)
        .filter(LessonSlide.lesson_id == lesson.id)
        .order_by(LessonSlide.position.asc())
        .all()
    )
    resources = (
        db.query(LessonResource)
        .filter(LessonResource.lesson_id == lesson.id)
        .all()
    )
    messages = []
    if current_user:
        messages = (
            db.query(LessonMessage)
            .filter(LessonMessage.lesson_id == lesson.id)
            .order_by(LessonMessage.created_at.asc())
            .all()
        )

    return {
        "id": lesson.id,
        "title": lesson.title,
        "duration": lesson.duration,
        "type": lesson.type,
        "video_url": lesson.video_url,
        "position": lesson.position or 0,
        "is_free": is_free,
        "locked": False,
        "slides": slides,
        "resources": resources,
        "messages": [serialize_message(message) for message in messages],
    }


@app.get("/lessons/{lesson_id}/assignments", response_model=list[LessonAssignmentOut])
def list_lesson_assignments(
    lesson_id: int,
    current_user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    lesson = db.query(CourseLesson).filter(CourseLesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    _, locked = lesson_access(db, current_user, lesson)
    if locked and not (current_user and can_manage_messages(current_user)):
        raise HTTPException(status_code=403, detail="Lesson locked")
    assignments = (
        db.query(LessonAssignment)
        .filter(LessonAssignment.lesson_id == lesson.id)
        .order_by(LessonAssignment.id.asc())
        .all()
    )
    results = []
    for assignment in assignments:
        submission = None
        if current_user:
            submission = (
                db.query(AssignmentSubmission)
                .filter(
                    AssignmentSubmission.assignment_id == assignment.id,
                    AssignmentSubmission.student_id == current_user.id,
                )
                .first()
            )
        submission_count = None
        graded_count = None
        if current_user and can_manage_messages(current_user):
            submission_count = (
                db.query(AssignmentSubmission)
                .filter(AssignmentSubmission.assignment_id == assignment.id)
                .count()
            )
            graded_count = (
                db.query(AssignmentSubmission)
                .filter(
                    AssignmentSubmission.assignment_id == assignment.id,
                    AssignmentSubmission.rating.isnot(None),
                )
                .count()
            )
        results.append(
            serialize_assignment_payload(
                assignment,
                submission=submission,
                submission_count=submission_count,
                graded_count=graded_count,
            )
        )
    return results


@app.post("/lessons/{lesson_id}/assignments", response_model=LessonAssignmentOut)
def create_lesson_assignment(
    lesson_id: int,
    payload: LessonAssignmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not can_manage_messages(current_user):
        raise HTTPException(status_code=403, detail="Teacher access required")
    lesson = db.query(CourseLesson).filter(CourseLesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    title = payload.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Assignment title required")
    description = payload.description.strip() if payload.description else None
    max_rating = int(payload.max_rating or 5)
    if max_rating < 1 or max_rating > 5:
        raise HTTPException(status_code=400, detail="max_rating must be between 1 and 5")

    assignment = LessonAssignment(
        lesson_id=lesson.id,
        title=title,
        description=description,
        max_rating=max_rating,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    publish_assignment_event(
        lesson.id,
        "assignment_created",
        {"assignment_id": assignment.id},
    )
    return serialize_assignment_payload(assignment)


@app.post("/lessons/{lesson_id}/assignments/bulk", response_model=list[LessonAssignmentOut])
def create_lesson_assignments_bulk(
    lesson_id: int,
    payload: LessonAssignmentBulkCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not can_manage_messages(current_user):
        raise HTTPException(status_code=403, detail="Teacher access required")
    lesson = db.query(CourseLesson).filter(CourseLesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    if not payload.assignments:
        raise HTTPException(status_code=400, detail="Assignments list required")
    if len(payload.assignments) > 30:
        raise HTTPException(status_code=400, detail="Maximum 30 assignments at once")

    created: list[LessonAssignment] = []
    for index, item in enumerate(payload.assignments):
        title = item.title.strip()
        if not title:
            raise HTTPException(
                status_code=400,
                detail=f"Assignment title required at row {index + 1}",
            )
        description = item.description.strip() if item.description else None
        max_rating = int(item.max_rating or 5)
        if max_rating < 1 or max_rating > 5:
            raise HTTPException(
                status_code=400,
                detail=f"max_rating must be between 1 and 5 at row {index + 1}",
            )

        assignment = LessonAssignment(
            lesson_id=lesson.id,
            title=title,
            description=description,
            max_rating=max_rating,
        )
        db.add(assignment)
        created.append(assignment)

    db.commit()
    for assignment in created:
        db.refresh(assignment)
    publish_assignment_event(
        lesson.id,
        "assignment_bulk_created",
        {
            "assignment_ids": [assignment.id for assignment in created],
            "count": len(created),
        },
    )
    return [serialize_assignment_payload(assignment) for assignment in created]


@app.post("/assignments/{assignment_id}/upload-image")
async def upload_assignment_image(
    assignment_id: int,
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    assignment = (
        db.query(LessonAssignment).filter(LessonAssignment.id == assignment_id).first()
    )
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    lesson = db.query(CourseLesson).filter(CourseLesson.id == assignment.lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    _, locked = lesson_access(db, current_user, lesson)
    if locked and not can_manage_messages(current_user):
        raise HTTPException(status_code=403, detail="Lesson locked")

    if not file:
        raise HTTPException(status_code=400, detail="File required")

    content_type = (file.content_type or "").lower()
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")

    return await store_chat_upload(file, request)


@app.post("/assignments/{assignment_id}/submit", response_model=AssignmentSubmissionOut)
def submit_assignment(
    assignment_id: int,
    payload: AssignmentSubmissionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    assignment = (
        db.query(LessonAssignment).filter(LessonAssignment.id == assignment_id).first()
    )
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    lesson = db.query(CourseLesson).filter(CourseLesson.id == assignment.lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    _, locked = lesson_access(db, current_user, lesson)
    if locked and not can_manage_messages(current_user):
        raise HTTPException(status_code=403, detail="Lesson locked")
    content = payload.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Content required")
    submission = (
        db.query(AssignmentSubmission)
        .filter(
            AssignmentSubmission.assignment_id == assignment.id,
            AssignmentSubmission.student_id == current_user.id,
        )
        .first()
    )
    if submission:
        submission.content = content
        submission.rating = None
        submission.feedback = None
        submission.graded_by = None
        submission.graded_at = None
    else:
        submission = AssignmentSubmission(
            assignment_id=assignment.id,
            student_id=current_user.id,
            content=content,
        )
        db.add(submission)
    db.commit()
    db.refresh(submission)
    publish_assignment_event(
        lesson.id,
        "submission_updated",
        {
            "assignment_id": assignment.id,
            "submission_id": submission.id,
            "student_id": current_user.id,
        },
    )
    return serialize_submission(submission)


@app.get("/assignments/{assignment_id}/submissions", response_model=list[AssignmentSubmissionOut])
def list_assignment_submissions(
    assignment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not can_manage_messages(current_user):
        raise HTTPException(status_code=403, detail="Teacher access required")
    assignment = (
        db.query(LessonAssignment).filter(LessonAssignment.id == assignment_id).first()
    )
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    submissions = (
        db.query(AssignmentSubmission)
        .filter(AssignmentSubmission.assignment_id == assignment.id)
        .order_by(AssignmentSubmission.created_at.desc())
        .all()
    )
    return [serialize_submission(item) for item in submissions]


@app.post("/submissions/{submission_id}/grade", response_model=AssignmentSubmissionOut)
def grade_submission(
    submission_id: int,
    payload: AssignmentGradeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not can_manage_messages(current_user):
        raise HTTPException(status_code=403, detail="Teacher access required")
    submission = (
        db.query(AssignmentSubmission)
        .filter(AssignmentSubmission.id == submission_id)
        .first()
    )
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    rating_value = int(payload.rating)
    if rating_value < 1 or rating_value > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    assignment = (
        db.query(LessonAssignment)
        .filter(LessonAssignment.id == submission.assignment_id)
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    submission.rating = rating_value
    submission.feedback = payload.feedback
    submission.graded_by = current_user.id
    submission.graded_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(submission)
    publish_assignment_event(
        assignment.lesson_id,
        "grade_updated",
        {
            "assignment_id": assignment.id,
            "submission_id": submission.id,
            "student_id": submission.student_id,
            "rating": submission.rating,
        },
    )
    return serialize_submission(submission)


@app.post("/lessons/{lesson_id}/messages/upload")
async def upload_lesson_message_file(
    lesson_id: int,
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lesson = db.query(CourseLesson).filter(CourseLesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    _, locked = lesson_access(db, current_user, lesson)
    if locked:
        raise HTTPException(status_code=403, detail="Lesson locked")
    if not file:
        raise HTTPException(status_code=400, detail="File required")
    return await store_chat_upload(file, request)


@app.get("/lessons/{lesson_id}/messages", response_model=list[LessonMessageOut])
def list_lesson_messages(
    lesson_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lesson = db.query(CourseLesson).filter(CourseLesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    _, locked = lesson_access(db, current_user, lesson)
    if locked:
        raise HTTPException(status_code=403, detail="Lesson locked")
    messages = (
        db.query(LessonMessage)
        .filter(LessonMessage.lesson_id == lesson.id)
        .order_by(LessonMessage.created_at.asc())
        .all()
    )
    return [serialize_message(message) for message in messages]


@app.post("/lessons/{lesson_id}/messages", response_model=LessonMessageOut)
def send_lesson_message(
    lesson_id: int,
    payload: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lesson = db.query(CourseLesson).filter(CourseLesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    _, locked = lesson_access(db, current_user, lesson)
    if locked:
        raise HTTPException(status_code=403, detail="Lesson locked")
    content = normalize_message_content(payload.content)
    has_attachment = bool(
        payload.attachment_kind or payload.attachment_url or payload.attachment_name
    )
    if not content and not has_attachment:
        raise HTTPException(status_code=400, detail="Message content required")
    message = LessonMessage(
        lesson_id=lesson.id,
        user_id=current_user.id,
        sender="user",
        content=content,
    )
    db.add(message)
    db.flush()
    upsert_message_attachment(db, message, payload)
    db.commit()
    db.refresh(message)
    course = db.query(Course).filter(Course.id == lesson.course_id).first()
    preview_text = message.content or attachment_preview_text(message.attachment)
    recipients = (
        db.query(User)
        .join(User.roles)
        .filter(Role.name.in_(["teacher", "admin"]))
        .distinct()
        .all()
    )
    for recipient in recipients:
        if recipient.id == current_user.id:
            continue
        db.add(
            LessonNotification(
                recipient_id=recipient.id,
                sender_id=current_user.id,
                message_id=message.id,
                course_id=lesson.course_id,
                course_title=course.title if course else lesson.course_id,
                lesson_id=lesson.id,
                lesson_title=lesson.title,
                message_content=preview_text,
            )
        )
    db.commit()
    return serialize_message(message)

@app.post("/lessons/{lesson_id}/teacher/messages", response_model=LessonMessageOut)
def send_teacher_message(
    lesson_id: int,
    payload: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not (user_has_role(current_user, "teacher") or user_has_role(current_user, "admin")):
        raise HTTPException(status_code=403, detail="Teacher access required")
    lesson = db.query(CourseLesson).filter(CourseLesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    content = normalize_message_content(payload.content)
    has_attachment = bool(
        payload.attachment_kind or payload.attachment_url or payload.attachment_name
    )
    if not content and not has_attachment:
        raise HTTPException(status_code=400, detail="Message content required")
    message = LessonMessage(
        lesson_id=lesson.id,
        user_id=current_user.id,
        sender="teacher",
        content=content,
    )
    db.add(message)
    db.flush()
    upsert_message_attachment(db, message, payload)
    db.commit()
    db.refresh(message)
    return serialize_message(message)


@app.put("/lessons/{lesson_id}/messages/{message_id}", response_model=LessonMessageOut)
def update_lesson_message(
    lesson_id: int,
    message_id: int,
    payload: MessageUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lesson = db.query(CourseLesson).filter(CourseLesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    _, locked = lesson_access(db, current_user, lesson)
    if locked and not can_manage_messages(current_user):
        raise HTTPException(status_code=403, detail="Lesson locked")
    message = (
        db.query(LessonMessage)
        .filter(LessonMessage.id == message_id, LessonMessage.lesson_id == lesson.id)
        .first()
    )
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    if not can_manage_messages(current_user) and message.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="No permission to edit")
    message.content = payload.content
    db.commit()
    db.refresh(message)
    return serialize_message(message)


@app.delete("/lessons/{lesson_id}/messages/{message_id}")
def delete_lesson_message(
    lesson_id: int,
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lesson = db.query(CourseLesson).filter(CourseLesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    _, locked = lesson_access(db, current_user, lesson)
    if locked and not can_manage_messages(current_user):
        raise HTTPException(status_code=403, detail="Lesson locked")
    message = (
        db.query(LessonMessage)
        .filter(LessonMessage.id == message_id, LessonMessage.lesson_id == lesson.id)
        .first()
    )
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    if not can_manage_messages(current_user) and message.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="No permission to delete")
    db.delete(message)
    db.commit()
    return {"status": "ok"}


@app.get("/lessons/{lesson_id}/private-chat/me", response_model=PrivateChatThreadOut)
def get_or_open_my_private_chat(
    lesson_id: int,
    target: str = Query(default="teacher"),
    recipient_id: int | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lesson = db.query(CourseLesson).filter(CourseLesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    _, locked = lesson_access(db, current_user, lesson)
    if locked and not can_manage_messages(current_user):
        raise HTTPException(status_code=403, detail="Lesson locked")

    if can_manage_messages(current_user):
        raise HTTPException(status_code=400, detail="Teacher should use /private-chats list")
    target_normalized = (target or "teacher").strip().lower()
    if target_normalized not in {"teacher", "admin"}:
        raise HTTPException(status_code=400, detail="Invalid target. Use teacher or admin")

    recipient: User | None = None
    if recipient_id:
        recipient = db.query(User).filter(User.id == recipient_id, User.is_active.is_(True)).first()
        if not recipient:
            raise HTTPException(status_code=404, detail="Recipient not found")
        expected_role = "admin" if target_normalized == "admin" else "teacher"
        if not user_has_role(recipient, expected_role):
            raise HTTPException(status_code=400, detail=f"Recipient must have role: {expected_role}")
    else:
        recipient = (
            resolve_lesson_admin(db, lesson)
            if target_normalized == "admin"
            else resolve_lesson_teacher(db, lesson, student_id=current_user.id)
        )
    if not recipient:
        if target_normalized == "admin":
            raise HTTPException(status_code=503, detail="Admin account not found")
        raise HTTPException(status_code=503, detail="Teacher account not found")

    chat = get_or_create_private_chat(
        db,
        lesson_id=lesson.id,
        student_id=current_user.id,
        teacher_id=recipient.id,
    )
    return serialize_private_chat_thread(db, chat, current_user.id)


@app.get(
    "/lessons/{lesson_id}/private-chat/recipients",
    response_model=list[PrivateChatRecipientOut],
)
def list_my_private_chat_recipients(
    lesson_id: int,
    target: str = Query(default="teacher"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lesson = db.query(CourseLesson).filter(CourseLesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    _, locked = lesson_access(db, current_user, lesson)
    if locked and not can_manage_messages(current_user):
        raise HTTPException(status_code=403, detail="Lesson locked")
    if can_manage_messages(current_user):
        raise HTTPException(status_code=400, detail="Recipients list is for students")

    target_normalized = (target or "teacher").strip().lower()
    if target_normalized not in {"teacher", "admin"}:
        raise HTTPException(status_code=400, detail="Invalid target. Use teacher or admin")

    return list_private_chat_recipients(
        db,
        lesson=lesson,
        student_id=current_user.id,
        target=target_normalized,
    )


@app.post("/lessons/{lesson_id}/private-chats/{student_id}/open", response_model=PrivateChatThreadOut)
def open_private_chat_for_teacher(
    lesson_id: int,
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not can_manage_messages(current_user):
        raise HTTPException(status_code=403, detail="Teacher access required")

    lesson = db.query(CourseLesson).filter(CourseLesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    chat = get_or_create_private_chat(
        db,
        lesson_id=lesson.id,
        student_id=student.id,
        teacher_id=current_user.id,
    )
    return serialize_private_chat_thread(db, chat, current_user.id)


@app.get("/lessons/{lesson_id}/private-chats", response_model=list[PrivateChatThreadOut])
def list_private_chats_for_lesson(
    lesson_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not can_manage_messages(current_user):
        raise HTTPException(status_code=403, detail="Teacher access required")
    lesson = db.query(CourseLesson).filter(CourseLesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    query = db.query(PrivateLessonChat).filter(
        PrivateLessonChat.lesson_id == lesson.id,
        PrivateLessonChat.teacher_id == current_user.id,
    )
    chats = query.order_by(PrivateLessonChat.updated_at.desc(), PrivateLessonChat.id.desc()).all()
    return [serialize_private_chat_thread(db, chat, current_user.id) for chat in chats]


@app.get("/private-chats/{chat_id}/messages", response_model=list[PrivateChatMessageOut])
def list_private_chat_messages(
    chat_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chat = db.query(PrivateLessonChat).filter(PrivateLessonChat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Private chat not found")
    if not can_access_private_chat(chat, current_user):
        raise HTTPException(status_code=403, detail="No permission for this chat")

    unread_messages = (
        db.query(PrivateLessonMessage)
        .filter(
            PrivateLessonMessage.chat_id == chat.id,
            PrivateLessonMessage.sender_id != current_user.id,
            PrivateLessonMessage.is_read == False,
        )
        .all()
    )
    if unread_messages:
        for item in unread_messages:
            item.is_read = True
        db.commit()

    messages = (
        db.query(PrivateLessonMessage)
        .filter(PrivateLessonMessage.chat_id == chat.id)
        .order_by(PrivateLessonMessage.created_at.asc(), PrivateLessonMessage.id.asc())
        .all()
    )
    return [serialize_private_chat_message(item) for item in messages]


@app.post("/private-chats/{chat_id}/messages/upload")
async def upload_private_chat_file(
    chat_id: int,
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chat = db.query(PrivateLessonChat).filter(PrivateLessonChat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Private chat not found")
    if not can_access_private_chat(chat, current_user):
        raise HTTPException(status_code=403, detail="No permission for this chat")

    lesson = db.query(CourseLesson).filter(CourseLesson.id == chat.lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    _, locked = lesson_access(db, current_user, lesson)
    if locked and not can_manage_messages(current_user):
        raise HTTPException(status_code=403, detail="Lesson locked")

    if not file:
        raise HTTPException(status_code=400, detail="File required")
    return await store_chat_upload(file, request)


@app.websocket("/ws/lessons/{lesson_id}/assignments")
async def assignments_socket(
    websocket: WebSocket,
    lesson_id: int,
    token: str = Query(default=""),
):
    db = SessionLocal()
    connected_lesson_id = lesson_id
    try:
        user = get_user_by_ws_token(db, token)
        if not user:
            await websocket.close(code=4401)
            return

        lesson = db.query(CourseLesson).filter(CourseLesson.id == lesson_id).first()
        if not lesson:
            await websocket.close(code=4404)
            return

        _, locked = lesson_access(db, user, lesson)
        if locked and not can_manage_messages(user):
            await websocket.close(code=4403)
            return

        connected_lesson_id = lesson.id
        await assignment_socket_hub.connect(lesson.id, websocket)
        await websocket.send_json({"event": "connected", "lesson_id": lesson.id})

        while True:
            payload = await websocket.receive_text()
            if payload.strip().lower() == "ping":
                await websocket.send_json({"event": "pong"})
    except WebSocketDisconnect:
        pass
    except Exception:
        try:
            await websocket.close(code=1011)
        except Exception:
            pass
    finally:
        assignment_socket_hub.disconnect(connected_lesson_id, websocket)
        db.close()


@app.websocket("/ws/lessons/{lesson_id}/private-threads")
async def private_thread_socket(
    websocket: WebSocket,
    lesson_id: int,
    token: str = Query(default=""),
):
    db = SessionLocal()
    connected_lesson_id = lesson_id
    try:
        user = get_user_by_ws_token(db, token)
        if not user:
            await websocket.close(code=4401)
            return
        if not can_manage_messages(user):
            await websocket.close(code=4403)
            return

        lesson = db.query(CourseLesson).filter(CourseLesson.id == lesson_id).first()
        if not lesson:
            await websocket.close(code=4404)
            return

        connected_lesson_id = lesson.id
        await private_thread_socket_hub.connect(lesson.id, websocket)
        await websocket.send_json({"event": "connected", "lesson_id": lesson.id})

        while True:
            payload = await websocket.receive_text()
            if payload.strip().lower() == "ping":
                await websocket.send_json({"event": "pong"})
    except WebSocketDisconnect:
        pass
    except Exception:
        try:
            await websocket.close(code=1011)
        except Exception:
            pass
    finally:
        private_thread_socket_hub.disconnect(connected_lesson_id, websocket)
        db.close()


@app.websocket("/ws/private-chats/{chat_id}")
async def private_chat_socket(
    websocket: WebSocket,
    chat_id: int,
    token: str = Query(default=""),
):
    db = SessionLocal()
    connected_chat_id = chat_id
    try:
        user = get_user_by_ws_token(db, token)
        if not user:
            await websocket.close(code=4401)
            return

        chat = db.query(PrivateLessonChat).filter(PrivateLessonChat.id == chat_id).first()
        if not chat:
            await websocket.close(code=4404)
            return
        if not can_access_private_chat(chat, user):
            await websocket.close(code=4403)
            return

        connected_chat_id = chat.id
        await private_chat_socket_hub.connect(chat.id, websocket)
        await websocket.send_json({"event": "connected", "chat_id": chat.id})

        while True:
            payload = await websocket.receive_text()
            if payload.strip().lower() == "ping":
                await websocket.send_json({"event": "pong"})
    except WebSocketDisconnect:
        pass
    except Exception:
        try:
            await websocket.close(code=1011)
        except Exception:
            pass
    finally:
        private_chat_socket_hub.disconnect(connected_chat_id, websocket)
        db.close()


@app.post("/private-chats/{chat_id}/messages", response_model=PrivateChatMessageOut)
async def send_private_chat_message(
    chat_id: int,
    payload: PrivateChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chat = db.query(PrivateLessonChat).filter(PrivateLessonChat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Private chat not found")
    if not can_access_private_chat(chat, current_user):
        raise HTTPException(status_code=403, detail="No permission for this chat")

    lesson = db.query(CourseLesson).filter(CourseLesson.id == chat.lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    _, locked = lesson_access(db, current_user, lesson)
    if locked and not can_manage_messages(current_user):
        raise HTTPException(status_code=403, detail="Lesson locked")

    content = (payload.content or "").strip()
    has_attachment = bool(
        payload.attachment_kind or payload.attachment_url or payload.attachment_name
    )
    if not content:
        if has_attachment:
            content = attachment_preview_text_from_payload(
                payload.attachment_kind,
                payload.attachment_name,
            )
        else:
            # Backward compatibility: eski frontendlar ba'zan bo'sh content yuboradi.
            content = "Xabar"

    message = PrivateLessonMessage(
        chat_id=chat.id,
        sender_id=current_user.id,
        content=content,
        is_read=False,
    )
    db.add(message)
    db.flush()
    upsert_private_message_attachment(db, message, payload)
    chat.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(message)
    response_payload = serialize_private_chat_message(message)
    await private_chat_socket_hub.broadcast(
        chat.id,
        {
            "event": "message",
            "chat_id": chat.id,
            "message": response_payload,
        },
    )
    await private_thread_socket_hub.broadcast(
        chat.lesson_id,
        {
            "event": "thread_update",
            "lesson_id": chat.lesson_id,
            "thread": serialize_private_chat_thread(db, chat, chat.teacher_id),
        },
    )
    return response_payload


@app.delete("/private-chats/{chat_id}/messages")
async def clear_private_chat_messages(
    chat_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chat = db.query(PrivateLessonChat).filter(PrivateLessonChat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Private chat not found")
    if not can_access_private_chat(chat, current_user):
        raise HTTPException(status_code=403, detail="No permission for this chat")

    message_ids = [
        row[0]
        for row in db.query(PrivateLessonMessage.id)
        .filter(PrivateLessonMessage.chat_id == chat.id)
        .all()
    ]
    deleted_count = len(message_ids)

    if deleted_count:
        (
            db.query(PrivateLessonMessageAttachment)
            .filter(PrivateLessonMessageAttachment.message_id.in_(message_ids))
            .delete(synchronize_session=False)
        )
        (
            db.query(PrivateLessonMessage)
            .filter(PrivateLessonMessage.id.in_(message_ids))
            .delete(synchronize_session=False)
        )

    chat.updated_at = datetime.now(timezone.utc)
    db.commit()

    await private_chat_socket_hub.broadcast(
        chat.id,
        {
            "event": "cleared",
            "chat_id": chat.id,
        },
    )
    await private_thread_socket_hub.broadcast(
        chat.lesson_id,
        {
            "event": "thread_update",
            "lesson_id": chat.lesson_id,
            "thread": serialize_private_chat_thread(db, chat, chat.teacher_id),
        },
    )
    return {"status": "ok", "deleted_count": deleted_count}


@app.post("/courses/{course_id}/purchase")
def purchase_course(
    course_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    existing = (
        db.query(CoursePurchase)
        .filter(CoursePurchase.user_id == current_user.id, CoursePurchase.course_id == course_id)
        .first()
    )
    if existing:
        return {"status": "ok", "message": "Already purchased"}
    purchase = CoursePurchase(user_id=current_user.id, course_id=course_id)
    db.add(purchase)
    db.commit()
    return {"status": "ok", "message": "Course unlocked"}


@app.get("/notifications", response_model=list[LessonNotificationOut])
def list_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not can_manage_messages(current_user):
        raise HTTPException(status_code=403, detail="Teacher access required")
    notifications = (
        db.query(LessonNotification)
        .filter(LessonNotification.recipient_id == current_user.id)
        .order_by(LessonNotification.created_at.desc())
        .limit(50)
        .all()
    )
    return [serialize_notification(item) for item in notifications]


@app.put("/notifications/{notification_id}/read", response_model=LessonNotificationOut)
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notification = (
        db.query(LessonNotification)
        .filter(
            LessonNotification.id == notification_id,
            LessonNotification.recipient_id == current_user.id,
        )
        .first()
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return serialize_notification(notification)


@app.put("/notifications/read-all")
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not can_manage_messages(current_user):
        raise HTTPException(status_code=403, detail="Teacher access required")
    (
        db.query(LessonNotification)
        .filter(
            LessonNotification.recipient_id == current_user.id,
            LessonNotification.is_read.is_(False),
        )
        .update({"is_read": True})
    )
    db.commit()
    return {"status": "ok"}


@app.post("/payments/checkout/{course_id}", response_model=PaymentOut)
def checkout_course(
    course_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    existing = (
        db.query(CoursePurchase)
        .filter(CoursePurchase.user_id == current_user.id, CoursePurchase.course_id == course_id)
        .first()
    )
    if not existing:
        purchase = CoursePurchase(user_id=current_user.id, course_id=course_id)
        db.add(purchase)

    order = PaymentOrder(
        user_id=current_user.id,
        course_id=course_id,
        amount_cents=parse_price_to_cents(course.price),
        currency="USD",
        provider="mock",
        status="paid",
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@app.get("/payments/me", response_model=list[PaymentOut])
def list_payments(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return (
        db.query(PaymentOrder)
        .filter(PaymentOrder.user_id == current_user.id)
        .order_by(PaymentOrder.created_at.desc())
        .all()
    )
