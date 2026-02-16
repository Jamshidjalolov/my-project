export type CourseLesson = {
  id?: number;
  title: string;
  duration: string;
  type?: "video" | "lab" | "quiz";
  videoUrl?: string;
  position?: number;
  isFree?: boolean;
  locked?: boolean;
};

export type CourseCodeSample = {
  title: string;
  language: string;
  content: string;
};

export type Course = {
  id: string;
  title: string;
  image: string;
  category: string;
  duration: string;
  price: string;
  oldPrice?: string;
  instructor: string;
  summary: string;
  topics: string[];
  level?: string;
  rating?: number;
  ratingCount?: number;
  teacherRating?: number;
  teacherRatingCount?: number;
  students?: string;
  language?: string;
  lessons?: CourseLesson[];
  codeSamples?: CourseCodeSample[];
  freeLessons?: number;
  isPurchased?: boolean;
};

export type LessonSlide = {
  id: number;
  title: string;
  imageUrl?: string | null;
  content?: string | null;
  position: number;
};

export type LessonResource = {
  id: number;
  title: string;
  url: string;
  kind: string;
};

export type AssignmentSubmission = {
  id: number;
  assignmentId: number;
  studentId: number;
  studentUsername?: string | null;
  content: string;
  createdAt?: string | null;
  rating?: number | null;
  feedback?: string | null;
  gradedBy?: number | null;
  gradedByUsername?: string | null;
  gradedAt?: string | null;
};

export type LessonAssignment = {
  id: number;
  lessonId: number;
  title: string;
  description?: string | null;
  maxRating?: number;
  submission?: AssignmentSubmission | null;
  submissionCount?: number | null;
  gradedCount?: number | null;
};

export type LessonMessage = {
  id: number;
  key?: string;
  userId?: number | null;
  username?: string | null;
  sender: "user" | "teacher";
  content: string;
  attachment?: LessonMessageAttachment | null;
  createdAt?: string | null;
  clientTempId?: number;
  pending?: boolean;
};

export type LessonMessageAttachment = {
  id?: number;
  kind: "sticker" | "image" | "video" | "audio" | "file";
  url?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  durationSeconds?: number | null;
};

export type LessonDetail = {
  id: number;
  title: string;
  duration: string;
  type?: string | null;
  videoUrl?: string | null;
  position: number;
  isFree?: boolean;
  locked?: boolean;
  slides: LessonSlide[];
  resources: LessonResource[];
  messages: LessonMessage[];
};
