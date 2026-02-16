from sqlalchemy import Column, Integer, String, DateTime, Boolean, func, Table, ForeignKey, UniqueConstraint, Text, Float
from sqlalchemy.orm import relationship
from sqlalchemy.types import JSON

from database import Base


user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("role_id", Integer, ForeignKey("roles.id"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    roles = relationship("Role", secondary=user_roles, back_populates="users")
    course_purchases = relationship("CoursePurchase", back_populates="user")


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(64), unique=True, index=True, nullable=False)
    users = relationship("User", secondary=user_roles, back_populates="roles")


class CoursePurchase(Base):
    __tablename__ = "course_purchases"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(String(255), nullable=False)
    purchased_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="course_purchases")

    __table_args__ = (
        UniqueConstraint("user_id", "course_id", name="uq_course_purchase"),
    )


class Course(Base):
    __tablename__ = "courses"

    id = Column(String(255), primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    image = Column(String(1024), nullable=False)
    category = Column(String(128), nullable=False)
    duration = Column(String(64), nullable=False)
    price = Column(String(64), nullable=False)
    old_price = Column(String(64), nullable=True)
    instructor = Column(String(255), nullable=False)
    summary = Column(Text, nullable=False)
    topics = Column(JSON, default=list)
    level = Column(String(64), nullable=True)
    rating = Column(Float, nullable=True)
    students = Column(String(64), nullable=True)
    language = Column(String(64), nullable=True)
    code_samples = Column(JSON, default=list)

    lessons = relationship("CourseLesson", back_populates="course", cascade="all, delete-orphan")


class CourseRating(Base):
    __tablename__ = "course_ratings"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(String(255), ForeignKey("courses.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False)
    review = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
    course = relationship("Course")

    __table_args__ = (
        UniqueConstraint("user_id", "course_id", name="uq_course_rating"),
    )


class TeacherRating(Base):
    __tablename__ = "teacher_ratings"

    id = Column(Integer, primary_key=True, index=True)
    teacher_name = Column(String(255), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False)
    review = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("user_id", "teacher_name", name="uq_teacher_rating"),
    )


class CourseLesson(Base):
    __tablename__ = "course_lessons"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(String(255), ForeignKey("courses.id"), nullable=False)
    title = Column(String(255), nullable=False)
    duration = Column(String(64), nullable=False)
    type = Column(String(32), nullable=True)
    video_url = Column(String(1024), nullable=True)
    position = Column(Integer, nullable=False, default=0)
    is_free = Column(Boolean, default=False)

    course = relationship("Course", back_populates="lessons")


class LessonSlide(Base):
    __tablename__ = "lesson_slides"

    id = Column(Integer, primary_key=True, index=True)
    lesson_id = Column(Integer, ForeignKey("course_lessons.id"), nullable=False)
    title = Column(String(255), nullable=False)
    image_url = Column(String(1024), nullable=True)
    content = Column(Text, nullable=True)
    position = Column(Integer, default=0)

    lesson = relationship("CourseLesson")


class LessonResource(Base):
    __tablename__ = "lesson_resources"

    id = Column(Integer, primary_key=True, index=True)
    lesson_id = Column(Integer, ForeignKey("course_lessons.id"), nullable=False)
    title = Column(String(255), nullable=False)
    url = Column(String(1024), nullable=False)
    kind = Column(String(64), nullable=False)

    lesson = relationship("CourseLesson")


class LessonAssignment(Base):
    __tablename__ = "lesson_assignments"

    id = Column(Integer, primary_key=True, index=True)
    lesson_id = Column(Integer, ForeignKey("course_lessons.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    max_rating = Column(Integer, default=5)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    lesson = relationship("CourseLesson")


class AssignmentSubmission(Base):
    __tablename__ = "assignment_submissions"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("lesson_assignments.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    rating = Column(Integer, nullable=True)
    feedback = Column(Text, nullable=True)
    graded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    graded_at = Column(DateTime(timezone=True), nullable=True)

    assignment = relationship("LessonAssignment")
    student = relationship("User", foreign_keys=[student_id])
    grader = relationship("User", foreign_keys=[graded_by])

    __table_args__ = (
        UniqueConstraint("assignment_id", "student_id", name="uq_assignment_submission"),
    )


class LessonMessage(Base):
    __tablename__ = "lesson_messages"

    id = Column(Integer, primary_key=True, index=True)
    lesson_id = Column(Integer, ForeignKey("course_lessons.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    sender = Column(String(32), default="user")
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    lesson = relationship("CourseLesson")
    user = relationship("User")
    attachment = relationship(
        "LessonMessageAttachment",
        back_populates="message",
        uselist=False,
        cascade="all, delete-orphan",
    )


class LessonMessageAttachment(Base):
    __tablename__ = "lesson_message_attachments"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(
        Integer,
        ForeignKey("lesson_messages.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    kind = Column(String(32), nullable=False, default="file")
    url = Column(String(1024), nullable=True)
    file_name = Column(String(255), nullable=True)
    mime_type = Column(String(255), nullable=True)
    size_bytes = Column(Integer, nullable=True)
    duration_seconds = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    message = relationship("LessonMessage", back_populates="attachment")


class LessonNotification(Base):
    __tablename__ = "lesson_notifications"

    id = Column(Integer, primary_key=True, index=True)
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    message_id = Column(Integer, ForeignKey("lesson_messages.id"), nullable=False)
    course_id = Column(String(255), nullable=False)
    course_title = Column(String(255), nullable=False)
    lesson_id = Column(Integer, ForeignKey("course_lessons.id"), nullable=False)
    lesson_title = Column(String(255), nullable=False)
    message_content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    recipient = relationship("User", foreign_keys=[recipient_id])
    sender = relationship("User", foreign_keys=[sender_id])
    message = relationship("LessonMessage")
    lesson = relationship("CourseLesson")


class PrivateLessonChat(Base):
    __tablename__ = "private_lesson_chats"

    id = Column(Integer, primary_key=True, index=True)
    lesson_id = Column(Integer, ForeignKey("course_lessons.id"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    lesson = relationship("CourseLesson")
    student = relationship("User", foreign_keys=[student_id])
    teacher = relationship("User", foreign_keys=[teacher_id])

    __table_args__ = (
        UniqueConstraint(
            "lesson_id",
            "student_id",
            "teacher_id",
            name="uq_private_lesson_chat",
        ),
    )


class PrivateLessonMessage(Base):
    __tablename__ = "private_lesson_messages"

    id = Column(Integer, primary_key=True, index=True)
    chat_id = Column(Integer, ForeignKey("private_lesson_chats.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    chat = relationship("PrivateLessonChat")
    sender = relationship("User")
    attachment = relationship(
        "PrivateLessonMessageAttachment",
        back_populates="message",
        uselist=False,
        cascade="all, delete-orphan",
    )


class PrivateLessonMessageAttachment(Base):
    __tablename__ = "private_lesson_message_attachments"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(
        Integer,
        ForeignKey("private_lesson_messages.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    kind = Column(String(32), nullable=False, default="file")
    url = Column(String(1024), nullable=True)
    file_name = Column(String(255), nullable=True)
    mime_type = Column(String(255), nullable=True)
    size_bytes = Column(Integer, nullable=True)
    duration_seconds = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    message = relationship("PrivateLessonMessage", back_populates="attachment")


class EmailOTP(Base):
    __tablename__ = "email_otps"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    code_hash = Column(String(255), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PaymentOrder(Base):
    __tablename__ = "payment_orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(String(255), nullable=False)
    amount_cents = Column(Integer, default=0)
    currency = Column(String(16), default="USD")
    provider = Column(String(32), default="mock")
    status = Column(String(24), default="paid")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
