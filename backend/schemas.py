from datetime import datetime
from pydantic import BaseModel, EmailStr
from typing import List, Optional


class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    roles: Optional[List[str]] = None
    require_email_code: Optional[bool] = False


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    email: EmailStr
    username: str
    roles: List[str] = []

    class Config:
        from_attributes = True


class CourseLesson(BaseModel):
    id: Optional[int] = None
    title: str
    duration: str
    type: Optional[str] = "video"
    video_url: Optional[str] = None
    position: Optional[int] = None
    is_free: Optional[bool] = None
    locked: Optional[bool] = None


class CourseCodeSample(BaseModel):
    title: str
    language: str
    content: str


class CourseOut(BaseModel):
    id: str
    title: str
    image: str
    category: str
    duration: str
    price: str
    old_price: Optional[str] = None
    instructor: str
    summary: str
    topics: List[str]
    level: Optional[str] = None
    rating: Optional[float] = None
    rating_count: Optional[int] = None
    teacher_rating: Optional[float] = None
    teacher_rating_count: Optional[int] = None
    students: Optional[str] = None
    language: Optional[str] = None
    lessons: Optional[List[CourseLesson]] = None
    code_samples: Optional[List[CourseCodeSample]] = None
    free_lessons: Optional[int] = None
    is_purchased: Optional[bool] = None


class PaymentOut(BaseModel):
    id: int
    course_id: str
    amount_cents: int
    currency: str
    provider: str
    status: str


class LessonSlideOut(BaseModel):
    id: int
    title: str
    image_url: Optional[str] = None
    content: Optional[str] = None
    position: int

    class Config:
        from_attributes = True


class LessonResourceOut(BaseModel):
    id: int
    title: str
    url: str
    kind: str

    class Config:
        from_attributes = True


class AssignmentSubmissionOut(BaseModel):
    id: int
    assignment_id: int
    student_id: int
    student_username: Optional[str] = None
    content: str
    created_at: Optional[datetime] = None
    rating: Optional[int] = None
    feedback: Optional[str] = None
    graded_by: Optional[int] = None
    graded_by_username: Optional[str] = None
    graded_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LessonMessageAttachmentOut(BaseModel):
    id: int
    kind: str
    url: Optional[str] = None
    file_name: Optional[str] = None
    mime_type: Optional[str] = None
    size_bytes: Optional[int] = None
    duration_seconds: Optional[float] = None

    class Config:
        from_attributes = True


class LessonAssignmentOut(BaseModel):
    id: int
    lesson_id: int
    title: str
    description: Optional[str] = None
    max_rating: int = 5
    submission: Optional[AssignmentSubmissionOut] = None
    submission_count: Optional[int] = None
    graded_count: Optional[int] = None

    class Config:
        from_attributes = True


class LessonMessageOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    username: Optional[str] = None
    sender: str
    content: str
    created_at: Optional[datetime] = None
    attachment: Optional[LessonMessageAttachmentOut] = None

    class Config:
        from_attributes = True


class PrivateChatThreadOut(BaseModel):
    id: int
    lesson_id: int
    student_id: int
    student_username: Optional[str] = None
    teacher_id: int
    teacher_username: Optional[str] = None
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    unread_count: int = 0


class PrivateChatRecipientOut(BaseModel):
    id: int
    username: str
    role: str
    chat_id: Optional[int] = None


class PrivateChatMessageOut(BaseModel):
    id: int
    chat_id: int
    sender_id: int
    sender_username: Optional[str] = None
    content: str
    is_read: bool = False
    created_at: Optional[datetime] = None
    attachment: Optional[LessonMessageAttachmentOut] = None


class PrivateChatMessageCreate(BaseModel):
    content: Optional[str] = None
    attachment_kind: Optional[str] = None
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None
    attachment_mime: Optional[str] = None
    attachment_size: Optional[int] = None
    attachment_duration: Optional[float] = None


class LessonNotificationOut(BaseModel):
    id: int
    recipient_id: int
    sender_id: Optional[int] = None
    sender_username: Optional[str] = None
    course_id: str
    course_title: str
    lesson_id: int
    lesson_title: str
    message_id: int
    message_content: str
    is_read: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LessonDetailOut(BaseModel):
    id: int
    title: str
    duration: str
    type: Optional[str] = None
    video_url: Optional[str] = None
    position: int
    is_free: Optional[bool] = None
    locked: Optional[bool] = None
    slides: list[LessonSlideOut] = []
    resources: list[LessonResourceOut] = []
    messages: list[LessonMessageOut] = []


class MessageCreate(BaseModel):
    content: Optional[str] = None
    attachment_kind: Optional[str] = None
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None
    attachment_mime: Optional[str] = None
    attachment_size: Optional[int] = None
    attachment_duration: Optional[float] = None


class MessageUpdate(BaseModel):
    content: str


class AssignmentSubmissionCreate(BaseModel):
    content: str


class LessonAssignmentCreate(BaseModel):
    title: str
    description: Optional[str] = None
    max_rating: Optional[int] = 5


class LessonAssignmentBulkCreate(BaseModel):
    assignments: List[LessonAssignmentCreate]


class AssignmentGradeCreate(BaseModel):
    rating: int
    feedback: Optional[str] = None


class RatingCreate(BaseModel):
    rating: int
    review: Optional[str] = None


class RatingSummary(BaseModel):
    average: float
    count: int
    my_rating: Optional[int] = None


class EmailCodeRequest(BaseModel):
    email: EmailStr


class EmailCodeVerify(BaseModel):
    email: EmailStr
    code: str
