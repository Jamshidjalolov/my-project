import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  get,
  onValue,
  orderByChild,
  push,
  query,
  ref as dbRef,
  remove,
  update,
} from "firebase/database";
import { signInWithCustomToken } from "firebase/auth";
import type {
  Course,
  CourseLesson,
  LessonDetail,
  LessonMessage,
  LessonMessageAttachment,
  LessonAssignment,
  AssignmentSubmission,
} from "../types/course";
import { coursesSeed } from "../data/courses";
import { auth, db } from "../firebase";

const tabs = [
  "Overview",
  "Messages",
  "Assignments",
  "Notes",
  "Announcements",
  "Reviews",
  "Learning tools",
] as const;

type PendingAttachment = {
  kind: LessonMessageAttachment["kind"];
  file?: File;
  previewUrl?: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  durationSeconds?: number;
};

type OutgoingAttachmentPayload = {
  kind: LessonMessageAttachment["kind"];
  url?: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  durationSeconds?: number;
};

type TeacherAssignmentDraft = {
  id: number;
  title: string;
  description: string;
  maxRating: number;
};

type AssignmentSubmissionDraft = {
  text: string;
  imageUrl: string;
  resourceUrl: string;
  code: string;
};

type DirectChatThread = {
  id: number;
  lessonId: number;
  studentId: number;
  studentUsername?: string | null;
  teacherId: number;
  teacherUsername?: string | null;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  unreadCount: number;
};

type DirectChatMessage = {
  id: number;
  chatId: number;
  senderId: number;
  senderUsername?: string | null;
  content: string;
  isRead: boolean;
  attachment?: LessonMessageAttachment | null;
  createdAt?: string | null;
};

type DirectRecipient = {
  id: number;
  username: string;
  role: "teacher" | "admin";
  chatId?: number | null;
};

function normalizeAttachment(raw: any): LessonMessageAttachment | null {
  if (!raw) return null;
  const kindRaw = (raw.kind ?? raw.type ?? "").toString().toLowerCase();
  const kind: LessonMessageAttachment["kind"] =
    kindRaw === "sticker" ||
    kindRaw === "image" ||
    kindRaw === "video" ||
    kindRaw === "audio"
      ? kindRaw
      : "file";
  return {
    id: raw.id ?? undefined,
    kind,
    url: raw.url ?? raw.attachment_url ?? raw.attachmentUrl ?? null,
    fileName: raw.file_name ?? raw.fileName ?? raw.name ?? null,
    mimeType: raw.mime_type ?? raw.mimeType ?? null,
    sizeBytes: raw.size_bytes ?? raw.sizeBytes ?? null,
    durationSeconds: raw.duration_seconds ?? raw.durationSeconds ?? null,
  };
}

function normalizeLessonMessage(raw: any): LessonMessage {
  const sender = raw.sender === "assistant" ? "teacher" : raw.sender;
  return {
    id: raw.id,
    userId: raw.user_id ?? raw.userId ?? null,
    username: raw.username ?? raw.user?.username ?? null,
    sender,
    content: raw.content ?? "",
    attachment: normalizeAttachment(raw.attachment),
    createdAt: raw.created_at ?? raw.createdAt ?? null,
  };
}

function normalizeLessonDetail(raw: any): LessonDetail {
  return {
    id: raw.id,
    title: raw.title,
    duration: raw.duration,
    type: raw.type ?? null,
    videoUrl: raw.video_url ?? raw.videoUrl ?? null,
    position: raw.position ?? 0,
    isFree: raw.is_free ?? raw.isFree,
    locked: Boolean(raw.locked),
    slides: (raw.slides ?? []).map((slide: any) => ({
      id: slide.id,
      title: slide.title,
      imageUrl: slide.image_url ?? slide.imageUrl ?? null,
      content: slide.content ?? null,
      position: slide.position ?? 0,
    })),
    resources: (raw.resources ?? []).map((resource: any) => ({
      id: resource.id,
      title: resource.title,
      url: resource.url,
      kind: resource.kind,
    })),
    messages: (raw.messages ?? []).map(normalizeLessonMessage),
  };
}

function normalizeAssignmentSubmission(raw: any): AssignmentSubmission {
  return {
    id: raw.id,
    assignmentId: raw.assignment_id ?? raw.assignmentId ?? 0,
    studentId: raw.student_id ?? raw.studentId ?? 0,
    studentUsername: raw.student_username ?? raw.studentUsername ?? null,
    content: raw.content ?? "",
    createdAt: raw.created_at ?? raw.createdAt ?? null,
    rating: raw.rating ?? null,
    feedback: raw.feedback ?? null,
    gradedBy: raw.graded_by ?? raw.gradedBy ?? null,
    gradedByUsername: raw.graded_by_username ?? raw.gradedByUsername ?? null,
    gradedAt: raw.graded_at ?? raw.gradedAt ?? null,
  };
}

function normalizeLessonAssignment(raw: any): LessonAssignment {
  return {
    id: raw.id,
    lessonId: raw.lesson_id ?? raw.lessonId ?? 0,
    title: raw.title,
    description: raw.description ?? null,
    maxRating: raw.max_rating ?? raw.maxRating ?? 5,
    submission: raw.submission
      ? normalizeAssignmentSubmission(raw.submission)
      : null,
    submissionCount: raw.submission_count ?? raw.submissionCount ?? null,
    gradedCount: raw.graded_count ?? raw.gradedCount ?? null,
  };
}

function normalizeRealtimeMessage(key: string, raw: any): LessonMessage {
  const createdAtMs =
    typeof raw?.createdAt === "number" ? raw.createdAt : Date.now();
  return {
    id: Number(raw?.id ?? createdAtMs),
    key,
    userId: raw?.userId ?? null,
    username: raw?.username ?? null,
    sender: raw?.sender === "teacher" ? "teacher" : "user",
    content: raw?.content ?? "",
    attachment: normalizeAttachment(raw?.attachment),
    createdAt: new Date(createdAtMs).toISOString(),
    clientTempId:
      typeof raw?.clientTempId === "number" ? raw.clientTempId : undefined,
  };
}

function buildFallbackLessonDetail(
  lesson: CourseLesson,
  course: Course
): LessonDetail {
  const slides =
    course.topics?.slice(0, 5).map((topic, idx) => ({
      id: idx + 1,
      title: topic,
      imageUrl: null,
      content: `Focus: ${topic}`,
      position: idx + 1,
    })) ?? [];
  const resources =
    course.codeSamples?.map((sample, idx) => ({
      id: idx + 1,
      title: sample.title,
      url: "#",
      kind: sample.language,
    })) ?? [];

  return {
    id: lesson.id ?? 0,
    title: lesson.title,
    duration: lesson.duration,
    type: lesson.type ?? null,
    videoUrl: lesson.videoUrl ?? null,
    position: lesson.position ?? 0,
    isFree: lesson.isFree,
    locked: lesson.locked,
    slides,
    resources,
    messages: [],
  };
}

function formatTimestamp(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function normalizeDirectChatThread(raw: any): DirectChatThread {
  const lastMessageRaw = raw.last_message ?? raw.lastMessage ?? null;
  const parsedLastMessage =
    typeof lastMessageRaw === "string"
      ? parseDirectMessageContent(lastMessageRaw)
      : { content: "", attachment: null };
  const lastMessagePreview =
    parsedLastMessage.content?.trim() ||
    directAttachmentPreviewText(parsedLastMessage.attachment) ||
    null;
  return {
    id: raw.id,
    lessonId: raw.lesson_id ?? raw.lessonId ?? 0,
    studentId: raw.student_id ?? raw.studentId ?? 0,
    studentUsername: raw.student_username ?? raw.studentUsername ?? null,
    teacherId: raw.teacher_id ?? raw.teacherId ?? 0,
    teacherUsername: raw.teacher_username ?? raw.teacherUsername ?? null,
    lastMessage: lastMessagePreview,
    lastMessageAt: raw.last_message_at ?? raw.lastMessageAt ?? null,
    unreadCount: raw.unread_count ?? raw.unreadCount ?? 0,
  };
}

function normalizeDirectChatMessage(raw: any): DirectChatMessage {
  const parsedContent = parseDirectMessageContent(raw.content ?? "");
  const apiAttachment = normalizeAttachment(raw.attachment);
  const attachment = apiAttachment ?? parsedContent.attachment;
  return {
    id: raw.id,
    chatId: raw.chat_id ?? raw.chatId ?? 0,
    senderId: raw.sender_id ?? raw.senderId ?? 0,
    senderUsername: raw.sender_username ?? raw.senderUsername ?? null,
    content: parsedContent.content,
    isRead: Boolean(raw.is_read ?? raw.isRead),
    attachment,
    createdAt: raw.created_at ?? raw.createdAt ?? null,
  };
}

function getChatDayKey(value?: string | null) {
  if (!value) return "unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatChatDayLabel(value?: string | null) {
  if (!value) return "Bugun";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Bugun";
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - start.getTime()) / 86400000);
  if (diff === 0) return "Bugun";
  if (diff === 1) return "Kecha";
  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

function formatBytes(value?: number | null) {
  if (!value || value <= 0) return "";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function directMessagePreviewText(message: DirectChatMessage) {
  if (message.content?.trim()) return message.content;
  return directAttachmentPreviewText(message.attachment) ?? "Yangi xabar";
}

function detectAttachmentKindFromFile(
  file: File
): LessonMessageAttachment["kind"] {
  const mime = (file.type || "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "file";
}

function pickVoiceMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) {
    return undefined;
  }
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  return candidates.find((item) => MediaRecorder.isTypeSupported(item));
}

function extensionFromMimeType(mime: string): string {
  const lower = (mime || "").toLowerCase();
  if (lower.includes("ogg")) return "ogg";
  if (lower.includes("mp4")) return "m4a";
  if (lower.includes("mpeg")) return "mp3";
  if (lower.includes("wav")) return "wav";
  return "webm";
}

function normalizeUploadedFileUrl(rawUrl: unknown): string | undefined {
  if (typeof rawUrl !== "string") return undefined;
  const trimmed = rawUrl.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return `http://127.0.0.1:8000${trimmed}`;
  return `http://127.0.0.1:8000/${trimmed}`;
}

const DIRECT_ATTACHMENT_PREFIX = "__DIRECT_ATTACHMENT__";
const ASSIGNMENT_CONTENT_PREFIX = "__ASSIGNMENT_CONTENT__";

function encodeDirectMessageContent(
  text: string,
  attachment: OutgoingAttachmentPayload
): string {
  return `${DIRECT_ATTACHMENT_PREFIX}${JSON.stringify({
    text,
    attachment,
  })}`;
}

function parseDirectMessageContent(rawContent: string): {
  content: string;
  attachment: LessonMessageAttachment | null;
} {
  const source = (rawContent || "").trim();
  if (!source.startsWith(DIRECT_ATTACHMENT_PREFIX)) {
    return { content: rawContent || "", attachment: null };
  }
  const jsonPart = source.slice(DIRECT_ATTACHMENT_PREFIX.length);
  try {
    const parsed = JSON.parse(jsonPart) as {
      text?: unknown;
      attachment?: unknown;
    };
    const attachment = normalizeAttachment(parsed?.attachment);
    const content =
      typeof parsed?.text === "string" ? parsed.text : rawContent || "";
    return { content, attachment };
  } catch {
    return { content: rawContent || "", attachment: null };
  }
}

function directAttachmentPreviewText(
  attachment: LessonMessageAttachment | null | undefined
): string | null {
  if (!attachment) return null;
  if (attachment.kind === "image") return "Rasm yuborildi";
  if (attachment.kind === "video") return "Video yuborildi";
  if (attachment.kind === "audio") return "Ovozli xabar yuborildi";
  if (attachment.kind === "file") {
    return `Fayl: ${attachment.fileName ?? "attachment"}`;
  }
  if (attachment.kind === "sticker") return "Sticker yuborildi";
  return "Yangi xabar";
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

function parseAssignmentSubmissionContent(rawContent: string): AssignmentSubmissionDraft {
  const source = (rawContent || "").trim();
  if (!source.startsWith(ASSIGNMENT_CONTENT_PREFIX)) {
    return {
      text: rawContent || "",
      imageUrl: "",
      resourceUrl: "",
      code: "",
    };
  }

  const jsonPart = source.slice(ASSIGNMENT_CONTENT_PREFIX.length);
  try {
    const parsed = JSON.parse(jsonPart) as {
      text?: unknown;
      imageUrl?: unknown;
      resourceUrl?: unknown;
      code?: unknown;
    };
    return {
      text: typeof parsed?.text === "string" ? parsed.text : "",
      imageUrl: typeof parsed?.imageUrl === "string" ? parsed.imageUrl : "",
      resourceUrl:
        typeof parsed?.resourceUrl === "string" ? parsed.resourceUrl : "",
      code: typeof parsed?.code === "string" ? parsed.code : "",
    };
  } catch {
    return {
      text: rawContent || "",
      imageUrl: "",
      resourceUrl: "",
      code: "",
    };
  }
}

function createEmptyAssignmentSubmissionDraft(): AssignmentSubmissionDraft {
  return {
    text: "",
    imageUrl: "",
    resourceUrl: "",
    code: "",
  };
}

function createAssignmentSubmissionDraftFromContent(
  rawContent?: string | null
): AssignmentSubmissionDraft {
  return parseAssignmentSubmissionContent(rawContent ?? "");
}

function isAssignmentSubmissionDraftEmpty(
  draft: AssignmentSubmissionDraft | undefined
): boolean {
  if (!draft) return true;
  return !(
    draft.text.trim() ||
    draft.imageUrl.trim() ||
    draft.resourceUrl.trim() ||
    draft.code.trim()
  );
}

function encodeAssignmentSubmissionContent(
  draft: AssignmentSubmissionDraft
): string {
  const normalized: AssignmentSubmissionDraft = {
    text: draft.text.trim(),
    imageUrl: draft.imageUrl.trim(),
    resourceUrl: draft.resourceUrl.trim(),
    code: draft.code.trim(),
  };
  const hasAny =
    normalized.text ||
    normalized.imageUrl ||
    normalized.resourceUrl ||
    normalized.code;
  if (!hasAny) return "";
  const hasMeta = normalized.imageUrl || normalized.resourceUrl || normalized.code;
  if (!hasMeta) return normalized.text;
  return `${ASSIGNMENT_CONTENT_PREFIX}${JSON.stringify(normalized)}`;
}

function getMessageStatus(
  message: LessonMessage,
  index: number,
  list: LessonMessage[],
  isTeacher: boolean,
  currentUserId?: number | null
) {
  if (message.pending || message.id < 0) return "Yuborilmoqda";
  const isOwn =
    (message.sender === "teacher" && isTeacher) ||
    (message.sender === "user" && !isTeacher) ||
    (currentUserId && message.userId === currentUserId);
  if (!isOwn) return "";
  const hasReplyAfter = list
    .slice(index + 1)
    .some((item) => item.sender !== message.sender);
  return hasReplyAfter ? "O'qildi" : "Yetkazildi";
}

function messageNodeId(message: LessonMessage): string {
  return message.key ?? `id-${message.id}`;
}

function createAssignmentDraft(id: number): TeacherAssignmentDraft {
  return {
    id,
    title: "",
    description: "",
    maxRating: 5,
  };
}

function CourseDetail() {
  const { courseId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [activeLesson, setActiveLesson] = useState<CourseLesson | null>(null);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Overview");
  const [messagePaneMode, setMessagePaneMode] = useState<"group" | "direct">(
    "group"
  );
  const [loading, setLoading] = useState(true);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [lessonDetail, setLessonDetail] = useState<LessonDetail | null>(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [chatMessages, setChatMessages] = useState<LessonMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [pendingAttachment, setPendingAttachment] =
    useState<PendingAttachment | null>(null);
  const [chatUploading, setChatUploading] = useState(false);
  const [pickerAccept, setPickerAccept] = useState<string>("*/*");
  const [stickerOpen, setStickerOpen] = useState(false);
  const [directStickerOpen, setDirectStickerOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [chatTransport, setChatTransport] = useState<"firebase" | "backend">(
    "firebase"
  );
  const [firebaseRealtimeEnabled, setFirebaseRealtimeEnabled] = useState(true);
  const [, setChatError] = useState("");
  const [directThreads, setDirectThreads] = useState<DirectChatThread[]>([]);
  const [activeDirectChatId, setActiveDirectChatId] = useState<number | null>(null);
  const [directWsChatId, setDirectWsChatId] = useState<number | null>(null);
  const [directMessages, setDirectMessages] = useState<DirectChatMessage[]>([]);
  const [directInput, setDirectInput] = useState("");
  const studentDirectTarget: "admin" = "admin";
  const [studentRecipients, setStudentRecipients] = useState<DirectRecipient[]>([]);
  const [studentRecipientId, setStudentRecipientId] = useState<number | null>(null);
  const [directLoading, setDirectLoading] = useState(false);
  const [directSending, setDirectSending] = useState(false);
  const [directError, setDirectError] = useState("");
  const [directPendingAttachment, setDirectPendingAttachment] =
    useState<PendingAttachment | null>(null);
  const [directUploading, setDirectUploading] = useState(false);
  const [directPickerAccept, setDirectPickerAccept] = useState<string>("*/*");
  const [directRecording, setDirectRecording] = useState(false);
  const [typingUsers, setTypingUsers] = useState<
    { key: string; username: string; sender: "user" | "teacher" }[]
  >([]);
  const [assignments, setAssignments] = useState<LessonAssignment[]>([]);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");
  const [submissionDrafts, setSubmissionDrafts] = useState<
    Record<number, AssignmentSubmissionDraft>
  >({});
  const [assignmentSubmissions, setAssignmentSubmissions] = useState<
    Record<number, AssignmentSubmission[]>
  >({});
  const [assignmentRealtimeTick, setAssignmentRealtimeTick] = useState(0);
  const [assignmentRealtimeStatus, setAssignmentRealtimeStatus] = useState<
    "offline" | "connecting" | "live"
  >("offline");
  const [assignmentSubmitModalId, setAssignmentSubmitModalId] = useState<
    number | null
  >(null);
  const [assignmentSubmitUploading, setAssignmentSubmitUploading] =
    useState(false);
  const [gradeDrafts, setGradeDrafts] = useState<Record<number, number>>({});
  const [submissionsOpen, setSubmissionsOpen] = useState<
    Record<number, boolean>
  >({});
  const [teacherAssignmentDrafts, setTeacherAssignmentDrafts] = useState<
    TeacherAssignmentDraft[]
  >([createAssignmentDraft(Date.now())]);
  const [assignmentCreateBusy, setAssignmentCreateBusy] = useState(false);
  const [assignmentCreateError, setAssignmentCreateError] = useState("");
  const [assignmentBuilderOpen, setAssignmentBuilderOpen] = useState(false);
  const [assignmentListFilter, setAssignmentListFilter] = useState<
    "all" | "submitted" | "graded"
  >("all");
  const [submissionBusyId, setSubmissionBusyId] = useState<number | null>(null);
  const [gradingBusyId, setGradingBusyId] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const directChatEndRef = useRef<HTMLDivElement | null>(null);
  const directSocketRef = useRef<WebSocket | null>(null);
  const directSocketReconnectRef = useRef<number | null>(null);
  const directSocketRetryRef = useRef(0);
  const directThreadSocketRef = useRef<WebSocket | null>(null);
  const directThreadSocketReconnectRef = useRef<number | null>(null);
  const directThreadSocketRetryRef = useRef(0);
  const directFileInputRef = useRef<HTMLInputElement | null>(null);
  const assignmentFileInputRef = useRef<HTMLInputElement | null>(null);
  const directMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const directRecordingChunksRef = useRef<Blob[]>([]);
  const directRecordingStreamRef = useRef<MediaStream | null>(null);
  const directRecordingStartedAtRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const firebaseAuthPromiseRef = useRef<Promise<void> | null>(null);
  const backendFetchPromiseRef = useRef<Promise<LessonMessage[]> | null>(null);
  const backendFetchLessonRef = useRef<number | null>(null);
  const backendLastFetchAtRef = useRef(0);
  const assignmentSocketRef = useRef<WebSocket | null>(null);
  const assignmentSocketReconnectRef = useRef<number | null>(null);
  const assignmentSocketPingRef = useRef<number | null>(null);
  const assignmentSocketRetryRef = useRef(0);
  const typingStopTimerRef = useRef<number | null>(null);
  const typingLastSentAtRef = useRef(0);
  const typingActiveRef = useRef(false);
  const [currentUser, setCurrentUser] = useState<{
    id: number;
    username: string;
    roles: string[];
  } | null>(null);
  const [notifications, setNotifications] = useState<
    {
      id: number;
      senderId?: number | null;
      senderUsername?: string | null;
      courseId: string;
      courseTitle: string;
      lessonId: number;
      lessonTitle: string;
      messageContent: string;
      createdAt?: string | null;
      isRead: boolean;
    }[]
  >([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement | null>(null);
  const notifDrawerRef = useRef<HTMLDivElement | null>(null);
  const [notifSearch, setNotifSearch] = useState("");
  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [messageBusyId, setMessageBusyId] = useState<string | null>(null);
  const [courseRating, setCourseRating] = useState<{
    average: number;
    count: number;
    myRating: number | null;
  }>({ average: 0, count: 0, myRating: null });
  const [teacherRating, setTeacherRating] = useState<{
    average: number;
    count: number;
    myRating: number | null;
  }>({ average: 0, count: 0, myRating: null });
  const [courseHover, setCourseHover] = useState<number | null>(null);
  const [teacherHover, setTeacherHover] = useState<number | null>(null);
  const [ratingBusy, setRatingBusy] = useState(false);
  const [ratingError, setRatingError] = useState("");

  const safelyCloseSocket = (socket: WebSocket | null) => {
    if (!socket) return;
    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;
    if (socket.readyState === WebSocket.CONNECTING) {
      socket.addEventListener(
        "open",
        () => {
          try {
            socket.close(1000, "cleanup");
          } catch {
            // ignore close errors
          }
        },
        { once: true }
      );
      return;
    }
    if (socket.readyState === WebSocket.OPEN) {
      try {
        socket.close(1000, "cleanup");
      } catch {
        // ignore close errors
      }
    }
  };

  useEffect(() => {
    if (!courseId) {
      setCourse(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const token = localStorage.getItem("access_token");
    fetch(`http://127.0.0.1:8000/courses/${courseId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          const normalized: Course = {
            id: data.id,
            title: data.title,
            image: data.image,
            category: data.category,
            duration: data.duration,
            price: data.price,
            oldPrice: data.old_price ?? data.oldPrice,
            instructor: data.instructor,
            summary: data.summary,
            topics: data.topics ?? [],
            level: data.level,
            rating: data.rating,
            ratingCount: data.rating_count ?? data.ratingCount,
            teacherRating: data.teacher_rating ?? data.teacherRating,
            teacherRatingCount:
              data.teacher_rating_count ?? data.teacherRatingCount,
            students: data.students,
            language: data.language,
            lessons: (data.lessons ?? []).map((lesson: any) => ({
              ...lesson,
              videoUrl: lesson.video_url ?? lesson.videoUrl,
              position: lesson.position,
              isFree: lesson.is_free ?? lesson.isFree,
              locked: Boolean(lesson.locked),
            })),
            codeSamples: data.code_samples ?? data.codeSamples ?? [],
            freeLessons: data.free_lessons ?? data.freeLessons,
            isPurchased: data.is_purchased ?? data.isPurchased,
          };
          setCourse(normalized);
          return;
        }
        const fallback = coursesSeed.find((item) => item.id === courseId) ?? null;
        setCourse(fallback);
      })
      .catch(() => {
        const fallback = coursesSeed.find((item) => item.id === courseId) ?? null;
        setCourse(fallback);
      })
      .finally(() => setLoading(false));
  }, [courseId]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setCurrentUser(null);
      return;
    }
    fetch("http://127.0.0.1:8000/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.username) {
          setCurrentUser({
            id: data.id,
            username: data.username,
            roles: Array.isArray(data.roles) ? data.roles : [],
          });
        } else {
          setCurrentUser(null);
        }
      })
      .catch(() => setCurrentUser(null));
  }, [courseId]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (notifRef.current?.contains(target)) return;
      if (notifDrawerRef.current?.contains(target)) return;
      setNotifOpen(false);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  useEffect(() => {
    if (!course) {
      setActiveLesson(null);
      return;
    }
    const params = new URLSearchParams(location.search);
    const lessonIdParam = params.get("lesson");
    const lessons = course.lessons ?? [];
    if (lessonIdParam) {
      const match = lessons.find(
        (lesson) => String(lesson.id) === String(lessonIdParam)
      );
      if (match) {
        setActiveLesson(match);
        return;
      }
    }
    const available = lessons.find((lesson) => lesson.videoUrl && !lesson.locked);
    const firstFree = lessons.find((lesson) => lesson.isFree && !lesson.locked);
    setActiveLesson(available ?? firstFree ?? lessons[0] ?? null);
  }, [course, location.search]);

  useEffect(() => {
    if (!activeLesson || !course) {
      setLessonDetail(null);
      setChatMessages([]);
      return;
    }

    if (!activeLesson.id) {
      const fallback = buildFallbackLessonDetail(activeLesson, course);
      setLessonDetail(fallback);
      setChatMessages([]);
      setSlideIndex(0);
      return;
    }

    let cancelled = false;
    setLessonLoading(true);
    const token = localStorage.getItem("access_token");
    fetch(`http://127.0.0.1:8000/lessons/${activeLesson.id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setLessonDetail(null);
          setChatMessages([]);
          return;
        }
        const normalized = normalizeLessonDetail(data);
        setLessonDetail(normalized);
        setChatMessages((prev) => prev.filter((item) => item.pending));
        setSlideIndex(0);
      })
      .catch(() => {
        if (cancelled) return;
        setLessonDetail(null);
        setChatMessages([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLessonLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeLesson?.id, course?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chatMessages.length]);

  useEffect(() => {
    directChatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [directMessages.length, activeDirectChatId]);

  useEffect(() => {
    return () => {
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (pendingAttachment?.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(pendingAttachment.previewUrl);
      }
    };
  }, [pendingAttachment]);

  useEffect(() => {
    return () => {
      if (
        directMediaRecorderRef.current &&
        directMediaRecorderRef.current.state !== "inactive"
      ) {
        try {
          directMediaRecorderRef.current.stop();
        } catch {
          // noop
        }
      }
      directRecordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      directMediaRecorderRef.current = null;
      directRecordingChunksRef.current = [];
      directRecordingStartedAtRef.current = null;
      if (directPendingAttachment?.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(directPendingAttachment.previewUrl);
      }
    };
  }, [directPendingAttachment]);

  const currentVideoUrl = lessonDetail?.videoUrl ?? activeLesson?.videoUrl;
  const lessonLocked = lessonDetail?.locked ?? activeLesson?.locked ?? false;
  const slides = lessonDetail?.slides ?? [];
  const fallbackSlides =
    slides.length === 0 && course?.topics?.length
      ? course.topics.slice(0, 5).map((topic, idx) => ({
          id: idx + 1,
          title: topic,
          imageUrl: null,
          content: `Focus: ${topic}`,
          position: idx + 1,
        }))
      : slides;
  const resources = lessonDetail?.resources ?? [];
  const currentSlide = fallbackSlides[slideIndex];
  const isAuthed = Boolean(localStorage.getItem("access_token"));
  const isTeacher = Boolean(
    currentUser?.roles?.some((role) => role === "teacher" || role === "admin")
  );
  const groupChatActive =
    activeTab === "Messages" && messagePaneMode === "group";
  const directChatActive =
    activeTab === "Messages" && messagePaneMode === "direct";
  const chatLocked = lessonLocked && !isTeacher;
  const canManageMessages = isTeacher;
  const unreadCount = notifications.filter((item) => !item.isRead).length;
  const activeDirectThread =
    activeDirectChatId !== null
      ? directThreads.find((thread) => thread.id === activeDirectChatId) ?? null
      : null;
  const canUseActiveDirectThread = Boolean(
    activeDirectThread &&
      activeLesson?.id === activeDirectThread.lessonId &&
      (!currentUser?.id ||
        (isTeacher
          ? activeDirectThread.teacherId === currentUser.id
          : activeDirectThread.studentId === currentUser.id))
  );
  const resolvedDirectChatId = canUseActiveDirectThread
    ? activeDirectThread?.id ?? null
    : null;
  const directChatPeerName = isTeacher
    ? activeDirectThread?.studentUsername?.trim() ||
      (activeDirectThread?.studentId
        ? `Student ${activeDirectThread.studentId}`
        : "Student")
    : activeDirectThread?.teacherId
    ? `Admin ${activeDirectThread.teacherId}`
    : "Admin";
  const filteredNotifications = notifications.filter((item) => {
    if (!notifSearch.trim()) return true;
    const haystack = [
      item.courseTitle,
      item.lessonTitle,
      item.messageContent,
      item.senderUsername ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(notifSearch.trim().toLowerCase());
  });
  const tabLabel = (tab: (typeof tabs)[number]) => {
    if (tab === "Messages") return "Message";
    return tab;
  };

  const renderStars = (
    value: number,
    hoverValue: number | null,
    onHover: (value: number | null) => void,
    onSelect: (value: number) => void,
    disabled: boolean
  ) => (
    <div className="flex items-center gap-[6px]">
      {Array.from({ length: 5 }, (_, idx) => {
        const starValue = idx + 1;
        const active = (hoverValue ?? value) >= starValue;
        return (
          <button
            key={`star-${starValue}`}
            type="button"
            className={`grid h-[32px] w-[32px] place-items-center rounded-full border transition ${
              active
                ? "border-[#f6b54c] bg-[#fff3d9]"
                : "border-[#e4ecf6] bg-white"
            } ${disabled ? "cursor-not-allowed opacity-70" : "hover:-translate-y-[1px]"}`}
            onMouseEnter={() => onHover(starValue)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onSelect(starValue)}
            disabled={disabled}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill={active ? "#f6b54c" : "none"}
              stroke={active ? "#f6b54c" : "#c4cbd6"}
              strokeWidth="1.5"
            >
              <path d="M12 3.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5-4.7-4.6 6.5-.9L12 3.5z" />
            </svg>
          </button>
        );
      })}
    </div>
  );

  const renderAssignmentStars = (
    value: number,
    onSelect?: (value: number) => void,
    disabled?: boolean
  ) => (
    <div className="flex items-center gap-[6px]">
      {Array.from({ length: 5 }, (_, idx) => {
        const starValue = idx + 1;
        const active = value >= starValue;
        const canClick = Boolean(onSelect) && !disabled;
        return (
          <button
            key={`assignment-star-${starValue}`}
            type="button"
            className={`grid h-[26px] w-[26px] place-items-center rounded-full border transition ${
              active
                ? "border-[#f6b54c] bg-[#fff3d9]"
                : "border-[#e4ecf6] bg-white"
            } ${canClick ? "hover:-translate-y-[1px]" : "cursor-default"}`}
            onClick={() => onSelect?.(starValue)}
            disabled={!canClick}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill={active ? "#f6b54c" : "none"}
              stroke={active ? "#f6b54c" : "#c4cbd6"}
              strokeWidth="1.5"
            >
              <path d="M12 3.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5-4.7-4.6 6.5-.9L12 3.5z" />
            </svg>
          </button>
        );
      })}
    </div>
  );

  const courseAvg =
    courseRating.count > 0 ? courseRating.average : course?.rating ?? 0;
  const courseCount =
    courseRating.count > 0 ? courseRating.count : course?.ratingCount ?? 0;
  const teacherAvg =
    teacherRating.count > 0 ? teacherRating.average : course?.teacherRating ?? 0;
  const teacherCount =
    teacherRating.count > 0
      ? teacherRating.count
      : course?.teacherRatingCount ?? 0;

  const handlePurchase = async () => {
    if (!course) return;
    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/login");
      return;
    }
    setPurchaseLoading(true);
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/payments/checkout/${course.id}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const refreshed = await fetch(
          `http://127.0.0.1:8000/courses/${course.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await refreshed.json();
        if (data) {
          const normalized: Course = {
            id: data.id,
            title: data.title,
            image: data.image,
            category: data.category,
            duration: data.duration,
            price: data.price,
            oldPrice: data.old_price ?? data.oldPrice,
            instructor: data.instructor,
            summary: data.summary,
            topics: data.topics ?? [],
            level: data.level,
            rating: data.rating,
            ratingCount: data.rating_count ?? data.ratingCount,
            teacherRating: data.teacher_rating ?? data.teacherRating,
            teacherRatingCount:
              data.teacher_rating_count ?? data.teacherRatingCount,
            students: data.students,
            language: data.language,
            lessons: (data.lessons ?? []).map((lesson: any) => ({
              ...lesson,
              videoUrl: lesson.video_url ?? lesson.videoUrl,
              position: lesson.position,
              isFree: lesson.is_free ?? lesson.isFree,
              locked: Boolean(lesson.locked),
            })),
            codeSamples: data.code_samples ?? data.codeSamples ?? [],
            freeLessons: data.free_lessons ?? data.freeLessons,
            isPurchased: data.is_purchased ?? data.isPurchased,
          };
          setCourse(normalized);
        }
      }
    } finally {
      setPurchaseLoading(false);
    }
  };

  const ensureAuthToken = () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/login");
      return null;
    }
    return token;
  };

  const activateBackendChat = (message: string) => {
    setChatTransport("backend");
    setChatError(message);
  };

  const isFirebaseDnsError = (error: unknown) => {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    return (
      message.includes("err_name_not_resolved") ||
      message.includes("name not resolved") ||
      message.includes("failed to fetch") ||
      message.includes("network request failed") ||
      message.includes("dns")
    );
  };

  const disableFirebaseRealtime = (message: string) => {
    setFirebaseRealtimeEnabled(false);
    activateBackendChat(message);
  };

  const chatPath = (lessonId: number) => `lesson_chats/${lessonId}`;
  const typingPath = (lessonId: number) => `lesson_typing/${lessonId}`;
  const typingNodeKey = (sender: "user" | "teacher", userId?: number | null) =>
    `${sender}-${userId ?? "anon"}`;

  const ensureFirebaseUser = async () => {
    if (auth.currentUser) return auth.currentUser;
    const apiToken = localStorage.getItem("access_token");
    if (!apiToken) return null;

    if (!firebaseAuthPromiseRef.current) {
      firebaseAuthPromiseRef.current = (async () => {
        const res = await fetch("http://127.0.0.1:8000/auth/firebase/custom-token", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiToken}` },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || "Firebase custom token olinmadi");
        }
        const data = await res.json();
        const customToken = data.custom_token ?? data.customToken;
        if (!customToken) {
          throw new Error("Firebase custom token bo'sh");
        }
        await signInWithCustomToken(auth, customToken);
      })().finally(() => {
        firebaseAuthPromiseRef.current = null;
      });
    }

    await firebaseAuthPromiseRef.current;
    return auth.currentUser;
  };

  const sendBackendMessage = async (
    lessonId: number,
    content: string,
    sender: "user" | "teacher",
    token: string,
    attachment?: OutgoingAttachmentPayload | null
  ): Promise<LessonMessage | null> => {
    const primaryEndpoint =
      sender === "teacher"
        ? `http://127.0.0.1:8000/lessons/${lessonId}/teacher/messages`
        : `http://127.0.0.1:8000/lessons/${lessonId}/messages`;
    let res = await fetch(primaryEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        content,
        attachment_kind: attachment?.kind,
        attachment_url: attachment?.url,
        attachment_name: attachment?.fileName,
        attachment_mime: attachment?.mimeType,
        attachment_size: attachment?.sizeBytes,
        attachment_duration: attachment?.durationSeconds,
      }),
    });
    if (!res.ok && sender === "teacher" && res.status === 404) {
      res = await fetch(`http://127.0.0.1:8000/lessons/${lessonId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content,
          attachment_kind: attachment?.kind,
          attachment_url: attachment?.url,
          attachment_name: attachment?.fileName,
          attachment_mime: attachment?.mimeType,
          attachment_size: attachment?.sizeBytes,
          attachment_duration: attachment?.durationSeconds,
        }),
      });
    }
    if (!res.ok) return null;
    const data = await res.json();
    return normalizeLessonMessage(data);
  };

  const fetchBackendMessages = async (
    lessonId: number,
    options?: { force?: boolean }
  ): Promise<LessonMessage[] | null> => {
    const force = options?.force ?? false;
    const now = Date.now();
    if (
      !force &&
      backendFetchLessonRef.current === lessonId &&
      now - backendLastFetchAtRef.current < 4000
    ) {
      return null;
    }
    if (backendFetchPromiseRef.current && backendFetchLessonRef.current === lessonId) {
      return backendFetchPromiseRef.current;
    }

    backendFetchLessonRef.current = lessonId;
    const request = (async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) return [];
        const res = await fetch(`http://127.0.0.1:8000/lessons/${lessonId}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data.map(normalizeLessonMessage) : [];
      } catch {
        return [];
      }
    })();

    backendFetchPromiseRef.current = request;
    try {
      const result = await request;
      backendLastFetchAtRef.current = Date.now();
      return result;
    } finally {
      if (backendFetchPromiseRef.current === request) {
        backendFetchPromiseRef.current = null;
      }
    }
  };

  const applyIncomingMessages = (incoming: LessonMessage[]) => {
    setChatMessages((prev) => {
      const pending = prev.filter((item) => item.pending);
      const incomingTempIds = new Set(
        incoming
          .map((item) => item.clientTempId)
          .filter((item): item is number => typeof item === "number")
      );
      const pendingFiltered = pending.filter(
        (item) => !item.clientTempId || !incomingTempIds.has(item.clientTempId)
      );
      return pendingFiltered.length ? [...incoming, ...pendingFiltered] : incoming;
    });
  };

  const trySwitchToRealtime = async (lessonId: number): Promise<boolean> => {
    if (!firebaseRealtimeEnabled) return false;
    try {
      await ensureFirebaseUser();
      const snapshot = await get(
        query(dbRef(db, chatPath(lessonId)), orderByChild("createdAt"))
      );
      const incoming: LessonMessage[] = [];
      snapshot.forEach((child) => {
        if (!child.key) return;
        incoming.push(normalizeRealtimeMessage(child.key, child.val()));
      });
      applyIncomingMessages(incoming);
      setChatTransport("firebase");
      setChatError("");
      return true;
    } catch (error) {
      if (isFirebaseDnsError(error)) {
        disableFirebaseRealtime(
          "Firebase host topilmadi. Chat backend rejimida ishlaydi."
        );
      }
      return false;
    }
  };

  const pushFirebaseMessage = async (
    lessonId: number,
    content: string,
    sender: "user" | "teacher",
    clientTempId?: number,
    attachment?: OutgoingAttachmentPayload | null
  ) => {
    await ensureFirebaseUser();
    const payload = {
      id: Date.now(),
      userId: currentUser?.id ?? null,
      username: currentUser?.username ?? null,
      sender,
      content,
      attachment: attachment
        ? {
            kind: attachment.kind,
            url: attachment.url ?? null,
            fileName: attachment.fileName ?? null,
            mimeType: attachment.mimeType ?? null,
            sizeBytes: attachment.sizeBytes ?? null,
            durationSeconds: attachment.durationSeconds ?? null,
          }
        : null,
      createdAt: Date.now(),
      clientTempId: clientTempId ?? null,
    };
    try {
      await push(dbRef(db, chatPath(lessonId)), payload);
    } catch (error) {
      const message =
        error instanceof Error ? error.message.toLowerCase() : "";
      if (message.includes("permission_denied")) {
        activateBackendChat("Firebase write blocked. Backend chat mode yoqildi.");
      } else if (isFirebaseDnsError(error)) {
        disableFirebaseRealtime(
          "Firebase host topilmadi. Chat backend rejimiga o'tdi."
        );
      }
      throw error;
    }
  };

  const setTypingPresence = async (
    isTypingNow: boolean,
    options?: { force?: boolean }
  ) => {
    const force = options?.force ?? false;
    if (
      !activeLesson?.id ||
      !isAuthed ||
      chatLocked ||
      (!force && chatTransport !== "firebase")
    ) {
      return;
    }
    const sender: "user" | "teacher" = isTeacher ? "teacher" : "user";
    const nodeKey = typingNodeKey(sender, currentUser?.id ?? null);
    const now = Date.now();

    if (
      isTypingNow &&
      typingActiveRef.current &&
      now - typingLastSentAtRef.current < 1500
    ) {
      return;
    }

    try {
      await ensureFirebaseUser();
      const nodeRef = dbRef(
        db,
        `${typingPath(activeLesson.id)}/${nodeKey}`
      );
      if (isTypingNow) {
        typingActiveRef.current = true;
        typingLastSentAtRef.current = now;
        await update(nodeRef, {
          userId: currentUser?.id ?? null,
          username: currentUser?.username ?? null,
          sender,
          isTyping: true,
          updatedAt: now,
        });
      } else {
        if (!typingActiveRef.current) return;
        typingActiveRef.current = false;
        typingLastSentAtRef.current = now;
        await remove(nodeRef);
      }
    } catch {
      // typing failures should not block chat messages
    }
  };

  const handleChatInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setChatInput(value);

    if (!activeLesson?.id || chatLocked || !isAuthed || !groupChatActive) {
      return;
    }

    if (typingStopTimerRef.current !== null) {
      window.clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = null;
    }

    if (!value.trim()) {
      void setTypingPresence(false);
      return;
    }

    void setTypingPresence(true);
    typingStopTimerRef.current = window.setTimeout(() => {
      typingStopTimerRef.current = null;
      void setTypingPresence(false);
    }, 1500);
  };

  const clearPendingAttachment = () => {
    setPendingAttachment((prev) => {
      if (prev?.previewUrl && prev.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(prev.previewUrl);
      }
      return null;
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const openAttachmentPicker = (accept: string) => {
    if (!isAuthed || chatLocked) return;
    setPickerAccept(accept);
    fileInputRef.current?.click();
  };

  const handleFileSelected = (file?: File | null) => {
    if (!file) return;
    setChatError("");
    if (file.size > 30 * 1024 * 1024) {
      setChatError("Fayl hajmi 30MB dan oshmasligi kerak.");
      return;
    }
    const kind = detectAttachmentKindFromFile(file);
    const previewUrl =
      kind === "image" || kind === "video" || kind === "audio"
        ? URL.createObjectURL(file)
        : undefined;
    clearPendingAttachment();
    setPendingAttachment({
      kind,
      file,
      previewUrl,
      fileName: file.name,
      mimeType: file.type || undefined,
      sizeBytes: file.size,
    });
    setStickerOpen(false);
  };

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    handleFileSelected(event.target.files?.[0]);
  };

  const uploadPendingAttachment = async (
    lessonId: number,
    token: string,
    attachmentDraft: PendingAttachment
  ): Promise<OutgoingAttachmentPayload | null> => {
    if (attachmentDraft.kind === "sticker") {
      return {
        kind: "sticker",
        fileName: attachmentDraft.fileName ?? "Sticker",
      };
    }
    if (!attachmentDraft.file) {
      return null;
    }
    const formData = new FormData();
    formData.append("file", attachmentDraft.file);
    setChatUploading(true);
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/lessons/${lessonId}/messages/upload`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Fayl yuklanmadi");
      }
      const data = await res.json();
      return {
        kind:
          (data.kind as LessonMessageAttachment["kind"]) ?? attachmentDraft.kind,
        url: data.url ?? undefined,
        fileName: data.file_name ?? data.fileName ?? attachmentDraft.fileName,
        mimeType: data.mime_type ?? data.mimeType ?? attachmentDraft.mimeType,
        sizeBytes: data.size_bytes ?? data.sizeBytes ?? attachmentDraft.sizeBytes,
        durationSeconds:
          data.duration_seconds ??
          data.durationSeconds ??
          attachmentDraft.durationSeconds,
      };
    } finally {
      setChatUploading(false);
    }
  };

  const handleStickerSelect = (sticker: string) => {
    clearPendingAttachment();
    setPendingAttachment({
      kind: "sticker",
      fileName: sticker,
    });
    setChatInput(sticker);
    setStickerOpen(false);
  };

  const stopVoiceRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  };

  const startVoiceRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setChatError("Brauzer audio yozishni qo'llab-quvvatlamaydi.");
      return;
    }
    if (recording) return;
    try {
      setChatError("");
      clearPendingAttachment();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordingStreamRef.current = stream;
      recordingChunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const chunks = recordingChunksRef.current;
        recordingChunksRef.current = [];
        recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
        mediaRecorderRef.current = null;
        setRecording(false);
        if (!chunks.length) return;
        const blob = new Blob(chunks, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, {
          type: "audio/webm",
        });
        const previewUrl = URL.createObjectURL(file);
        setPendingAttachment({
          kind: "audio",
          file,
          previewUrl,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        });
      };
      recorder.start();
      setRecording(true);
    } catch {
      setRecording(false);
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
      mediaRecorderRef.current = null;
      setChatError("Mikrofon uchun ruxsat berilmadi.");
    }
  };

  const fetchCourseRating = async () => {
    if (!courseId) return;
    const token = localStorage.getItem("access_token");
    const res = await fetch(`http://127.0.0.1:8000/courses/${courseId}/ratings`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) return;
    const data = await res.json();
    setCourseRating({
      average: Number(data.average ?? 0),
      count: Number(data.count ?? 0),
      myRating: data.my_rating ?? null,
    });
  };

  const fetchTeacherRating = async (teacherName: string) => {
    if (!teacherName) return;
    const token = localStorage.getItem("access_token");
    const res = await fetch(
      `http://127.0.0.1:8000/teachers/${encodeURIComponent(teacherName)}/ratings`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }
    );
    if (!res.ok) return;
    const data = await res.json();
    setTeacherRating({
      average: Number(data.average ?? 0),
      count: Number(data.count ?? 0),
      myRating: data.my_rating ?? null,
    });
  };

  const handleSetCourseRating = async (value: number) => {
    if (!courseId) return;
    const token = ensureAuthToken();
    if (!token) return;
    setRatingError("");
    setRatingBusy(true);
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/courses/${courseId}/ratings`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ rating: value }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Rating xatosi");
      }
      const data = await res.json();
      setCourseRating({
        average: Number(data.average ?? 0),
        count: Number(data.count ?? 0),
        myRating: data.my_rating ?? value,
      });
    } catch (err) {
      setRatingError(
        err instanceof Error ? err.message : "Baholashda xatolik"
      );
    } finally {
      setRatingBusy(false);
    }
  };

  const handleSetTeacherRating = async (value: number) => {
    if (!course?.instructor) return;
    const token = ensureAuthToken();
    if (!token) return;
    setRatingError("");
    setRatingBusy(true);
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/teachers/${encodeURIComponent(course.instructor)}/ratings`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ rating: value }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Rating xatosi");
      }
      const data = await res.json();
      setTeacherRating({
        average: Number(data.average ?? 0),
        count: Number(data.count ?? 0),
        myRating: data.my_rating ?? value,
      });
    } catch (err) {
      setRatingError(
        err instanceof Error ? err.message : "Baholashda xatolik"
      );
    } finally {
      setRatingBusy(false);
    }
  };

  useEffect(() => {
    fetchCourseRating().catch(() => {});
  }, [courseId]);

  useEffect(() => {
    if (!course?.instructor) return;
    fetchTeacherRating(course.instructor).catch(() => {});
  }, [course?.instructor]);

  useEffect(() => {
    if (!activeLesson?.id) {
      setAssignments([]);
      setAssignmentSubmissions({});
      setSubmissionsOpen({});
      setAssignmentError("");
      return;
    }
    if (lessonLocked && !isTeacher) {
      setAssignments([]);
      setAssignmentError("");
      return;
    }
    let cancelled = false;
    const loadAssignments = async (silent: boolean) => {
      if (!silent) {
        setAssignmentLoading(true);
        setAssignmentError("");
      }
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch(
          `http://127.0.0.1:8000/lessons/${activeLesson.id}/assignments`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }
        );
        if (!res.ok) {
          throw new Error("Vazifalar yuklanmadi");
        }
        const data = await res.json();
        if (cancelled) return;
        const items = Array.isArray(data)
          ? data.map(normalizeLessonAssignment)
          : [];
        setAssignments(items);
        setSubmissionDrafts((prev) => {
          const next = { ...prev };
          items.forEach((item) => {
            if (next[item.id] === undefined) {
              next[item.id] = createAssignmentSubmissionDraftFromContent(
                item.submission?.content
              );
            }
          });
          return next;
        });
      } catch (err) {
        if (cancelled) return;
        if (!silent) {
          setAssignments([]);
          setAssignmentError(
            err instanceof Error ? err.message : "Vazifalar yuklanmadi"
          );
        }
      } finally {
        if (cancelled || silent) return;
        setAssignmentLoading(false);
      }
    };

    loadAssignments(false).catch(() => {});

    let timerId: number | null = null;
    if (activeTab === "Assignments" && assignmentRealtimeStatus !== "live") {
      timerId = window.setInterval(() => {
        if (document.visibilityState !== "visible") return;
        loadAssignments(true).catch(() => {});
      }, 5000);
    }

    return () => {
      cancelled = true;
      if (timerId) {
        window.clearInterval(timerId);
      }
    };
  }, [
    activeLesson?.id,
    lessonLocked,
    isTeacher,
    activeTab,
    assignmentRealtimeStatus,
    assignmentRealtimeTick,
  ]);

  useEffect(() => {
    const clearAssignmentReconnect = () => {
      if (assignmentSocketReconnectRef.current) {
        window.clearTimeout(assignmentSocketReconnectRef.current);
        assignmentSocketReconnectRef.current = null;
      }
    };
    const clearAssignmentPing = () => {
      if (assignmentSocketPingRef.current) {
        window.clearInterval(assignmentSocketPingRef.current);
        assignmentSocketPingRef.current = null;
      }
    };
    const closeAssignmentSocket = () => {
      const socket = assignmentSocketRef.current;
      if (!socket) return;
      socket.onopen = null;
      socket.onmessage = null;
      socket.onclose = null;
      socket.onerror = null;
      try {
        socket.close();
      } catch {}
      assignmentSocketRef.current = null;
    };

    if (!activeLesson?.id || activeTab !== "Assignments") {
      clearAssignmentReconnect();
      clearAssignmentPing();
      closeAssignmentSocket();
      setAssignmentRealtimeStatus("offline");
      return;
    }

    if (lessonLocked && !isTeacher) {
      clearAssignmentReconnect();
      clearAssignmentPing();
      closeAssignmentSocket();
      setAssignmentRealtimeStatus("offline");
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
      clearAssignmentReconnect();
      clearAssignmentPing();
      closeAssignmentSocket();
      setAssignmentRealtimeStatus("offline");
      return;
    }

    let disposed = false;

    const connect = () => {
      if (disposed || !activeLesson?.id) return;
      clearAssignmentReconnect();
      clearAssignmentPing();
      closeAssignmentSocket();
      setAssignmentRealtimeStatus("connecting");

      const socket = new WebSocket(
        `ws://127.0.0.1:8000/ws/lessons/${activeLesson.id}/assignments?token=${encodeURIComponent(
          token
        )}`
      );
      assignmentSocketRef.current = socket;

      socket.onopen = () => {
        if (disposed) return;
        assignmentSocketRetryRef.current = 0;
        setAssignmentRealtimeStatus("live");
        clearAssignmentPing();
        assignmentSocketPingRef.current = window.setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send("ping");
          }
        }, 15000);
      };

      socket.onmessage = (event) => {
        if (disposed) return;
        try {
          const payload = JSON.parse(event.data);
          if (payload?.event && payload.event !== "connected" && payload.event !== "pong") {
            setAssignmentRealtimeTick((prev) => prev + 1);
          }
        } catch {
          setAssignmentRealtimeTick((prev) => prev + 1);
        }
      };

      socket.onclose = (event) => {
        clearAssignmentPing();
        if (disposed) return;
        setAssignmentRealtimeStatus("offline");
        if ([4401, 4403, 4404].includes(event.code)) {
          return;
        }
        const nextRetry = Math.min(assignmentSocketRetryRef.current + 1, 5);
        assignmentSocketRetryRef.current = nextRetry;
        const delay = Math.min(1000 * 2 ** nextRetry, 10000);
        assignmentSocketReconnectRef.current = window.setTimeout(() => {
          connect();
        }, delay);
      };

      socket.onerror = () => {
        if (disposed) return;
        setAssignmentRealtimeStatus("offline");
      };
    };

    connect();

    return () => {
      disposed = true;
      clearAssignmentReconnect();
      clearAssignmentPing();
      closeAssignmentSocket();
      setAssignmentRealtimeStatus("offline");
    };
  }, [activeLesson?.id, activeTab, lessonLocked, isTeacher, isAuthed]);

  useEffect(() => {
    if (!isTeacher) {
      setAssignmentBuilderOpen(false);
      return;
    }
    setTeacherAssignmentDrafts([createAssignmentDraft(Date.now())]);
    setAssignmentCreateError("");
    setAssignmentBuilderOpen(false);
  }, [activeLesson?.id, isTeacher]);

  useEffect(() => {
    setAssignmentListFilter("all");
  }, [activeLesson?.id, isTeacher]);

  useEffect(() => {
    setGradeDrafts({});
  }, [activeLesson?.id, isTeacher]);

  useEffect(() => {
    setAssignmentSubmitModalId(null);
    setAssignmentSubmitUploading(false);
  }, [activeLesson?.id, isTeacher]);

  const updateSubmissionDraftField = (
    assignmentId: number,
    field: keyof AssignmentSubmissionDraft,
    value: string
  ) => {
    setSubmissionDrafts((prev) => ({
      ...prev,
      [assignmentId]: {
        ...(prev[assignmentId] ?? createEmptyAssignmentSubmissionDraft()),
        [field]: value,
      },
    }));
  };

  const renderAssignmentSubmissionBody = (
    rawContent: string,
    variant: "student" | "teacher" = "student"
  ) => {
    const parsed = parseAssignmentSubmissionContent(rawContent);
    const hasText = Boolean(parsed.text.trim());
    const hasCode = Boolean(parsed.code.trim());
    const safeImageUrl = isHttpUrl(parsed.imageUrl) ? parsed.imageUrl.trim() : "";
    const safeResourceUrl = isHttpUrl(parsed.resourceUrl)
      ? parsed.resourceUrl.trim()
      : "";
    const hasMedia = Boolean(safeImageUrl);
    const hasResource = Boolean(safeResourceUrl);
    const baseTextColor = variant === "teacher" ? "text-[#55627f]" : "text-[#2d3f66]";
    const cardTone =
      variant === "teacher"
        ? "border-[#e5ecf8] bg-[#f9fbff]"
        : "border-[#deebf8] bg-white";

    return (
      <div className="space-y-[8px]">
        {hasText && (
          <div className={`whitespace-pre-wrap text-[12px] ${baseTextColor}`}>
            {parsed.text}
          </div>
        )}
        {hasResource && (
          <a
            href={safeResourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex max-w-full items-center gap-[7px] rounded-[10px] border border-[#d6e3f8] bg-[#eef4ff] px-[10px] py-[6px] text-[11px] font-semibold text-[#315fcb] transition hover:border-[#9eb8e8]"
          >
            <span>Link:</span>
            <span className="truncate">{safeResourceUrl}</span>
          </a>
        )}
        {hasMedia && (
          <div className="space-y-[6px]">
            <a
              href={safeImageUrl}
              target="_blank"
              rel="noreferrer"
              className={`group block w-full max-w-[340px] overflow-hidden rounded-[12px] border ${cardTone} bg-[#f4f8ff]`}
            >
              <img
                src={safeImageUrl}
                alt="Topshirilgan rasm"
                className="h-[170px] w-full object-contain p-[6px] transition duration-200 group-hover:scale-[1.02]"
                loading="lazy"
              />
            </a>
            <a
              href={safeImageUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-full border border-[#d6e3f8] bg-white px-[10px] py-[4px] text-[10px] font-semibold text-[#3f63b7] transition hover:border-[#9fb8e8]"
            >
              Rasmni ochish
            </a>
          </div>
        )}
        {hasCode && (
          <pre className="max-h-[220px] overflow-auto rounded-[12px] border border-[#22314d] bg-[#111a2b] p-[10px] text-[11px] text-[#d9e7ff]">
            {parsed.code}
          </pre>
        )}
        {!hasText && !hasResource && !hasMedia && !hasCode && (
          <div className="text-[12px] text-[#7b7f9a]">Javob matni yo'q.</div>
        )}
      </div>
    );
  };

  const openAssignmentSubmitModal = (assignmentId: number) => {
    if (!isAuthed) {
      navigate("/login");
      return;
    }
    setAssignmentError("");
    setAssignmentSubmitModalId(assignmentId);
  };

  const closeAssignmentSubmitModal = () => {
    if (submissionBusyId || assignmentSubmitUploading) return;
    setAssignmentSubmitModalId(null);
  };

  const triggerAssignmentImagePicker = () => {
    if (!assignmentSubmitModalId) return;
    assignmentFileInputRef.current?.click();
  };

  const uploadAssignmentImageFile = async (assignmentId: number, file: File) => {
    const token = ensureAuthToken();
    if (!token) return;
    setAssignmentSubmitUploading(true);
    setAssignmentError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(
        `http://127.0.0.1:8000/assignments/${assignmentId}/upload-image`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Rasm yuklanmadi");
      }
      const data = await res.json();
      const uploadedUrl = normalizeUploadedFileUrl(data.url);
      if (!uploadedUrl) {
        throw new Error("Rasm URL topilmadi");
      }
      updateSubmissionDraftField(assignmentId, "imageUrl", uploadedUrl);
    } catch (err) {
      setAssignmentError(
        err instanceof Error ? err.message : "Rasm yuklanmadi"
      );
    } finally {
      setAssignmentSubmitUploading(false);
    }
  };

  const handleAssignmentImageInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !assignmentSubmitModalId) return;
    uploadAssignmentImageFile(assignmentSubmitModalId, file).catch(() => {});
    event.target.value = "";
  };

  const handleSendMessage = async () => {
    if (!activeLesson?.id) return;
    const typedText = chatInput.trim();
    const attachmentDraft = pendingAttachment;
    const messageText =
      attachmentDraft?.kind === "sticker"
        ? attachmentDraft.fileName ?? "🎉"
        : typedText;
    if (!messageText && !attachmentDraft) return;
    if (!isAuthed) {
      navigate("/login");
      return;
    }
    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/login");
      return;
    }
    const restoreDraft = () => {
      if (!attachmentDraft) return;
      const previewUrl =
        attachmentDraft.previewUrl ??
        ((attachmentDraft.kind === "image" ||
          attachmentDraft.kind === "video" ||
          attachmentDraft.kind === "audio") &&
        attachmentDraft.file
          ? URL.createObjectURL(attachmentDraft.file)
          : undefined);
      setPendingAttachment({
        ...attachmentDraft,
        previewUrl,
      });
    };
    let outgoingAttachment: OutgoingAttachmentPayload | null = null;
    if (attachmentDraft) {
      try {
        outgoingAttachment = await uploadPendingAttachment(
          activeLesson.id,
          token,
          attachmentDraft
        );
      } catch (err) {
        setChatError(
          err instanceof Error ? err.message : "Fayl yuklashda xatolik"
        );
        return;
      }
    }
    const tempId = -Date.now();
    const tempMessage: LessonMessage = {
      id: tempId,
      key: undefined,
      userId: currentUser?.id ?? null,
      username: currentUser?.username ?? null,
      sender: isTeacher ? "teacher" : "user",
      content: messageText,
      attachment: attachmentDraft
        ? {
            kind: attachmentDraft.kind,
            url: outgoingAttachment?.url ?? attachmentDraft.previewUrl ?? null,
            fileName:
              outgoingAttachment?.fileName ?? attachmentDraft.fileName ?? null,
            mimeType:
              outgoingAttachment?.mimeType ?? attachmentDraft.mimeType ?? null,
            sizeBytes:
              outgoingAttachment?.sizeBytes ?? attachmentDraft.sizeBytes ?? null,
            durationSeconds:
              outgoingAttachment?.durationSeconds ??
              attachmentDraft.durationSeconds ??
              null,
          }
        : undefined,
      createdAt: new Date().toISOString(),
      clientTempId: tempId,
      pending: true,
    };
    setChatMessages((prev) => [...prev, tempMessage]);
    setChatInput("");
    if (typingStopTimerRef.current !== null) {
      window.clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = null;
    }
    void setTypingPresence(false);
    clearPendingAttachment();
    setStickerOpen(false);
    setChatSending(true);
    let firebaseSent = false;
    try {
      await pushFirebaseMessage(
        activeLesson.id,
        messageText,
        isTeacher ? "teacher" : "user",
        tempId,
        outgoingAttachment
      );
      firebaseSent = true;
      if (chatTransport !== "firebase") {
        setChatTransport("firebase");
      }
      setChatError("");
    } catch {
      // fallback handled below
    }

    if (token) {
      try {
        const saved = await sendBackendMessage(
          activeLesson.id,
          messageText,
          isTeacher ? "teacher" : "user",
          token,
          outgoingAttachment
        );
        if (saved && !firebaseSent) {
          setChatMessages((prev) =>
            prev.map((item) => (item.id === tempMessage.id ? saved : item))
          );
        } else if (!saved && !firebaseSent) {
          setChatMessages((prev) =>
            prev.filter((item) => item.id !== tempMessage.id)
          );
          setChatInput(messageText);
          restoreDraft();
        }
      } catch {
        if (!firebaseSent) {
          setChatMessages((prev) =>
            prev.filter((item) => item.id !== tempMessage.id)
          );
          setChatInput(messageText);
          restoreDraft();
        }
      }
    } else if (!firebaseSent) {
      setChatMessages((prev) =>
        prev.filter((item) => item.id !== tempMessage.id)
      );
      setChatInput(messageText);
      restoreDraft();
    }

    setChatSending(false);
  };

  const handleStartEdit = (message: LessonMessage) => {
    setEditingMessageId(messageNodeId(message));
    setEditingContent(message.content);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent("");
  };

  const handleSaveEdit = async (message: LessonMessage) => {
    if (!activeLesson?.id) return;
    const trimmed = editingContent.trim();
    if (!trimmed) return;
    const nodeId = messageNodeId(message);
    setMessageBusyId(nodeId);
    try {
      if (chatTransport === "firebase" && message.key) {
        await update(
          dbRef(db, `${chatPath(activeLesson.id)}/${message.key}`),
          {
            content: trimmed,
            editedAt: Date.now(),
          }
        );
      } else {
        const token = ensureAuthToken();
        if (!token) return;
        const res = await fetch(
          `http://127.0.0.1:8000/lessons/${activeLesson.id}/messages/${message.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ content: trimmed }),
          }
        );
        if (!res.ok) return;
        const data = await res.json();
        const updatedMessage = normalizeLessonMessage(data);
        setChatMessages((prev) =>
          prev.map((item) => (item.id === message.id ? updatedMessage : item))
        );
      }
      handleCancelEdit();
    } finally {
      setMessageBusyId(null);
    }
  };

  const handleDeleteMessage = async (message: LessonMessage) => {
    if (!activeLesson?.id) return;
    const nodeId = messageNodeId(message);
    setMessageBusyId(nodeId);
    try {
      if (chatTransport === "firebase" && message.key) {
        await remove(dbRef(db, `${chatPath(activeLesson.id)}/${message.key}`));
      } else {
        const token = ensureAuthToken();
        if (!token) return;
        const res = await fetch(
          `http://127.0.0.1:8000/lessons/${activeLesson.id}/messages/${message.id}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!res.ok) return;
        setChatMessages((prev) => prev.filter((item) => item.id !== message.id));
      }
    } finally {
      setMessageBusyId(null);
    }
  };

  const refreshChat = async () => {
    if (!activeLesson?.id) return;
    if (chatLocked) return;
    try {
      let incoming: LessonMessage[] = [];
      if (chatTransport === "firebase") {
        await ensureFirebaseUser();
        const snapshot = await get(
          query(
            dbRef(db, chatPath(activeLesson.id)),
            orderByChild("createdAt")
          )
        );
        snapshot.forEach((child) => {
          if (!child.key) return;
          incoming.push(normalizeRealtimeMessage(child.key, child.val()));
        });
      } else {
        incoming =
          (await fetchBackendMessages(activeLesson.id, { force: true })) ?? [];
      }
      applyIncomingMessages(incoming);
    } catch (error) {
      const message =
        error instanceof Error ? error.message.toLowerCase() : "";
      if (chatTransport === "firebase" && message.includes("permission_denied")) {
        activateBackendChat("Firebase read blocked. Backend chat mode yoqildi.");
      } else if (chatTransport === "firebase" && isFirebaseDnsError(error)) {
        disableFirebaseRealtime(
          "Firebase host topilmadi. Backend chat avtomatik yoqildi."
        );
      }
    }
  };

  // polling handled below; keep refreshChat for manual triggers

  const fetchDirectMessages = async (chatId: number): Promise<DirectChatMessage[] | null> => {
    const token = localStorage.getItem("access_token");
    if (!token) return null;
    try {
      const res = await fetch(`http://127.0.0.1:8000/private-chats/${chatId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Direct chat xabarlari yuklanmadi");
      }
      const data = await res.json();
      const normalized = Array.isArray(data)
        ? data.map(normalizeDirectChatMessage)
        : [];
      setDirectMessages(
        normalized.sort((a, b) => {
          const left = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const right = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return left === right ? a.id - b.id : left - right;
        })
      );
      setDirectThreads((prev) =>
        prev.map((item) =>
          item.id === chatId ? { ...item, unreadCount: 0 } : item
        )
      );
      setDirectError("");
      return normalized;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Direct chat xabarlari yuklanmadi";
      setDirectError(errorMessage);
      const lowered = errorMessage.toLowerCase();
      if (lowered.includes("permission") || lowered.includes("forbidden")) {
        setActiveDirectChatId(null);
        if (isTeacher) {
          fetchTeacherDirectThreads().catch(() => {});
        } else {
          fetchStudentDirectThread(
            studentDirectTarget,
            studentRecipientId
          ).catch(() => {});
        }
      }
      return null;
    }
  };

  const upsertDirectMessage = (message: DirectChatMessage) => {
    setDirectMessages((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === message.id);
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = { ...next[existingIndex], ...message };
        return next;
      }
      return [...prev, message].sort((a, b) => {
        const left = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const right = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return left === right ? a.id - b.id : left - right;
      });
    });

    setDirectThreads((prev) =>
      prev.map((item) => {
        if (item.id !== message.chatId) return item;
        const isOwnMessage = !!currentUser?.id && message.senderId === currentUser.id;
        const isActiveThread = activeDirectChatId === item.id;
        const unreadCount =
          isOwnMessage || isActiveThread ? 0 : Math.max(0, item.unreadCount + 1);
        return {
          ...item,
          lastMessage: directMessagePreviewText(message),
          lastMessageAt: message.createdAt ?? new Date().toISOString(),
          unreadCount,
        };
      })
    );
  };

  const fetchTeacherDirectThreads = async () => {
    if (!activeLesson?.id) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    setDirectLoading(true);
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/lessons/${activeLesson.id}/private-chats`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Private chatlar yuklanmadi");
      }
      const data = await res.json();
      const normalized = Array.isArray(data)
        ? data.map(normalizeDirectChatThread)
        : [];
      setDirectThreads(normalized);
      setDirectError("");
      setActiveDirectChatId((prev) => {
        if (!normalized.length) return null;
        if (prev && normalized.some((item) => item.id === prev)) return prev;
        return normalized[0].id;
      });
    } catch (err) {
      setDirectThreads([]);
      setActiveDirectChatId(null);
      setDirectError(
        err instanceof Error ? err.message : "Private chatlar yuklanmadi"
      );
    } finally {
      setDirectLoading(false);
    }
  };

  const fetchStudentDirectThread = async (
    target: "admin" = "admin",
    recipientId?: number | null
  ) => {
    if (!activeLesson?.id) return null;
    const token = localStorage.getItem("access_token");
    if (!token) return null;
    setDirectLoading(true);
    try {
      const params = new URLSearchParams({ target });
      if (recipientId && recipientId > 0) {
        params.set("recipient_id", String(recipientId));
      }
      const query = params.toString();
      const res = await fetch(
        `http://127.0.0.1:8000/lessons/${activeLesson.id}/private-chat/me?${query}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Admin bilan chat ochilmadi");
      }
      const data = await res.json();
      const thread = normalizeDirectChatThread(data);
      setDirectThreads([thread]);
      setActiveDirectChatId(thread.id);
      if (!recipientId || recipientId <= 0) {
        setStudentRecipientId(thread.teacherId);
      }
      setDirectError("");
      return thread;
    } catch (err) {
      setDirectThreads([]);
      setActiveDirectChatId(null);
      setDirectError(
        err instanceof Error ? err.message : "Admin bilan chat ochilmadi"
      );
      return null;
    } finally {
      setDirectLoading(false);
    }
  };

  const openTeacherDirectThread = async (lessonId: number, studentId: number) => {
    const token = localStorage.getItem("access_token");
    if (!token || !isTeacher || !studentId) return null;
    setDirectLoading(true);
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/lessons/${lessonId}/private-chats/${studentId}/open`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Direct chatni ochib bo'lmadi");
      }
      const data = await res.json();
      const thread = normalizeDirectChatThread(data);
      upsertDirectThread(thread);
      setActiveDirectChatId(thread.id);
      setDirectError("");
      return thread;
    } catch (err) {
      setDirectError(
        err instanceof Error ? err.message : "Direct chatni ochib bo'lmadi"
      );
      return null;
    } finally {
      setDirectLoading(false);
    }
  };

  const clearDirectPendingAttachment = () => {
    setDirectPendingAttachment((prev) => {
      if (prev?.previewUrl && prev.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(prev.previewUrl);
      }
      return null;
    });
    if (directFileInputRef.current) {
      directFileInputRef.current.value = "";
    }
  };

  const openDirectAttachmentPicker = (accept: string) => {
    if (!isAuthed || chatLocked || !resolvedDirectChatId) return;
    setDirectStickerOpen(false);
    setDirectPickerAccept(accept);
    directFileInputRef.current?.click();
  };

  const handleDirectFileSelected = (file?: File | null) => {
    if (!file) return;
    setDirectError("");
    if (file.size > 30 * 1024 * 1024) {
      setDirectError("Fayl hajmi 30MB dan oshmasligi kerak.");
      return;
    }
    const kind = detectAttachmentKindFromFile(file);
    const previewUrl =
      kind === "image" || kind === "video" || kind === "audio"
        ? URL.createObjectURL(file)
        : undefined;
    clearDirectPendingAttachment();
    setDirectPendingAttachment({
      kind,
      file,
      previewUrl,
      fileName: file.name,
      mimeType: file.type || undefined,
      sizeBytes: file.size,
    });
    setDirectStickerOpen(false);
  };

  const handleDirectFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    handleDirectFileSelected(event.target.files?.[0]);
  };

  const handleDirectStickerSelect = (sticker: string) => {
    clearDirectPendingAttachment();
    setDirectPendingAttachment({
      kind: "sticker",
      fileName: sticker,
    });
    setDirectInput(sticker);
    setDirectStickerOpen(false);
  };

  const uploadDirectPendingAttachment = async (
    chatId: number,
    token: string,
    attachmentDraft: PendingAttachment
  ): Promise<OutgoingAttachmentPayload | null> => {
    if (attachmentDraft.kind === "sticker") {
      return {
        kind: "sticker",
        fileName: attachmentDraft.fileName ?? "Sticker",
      };
    }
    if (!attachmentDraft.file) return null;
    const formData = new FormData();
    formData.append("file", attachmentDraft.file);
    setDirectUploading(true);
    try {
      const uploadTargets: string[] = [];
      const lessonIdForUpload = activeLesson?.id ?? activeDirectThread?.lessonId;
      if (lessonIdForUpload) {
        // Avval lesson upload route ni sinaymiz: ko'p eski backendlarda shu mavjud.
        uploadTargets.push(
          `http://127.0.0.1:8000/lessons/${lessonIdForUpload}/messages/upload`
        );
      }
      uploadTargets.push(
        `http://127.0.0.1:8000/private-chats/${chatId}/messages/upload`
      );

      for (let idx = 0; idx < uploadTargets.length; idx += 1) {
        const res = await fetch(uploadTargets[idx], {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          const normalizedUrl = normalizeUploadedFileUrl(
            data.url ??
              data.attachment_url ??
              data.attachmentUrl ??
              data.attachment?.url ??
              data.file?.url ??
              data.file_url ??
              data.fileUrl ??
              data.path ??
              data.relative_path
          );
          return {
            kind:
              (data.kind as LessonMessageAttachment["kind"]) ??
              attachmentDraft.kind,
            url: normalizedUrl,
            fileName: data.file_name ?? data.fileName ?? attachmentDraft.fileName,
            mimeType: data.mime_type ?? data.mimeType ?? attachmentDraft.mimeType,
            sizeBytes:
              data.size_bytes ?? data.sizeBytes ?? attachmentDraft.sizeBytes,
            durationSeconds:
              data.duration_seconds ??
              data.durationSeconds ??
              attachmentDraft.durationSeconds,
          };
        }

        if (res.status === 404 && idx < uploadTargets.length - 1) {
          continue;
        }
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Fayl yuklanmadi");
      }

      throw new Error("Fayl yuklanmadi");
    } finally {
      setDirectUploading(false);
    }
  };

  const stopDirectVoiceRecording = () => {
    const recorder = directMediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.requestData();
      } catch {
        // ignore if recorder can't flush manually
      }
      recorder.stop();
    }
  };

  const startDirectVoiceRecording = async () => {
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setDirectError("Brauzer audio yozishni qo'llab-quvvatlamaydi.");
      return;
    }
    if (directRecording) return;
    try {
      setDirectError("");
      clearDirectPendingAttachment();
      setDirectStickerOpen(false);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const pickedMimeType = pickVoiceMimeType();
      const recorder = pickedMimeType
        ? new MediaRecorder(stream, { mimeType: pickedMimeType })
        : new MediaRecorder(stream);
      directRecordingStreamRef.current = stream;
      directRecordingChunksRef.current = [];
      directMediaRecorderRef.current = recorder;
      directRecordingStartedAtRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          directRecordingChunksRef.current.push(event.data);
        }
      };
      recorder.onerror = () => {
        setDirectError("Ovoz yozishda xatolik yuz berdi.");
      };
      recorder.onstop = () => {
        const chunks = directRecordingChunksRef.current;
        directRecordingChunksRef.current = [];
        directRecordingStreamRef.current?.getTracks().forEach((track) => track.stop());
        directRecordingStreamRef.current = null;
        directMediaRecorderRef.current = null;
        setDirectRecording(false);
        const startedAt = directRecordingStartedAtRef.current;
        directRecordingStartedAtRef.current = null;
        if (!chunks.length) {
          setDirectError("Ovozli xabar yozilmadi. Qayta urinib ko'ring.");
          return;
        }
        const mimeType =
          recorder.mimeType || chunks[0]?.type || pickedMimeType || "audio/webm";
        const blob = new Blob(chunks, { type: mimeType });
        if (!blob.size) {
          setDirectError("Ovozli xabar yozilmadi. Qayta urinib ko'ring.");
          return;
        }
        const extension = extensionFromMimeType(mimeType);
        const file = new File([blob], `direct-voice-${Date.now()}.${extension}`, {
          type: mimeType,
        });
        const previewUrl = URL.createObjectURL(file);
        const durationSeconds = startedAt
          ? Math.max(1, Math.round((Date.now() - startedAt) / 1000))
          : undefined;
        setDirectPendingAttachment({
          kind: "audio",
          file,
          previewUrl,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          durationSeconds,
        });
      };
      recorder.start(250);
      setDirectRecording(true);
    } catch (err) {
      setDirectRecording(false);
      directRecordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      directRecordingStreamRef.current = null;
      directMediaRecorderRef.current = null;
      directRecordingStartedAtRef.current = null;
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Mikrofon uchun ruxsat berilmadi.";
      setDirectError(message);
    }
  };

  const upsertDirectThread = (thread: DirectChatThread) => {
    setDirectThreads((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === thread.id);
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          ...thread,
        };
        return next.sort((a, b) => {
          const left = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const right = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return left === right ? b.id - a.id : right - left;
        });
      }
      const next = [...prev, thread];
      return next.sort((a, b) => {
        const left = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const right = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return left === right ? b.id - a.id : right - left;
      });
    });

    setActiveDirectChatId((prev) => {
      if (prev) return prev;
      return thread.id;
    });
  };

  const handleSendDirectMessage = async () => {
    const token = localStorage.getItem("access_token");
    const chatId = resolvedDirectChatId;
    const typedText = directInput.trim();
    const attachmentDraft = directPendingAttachment;
    if (!token || !chatId || (!typedText && !attachmentDraft)) return;
    setDirectSending(true);
    try {
      let outgoingAttachment: OutgoingAttachmentPayload | null = null;
      if (attachmentDraft) {
        try {
          outgoingAttachment = await uploadDirectPendingAttachment(
            chatId,
            token,
            attachmentDraft
          );
        } catch (err) {
          setDirectError(
            err instanceof Error ? err.message : "Fayl yuklashda xatolik"
          );
          return;
        }
      }
      const attachmentUrlForPayload =
        outgoingAttachment?.url ?? attachmentDraft?.previewUrl;
      const attachmentForContent =
        outgoingAttachment || attachmentDraft
          ? {
              kind:
                outgoingAttachment?.kind ??
                attachmentDraft?.kind ??
                ("file" as LessonMessageAttachment["kind"]),
              url: attachmentUrlForPayload,
              fileName:
                outgoingAttachment?.fileName ?? attachmentDraft?.fileName,
              mimeType:
                outgoingAttachment?.mimeType ?? attachmentDraft?.mimeType,
              sizeBytes:
                outgoingAttachment?.sizeBytes ?? attachmentDraft?.sizeBytes,
              durationSeconds:
                outgoingAttachment?.durationSeconds ??
                attachmentDraft?.durationSeconds,
            }
          : null;
      const content = attachmentForContent
        ? encodeDirectMessageContent(typedText, attachmentForContent)
        : typedText;
      const shouldSendAttachment = Boolean(
        attachmentForContent &&
          (attachmentForContent.kind === "sticker" || attachmentForContent.url)
      );
      const res = await fetch(`http://127.0.0.1:8000/private-chats/${chatId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content,
          attachment_kind: shouldSendAttachment
            ? attachmentForContent?.kind
            : undefined,
          attachment_url:
            shouldSendAttachment && attachmentForContent?.kind !== "sticker"
              ? attachmentForContent?.url
              : undefined,
          attachment_name: shouldSendAttachment
            ? attachmentForContent?.fileName
            : undefined,
          attachment_mime: shouldSendAttachment
            ? attachmentForContent?.mimeType
            : undefined,
          attachment_size: shouldSendAttachment
            ? attachmentForContent?.sizeBytes
            : undefined,
          attachment_duration:
            shouldSendAttachment && attachmentForContent?.kind === "audio"
              ? attachmentForContent?.durationSeconds
              : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Xabar yuborilmadi");
      }
      const data = await res.json();
      const normalized = normalizeDirectChatMessage(data);
      upsertDirectMessage(normalized);
      setDirectInput("");
      clearDirectPendingAttachment();
      setDirectStickerOpen(false);
      setDirectError("");
    } catch (err) {
      setDirectError(err instanceof Error ? err.message : "Xabar yuborilmadi");
    } finally {
      setDirectSending(false);
    }
  };

  const handleClearDirectMessages = async () => {
    const token = localStorage.getItem("access_token");
    const chatId = resolvedDirectChatId;
    if (!token || !chatId) return;
    const confirmed = window.confirm(
      "Shu dialogdagi barcha xabarlarni tozalashni xohlaysizmi?"
    );
    if (!confirmed) return;
    setDirectSending(true);
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/private-chats/${chatId}/messages`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (res.status === 404) {
        // Backward compatibility: eski backendda clear endpoint bo'lmasa ham lokal chatni tozalab qo'yamiz.
        setDirectMessages([]);
        setDirectThreads((prev) =>
          prev.map((item) =>
            item.id === chatId
              ? {
                  ...item,
                  lastMessage: null,
                  lastMessageAt: null,
                  unreadCount: 0,
                }
              : item
          )
        );
        setDirectError("");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Chatni tozalab bo'lmadi");
      }
      setDirectMessages([]);
      setDirectThreads((prev) =>
        prev.map((item) =>
          item.id === chatId
            ? {
                ...item,
                lastMessage: null,
                lastMessageAt: null,
                unreadCount: 0,
              }
            : item
        )
      );
      setDirectError("");
    } catch (err) {
      setDirectError(err instanceof Error ? err.message : "Chatni tozalab bo'lmadi");
    } finally {
      setDirectSending(false);
    }
  };

  const addTeacherAssignmentRow = () => {
    setTeacherAssignmentDrafts((prev) => [
      ...prev,
      createAssignmentDraft(Date.now() + prev.length),
    ]);
  };

  const removeTeacherAssignmentRow = (rowId: number) => {
    setTeacherAssignmentDrafts((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((row) => row.id !== rowId);
    });
  };

  const updateTeacherAssignmentRow = (
    rowId: number,
    key: "title" | "description" | "maxRating",
    value: string | number
  ) => {
    setTeacherAssignmentDrafts((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              [key]:
                key === "maxRating"
                  ? Math.max(1, Math.min(5, Number(value) || 5))
                  : String(value),
            }
          : row
      )
    );
  };

  const handleCreateAssignments = async () => {
    if (!activeLesson?.id) return;
    const token = ensureAuthToken();
    if (!token) return;

    const payloadItems = teacherAssignmentDrafts
      .map((row) => ({
        title: row.title.trim(),
        description: row.description.trim(),
        max_rating: row.maxRating,
      }))
      .filter((row) => row.title.length > 0);

    if (payloadItems.length === 0) {
      setAssignmentCreateError("Kamida bitta vazifa nomini kiriting.");
      return;
    }

    setAssignmentCreateBusy(true);
    setAssignmentCreateError("");
    setAssignmentError("");
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/lessons/${activeLesson.id}/assignments/bulk`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ assignments: payloadItems }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Vazifalar yaratilmadi");
      }
      const data = await res.json();
      const createdItems = Array.isArray(data)
        ? data.map(normalizeLessonAssignment)
        : [];
      if (!createdItems.length) {
        throw new Error("Vazifalar yaratilmadi");
      }

      setAssignments((prev) => [...prev, ...createdItems]);
      setSubmissionDrafts((prev) => {
        const next = { ...prev };
        createdItems.forEach((item) => {
          if (next[item.id] === undefined) {
            next[item.id] = createEmptyAssignmentSubmissionDraft();
          }
        });
        return next;
      });
      setTeacherAssignmentDrafts([createAssignmentDraft(Date.now())]);
      setAssignmentBuilderOpen(false);
    } catch (err) {
      setAssignmentCreateError(
        err instanceof Error ? err.message : "Vazifalar yaratilmadi"
      );
    } finally {
      setAssignmentCreateBusy(false);
    }
  };

  const handleSubmitAssignment = async (assignmentId: number) => {
    const draft =
      submissionDrafts[assignmentId] ?? createEmptyAssignmentSubmissionDraft();
    const safeImageUrl = draft.imageUrl.trim();
    const safeResourceUrl = draft.resourceUrl.trim();
    if (safeImageUrl && !isHttpUrl(safeImageUrl)) {
      setAssignmentError("Rasm URL `http://` yoki `https://` bilan boshlansin.");
      return;
    }
    if (safeResourceUrl && !isHttpUrl(safeResourceUrl)) {
      setAssignmentError("URL `http://` yoki `https://` bilan boshlansin.");
      return;
    }
    const content = encodeAssignmentSubmissionContent({
      ...draft,
      imageUrl: safeImageUrl,
      resourceUrl: safeResourceUrl,
    });
    if (!content) return;
    const token = ensureAuthToken();
    if (!token) return;
    setSubmissionBusyId(assignmentId);
    setAssignmentError("");
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/assignments/${assignmentId}/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Vazifa yuborilmadi");
      }
      const data = await res.json();
      const submission = normalizeAssignmentSubmission(data);
      setAssignments((prev) =>
        prev.map((item) =>
          item.id === assignmentId ? { ...item, submission } : item
        )
      );
      setSubmissionDrafts((prev) => ({
        ...prev,
        [assignmentId]: createAssignmentSubmissionDraftFromContent(
          submission.content
        ),
      }));
      setAssignmentSubmitModalId((prev) =>
        prev === assignmentId ? null : prev
      );
    } catch (err) {
      setAssignmentError(
        err instanceof Error ? err.message : "Vazifa yuborilmadi"
      );
    } finally {
      setSubmissionBusyId(null);
    }
  };

  const loadAssignmentSubmissions = async (
    assignmentId: number,
    options?: { silent?: boolean }
  ) => {
    const silent = Boolean(options?.silent);
    const token = ensureAuthToken();
    if (!token) return;
    if (!silent) {
      setSubmissionBusyId(assignmentId);
      setAssignmentError("");
    }
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/assignments/${assignmentId}/submissions`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Vazifalar yuklanmadi");
      }
      const data = await res.json();
      const items = Array.isArray(data)
        ? data.map(normalizeAssignmentSubmission)
        : [];
      setAssignmentSubmissions((prev) => ({ ...prev, [assignmentId]: items }));
      setAssignments((prev) =>
        prev.map((assignment) =>
          assignment.id === assignmentId
            ? {
                ...assignment,
                submissionCount: items.length,
                gradedCount: items.filter((item) => item.rating).length,
              }
            : assignment
        )
      );
    } catch (err) {
      if (!silent) {
        setAssignmentError(
          err instanceof Error ? err.message : "Vazifalar yuklanmadi"
        );
      }
    } finally {
      if (!silent) {
        setSubmissionBusyId(null);
      }
    }
  };

  const toggleAssignmentSubmissions = (assignmentId: number) => {
    setSubmissionsOpen((prev) => {
      const next = !prev[assignmentId];
      return { ...prev, [assignmentId]: next };
    });
    if (!assignmentSubmissions[assignmentId]) {
      loadAssignmentSubmissions(assignmentId).catch(() => {});
    }
  };

  useEffect(() => {
    if (!isTeacher || activeTab !== "Assignments") return;
    const openedAssignmentIds = Object.entries(submissionsOpen)
      .filter(([, isOpen]) => Boolean(isOpen))
      .map(([id]) => Number(id))
      .filter((id) => Number.isFinite(id));
    if (!openedAssignmentIds.length) return;

    openedAssignmentIds.forEach((assignmentId) => {
      loadAssignmentSubmissions(assignmentId, { silent: true }).catch(() => {});
    });

    if (assignmentRealtimeStatus === "live") return;

    const timerId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      openedAssignmentIds.forEach((assignmentId) => {
        loadAssignmentSubmissions(assignmentId, { silent: true }).catch(() => {});
      });
    }, 5000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [
    isTeacher,
    activeTab,
    submissionsOpen,
    activeLesson?.id,
    assignmentRealtimeStatus,
    assignmentRealtimeTick,
  ]);

  const handleGradeSubmission = async (
    assignmentId: number,
    submissionId: number,
    rating: number
  ) => {
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      setAssignmentError("Avval 1 dan 5 gacha baho tanlang");
      return;
    }
    const alreadyGraded = (assignmentSubmissions[assignmentId] ?? []).find(
      (item) => item.id === submissionId && typeof item.rating === "number"
    );
    if (alreadyGraded) {
      setAssignmentError("Bu topshiriq allaqachon baholangan");
      return;
    }
    const token = ensureAuthToken();
    if (!token) return;
    setGradingBusyId(submissionId);
    setAssignmentError("");
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/submissions/${submissionId}/grade`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ rating }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Baholashda xatolik");
      }
      const data = await res.json();
      const updated = normalizeAssignmentSubmission(data);
      const current = assignmentSubmissions[assignmentId] ?? [];
      const nextList = current.map((item) =>
        item.id === submissionId ? updated : item
      );
      setGradeDrafts((prev) => {
        const next = { ...prev };
        delete next[submissionId];
        return next;
      });
      setAssignmentSubmissions((prev) => ({
        ...prev,
        [assignmentId]: nextList,
      }));
      setAssignments((prev) =>
        prev.map((assignment) =>
          assignment.id === assignmentId
            ? {
                ...assignment,
                submissionCount: nextList.length,
                gradedCount: nextList.filter((item) => item.rating).length,
              }
            : assignment
        )
      );
    } catch (err) {
      setAssignmentError(
        err instanceof Error ? err.message : "Baholashda xatolik"
      );
    } finally {
      setGradingBusyId(null);
    }
  };

  const fetchNotifications = async () => {
    const token = localStorage.getItem("access_token");
    if (!token || !isTeacher) return;
    try {
      const res = await fetch("http://127.0.0.1:8000/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const normalized = Array.isArray(data)
        ? data.map((item: any) => ({
            id: item.id,
            senderId: item.sender_id ?? null,
            senderUsername: item.sender_username ?? null,
            courseId: item.course_id,
            courseTitle: item.course_title ?? "Course",
            lessonId: item.lesson_id,
            lessonTitle: item.lesson_title ?? "Lesson",
            messageContent: item.message_content ?? "",
            createdAt: item.created_at ?? null,
            isRead: Boolean(item.is_read),
          }))
        : [];
      setNotifications(normalized);
    } catch {
      // ignore
    }
  };

  const markNotificationRead = async (id: number) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/notifications/${id}/read`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) return;
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isRead: true } : item))
      );
    } catch {
      // ignore
    }
  };

  const markAllRead = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    try {
      const res = await fetch("http://127.0.0.1:8000/notifications/read-all", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    } catch {
      // ignore
    }
  };

  const handleNotificationClick = (note: (typeof notifications)[number]) => {
    markNotificationRead(note.id);
    setNotifOpen(false);
    const canOpenDirect =
      isTeacher &&
      !!note.senderId &&
      (!!currentUser?.id ? note.senderId !== currentUser.id : true);

    if (!course || course.id !== note.courseId) {
      const params = new URLSearchParams();
      params.set("lesson", String(note.lessonId));
      if (canOpenDirect) {
        params.set("direct", "1");
        params.set("student", String(note.senderId));
      }
      navigate(`/courses/${note.courseId}?${params.toString()}`);
      return;
    }
    const lesson = course.lessons?.find((item) => item.id === note.lessonId);
    if (lesson) {
      setActiveLesson(lesson);
    }
    if (canOpenDirect && note.senderId) {
      setActiveTab("Messages");
      setMessagePaneMode("direct");
      openTeacherDirectThread(note.lessonId, note.senderId).catch(() => {});
    }
  };

  useEffect(() => {
    if (!isTeacher) return;
    const lessonId = activeLesson?.id;
    if (typeof lessonId !== "number") return;
    const params = new URLSearchParams(location.search);
    if (params.get("direct") !== "1") return;
    const studentId = Number(params.get("student") || "0");
    const lessonIdParam = Number(params.get("lesson") || "0");
    if (!Number.isFinite(studentId) || studentId <= 0) return;
    if (lessonIdParam > 0 && lessonIdParam !== lessonId) return;

    let cancelled = false;
    const openFromQuery = async () => {
      setActiveTab("Messages");
      setMessagePaneMode("direct");
      await openTeacherDirectThread(lessonId, studentId);
      if (cancelled) return;
      const nextParams = new URLSearchParams(location.search);
      nextParams.delete("direct");
      nextParams.delete("student");
      const query = nextParams.toString();
      navigate(`${location.pathname}${query ? `?${query}` : ""}`, {
        replace: true,
      });
    };
    openFromQuery().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [activeLesson?.id, isTeacher, location.pathname, location.search, navigate]);

  const handleSendReply = async (note: (typeof notifications)[number]) => {
    const token = localStorage.getItem("access_token");
    if (!token || !replyText.trim()) return;
    setReplySending(true);
    let firebaseSent = false;
    try {
      try {
        await pushFirebaseMessage(note.lessonId, replyText.trim(), "teacher");
        firebaseSent = true;
        if (chatTransport !== "firebase") {
          setChatTransport("firebase");
        }
        setChatError("");
      } catch {
        // fallback to backend only
      }
      const saved = await sendBackendMessage(
        note.lessonId,
        replyText.trim(),
        "teacher",
        token
      );
      if (!saved && !firebaseSent) return;
      await markNotificationRead(note.id);
      setReplyingToId(null);
      setReplyText("");
      fetchNotifications();
      if (activeLesson?.id === note.lessonId && chatTransport === "backend") {
        refreshChat();
      }
    } finally {
      setReplySending(false);
    }
  };

  // AI chat removed; teacher replies handled via role-based endpoint.

  // curriculum list is shown in the sidebar now
  const stickerPack = ["🔥", "🚀", "👏", "🤝", "✅", "💡", "🎯", "🎉"];

  useEffect(() => {
    if (!activeLesson?.id || chatLocked || !groupChatActive) {
      setChatMessages([]);
      return;
    }
    const lessonId = activeLesson.id;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    let intervalId: number | undefined;
    let retryIntervalId: number | undefined;

    if (chatTransport === "backend") {
      let retryAttempts = 0;
      const poll = async (force = false) => {
        if (cancelled) return;
        if (document.visibilityState !== "visible") return;
        const incoming = await fetchBackendMessages(lessonId, { force });
        if (cancelled) return;
        if (incoming !== null) {
          applyIncomingMessages(incoming);
        }
      };
      const retryRealtime = async () => {
        if (cancelled) return;
        if (!firebaseRealtimeEnabled) return;
        if (document.visibilityState !== "visible") return;
        if (retryAttempts >= 6) return;
        retryAttempts += 1;
        const switched = await trySwitchToRealtime(lessonId);
        if (switched && retryIntervalId !== undefined) {
          window.clearInterval(retryIntervalId);
          retryIntervalId = undefined;
        }
      };
      poll(true);
      retryRealtime();
      const onFocus = () => {
        poll(true);
        retryRealtime();
      };
      const onVisibility = () => {
        if (document.visibilityState === "visible") {
          poll(true);
          retryRealtime();
        }
      };
      window.addEventListener("focus", onFocus);
      document.addEventListener("visibilitychange", onVisibility);
      intervalId = window.setInterval(() => poll(false), 15000);
      if (firebaseRealtimeEnabled) {
        retryIntervalId = window.setInterval(retryRealtime, 3000);
      }
      return () => {
        cancelled = true;
        if (intervalId !== undefined) window.clearInterval(intervalId);
        if (retryIntervalId !== undefined) window.clearInterval(retryIntervalId);
        window.removeEventListener("focus", onFocus);
        document.removeEventListener("visibilitychange", onVisibility);
      };
    }

    const start = async () => {
      if (!firebaseRealtimeEnabled) {
        activateBackendChat("Firebase vaqtincha o'chirilgan. Backend chat ishlayapti.");
        return;
      }
      await ensureFirebaseUser();
      const messagesQuery = query(dbRef(db, chatPath(lessonId)), orderByChild("createdAt"));
      const probe = await get(messagesQuery);
      if (cancelled) return;
      const firstBatch: LessonMessage[] = [];
      probe.forEach((child) => {
        if (!child.key) return;
        firstBatch.push(normalizeRealtimeMessage(child.key, child.val()));
      });
      applyIncomingMessages(firstBatch);
      unsubscribe = onValue(
        messagesQuery,
        (snapshot) => {
          if (cancelled) return;
          const incoming: LessonMessage[] = [];
          snapshot.forEach((child) => {
            if (!child.key) return;
            incoming.push(normalizeRealtimeMessage(child.key, child.val()));
          });
          applyIncomingMessages(incoming);
        },
        () => {
          if (cancelled) return;
          activateBackendChat("Firebase access denied. Backend chat mode yoqildi.");
        }
      );
    };
    start().catch((error) => {
      if (cancelled) return;
      if (isFirebaseDnsError(error)) {
        disableFirebaseRealtime(
          "Firebase host topilmadi. Backend chat avtomatik yoqildi."
        );
      } else {
        activateBackendChat("Firebase ulanishda xato. Backend chat mode yoqildi.");
      }
    });
    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
      if (intervalId !== undefined) window.clearInterval(intervalId);
      if (retryIntervalId !== undefined) window.clearInterval(retryIntervalId);
    };
  }, [activeLesson?.id, chatLocked, chatTransport, groupChatActive, firebaseRealtimeEnabled]);

  useEffect(() => {
    if (
      !directChatActive ||
      !activeLesson?.id ||
      !isAuthed ||
      chatLocked
    ) {
      setDirectThreads([]);
      setDirectMessages([]);
      setActiveDirectChatId(null);
      setStudentRecipients([]);
      setStudentRecipientId(null);
      setDirectError("");
      return;
    }

    if (isTeacher) {
      fetchTeacherDirectThreads().catch(() => {});
    } else {
      let cancelled = false;
      const run = async () => {
        const thread = await fetchStudentDirectThread(
          studentDirectTarget,
          studentRecipientId
        );
        if (cancelled) return;
        if (!thread) {
          setStudentRecipients([]);
          setStudentRecipientId(null);
          return;
        }
        setStudentRecipients([
          {
            id: thread.teacherId,
            username: "Admin",
            role: "admin",
            chatId: thread.id,
          },
        ]);
        setStudentRecipientId(thread.teacherId);
      };
      run().catch(() => {});
      return () => {
        cancelled = true;
      };
    }
  }, [activeLesson?.id, directChatActive, chatLocked, isAuthed, isTeacher, studentDirectTarget]);

  useEffect(() => {
    if (isTeacher || !directChatActive) return;
    setStudentRecipients([]);
    setStudentRecipientId(null);
    setDirectThreads([]);
    setDirectMessages([]);
    setActiveDirectChatId(null);
    setDirectError("");
  }, [studentDirectTarget, isTeacher, directChatActive]);

  useEffect(() => {
    if (!activeDirectChatId) return;
    if (canUseActiveDirectThread) return;
    setActiveDirectChatId(null);
  }, [activeDirectChatId, canUseActiveDirectThread]);

  useEffect(() => {
    if (
      !directChatActive ||
      !activeLesson?.id ||
      !isAuthed ||
      chatLocked ||
      !isTeacher
    ) {
      if (directThreadSocketReconnectRef.current !== null) {
        window.clearTimeout(directThreadSocketReconnectRef.current);
        directThreadSocketReconnectRef.current = null;
      }
      directThreadSocketRetryRef.current = 0;
      if (directThreadSocketRef.current) {
        safelyCloseSocket(directThreadSocketRef.current);
        directThreadSocketRef.current = null;
      }
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) return;

    let cancelled = false;

    const connect = () => {
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      const socket = new WebSocket(
        `${protocol}://127.0.0.1:8000/ws/lessons/${activeLesson.id}/private-threads?token=${encodeURIComponent(
          token
        )}`
      );
      directThreadSocketRef.current = socket;

      socket.onopen = () => {
        directThreadSocketRetryRef.current = 0;
      };

      socket.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          if (raw?.event !== "thread_update") return;
          const thread = normalizeDirectChatThread(raw.thread ?? raw);
          upsertDirectThread(thread);
        } catch {
          // ignore malformed thread updates
        }
      };

      socket.onclose = () => {
        if (cancelled) return;
        directThreadSocketRetryRef.current += 1;
        if (directThreadSocketRetryRef.current > 5) {
          setDirectError("Thread realtime ulanishi uzildi. Sahifani yangilang.");
          fetchTeacherDirectThreads().catch(() => {});
          return;
        }
        if (directThreadSocketReconnectRef.current !== null) {
          window.clearTimeout(directThreadSocketReconnectRef.current);
        }
        directThreadSocketReconnectRef.current = window.setTimeout(() => {
          connect();
        }, 1200 * directThreadSocketRetryRef.current);
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (directThreadSocketReconnectRef.current !== null) {
        window.clearTimeout(directThreadSocketReconnectRef.current);
        directThreadSocketReconnectRef.current = null;
      }
      directThreadSocketRetryRef.current = 0;
      if (directThreadSocketRef.current) {
        safelyCloseSocket(directThreadSocketRef.current);
        directThreadSocketRef.current = null;
      }
    };
  }, [activeLesson?.id, directChatActive, chatLocked, isAuthed, isTeacher]);

  useEffect(() => {
    if (
      !directChatActive ||
      !activeLesson?.id ||
      !resolvedDirectChatId ||
      !isAuthed ||
      chatLocked
    ) {
      setDirectMessages([]);
      setDirectWsChatId(null);
      return;
    }
    let cancelled = false;
    setDirectWsChatId(null);
    fetchDirectMessages(resolvedDirectChatId)
      .then((items) => {
        if (cancelled) return;
        setDirectWsChatId(items ? resolvedDirectChatId : null);
      })
      .catch(() => {
        if (cancelled) return;
        setDirectWsChatId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeLesson?.id, directChatActive, resolvedDirectChatId, isAuthed, chatLocked]);

  useEffect(() => {
    if (
      !directChatActive ||
      !activeLesson?.id ||
      !directWsChatId ||
      !isAuthed ||
      chatLocked
    ) {
      if (directSocketReconnectRef.current !== null) {
        window.clearTimeout(directSocketReconnectRef.current);
        directSocketReconnectRef.current = null;
      }
      directSocketRetryRef.current = 0;
      if (directSocketRef.current) {
        safelyCloseSocket(directSocketRef.current);
        directSocketRef.current = null;
      }
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) return;

    let cancelled = false;

    const connect = () => {
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      const socket = new WebSocket(
        `${protocol}://127.0.0.1:8000/ws/private-chats/${directWsChatId}?token=${encodeURIComponent(
          token
        )}`
      );
      directSocketRef.current = socket;

      socket.onopen = () => {
        setDirectError("");
        directSocketRetryRef.current = 0;
      };

      socket.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          if (raw?.event === "message") {
            const normalized = normalizeDirectChatMessage(raw.message ?? raw);
            upsertDirectMessage(normalized);
            return;
          }
          if (raw?.event === "cleared") {
            setDirectMessages([]);
            if (directWsChatId) {
              setDirectThreads((prev) =>
                prev.map((item) =>
                  item.id === directWsChatId
                    ? {
                        ...item,
                        lastMessage: null,
                        lastMessageAt: null,
                        unreadCount: 0,
                      }
                    : item
                )
              );
            }
          }
        } catch {
          // ignore malformed message frames
        }
      };

      socket.onerror = () => {
        setDirectError("Direct realtime ulanishida xatolik.");
      };

      socket.onclose = () => {
        if (cancelled) return;
        directSocketRetryRef.current += 1;
        if (directSocketRetryRef.current > 5) {
          setDirectError("Direct realtime ulanishi uzildi. Dialogni qayta tanlang.");
          if (isTeacher) {
            fetchTeacherDirectThreads().catch(() => {});
          } else {
            fetchStudentDirectThread(
              studentDirectTarget,
              studentRecipientId
            ).catch(() => {});
          }
          return;
        }
        if (directSocketReconnectRef.current !== null) {
          window.clearTimeout(directSocketReconnectRef.current);
        }
        directSocketReconnectRef.current = window.setTimeout(() => {
          connect();
        }, 900 * directSocketRetryRef.current);
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (directSocketReconnectRef.current !== null) {
        window.clearTimeout(directSocketReconnectRef.current);
        directSocketReconnectRef.current = null;
      }
      directSocketRetryRef.current = 0;
      if (directSocketRef.current) {
        safelyCloseSocket(directSocketRef.current);
        directSocketRef.current = null;
      }
    };
  }, [
    activeLesson?.id,
    directChatActive,
    directWsChatId,
    isAuthed,
    chatLocked,
    currentUser?.id,
    isTeacher,
    studentDirectTarget,
    studentRecipientId,
  ]);

  useEffect(() => {
    setDirectInput("");
    clearDirectPendingAttachment();
    setDirectStickerOpen(false);
  }, [activeDirectChatId]);

  useEffect(() => {
    if (directChatActive) return;
    if (directRecording) {
      stopDirectVoiceRecording();
    }
    clearDirectPendingAttachment();
    setDirectStickerOpen(false);
  }, [directChatActive, directRecording]);

  useEffect(() => {
    if (
      !activeLesson?.id ||
      chatLocked ||
      !groupChatActive ||
      chatTransport !== "firebase"
    ) {
      setTypingUsers([]);
      return;
    }
    const lessonId = activeLesson.id;
    const ownSender: "user" | "teacher" = isTeacher ? "teacher" : "user";
    const ownKey = typingNodeKey(ownSender, currentUser?.id ?? null);
    let cancelled = false;
    const unsubscribe = onValue(
      dbRef(db, typingPath(lessonId)),
      (snapshot) => {
        if (cancelled) return;
        const now = Date.now();
        const incoming: {
          key: string;
          username: string;
          sender: "user" | "teacher";
        }[] = [];
        snapshot.forEach((child) => {
          const key = child.key ?? "";
          if (!key || key === ownKey) return;
          const raw = child.val() ?? {};
          const updatedAt =
            typeof raw.updatedAt === "number" ? raw.updatedAt : 0;
          if (!raw.isTyping || (updatedAt && now - updatedAt > 12000)) return;
          const sender: "user" | "teacher" =
            raw.sender === "teacher" ? "teacher" : "user";
          const username =
            String(raw.username ?? "").trim() ||
            (sender === "teacher" ? "Teacher" : "Student");
          incoming.push({ key, username, sender });
        });
        setTypingUsers(incoming.slice(0, 3));
      },
      () => {
        if (cancelled) return;
        setTypingUsers([]);
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
      setTypingUsers([]);
    };
  }, [
    activeLesson?.id,
    groupChatActive,
    chatLocked,
    chatTransport,
    currentUser?.id,
    isTeacher,
  ]);

  useEffect(() => {
    return () => {
      if (typingStopTimerRef.current !== null) {
        window.clearTimeout(typingStopTimerRef.current);
        typingStopTimerRef.current = null;
      }
      void setTypingPresence(false, { force: true });
      setTypingUsers([]);
    };
  }, [activeLesson?.id, groupChatActive, chatLocked, chatTransport]);

  useEffect(() => {
    if (!isTeacher) return;
    const pollNotifications = () => {
      if (document.visibilityState !== "visible") return;
      fetchNotifications();
    };
    pollNotifications();
    const intervalMs = notifOpen ? 8000 : 30000;
    const interval = window.setInterval(pollNotifications, intervalMs);
    const onFocus = () => pollNotifications();
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        pollNotifications();
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [isTeacher, notifOpen]);

  useEffect(() => {
    if (slideIndex >= fallbackSlides.length && fallbackSlides.length > 0) {
      setSlideIndex(0);
    }
  }, [fallbackSlides.length, slideIndex]);

  const renderMessageAttachment = (
    attachment?: LessonMessageAttachment | null,
    messageContent?: string,
    isOwn = false
  ) => {
    if (!attachment) return null;
    if (attachment.kind === "sticker") {
      return (
        <div className="mb-[4px] text-[42px] leading-none">
          {messageContent || "STICKER"}
        </div>
      );
    }
    if (attachment.kind === "image" && attachment.url) {
      return (
        <a href={attachment.url} target="_blank" rel="noreferrer">
          <img
            src={attachment.url}
            alt={attachment.fileName ?? "image"}
            className="mb-[6px] max-h-[240px] w-full max-w-[320px] rounded-[14px] border border-black/5 object-cover"
          />
        </a>
      );
    }
    if (attachment.kind === "video" && attachment.url) {
      return (
        <video
          className="mb-[6px] max-h-[260px] w-full max-w-[340px] rounded-[14px] border border-black/5"
          controls
          src={attachment.url}
        />
      );
    }
    if (attachment.kind === "audio" && attachment.url) {
      return (
        <audio
          className="mb-[6px] w-full max-w-[320px] rounded-[12px]"
          controls
          src={attachment.url}
        />
      );
    }
    return (
      <a
        href={attachment.url ?? "#"}
        target="_blank"
        rel="noreferrer"
        className={`mb-[6px] flex items-center gap-[8px] rounded-[12px] border px-[10px] py-[8px] text-[12px] ${
          isOwn
            ? "border-[#9bd79d] bg-white/55 text-[#1f334d]"
            : "border-[#dce6f2] bg-[#f8fbff] text-[#1f334d]"
        }`}
      >
        <span className="grid h-[28px] w-[28px] place-items-center rounded-[8px] bg-[#e8eef9] text-[10px] font-semibold text-[#3b4a6a]">
          FILE
        </span>
        <span className="truncate">
          {attachment.fileName ?? "Attachment"}
          {attachment.sizeBytes ? ` (${formatBytes(attachment.sizeBytes)})` : ""}
        </span>
      </a>
    );
  };

  const renderMaterials = () => (
    <div className="mt-[18px] space-y-[16px]">
      {lessonLocked && (
        <div className="rounded-[18px] border border-[#e6eef7] bg-white p-[22px] text-center shadow-[0_14px_45px_rgba(40,60,100,0.08)]">
          <div className="text-[18px] font-semibold text-[#2f2f7f]">
            Lesson materials are locked
          </div>
          <p className="mt-[8px] text-[13px] text-[#7b7f9a]">
            Unlock the full course to access full slides, resources, and chat.
          </p>
          <button
            className="mt-[12px] rounded-[12px] bg-[#47b9b9] px-[18px] py-[10px] text-[13px] font-semibold text-white"
            onClick={handlePurchase}
            disabled={purchaseLoading}
          >
            {purchaseLoading ? "Unlocking..." : "Unlock full course"}
          </button>
        </div>
      )}

      <div
        className={`grid gap-[16px] lg:grid-cols-[1.4fr_1fr] ${
          lessonLocked ? "opacity-80" : ""
        }`}
      >
        <div className="rounded-[18px] bg-white p-[18px] shadow-[0_14px_45px_rgba(40,60,100,0.08)]">
          <div className="flex items-center justify-between">
            <div className="text-[15px] font-semibold text-[#2f2f7f]">
              Lesson slides
            </div>
            <div className="text-[12px] text-[#8a8fa8]">
              {fallbackSlides.length
                ? `Slide ${Math.min(
                    slideIndex + 1,
                    fallbackSlides.length
                  )} of ${fallbackSlides.length}`
                : "No slides"}
            </div>
          </div>

          <div className="mt-[12px] h-[260px] overflow-hidden rounded-[14px] border border-[#e6eef7] bg-[#f6f9ff]">
            {lessonLoading ? (
              <div className="h-full w-full animate-pulse bg-[#e4ebf5]" />
            ) : fallbackSlides.length ? (
              currentSlide?.imageUrl ? (
                <img
                  src={currentSlide.imageUrl}
                  alt={currentSlide.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center px-[18px] text-center">
                  <div className="text-[16px] font-semibold text-[#2f2f7f]">
                    {currentSlide?.title ?? "Lesson notes"}
                  </div>
                  <p className="mt-[8px] text-[13px] text-[#5e627b]">
                    {currentSlide?.content ??
                      "Slides will appear here once available."}
                  </p>
                </div>
              )
            ) : (
              <div className="flex h-full items-center justify-center text-[13px] text-[#8a8fa8]">
                No slides available for this lesson.
              </div>
            )}
          </div>

          <div className="mt-[10px] flex items-center justify-between">
            <button
              className="rounded-full border border-[#dbe6f2] px-[12px] py-[6px] text-[12px] font-semibold text-[#2f2f7f] transition hover:border-[#47b9b9] hover:text-[#2aa3b2] disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => setSlideIndex((prev) => Math.max(prev - 1, 0))}
              disabled={slideIndex <= 0}
            >
              Prev
            </button>
            <div className="text-[12px] text-[#8a8fa8]">
              {fallbackSlides.length
                ? `${slideIndex + 1}/${fallbackSlides.length}`
                : "0/0"}
            </div>
            <button
              className="rounded-full border border-[#dbe6f2] px-[12px] py-[6px] text-[12px] font-semibold text-[#2f2f7f] transition hover:border-[#47b9b9] hover:text-[#2aa3b2] disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() =>
                setSlideIndex((prev) =>
                  Math.min(
                    prev + 1,
                    Math.max(fallbackSlides.length - 1, 0)
                  )
                )
              }
              disabled={
                fallbackSlides.length === 0 ||
                slideIndex >= fallbackSlides.length - 1
              }
            >
              Next
            </button>
          </div>
        </div>

        <div className="rounded-[18px] bg-white p-[18px] shadow-[0_14px_45px_rgba(40,60,100,0.08)]">
          <div className="text-[15px] font-semibold text-[#2f2f7f]">
            Lesson resources
          </div>
          <div className="mt-[12px] space-y-[10px]">
            {resources.length ? (
              resources.map((resource) => (
                <a
                  key={`resource-${resource.id}`}
                  href={resource.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-[12px] border border-[#e6eef7] bg-[#f8fbff] px-[12px] py-[10px] text-[13px] text-[#2f2f7f] transition hover:border-[#47b9b9]"
                >
                  <div>
                    <div className="font-semibold">{resource.title}</div>
                    <div className="text-[12px] text-[#8a8fa8]">
                      {resource.kind}
                    </div>
                  </div>
                  <span className="rounded-full bg-[#e8f7f7] px-[10px] py-[4px] text-[11px] font-semibold text-[#2aa3b2]">
                    Open
                  </span>
                </a>
              ))
            ) : (
              <div className="rounded-[12px] border border-dashed border-[#dbe6f2] bg-[#fbfdff] px-[12px] py-[16px] text-[12px] text-[#8a8fa8]">
                No resources for this lesson yet.
              </div>
            )}
          </div>

          {(course?.codeSamples ?? []).length > 0 && (
            <div className="mt-[16px]">
              <div className="text-[13px] font-semibold text-[#2f2f7f]">
                Code snippets
              </div>
              <div className="mt-[10px] space-y-[10px]">
                {(course?.codeSamples ?? []).slice(0, 2).map((sample, idx) => (
                  <div
                    key={`${course?.id ?? "course"}-resource-${idx}`}
                    className="rounded-[12px] border border-[#e6eef7] bg-[#f8fbff] p-[12px]"
                  >
                    <div className="text-[12px] font-semibold text-[#2f2f7f]">
                      {sample.title} -{" "}
                      <span className="text-[#47b9b9]">
                        {sample.language}
                      </span>
                    </div>
                    <pre className="mt-[8px] whitespace-pre-wrap rounded-[10px] bg-[#121824] p-[10px] text-[11px] text-[#dbe7ff]">
                      {sample.content}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderAssignments = () => {
    const totalAssignments = assignments.length;
    const studentSubmittedCount = assignments.filter((item) => item.submission).length;
    const studentGradedCount = assignments.filter(
      (item) => typeof item.submission?.rating === "number"
    ).length;
    const teacherSubmittedAssignmentCount = assignments.filter(
      (item) => (item.submissionCount ?? 0) > 0
    ).length;
    const teacherGradedAssignmentCount = assignments.filter(
      (item) => (item.gradedCount ?? 0) > 0
    ).length;
    const teacherSubmissionCount = assignments.reduce(
      (acc, item) => acc + (item.submissionCount ?? 0),
      0
    );
    const teacherGradedCount = assignments.reduce(
      (acc, item) => acc + (item.gradedCount ?? 0),
      0
    );
    const filteredAssignments = assignments.filter((assignment) => {
      if (assignmentListFilter === "all") return true;
      if (assignmentListFilter === "submitted") {
        return isTeacher
          ? (assignment.submissionCount ?? 0) > 0
          : Boolean(assignment.submission);
      }
      return isTeacher
        ? (assignment.gradedCount ?? 0) > 0
        : typeof assignment.submission?.rating === "number";
    });

    return (
    <div className="relative space-y-[16px] overflow-hidden rounded-[26px] border border-[#d9e4f4] bg-[linear-gradient(145deg,#f4f8ff_0%,#edf6ff_40%,#fff7ec_100%)] p-[14px] shadow-[0_26px_75px_rgba(15,30,70,0.15)]">
      <div className="pointer-events-none absolute right-[-60px] top-[-70px] h-[180px] w-[180px] rounded-full bg-[#63b6ff]/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-90px] left-[-70px] h-[220px] w-[220px] rounded-full bg-[#ffab49]/15 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(circle_at_1px_1px,rgba(85,109,151,0.18)_1px,transparent_0)] [background-size:16px_16px]" />
      {lessonLocked && !isTeacher && (
        <div className="relative z-[1] rounded-[20px] border border-[#f0d4d4] bg-[#fff7f7] p-[20px] text-center shadow-[0_14px_45px_rgba(40,60,100,0.08)]">
          <div className="text-[16px] font-semibold text-[#2f2f7f]">
            Vazifalar locked
          </div>
          <p className="mt-[6px] text-[12px] text-[#7b7f9a]">
            Vazifalarni ko'rish va topshirish uchun kursni unlock qiling.
          </p>
        </div>
      )}

      <div className="relative z-[1] rounded-[24px] border border-[#deebfb] bg-white/90 p-[18px] shadow-[0_20px_56px_rgba(16,30,64,0.14)] backdrop-blur-[2px]">
        <div className="flex flex-wrap items-center justify-between gap-[10px]">
          <div>
            <div className="text-[18px] font-semibold text-[#2f2f7f]">
              Lesson assignments
            </div>
            <div className="text-[12px] text-[#7b7f9a]">
              Har bir dars uchun amaliy vazifa va baholash.
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-[6px]">
            <span
              className={`rounded-full border px-[12px] py-[6px] text-[11px] font-semibold ${
                lessonLocked && !isTeacher
                  ? "border-[#ffd7d7] bg-[#fff1f1] text-[#ff6b6b]"
                  : isTeacher
                  ? "border-[#cfeeee] bg-[#ecfbfb] text-[#128a99]"
                  : "border-[#dfe7f7] bg-[#f2f6fe] text-[#2f2f7f]"
              }`}
            >
              {lessonLocked && !isTeacher
                ? "Locked"
                : isTeacher
                ? "Teacher mode"
                : "Student mode"}
            </span>
            <span
              className={`rounded-full border px-[10px] py-[6px] text-[10px] font-semibold ${
                assignmentRealtimeStatus === "live"
                  ? "border-[#bfe9dd] bg-[#ecfaf6] text-[#1a9b82]"
                  : assignmentRealtimeStatus === "connecting"
                  ? "border-[#d7e5ff] bg-[#eef4ff] text-[#315fcb]"
                  : "border-[#d3def3] bg-[#f6f9ff] text-[#4a5f87]"
              }`}
            >
              {assignmentRealtimeStatus === "live"
                ? "Realtime online"
                : assignmentRealtimeStatus === "connecting"
                ? "Realtime ulanmoqda..."
                : "Realtime fallback"}
            </span>
          </div>
        </div>

        <div className="mt-[14px] rounded-[16px] border border-[#dbe6f7] bg-[#f8fbff] p-[8px]">
          <div className="grid gap-[8px] sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setAssignmentListFilter("all")}
            className={`rounded-[12px] border px-[12px] py-[10px] text-left transition ${
              assignmentListFilter === "all"
                ? "border-[#4f7df0] bg-[#1e2f57] text-white shadow-[0_10px_25px_rgba(42,74,146,0.38)]"
                : "border-[#dfe9f8] bg-white hover:border-[#b8c9e8]"
            }`}
          >
            <div
              className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${
                assignmentListFilter === "all" ? "text-white/80" : "text-[#6b7da0]"
              }`}
            >
              Vazifalar
            </div>
            <div
              className={`mt-[4px] text-[18px] font-bold ${
                assignmentListFilter === "all" ? "text-white" : "text-[#2f2f7f]"
              }`}
            >
              {totalAssignments}
            </div>
          </button>
          <button
            type="button"
            onClick={() => setAssignmentListFilter("submitted")}
            className={`rounded-[12px] border px-[12px] py-[10px] text-left transition ${
              assignmentListFilter === "submitted"
                ? "border-[#3f74f2] bg-[#24489d] text-white shadow-[0_10px_25px_rgba(42,74,146,0.34)]"
                : "border-[#dfe9f8] bg-white hover:border-[#b8c9e8]"
            }`}
          >
            <div
              className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${
                assignmentListFilter === "submitted"
                  ? "text-white/80"
                  : "text-[#6b7da0]"
              }`}
            >
              {isTeacher ? "Topshirilgan" : "Yuborilgan"}
            </div>
            <div
              className={`mt-[4px] text-[18px] font-bold ${
                assignmentListFilter === "submitted"
                  ? "text-white"
                  : "text-[#315fcb]"
              }`}
            >
              {isTeacher ? teacherSubmissionCount : studentSubmittedCount}
            </div>
            <div
              className={`text-[10px] ${
                assignmentListFilter === "submitted"
                  ? "text-white/75"
                  : "text-[#7b8ba8]"
              }`}
            >
              {isTeacher
                ? `${teacherSubmittedAssignmentCount} ta vazifa`
                : `${studentSubmittedCount} ta vazifa`}
            </div>
          </button>
          <button
            type="button"
            onClick={() => setAssignmentListFilter("graded")}
            className={`rounded-[12px] border px-[12px] py-[10px] text-left transition ${
              assignmentListFilter === "graded"
                ? "border-[#f19a2f] bg-[#a85b15] text-white shadow-[0_10px_25px_rgba(196,112,24,0.34)]"
                : "border-[#dfe9f8] bg-white hover:border-[#b8c9e8]"
            }`}
          >
            <div
              className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${
                assignmentListFilter === "graded"
                  ? "text-white/80"
                  : "text-[#6b7da0]"
              }`}
            >
              {isTeacher ? "Baholangan" : "Baholangan"}
            </div>
            <div
              className={`mt-[4px] text-[18px] font-bold ${
                assignmentListFilter === "graded"
                  ? "text-white"
                  : "text-[#cf8a2f]"
              }`}
            >
              {isTeacher ? teacherGradedCount : studentGradedCount}
            </div>
            <div
              className={`text-[10px] ${
                assignmentListFilter === "graded"
                  ? "text-white/75"
                  : "text-[#7b8ba8]"
              }`}
            >
              {isTeacher
                ? `${teacherGradedAssignmentCount} ta vazifa`
                : `${studentGradedCount} ta vazifa`}
            </div>
          </button>
        </div>
        </div>

        {!isAuthed && !isTeacher && (
          <div className="mt-[12px] rounded-[12px] border border-dashed border-[#dbe6f2] bg-[#f8fbff] px-[12px] py-[12px] text-[12px] text-[#6b7897]">
            Vazifani topshirish uchun login qiling.
          </div>
        )}

        {assignmentError && (
          <div className="mt-[12px] rounded-[12px] border border-[#ffdcdc] bg-[#fff4f4] px-[12px] py-[8px] text-[12px] text-[#d44d4d]">
            {assignmentError}
          </div>
        )}

        {isTeacher && (
          <>
            <div className="mt-[14px] rounded-[18px] border border-[#dbe6f2] bg-white p-[14px] shadow-[0_10px_26px_rgba(20,35,80,0.08)]">
              <div className="flex flex-wrap items-center justify-between gap-[10px]">
                <div>
                  <div className="text-[14px] font-semibold text-[#2f2f7f]">
                    Assignment builder
                  </div>
                  <div className="text-[11px] text-[#7b7f9a]">
                    Vazifalarni modal oynada tez va tartibli yarating.
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-full bg-[linear-gradient(90deg,#4f7df0,#47b9b9)] px-[14px] py-[7px] text-[11px] font-semibold text-white shadow-[0_10px_24px_rgba(71,137,230,0.35)] transition hover:-translate-y-[1px]"
                  onClick={() => setAssignmentBuilderOpen(true)}
                >
                  + Vazifa qo'shish
                </button>
              </div>
            </div>

            {assignmentBuilderOpen && (
              <div
                className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0f1b35]/50 px-[14px] py-[20px] backdrop-blur-[2px]"
                onClick={() => {
                  if (!assignmentCreateBusy) setAssignmentBuilderOpen(false);
                }}
              >
                <div
                  className="max-h-[90vh] w-full max-w-[760px] overflow-hidden rounded-[24px] border border-[#dbe6f2] bg-[linear-gradient(135deg,#f8fcff_0%,#f4fbff_55%,#fff9f1_100%)] shadow-[0_28px_80px_rgba(14,28,60,0.35)]"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="flex items-center justify-between border-b border-[#dbe6f2] bg-white/80 px-[16px] py-[12px]">
                    <div>
                      <div className="text-[15px] font-semibold text-[#2f2f7f]">
                        Assignment builder
                      </div>
                      <div className="text-[11px] text-[#7b7f9a]">
                        Dars uchun vazifalarni yarating va saqlang
                      </div>
                    </div>
                    <button
                      type="button"
                      className="rounded-full border border-[#dbe6f2] bg-white px-[10px] py-[5px] text-[11px] font-semibold text-[#5e627b] transition hover:bg-[#f6f9ff] disabled:opacity-60"
                      onClick={() => setAssignmentBuilderOpen(false)}
                      disabled={assignmentCreateBusy}
                    >
                      Yopish
                    </button>
                  </div>

                  <div className="max-h-[62vh] space-y-[10px] overflow-auto p-[14px]">
                    <div className="flex flex-wrap items-center justify-between gap-[8px]">
                      <div className="text-[11px] font-semibold text-[#4f6286]">
                        Draftlar: {teacherAssignmentDrafts.length}
                      </div>
                      <button
                        type="button"
                        className="rounded-full border border-[#cfe0fb] bg-white px-[12px] py-[6px] text-[11px] font-semibold text-[#2f2f7f] transition hover:-translate-y-[1px] hover:border-[#5c8cff] hover:text-[#315fcb]"
                        onClick={addTeacherAssignmentRow}
                        disabled={assignmentCreateBusy}
                      >
                        + Qator qo'shish
                      </button>
                    </div>

                    {teacherAssignmentDrafts.map((row, idx) => (
                      <div
                        key={`assignment-row-${row.id}`}
                        className="group relative overflow-hidden rounded-[14px] border border-[#dbe6f2] bg-white p-[10px] shadow-[0_8px_24px_rgba(20,35,80,0.06)]"
                      >
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,#4f7df0,#47b9b9,#ffb35c)] opacity-60 transition group-hover:opacity-100" />
                        <div className="mb-[6px] flex items-center justify-between gap-[8px]">
                          <div className="text-[11px] font-semibold text-[#4f6286]">
                            Vazifa #{idx + 1} draft
                          </div>
                          {teacherAssignmentDrafts.length > 1 && (
                            <button
                              type="button"
                              className="rounded-full border border-[#ffd8d8] px-[10px] py-[4px] text-[10px] font-semibold text-[#d44d4d]"
                              onClick={() => removeTeacherAssignmentRow(row.id)}
                              disabled={assignmentCreateBusy}
                            >
                              O'chirish
                            </button>
                          )}
                        </div>
                        <input
                          className="h-[40px] w-full rounded-[10px] border border-[#e4ebf5] bg-[#fbfdff] px-[10px] text-[12px] outline-none transition focus:border-[#5d85ef] focus:bg-white"
                          placeholder="Vazifa nomi"
                          value={row.title}
                          onChange={(event) =>
                            updateTeacherAssignmentRow(
                              row.id,
                              "title",
                              event.target.value
                            )
                          }
                          disabled={assignmentCreateBusy}
                        />
                        <textarea
                          className="mt-[8px] h-[82px] w-full resize-none rounded-[10px] border border-[#e4ebf5] bg-[#fbfdff] px-[10px] py-[8px] text-[12px] outline-none transition focus:border-[#5d85ef] focus:bg-white"
                          placeholder="Topshiriq sharti va talablar"
                          value={row.description}
                          onChange={(event) =>
                            updateTeacherAssignmentRow(
                              row.id,
                              "description",
                              event.target.value
                            )
                          }
                          disabled={assignmentCreateBusy}
                        />
                        <div className="mt-[8px] flex items-center justify-between gap-[8px]">
                          <span className="text-[11px] font-semibold text-[#6a7a95]">
                            Maks baho
                          </span>
                          <select
                            className="h-[32px] rounded-[8px] border border-[#dbe6f2] bg-white px-[10px] text-[11px] font-semibold outline-none transition focus:border-[#5d85ef]"
                            value={row.maxRating}
                            onChange={(event) =>
                              updateTeacherAssignmentRow(
                                row.id,
                                "maxRating",
                                Number(event.target.value)
                              )
                            }
                            disabled={assignmentCreateBusy}
                          >
                            {[1, 2, 3, 4, 5].map((value) => (
                              <option key={`max-rating-${value}`} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}

                    {assignmentCreateError && (
                      <div className="rounded-[10px] border border-[#ffd8d8] bg-[#fff6f6] px-[10px] py-[8px] text-[11px] text-[#d44d4d]">
                        {assignmentCreateError}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-[8px] border-t border-[#dbe6f2] bg-white/80 px-[14px] py-[10px]">
                    <button
                      type="button"
                      className="rounded-full border border-[#dbe6f2] bg-white px-[12px] py-[6px] text-[11px] font-semibold text-[#5e627b] transition hover:bg-[#f6f9ff]"
                      onClick={() =>
                        setTeacherAssignmentDrafts([createAssignmentDraft(Date.now())])
                      }
                      disabled={assignmentCreateBusy}
                    >
                      Tozalash
                    </button>
                    <button
                      type="button"
                      className="rounded-full bg-[linear-gradient(90deg,#4f7df0,#47b9b9)] px-[14px] py-[6px] text-[11px] font-semibold text-white shadow-[0_10px_24px_rgba(71,137,230,0.35)] transition hover:-translate-y-[1px] disabled:opacity-60"
                      onClick={handleCreateAssignments}
                      disabled={assignmentCreateBusy}
                    >
                      {assignmentCreateBusy
                        ? "Saqlanmoqda..."
                        : "Vazifalarni saqlash"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <div className="mt-[12px] space-y-[14px]">
          {assignmentLoading ? (
            <div className="rounded-[14px] border border-[#e6eef7] bg-[#f6f9ff] px-[14px] py-[16px] text-[12px] text-[#7b7f9a]">
              Vazifalar yuklanmoqda...
            </div>
          ) : assignments.length === 0 ? (
            <div className="rounded-[14px] border border-dashed border-[#dbe6f2] bg-[#fbfdff] px-[14px] py-[16px] text-[12px] text-[#7b7f9a]">
              Hozircha vazifa yo'q.
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="rounded-[14px] border border-dashed border-[#dbe6f2] bg-[#fbfdff] px-[14px] py-[16px] text-[12px] text-[#7b7f9a]">
              <div>
                Tanlangan filter bo'yicha vazifa topilmadi.
              </div>
              <button
                type="button"
                className="mt-[8px] rounded-full border border-[#dbe6f2] bg-white px-[12px] py-[5px] text-[11px] font-semibold text-[#2f2f7f] transition hover:border-[#5c84ee] hover:text-[#315fcb]"
                onClick={() => setAssignmentListFilter("all")}
              >
                Barchasini ko'rsatish
              </button>
            </div>
          ) : (
            filteredAssignments.map((assignment) => {
              const submission = assignment.submission ?? null;
              const isOpen = Boolean(submissionsOpen[assignment.id]);
              const submissions = assignmentSubmissions[assignment.id] ?? [];
              return (
                <div
                  key={`assignment-${assignment.id}`}
                  className="group relative overflow-hidden rounded-[20px] border border-[#dce7f7] bg-[linear-gradient(145deg,#ffffff_0%,#f7fbff_100%)] p-[16px] shadow-[0_12px_32px_rgba(24,44,84,0.1)] transition hover:-translate-y-[1px] hover:border-[#bfd2f0] hover:shadow-[0_18px_38px_rgba(24,44,84,0.15)]"
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-[4px] bg-[linear-gradient(90deg,#5f84ef,#46b9b9,#ffb45f)] opacity-70 transition group-hover:opacity-100" />
                  <div className="flex flex-wrap items-start justify-between gap-[10px]">
                    <div>
                      <div className="text-[15px] font-semibold text-[#263d70]">
                        {assignment.title}
                      </div>
                      {assignment.description && (
                        <div className="mt-[6px] text-[12px] leading-[1.5] text-[#687798]">
                          {assignment.description}
                        </div>
                      )}
                    </div>
                    {isTeacher && (
                      <span className="rounded-full border border-[#d6e3f8] bg-[#edf4ff] px-[10px] py-[4px] text-[10px] font-semibold text-[#2f2f7f]">
                        {assignment.gradedCount ?? 0}/
                        {assignment.submissionCount ?? 0} graded
                      </span>
                    )}
                  </div>

                  {!isTeacher && (
                    <div className="mt-[12px]">
                      {submission ? (
                        <div className="rounded-[14px] border border-[#deebf8] bg-white p-[12px] shadow-[0_10px_22px_rgba(16,30,64,0.08)]">
                          <div className="text-[11px] font-semibold text-[#72809f]">
                            Yuborgan javobingiz
                          </div>
                          <div className="mt-[8px]">
                            {renderAssignmentSubmissionBody(
                              submission.content,
                              "student"
                            )}
                          </div>
                          <div className="mt-[8px] flex flex-wrap items-center justify-between gap-[10px]">
                            {renderAssignmentStars(submission.rating ?? 0)}
                            {submission.rating ? (
                              <span className="text-[11px] font-semibold text-[#2aa3b2]">
                                Baholandi {submission.rating}/5
                              </span>
                            ) : (
                              <span className="text-[11px] text-[#ff9f43]">
                                Teacher hali baholamadi
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-[14px] border border-dashed border-[#d4e1f6] bg-[#f9fbff] px-[12px] py-[12px]">
                          <div className="text-[12px] text-[#5d6f91]">
                            Vazifani modal oynada topshirasiz: matn, rasm (file),
                            URL va code qo'shish mumkin.
                          </div>
                          <div className="mt-[10px] flex items-center justify-between gap-[10px]">
                            <span className="text-[11px] text-[#7d8ba6]">
                              {isAssignmentSubmissionDraftEmpty(
                                submissionDrafts[assignment.id]
                              )
                                ? "Draft bo'sh"
                                : "Draft saqlangan"}
                            </span>
                            <button
                              type="button"
                              className="rounded-full bg-[linear-gradient(90deg,#335ecf,#31aeb8)] px-[16px] py-[7px] text-[11px] font-semibold text-white shadow-[0_10px_24px_rgba(51,94,207,0.32)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60"
                              onClick={() => openAssignmentSubmitModal(assignment.id)}
                              disabled={!isAuthed}
                            >
                              Vazifani topshirish
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {isTeacher && (
                    <div className="mt-[12px]">
                      <button
                        className="rounded-full border border-[#ccd9ee] bg-white px-[13px] py-[7px] text-[11px] font-semibold text-[#2f2f7f] transition hover:border-[#4f7df0] hover:text-[#315fcb] disabled:opacity-60"
                        onClick={() => toggleAssignmentSubmissions(assignment.id)}
                        disabled={submissionBusyId === assignment.id}
                      >
                        {isOpen ? "Yashirish" : "Topshiriqlarni ko'rish"}
                      </button>
                      {isOpen && (
                        <div className="mt-[10px] max-h-[300px] space-y-[10px] overflow-auto pr-[4px]">
                          {submissions.length === 0 ? (
                            <div className="rounded-[12px] border border-dashed border-[#dbe6f2] bg-[#f9fbff] px-[12px] py-[12px] text-[12px] text-[#7b7f9a]">
                              Hali topshirilgan javob yo'q.
                            </div>
                          ) : (
                            submissions.map((submissionItem) => {
                              const selectedRating =
                                gradeDrafts[submissionItem.id] ?? 0;
                              const isGraded =
                                typeof submissionItem.rating === "number";
                              const isBusy = gradingBusyId === submissionItem.id;
                              return (
                                <div
                                  key={`submission-${submissionItem.id}`}
                                  className="rounded-[14px] border border-[#dce7f7] bg-white p-[12px] shadow-[0_10px_24px_rgba(16,30,64,0.08)]"
                                >
                                  <div className="flex items-center justify-between gap-[10px]">
                                    <div className="text-[12px] font-semibold text-[#2f2f7f]">
                                      {submissionItem.studentUsername ??
                                        `User ${submissionItem.studentId}`}
                                    </div>
                                    <div className="text-[10px] text-[#9aa0b8]">
                                      {submissionItem.createdAt
                                        ? new Date(
                                            submissionItem.createdAt
                                          ).toLocaleString()
                                        : ""}
                                    </div>
                                  </div>
                                  <div className="mt-[8px]">
                                    {renderAssignmentSubmissionBody(
                                      submissionItem.content,
                                      "teacher"
                                    )}
                                  </div>
                                  {isGraded ? (
                                    <div className="mt-[10px] flex flex-wrap items-center justify-between gap-[10px]">
                                      {renderAssignmentStars(
                                        submissionItem.rating ?? 0
                                      )}
                                      <span className="rounded-full bg-[#ecfaf6] px-[10px] py-[4px] text-[11px] font-semibold text-[#1c9c83]">
                                        Baholandi {submissionItem.rating}/5
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="mt-[10px] space-y-[8px]">
                                      <div className="flex flex-wrap items-center gap-[8px]">
                                        {[1, 2, 3, 4, 5].map((value) => (
                                          <button
                                            key={`quick-grade-${submissionItem.id}-${value}`}
                                            type="button"
                                            className={`grid h-[30px] min-w-[30px] place-items-center rounded-full border px-[10px] text-[11px] font-semibold transition ${
                                              selectedRating === value
                                                ? "border-[#4f7df0] bg-[#edf3ff] text-[#315fcb] shadow-[0_6px_14px_rgba(79,125,240,0.24)]"
                                                : "border-[#d6e2f4] bg-white text-[#60708f] hover:border-[#9fb8e7] hover:text-[#315fcb]"
                                            }`}
                                            onClick={() =>
                                              setGradeDrafts((prev) => ({
                                                ...prev,
                                                [submissionItem.id]: value,
                                              }))
                                            }
                                            disabled={isBusy}
                                          >
                                            {value}
                                          </button>
                                        ))}
                                        <span className="text-[11px] text-[#73829f]">
                                          {selectedRating
                                            ? `${selectedRating}/5 tanlandi`
                                            : "Baho tanlang"}
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        className="rounded-full bg-[linear-gradient(90deg,#335ecf,#31aeb8)] px-[13px] py-[6px] text-[11px] font-semibold text-white shadow-[0_8px_20px_rgba(51,94,207,0.3)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60"
                                        onClick={() =>
                                          handleGradeSubmission(
                                            assignment.id,
                                            submissionItem.id,
                                            selectedRating
                                          )
                                        }
                                        disabled={!selectedRating || isBusy}
                                      >
                                        {isBusy ? "Yuborilmoqda..." : "Bahoni yuborish"}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {!isTeacher &&
          assignmentSubmitModalId !== null &&
          (() => {
            const modalAssignment = assignments.find(
              (item) => item.id === assignmentSubmitModalId
            );
            if (!modalAssignment || modalAssignment.submission) return null;
            const draft =
              submissionDrafts[modalAssignment.id] ??
              createEmptyAssignmentSubmissionDraft();
            const hasImage = Boolean(draft.imageUrl.trim());
            return typeof document !== "undefined"
              ? createPortal(
                  <div
                    className="fixed inset-0 z-[220] flex items-center justify-center bg-[#0f1b35]/55 px-[14px] py-[20px] backdrop-blur-[2px]"
                    onClick={closeAssignmentSubmitModal}
                  >
                    <div
                      className="w-full max-w-[900px] overflow-hidden rounded-[22px] border border-[#d9e6fa] bg-[linear-gradient(145deg,#f8fbff_0%,#f4f9ff_55%,#fff8f0_100%)] shadow-[0_24px_70px_rgba(12,25,56,0.34)]"
                      onClick={(event) => event.stopPropagation()}
                    >
                  <input
                    ref={assignmentFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAssignmentImageInputChange}
                  />

                  <div className="flex items-center justify-between border-b border-[#dbe7f8] bg-white/80 px-[16px] py-[12px]">
                    <div>
                      <div className="text-[15px] font-semibold text-[#2f2f7f]">
                        Vazifani topshirish
                      </div>
                      <div className="text-[11px] text-[#6f7f9e]">
                        {modalAssignment.title}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="rounded-full border border-[#d9e5f7] bg-white px-[10px] py-[5px] text-[11px] font-semibold text-[#5d6c8a] transition hover:bg-[#f7faff] disabled:opacity-60"
                      onClick={closeAssignmentSubmitModal}
                      disabled={Boolean(submissionBusyId) || assignmentSubmitUploading}
                    >
                      Yopish
                    </button>
                  </div>

                  <div className="max-h-[68vh] overflow-auto p-[14px]">
                    <div className="grid gap-[12px] md:grid-cols-[1.35fr_0.95fr]">
                      <div className="space-y-[10px]">
                        <div className="rounded-[14px] border border-[#dce8f8] bg-white p-[10px]">
                          <div className="mb-[6px] text-[11px] font-semibold text-[#60708f]">
                            Yechim matni
                          </div>
                          <textarea
                            className="h-[122px] w-full resize-none rounded-[12px] border border-[#d9e5f8] bg-white px-[12px] py-[10px] text-[12px] outline-none transition focus:border-[#5e86ef] focus:shadow-[0_0_0_4px_rgba(94,134,239,0.14)]"
                            placeholder="Izoh yoki yechim matni..."
                            value={draft.text}
                            onChange={(event) =>
                              updateSubmissionDraftField(
                                modalAssignment.id,
                                "text",
                                event.target.value
                              )
                            }
                          />
                        </div>

                        <div className="rounded-[14px] border border-[#dce8f8] bg-white p-[10px]">
                          <div className="mb-[6px] text-[11px] font-semibold text-[#60708f]">
                            Loyiha URL (GitHub / demo)
                          </div>
                          <input
                            className="h-[40px] w-full rounded-[12px] border border-[#d9e5f8] bg-white px-[12px] text-[12px] outline-none transition focus:border-[#5e86ef]"
                            placeholder="https://github.com/..."
                            value={draft.resourceUrl}
                            onChange={(event) =>
                              updateSubmissionDraftField(
                                modalAssignment.id,
                                "resourceUrl",
                                event.target.value
                              )
                            }
                          />
                        </div>

                        <div className="rounded-[14px] border border-[#dce8f8] bg-white p-[10px]">
                          <div className="mb-[6px] text-[11px] font-semibold text-[#60708f]">
                            Code snippet (ixtiyoriy)
                          </div>
                          <textarea
                            className="h-[140px] w-full resize-none rounded-[12px] border border-[#d9e5f8] bg-[#f8fbff] px-[12px] py-[10px] text-[12px] font-mono outline-none transition focus:border-[#5e86ef]"
                            placeholder="Code snippet..."
                            value={draft.code}
                            onChange={(event) =>
                              updateSubmissionDraftField(
                                modalAssignment.id,
                                "code",
                                event.target.value
                              )
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-[10px]">
                        <div className="rounded-[14px] border border-[#dce8f8] bg-white p-[10px]">
                          <div className="mb-[8px] text-[11px] font-semibold text-[#60708f]">
                            Rasm (file orqali)
                          </div>
                          {hasImage ? (
                            <div className="space-y-[8px]">
                              <div className="overflow-hidden rounded-[12px] border border-[#d8e5f8] bg-[#f4f8ff]">
                                <img
                                  src={draft.imageUrl}
                                  alt="Yuklangan rasm"
                                  className="h-[180px] w-full object-contain p-[6px]"
                                />
                              </div>
                              <div className="flex flex-wrap items-center gap-[8px]">
                                <button
                                  type="button"
                                  className="rounded-full border border-[#ccd9ef] bg-white px-[10px] py-[5px] text-[11px] font-semibold text-[#315fcb] transition hover:border-[#4f7df0]"
                                  onClick={triggerAssignmentImagePicker}
                                  disabled={assignmentSubmitUploading}
                                >
                                  {assignmentSubmitUploading
                                    ? "Yuklanmoqda..."
                                    : "Rasmni almashtirish"}
                                </button>
                                <button
                                  type="button"
                                  className="rounded-full border border-[#f3d4d4] bg-[#fff6f6] px-[10px] py-[5px] text-[11px] font-semibold text-[#d44d4d]"
                                  onClick={() =>
                                    updateSubmissionDraftField(
                                      modalAssignment.id,
                                      "imageUrl",
                                      ""
                                    )
                                  }
                                  disabled={assignmentSubmitUploading}
                                >
                                  O'chirish
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="rounded-full border border-[#ccd9ef] bg-white px-[12px] py-[6px] text-[11px] font-semibold text-[#315fcb] transition hover:border-[#4f7df0]"
                              onClick={triggerAssignmentImagePicker}
                              disabled={assignmentSubmitUploading}
                            >
                              {assignmentSubmitUploading
                                ? "Yuklanmoqda..."
                                : "Rasm yuklash"}
                            </button>
                          )}
                          <div className="mt-[8px] text-[10px] text-[#7b8aa7]">
                            Tavsiya: JPG/PNG, 5MB gacha.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-[8px] border-t border-[#dbe7f8] bg-white/80 px-[14px] py-[10px]">
                    <span className="text-[11px] text-[#6f7f9e]">
                      Matn, rasm file, URL yoki code bilan yuboring.
                    </span>
                    <button
                      type="button"
                      className="rounded-full bg-[linear-gradient(90deg,#335ecf,#31aeb8)] px-[16px] py-[7px] text-[11px] font-semibold text-white shadow-[0_10px_24px_rgba(51,94,207,0.32)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => handleSubmitAssignment(modalAssignment.id)}
                      disabled={
                        submissionBusyId === modalAssignment.id ||
                        assignmentSubmitUploading ||
                        isAssignmentSubmissionDraftEmpty(draft)
                      }
                    >
                      {submissionBusyId === modalAssignment.id
                        ? "Yuborilmoqda..."
                        : "Yuborish"}
                    </button>
                  </div>
                </div>
              </div>,
                  document.body
                )
              : null;
          })()}
      </div>
    </div>
  );
  };

  const renderChat = () => (
    <div className="flex h-[520px] max-h-[72vh] flex-col overflow-hidden rounded-[26px] border border-[#d7e2ef] bg-white shadow-[0_24px_60px_rgba(17,35,80,0.2)]">
      <div className="flex items-center justify-between bg-[#4f7df0] px-[16px] py-[12px] text-white">
        <div className="flex items-center gap-[10px]">
          <div className="grid h-[38px] w-[38px] place-items-center rounded-full bg-white/20 text-[12px] font-bold">
            QA
          </div>
          <div>
            <div className="text-[15px] font-semibold">Lesson chat</div>
            <div className="text-[11px] text-white/80">
              {chatLocked
                ? "Locked"
                : chatTransport === "backend"
                ? firebaseRealtimeEnabled
                  ? "Connected via API"
                  : "API mode (RTDB off)"
                : "Connected via RTDB"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-[8px]">
          {!chatLocked && (
            <button
              type="button"
              className="rounded-full border border-white/30 bg-white/10 px-[10px] py-[5px] text-[11px] font-semibold text-white transition hover:bg-white/20"
              onClick={refreshChat}
            >
              Refresh
            </button>
          )}
          {!chatLocked && chatTransport === "backend" && firebaseRealtimeEnabled && (
            <button
              type="button"
              className="rounded-full border border-white/30 bg-white/10 px-[10px] py-[5px] text-[11px] font-semibold text-white transition hover:bg-white/20"
              onClick={() =>
                activeLesson?.id && trySwitchToRealtime(activeLesson.id)
              }
            >
              Realtime
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-[#e9edf5] bg-[radial-gradient(circle_at_1px_1px,rgba(120,138,170,0.2)_1px,transparent_0)] bg-[length:18px_18px] px-[12px] py-[14px]">
        {chatLocked ? (
          <div className="rounded-[14px] border border-dashed border-[#ffd6d6] bg-[#fff6f6] px-[14px] py-[16px] text-[12px] text-[#ff6b6b]">
            This lesson is locked. Unlock the course to join the chat.
          </div>
        ) : chatMessages.length ? (
          chatMessages.map((message, index) => {
            const isOwn =
              (message.sender === "teacher" && isTeacher) ||
              (message.sender === "user" && !isTeacher) ||
              (!!currentUser?.id && message.userId === currentUser.id);
            const displayName =
              message.username?.trim() ||
              (message.sender === "teacher" ? "Teacher" : "User");
            const avatarText = displayName.slice(0, 2).toUpperCase();
            const dayKey = getChatDayKey(message.createdAt);
            const prevDayKey =
              index > 0 ? getChatDayKey(chatMessages[index - 1]?.createdAt) : "";
            const showDayDivider = index === 0 || dayKey !== prevDayKey;
            const status = getMessageStatus(
              message,
              index,
              chatMessages,
              isTeacher,
              currentUser?.id
            );
            const bubbleTone = isOwn
              ? "bg-[#d9fdd3] border-[#a8dca0] text-[#19314f]"
              : "bg-white border-[#dce5f2] text-[#19314f]";

            return (
              <React.Fragment key={`message-${message.key ?? message.id}`}>
                {showDayDivider && (
                  <div className="sticky top-[6px] z-[3] mb-[8px] mt-[2px] flex justify-center">
                    <span className="rounded-full border border-[#d3deed] bg-white/95 px-[10px] py-[3px] text-[10px] font-semibold text-[#5b6d8e] shadow-[0_6px_14px_rgba(18,30,60,0.08)]">
                      {formatChatDayLabel(message.createdAt)}
                    </span>
                  </div>
                )}
                <div
                  className={`mb-[10px] flex items-end gap-[8px] ${
                    isOwn ? "justify-end" : "justify-start"
                  }`}
                >
                  {!isOwn && (
                    <div className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-[#8aa5de] text-[10px] font-bold text-white">
                      {avatarText || "US"}
                    </div>
                  )}

                  <div className="group relative max-w-[78%]">
                    <span
                      className={`absolute bottom-[10px] h-[12px] w-[12px] rotate-45 border ${
                        isOwn
                          ? "-right-[5px] border-l-0 border-t-0 border-[#a8dca0] bg-[#d9fdd3]"
                          : "-left-[5px] border-r-0 border-t-0 border-[#dce5f2] bg-white"
                      }`}
                    />

                    <div
                      className={`relative rounded-[16px] border px-[12px] py-[8px] text-[13px] leading-[1.55] shadow-[0_8px_18px_rgba(10,20,40,0.08)] ${bubbleTone}`}
                    >
                      <div className="mb-[4px] flex items-center gap-[6px] text-[10px] font-semibold text-[#5b6d8e]">
                        <span>{displayName}</span>
                        <span className="h-[3px] w-[3px] rounded-full bg-[#93a5c7]" />
                        <span>{message.sender === "teacher" ? "teacher" : "student"}</span>
                      </div>

                      {editingMessageId === messageNodeId(message) ? (
                        <div>
                          <textarea
                            className="h-[72px] w-full resize-none rounded-[10px] border border-[#d7e2f0] bg-white px-[10px] py-[8px] text-[12px] text-[#1f334d] outline-none focus:border-[#4f7df0]"
                            value={editingContent}
                            onChange={(event) => setEditingContent(event.target.value)}
                            disabled={messageBusyId === messageNodeId(message)}
                          />
                          <div className="mt-[6px] flex justify-end gap-[8px] text-[10px]">
                            <button
                              className="rounded-full border border-[#d7e2f0] px-[10px] py-[4px] text-[#576a88]"
                              onClick={handleCancelEdit}
                              disabled={messageBusyId === messageNodeId(message)}
                            >
                              Bekor
                            </button>
                            <button
                              className="rounded-full bg-[#4f7df0] px-[10px] py-[4px] text-white"
                              onClick={() => handleSaveEdit(message)}
                              disabled={
                                messageBusyId === messageNodeId(message) ||
                                !editingContent.trim()
                              }
                            >
                              Saqlash
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          {renderMessageAttachment(
                            message.attachment,
                            message.content,
                            isOwn
                          )}
                          {message.content &&
                            message.attachment?.kind !== "sticker" && (
                              <div>{message.content}</div>
                            )}
                        </div>
                      )}

                      <div className="mt-[4px] flex items-center justify-end gap-[8px] text-[10px] text-[#6a7e9f]">
                        {message.createdAt && (
                          <span>{formatTimestamp(message.createdAt)}</span>
                        )}
                        {status && (
                          <span
                            className={`inline-flex items-center gap-[4px] rounded-full px-[6px] py-[2px] ${
                              status === "O'qildi"
                                ? "bg-[#e5efff] text-[#3f6ee2]"
                                : status === "Yetkazildi"
                                ? "bg-[#eef2f8] text-[#6f81a1]"
                                : "bg-[#f4f6fb] text-[#8b93a9]"
                            }`}
                          >
                            {status === "Yuborilmoqda" ? (
                              <span className="h-[8px] w-[8px] animate-pulse rounded-full bg-current/70" />
                            ) : status === "O'qildi" ? (
                              <svg
                                width="14"
                                height="10"
                                viewBox="0 0 16 12"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M1 6L5 10L15 1"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M1 1L5 5"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            ) : (
                              <svg
                                width="12"
                                height="10"
                                viewBox="0 0 12 10"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M1 5L4 8L11 1"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                            <span className="text-[9px] font-semibold">
                              {status}
                            </span>
                          </span>
                        )}
                      </div>

                      {editingMessageId !== messageNodeId(message) &&
                        !message.pending &&
                        (chatTransport === "backend" || !!message.key) &&
                        (canManageMessages || message.userId === currentUser?.id) && (
                          <div className="mt-[6px] flex gap-[6px] text-[10px] text-[#5f7190] opacity-0 transition group-hover:opacity-100">
                            <button
                              className="rounded-full border border-[#d7e2f0] px-[10px] py-[4px]"
                              onClick={() => handleStartEdit(message)}
                              disabled={messageBusyId === messageNodeId(message)}
                            >
                              Edit
                            </button>
                            <button
                              className="rounded-full border border-[#d7e2f0] px-[10px] py-[4px]"
                              onClick={() => handleDeleteMessage(message)}
                              disabled={messageBusyId === messageNodeId(message)}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                    </div>
                  </div>

                  {isOwn && (
                    <div className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-[#5fbe76] text-[10px] font-bold text-white">
                      {avatarText || "ME"}
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })
        ) : (
          <div className="rounded-[14px] border border-dashed border-[#c8d5ea] bg-white/80 px-[14px] py-[16px] text-[12px] text-[#6f83a4]">
            Xabarlar hali yoq. Birinchi savolni siz yozing.
          </div>
        )}
        {!chatLocked && typingUsers.length > 0 && (
          <div className="mb-[8px] mt-[2px] flex justify-start">
            <div className="max-w-[72%] rounded-[14px] border border-[#d8e2f0] bg-white/95 px-[12px] py-[8px] shadow-[0_8px_20px_rgba(14,26,56,0.08)]">
              <div className="text-[10px] font-semibold text-[#607391]">
                {typingUsers.length === 1
                  ? `${typingUsers[0].username} yozmoqda...`
                  : typingUsers.length === 2
                  ? `${typingUsers[0].username} va ${typingUsers[1].username} yozmoqda...`
                  : `${typingUsers[0].username} va boshqalar yozmoqda...`}
              </div>
              <div className="mt-[3px] inline-flex items-center gap-[4px]">
                <span className="h-[6px] w-[6px] animate-bounce rounded-full bg-[#4f7df0]" />
                <span className="h-[6px] w-[6px] animate-bounce rounded-full bg-[#4f7df0] [animation-delay:120ms]" />
                <span className="h-[6px] w-[6px] animate-bounce rounded-full bg-[#4f7df0] [animation-delay:240ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {!chatLocked && (
        <div className="border-t border-[#e1e9f5] bg-white px-[12px] py-[12px]">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={pickerAccept}
            onChange={handleFileInputChange}
          />

          <div className="mb-[8px] flex gap-[6px] overflow-x-auto pb-[2px]">
            <button
              className="inline-flex items-center gap-[5px] rounded-full border border-[#d5dff0] bg-[#f8fbff] px-[10px] py-[5px] text-[11px] font-semibold text-[#34507d]"
              onClick={() => setStickerOpen((prev) => !prev)}
              type="button"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                <path d="M9 10h.01M15 10h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M8 15c1 1.4 2.4 2 4 2s3-.6 4-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Sticker
            </button>
            <button
              className="inline-flex items-center gap-[5px] rounded-full border border-[#d5dff0] bg-[#f8fbff] px-[10px] py-[5px] text-[11px] font-semibold text-[#34507d]"
              type="button"
              onClick={() => openAttachmentPicker("image/*")}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M8 14l2.5-2.5L14 15l2.5-2.5L19 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="8.5" cy="9" r="1.2" fill="currentColor" />
              </svg>
              Image
            </button>
            <button
              className="inline-flex items-center gap-[5px] rounded-full border border-[#d5dff0] bg-[#f8fbff] px-[10px] py-[5px] text-[11px] font-semibold text-[#34507d]"
              type="button"
              onClick={() => openAttachmentPicker("video/*")}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="3" y="5" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M11 10v4l3-2-3-2Z" fill="currentColor" />
                <path d="M17 10l4-2v8l-4-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Video
            </button>
            <button
              className="inline-flex items-center gap-[5px] rounded-full border border-[#d5dff0] bg-[#f8fbff] px-[10px] py-[5px] text-[11px] font-semibold text-[#34507d]"
              type="button"
              onClick={() => openAttachmentPicker("*/*")}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M7 13.5V8a5 5 0 1110 0v7a4 4 0 11-8 0V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              File
            </button>
            {!recording ? (
              <button
                className="inline-flex items-center gap-[5px] rounded-full border border-[#d5dff0] bg-[#f8fbff] px-[10px] py-[5px] text-[11px] font-semibold text-[#34507d]"
                type="button"
                onClick={startVoiceRecording}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect x="9" y="4" width="6" height="10" rx="3" stroke="currentColor" strokeWidth="2" />
                  <path d="M6 11a6 6 0 0012 0M12 17v3M9 20h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Voice
              </button>
            ) : (
              <button
                className="inline-flex items-center gap-[5px] rounded-full border border-[#ffb3b3] bg-[#fff2f2] px-[10px] py-[5px] text-[11px] font-semibold text-[#d44d4d]"
                type="button"
                onClick={stopVoiceRecording}
              >
                <span className="inline-block h-[8px] w-[8px] rounded-[2px] bg-current" />
                Stop
              </button>
            )}
          </div>

          {stickerOpen && (
            <div className="mb-[8px] flex flex-wrap gap-[8px] rounded-[12px] border border-[#dde6f2] bg-[#f7faff] p-[10px]">
              {stickerPack.map((sticker) => (
                <button
                  key={sticker}
                  type="button"
                  className="grid h-[36px] w-[36px] place-items-center rounded-[10px] border border-[#d7e2f0] bg-white text-[18px]"
                  onClick={() => handleStickerSelect(sticker)}
                >
                  {sticker}
                </button>
              ))}
            </div>
          )}

          {pendingAttachment && (
            <div className="mb-[8px] rounded-[12px] border border-[#dde6f2] bg-[#f7faff] p-[10px]">
              <div className="mb-[6px] text-[11px] font-semibold text-[#2f4870]">
                Tanlangan fayl
              </div>
              {pendingAttachment.kind === "image" && pendingAttachment.previewUrl && (
                <img
                  src={pendingAttachment.previewUrl}
                  alt={pendingAttachment.fileName ?? "preview"}
                  className="max-h-[180px] rounded-[10px]"
                />
              )}
              {pendingAttachment.kind === "video" && pendingAttachment.previewUrl && (
                <video
                  src={pendingAttachment.previewUrl}
                  className="max-h-[200px] rounded-[10px]"
                  controls
                />
              )}
              {pendingAttachment.kind === "audio" && pendingAttachment.previewUrl && (
                <audio src={pendingAttachment.previewUrl} controls className="w-full" />
              )}
              {pendingAttachment.kind === "file" && (
                <div className="inline-flex items-center gap-[6px] text-[12px] text-[#5e627b]">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M7 13.5V8a5 5 0 1110 0v7a4 4 0 11-8 0V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {pendingAttachment.fileName}
                  {pendingAttachment.sizeBytes
                    ? ` (${formatBytes(pendingAttachment.sizeBytes)})`
                    : ""}
                </div>
              )}
              {pendingAttachment.kind === "sticker" && (
                <div className="text-[36px] leading-none">
                  {pendingAttachment.fileName || "STK"}
                </div>
              )}
              <button
                type="button"
                className="mt-[8px] rounded-full border border-[#d5dff0] px-[10px] py-[4px] text-[11px] text-[#5e627b]"
                onClick={clearPendingAttachment}
              >
                Olib tashlash
              </button>
            </div>
          )}

          <div className="flex items-end gap-[8px]">
            <div className="flex flex-1 items-center gap-[8px] rounded-[24px] border border-[#d2dded] bg-[#f8fbff] px-[12px] py-[6px]">
              <input
                className="h-[36px] w-full bg-transparent text-[13px] text-[#24395f] outline-none placeholder:text-[#7d8ea9] disabled:text-[#9aa7bd]"
                placeholder={
                  chatLocked
                    ? "Unlock the lesson to chat"
                    : isTeacher
                    ? "Reply as teacher"
                    : "Xabar yozing..."
                }
                value={chatInput}
                onChange={handleChatInputChange}
                disabled={chatLocked || !isAuthed || recording}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
            </div>

            <button
              className="h-[44px] rounded-[14px] border border-[#d5dff0] bg-[#f8fbff] px-[12px] text-[11px] font-semibold text-[#34507d] disabled:opacity-60"
              type="button"
              onClick={recording ? stopVoiceRecording : startVoiceRecording}
              disabled={chatLocked || !isAuthed || chatUploading || chatSending}
            >
              {recording ? (
                <span className="inline-flex items-center gap-[5px]">
                  <span className="inline-block h-[8px] w-[8px] rounded-[2px] bg-current" />
                  Stop
                </span>
              ) : (
                <span className="inline-flex items-center gap-[5px]">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect x="9" y="4" width="6" height="10" rx="3" stroke="currentColor" strokeWidth="2" />
                    <path d="M6 11a6 6 0 0012 0M12 17v3M9 20h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Voice
                </span>
              )}
            </button>

            <button
              className="h-[44px] rounded-[14px] bg-[#4f7df0] px-[16px] text-[12px] font-semibold text-white transition hover:bg-[#3f6ee2] disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleSendMessage}
              disabled={
                chatLocked ||
                !isAuthed ||
                recording ||
                chatSending ||
                chatUploading ||
                (!chatInput.trim() && !pendingAttachment)
              }
            >
              {chatUploading ? (
                "Uploading"
              ) : chatSending ? (
                "Sending"
              ) : (
                <span className="inline-flex items-center gap-[6px]">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Send
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {!isAuthed && !chatLocked && (
        <div className="px-[12px] pb-[10px] text-[12px] text-[#8a8fa8]">
          Login to join the lesson chat.
        </div>
      )}
    </div>
  );

  const renderDirectChat = () => (
    <div className="flex h-[520px] max-h-[72vh] overflow-hidden rounded-[26px] border border-[#d7e2ef] bg-white shadow-[0_24px_60px_rgba(17,35,80,0.2)]">
      <div className="flex w-full min-h-0 flex-col lg:grid lg:grid-cols-[280px_1fr]">
        <aside className="flex max-h-[180px] shrink-0 flex-col border-b border-[#e3eaf5] bg-[#f8fbff] lg:max-h-none lg:border-b-0 lg:border-r">
          <div className="border-b border-[#e3eaf5] px-[14px] py-[12px]">
            <div className="text-[14px] font-semibold text-[#2f2f7f]">
              Private chat
            </div>
            <div className="mt-[2px] text-[11px] text-[#7f88a3]">
              {isTeacher
                ? "Studentlar bilan alohida yozishma"
                : "Admin bilan shaxsiy yozishma"}
            </div>
            {!isTeacher && (
              <div className="mt-[8px] space-y-[8px]">
                {studentRecipients.length > 0 && (
                  <div className="flex gap-[6px] overflow-x-auto pb-[2px]">
                    {studentRecipients.map((recipient, idx) => {
                      const isActive = studentRecipientId === recipient.id;
                      return (
                        <button
                          key={`recipient-${recipient.id}`}
                          type="button"
                          className={`shrink-0 rounded-full border px-[10px] py-[4px] text-[10px] font-semibold transition ${
                            isActive
                              ? "border-[#4f7df0] bg-[#eef3ff] text-[#355fce]"
                              : "border-[#dbe6f2] bg-white text-[#2f2f7f] hover:bg-[#f7faff]"
                          }`}
                          onClick={() => {
                            setStudentRecipientId(recipient.id);
                            fetchStudentDirectThread("admin", recipient.id).catch(
                              () => {}
                            );
                          }}
                        >
                          {`Admin ${idx + 1}`}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 space-y-[8px] overflow-auto p-[10px]">
            {directLoading ? (
              <div className="rounded-[12px] border border-[#e3eaf5] bg-white px-[12px] py-[12px] text-[12px] text-[#6f83a4]">
                Yuklanmoqda...
              </div>
            ) : directThreads.length === 0 ? (
              <div className="rounded-[12px] border border-dashed border-[#ccd8e8] bg-white px-[12px] py-[14px] text-[12px] text-[#6f83a4]">
                {isTeacher
                  ? "Hozircha private dialog yoq. Student Message bo'limidagi Direct ni ochganda shu yerda chiqadi."
                  : "Admin bilan dialog ochilmadi. Boshqa adminni tanlab ko'ring."}
              </div>
            ) : (
              directThreads.map((thread) => {
                const isActive = activeDirectChatId === thread.id;
                const title = isTeacher
                  ? thread.studentUsername?.trim() ||
                    `Student ${thread.studentId}`
                  : `Admin ${thread.teacherId}`;
                return (
                  <button
                    key={`direct-thread-${thread.id}`}
                    type="button"
                    className={`w-full rounded-[12px] border px-[12px] py-[10px] text-left transition ${
                      isActive
                        ? "border-[#4f7df0] bg-[#eef3ff]"
                        : "border-[#e3eaf5] bg-white hover:border-[#bfd0e8]"
                    }`}
                    onClick={() => setActiveDirectChatId(thread.id)}
                  >
                    <div className="flex items-center justify-between gap-[8px]">
                      <div className="text-[12px] font-semibold text-[#2f2f7f]">
                        {title}
                      </div>
                      {thread.unreadCount > 0 && (
                        <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#4f7df0] px-[5px] text-[10px] font-semibold text-white">
                          {thread.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="mt-[4px] line-clamp-1 text-[11px] text-[#6f83a4]">
                      {thread.lastMessage ?? "Yangi dialog"}
                    </div>
                    <div className="mt-[4px] text-[10px] text-[#9aa8bf]">
                      {thread.lastMessageAt
                        ? new Date(thread.lastMessageAt).toLocaleString()
                        : ""}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <div className="flex min-h-0 flex-1 flex-col bg-[#e9edf5] bg-[radial-gradient(circle_at_1px_1px,rgba(120,138,170,0.2)_1px,transparent_0)] bg-[length:18px_18px]">
          <div className="flex items-center justify-between border-b border-[#dce5f2] bg-white px-[14px] py-[12px]">
            <div className="flex items-center gap-[10px]">
              <div className="grid h-[34px] w-[34px] place-items-center rounded-full bg-[#4f7df0] text-[11px] font-bold text-white">
                {directChatPeerName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="text-[14px] font-semibold text-[#2f2f7f]">
                  {directChatPeerName}
                </div>
                <div className="text-[11px] text-[#7f88a3]">
                  {activeDirectThread
                    ? "Online chat"
                    : "Dialog tanlang yoki avval xabar yuboring"}
                </div>
              </div>
            </div>
            {activeDirectThread && (
              <div className="flex items-center gap-[8px]">
                <div className="text-[11px] text-[#7f88a3]">
                  {directMessages.length} ta xabar
                </div>
                <button
                  type="button"
                  onClick={handleClearDirectMessages}
                  className="rounded-full border border-[#f0c6c6] bg-[#fff3f3] px-[10px] py-[4px] text-[10px] font-semibold text-[#c24a4a] transition hover:bg-[#ffeaea] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={directSending || directUploading || directRecording}
                >
                  Tozalash
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto px-[12px] py-[14px]">
            {directError && (
              <div className="mb-[10px] rounded-[12px] border border-[#ffd6d6] bg-[#fff6f6] px-[12px] py-[10px] text-[12px] text-[#cf4b4b]">
                {directError}
              </div>
            )}

            {!activeDirectThread ? (
              <div className="rounded-[14px] border border-dashed border-[#c8d5ea] bg-white/80 px-[14px] py-[16px] text-[12px] text-[#6f83a4]">
                Private chat uchun dialog tanlang.
              </div>
            ) : directMessages.length === 0 ? (
              <div className="rounded-[14px] border border-dashed border-[#c8d5ea] bg-white/80 px-[14px] py-[16px] text-[12px] text-[#6f83a4]">
                Hali xabar yoq. Suhbatni boshlang.
              </div>
            ) : (
              directMessages.map((message, index) => {
                const isOwn = currentUser?.id
                  ? message.senderId === currentUser.id
                  : isTeacher
                    ? message.senderId === activeDirectThread.teacherId
                    : message.senderId === activeDirectThread.studentId;
                const senderName = isTeacher
                  ? message.senderUsername?.trim() ||
                    (message.senderId === activeDirectThread.teacherId
                      ? "Teacher"
                      : "Student")
                  : message.senderId === activeDirectThread.teacherId
                  ? "Admin"
                  : message.senderUsername?.trim() || "Student";
                const dayKey = getChatDayKey(message.createdAt);
                const prevDayKey =
                  index > 0 ? getChatDayKey(directMessages[index - 1]?.createdAt) : "";
                const showDayDivider = index === 0 || dayKey !== prevDayKey;
                const status = isOwn
                  ? message.isRead
                    ? "O'qildi"
                    : "Yetkazildi"
                  : "";
                return (
                  <React.Fragment key={`direct-message-${message.id}`}>
                    {showDayDivider && (
                      <div className="sticky top-[6px] z-[3] mb-[8px] mt-[2px] flex justify-center">
                        <span className="rounded-full border border-[#d3deed] bg-white/95 px-[10px] py-[3px] text-[10px] font-semibold text-[#5b6d8e] shadow-[0_6px_14px_rgba(18,30,60,0.08)]">
                          {formatChatDayLabel(message.createdAt)}
                        </span>
                      </div>
                    )}
                    <div
                      className={`mb-[10px] flex items-end gap-[8px] ${
                        isOwn ? "justify-end" : "justify-start"
                      }`}
                    >
                      {!isOwn && (
                        <div className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-[#8aa5de] text-[10px] font-bold text-white">
                          {senderName.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div className="max-w-[78%]">
                        <div
                          className={`rounded-[16px] border px-[12px] py-[8px] text-[13px] leading-[1.55] shadow-[0_8px_18px_rgba(10,20,40,0.08)] ${
                            isOwn
                              ? "border-[#a8dca0] bg-[#d9fdd3] text-[#19314f]"
                              : "border-[#dce5f2] bg-white text-[#19314f]"
                          }`}
                        >
                          <div className="mb-[4px] text-[10px] font-semibold text-[#5b6d8e]">
                            {senderName}
                          </div>
                          <div>
                            {renderMessageAttachment(
                              message.attachment,
                              message.content,
                              isOwn
                            )}
                            {message.content &&
                              message.attachment?.kind !== "sticker" && (
                                <div>{message.content}</div>
                              )}
                          </div>
                          <div className="mt-[4px] flex items-center justify-end gap-[8px] text-[10px] text-[#6a7e9f]">
                            {message.createdAt && (
                              <span>{formatTimestamp(message.createdAt)}</span>
                            )}
                            {status && (
                              <span className="rounded-full bg-[#eef2f8] px-[6px] py-[2px] text-[9px] font-semibold text-[#6f81a1]">
                                {status}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {isOwn && (
                        <div className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-[#5fbe76] text-[10px] font-bold text-white">
                          {senderName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                );
              })
            )}
            <div ref={directChatEndRef} />
          </div>

          <div className="max-h-[210px] overflow-auto border-t border-[#dce5f2] bg-white px-[12px] py-[12px]">
            {!isAuthed ? (
              <div className="text-[12px] text-[#8a8fa8]">
                Private chat uchun login qiling.
              </div>
            ) : (
              <div>
                <input
                  ref={directFileInputRef}
                  type="file"
                  className="hidden"
                  accept={directPickerAccept}
                  onChange={handleDirectFileInputChange}
                />

                <div className="mb-[8px] flex gap-[6px] overflow-x-auto pb-[2px]">
                  <button
                    type="button"
                    className="inline-flex items-center gap-[5px] rounded-full border border-[#d5dff0] bg-[#f8fbff] px-[10px] py-[5px] text-[11px] font-semibold text-[#34507d]"
                    onClick={() => setDirectStickerOpen((prev) => !prev)}
                    disabled={!activeDirectThread || directSending || directUploading}
                  >
                    Sticker
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-[5px] rounded-full border border-[#d5dff0] bg-[#f8fbff] px-[10px] py-[5px] text-[11px] font-semibold text-[#34507d]"
                    onClick={() => openDirectAttachmentPicker("image/*")}
                    disabled={!activeDirectThread || directSending || directUploading}
                  >
                    Image
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-[5px] rounded-full border border-[#d5dff0] bg-[#f8fbff] px-[10px] py-[5px] text-[11px] font-semibold text-[#34507d]"
                    onClick={() => openDirectAttachmentPicker("video/*")}
                    disabled={!activeDirectThread || directSending || directUploading}
                  >
                    Video
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-[5px] rounded-full border border-[#d5dff0] bg-[#f8fbff] px-[10px] py-[5px] text-[11px] font-semibold text-[#34507d]"
                    onClick={() => openDirectAttachmentPicker("*/*")}
                    disabled={!activeDirectThread || directSending || directUploading}
                  >
                    File
                  </button>
                </div>

                {directStickerOpen && (
                  <div className="mb-[8px] flex flex-wrap gap-[8px] rounded-[12px] border border-[#dde6f2] bg-[#f7faff] p-[10px]">
                    {stickerPack.map((sticker) => (
                      <button
                        key={`direct-${sticker}`}
                        type="button"
                        className="grid h-[36px] w-[36px] place-items-center rounded-[10px] border border-[#d7e2f0] bg-white text-[18px]"
                        onClick={() => handleDirectStickerSelect(sticker)}
                      >
                        {sticker}
                      </button>
                    ))}
                  </div>
                )}

                {directPendingAttachment && (
                  <div className="mb-[8px] rounded-[12px] border border-[#dde6f2] bg-[#f7faff] p-[10px]">
                    <div className="mb-[6px] text-[11px] font-semibold text-[#2f4870]">
                      Tanlangan fayl
                    </div>
                    {directPendingAttachment.kind === "image" &&
                      directPendingAttachment.previewUrl && (
                        <img
                          src={directPendingAttachment.previewUrl}
                          alt={directPendingAttachment.fileName ?? "preview"}
                          className="max-h-[120px] rounded-[10px]"
                        />
                      )}
                    {directPendingAttachment.kind === "video" &&
                      directPendingAttachment.previewUrl && (
                        <video
                          src={directPendingAttachment.previewUrl}
                          className="max-h-[140px] rounded-[10px]"
                          controls
                        />
                      )}
                    {directPendingAttachment.kind === "audio" &&
                      directPendingAttachment.previewUrl && (
                        <audio
                          src={directPendingAttachment.previewUrl}
                          controls
                          className="w-full"
                        />
                      )}
                    {directPendingAttachment.kind === "file" && (
                      <div className="text-[12px] text-[#5e627b]">
                        {directPendingAttachment.fileName}
                        {directPendingAttachment.sizeBytes
                          ? ` (${formatBytes(directPendingAttachment.sizeBytes)})`
                          : ""}
                      </div>
                    )}
                    {directPendingAttachment.kind === "sticker" && (
                      <div className="text-[36px] leading-none">
                        {directPendingAttachment.fileName || "STK"}
                      </div>
                    )}
                    <button
                      type="button"
                      className="mt-[8px] rounded-full border border-[#d5dff0] px-[10px] py-[4px] text-[11px] text-[#5e627b]"
                      onClick={clearDirectPendingAttachment}
                    >
                      Olib tashlash
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap items-end gap-[8px]">
                  <div className="flex min-w-[220px] flex-1 items-center gap-[8px] rounded-[24px] border border-[#d2dded] bg-[#f8fbff] px-[12px] py-[6px]">
                    <input
                      className="h-[36px] w-full bg-transparent text-[13px] text-[#24395f] outline-none placeholder:text-[#7d8ea9] disabled:text-[#9aa7bd]"
                      placeholder={
                        activeDirectThread
                          ? "Private xabar yozing..."
                          : "Avval dialog tanlang"
                      }
                      value={directInput}
                      onChange={(event) => setDirectInput(event.target.value)}
                      disabled={!activeDirectThread || directSending || directRecording}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          handleSendDirectMessage();
                        }
                      }}
                    />
                  </div>

                  <button
                    className="h-[44px] rounded-[14px] border border-[#d5dff0] bg-[#f8fbff] px-[12px] text-[11px] font-semibold text-[#34507d] disabled:opacity-60"
                    type="button"
                    onClick={directRecording ? stopDirectVoiceRecording : startDirectVoiceRecording}
                    disabled={!activeDirectThread || directUploading || directSending}
                  >
                    {directRecording ? (
                      <span className="inline-flex items-center gap-[5px]">
                        <span className="inline-block h-[8px] w-[8px] rounded-[2px] bg-current" />
                        Stop
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-[5px]">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <rect x="9" y="4" width="6" height="10" rx="3" stroke="currentColor" strokeWidth="2" />
                          <path d="M6 11a6 6 0 0012 0M12 17v3M9 20h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        Voice
                      </span>
                    )}
                  </button>

                  <button
                    className="h-[44px] rounded-[14px] bg-[#4f7df0] px-[16px] text-[12px] font-semibold text-white transition hover:bg-[#3f6ee2] disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={handleSendDirectMessage}
                    disabled={
                      !activeDirectThread ||
                      directSending ||
                      directUploading ||
                      directRecording ||
                      (!directInput.trim() && !directPendingAttachment)
                    }
                  >
                    {directUploading
                      ? "Uploading"
                      : directSending
                        ? "Sending"
                        : "Send"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <section className="min-h-screen bg-[#f6f8fc]">
        <div className="mx-auto w-full max-w-[1200px] px-[24px] py-[40px]">
          <div className="h-[24px] w-[140px] rounded-[8px] bg-[#e4ebf5]" />
          <div className="mt-[24px] h-[420px] rounded-[20px] bg-white shadow-[0_20px_60px_rgba(40,60,100,0.08)]" />
        </div>
      </section>
    );
  }

  if (!course) {
    return (
      <section className="min-h-screen bg-[#f6f8fc]">
        <div className="mx-auto w-full max-w-[1200px] px-[24px] py-[40px] text-center">
          <h2 className="text-[26px] font-semibold text-[#2f2f7f]">
            Course not found
          </h2>
          <button
            className="mt-[16px] rounded-[12px] bg-[#47b9b9] px-[20px] py-[10px] text-[14px] font-semibold text-white"
            onClick={() => navigate("/courses")}
          >
            Back to courses
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-[#eef1f7]">
      {isTeacher && notifOpen && (
        <div
          className="fixed inset-0 z-[120] bg-black/30"
          onClick={() => setNotifOpen(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-[50vw] min-w-[320px] max-w-[520px] overflow-hidden bg-white shadow-[0_30px_80px_rgba(10,20,40,0.35)]"
            ref={notifDrawerRef}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex h-[64px] items-center justify-between border-b border-[#eef2f6] px-[18px]">
              <div>
                <div className="text-[15px] font-semibold text-[#1f2440]">
                  Bildirishnomalar
                </div>
                <div className="text-[11px] text-[#7b7f9a]">
                  {unreadCount} ta yangi xabar
                </div>
              </div>
              <div className="flex items-center gap-[8px]">
                {notifications.length > 0 && (
                  <button
                    className="rounded-full border border-[#dbe6f2] px-[10px] py-[6px] text-[11px] font-semibold text-[#2aa3b2]"
                    onClick={markAllRead}
                  >
                    Hammasini o'qildi
                  </button>
                )}
                <button
                  className="rounded-full bg-[#f1f4f9] px-[10px] py-[6px] text-[11px] text-[#5e627b]"
                  onClick={() => setNotifOpen(false)}
                >
                  Yopish
                </button>
              </div>
            </div>
            <div className="p-[16px]">
              <input
                className="h-[38px] w-full rounded-[12px] border border-[#e4ebf5] px-[12px] text-[12px] outline-none focus:border-[#47b9b9]"
                placeholder="Qidirish: kurs, dars, foydalanuvchi..."
                value={notifSearch}
                onChange={(event) => setNotifSearch(event.target.value)}
              />
            </div>
            <div className="h-[calc(100%-118px)] overflow-auto px-[16px] pb-[18px]">
              {filteredNotifications.length === 0 ? (
                <div className="rounded-[14px] border border-dashed border-[#e6eef7] bg-[#fbfdff] px-[12px] py-[14px] text-[12px] text-[#8a8fa8]">
                  Bildirishnoma yo'q.
                </div>
              ) : (
                <div className="space-y-[10px]">
                  {filteredNotifications.map((note) => (
                    <div
                      key={`note-drawer-${note.id}`}
                      className={`rounded-[14px] border px-[14px] py-[12px] ${
                        note.isRead
                          ? "border-[#edf2f8] bg-[#fbfdff]"
                          : "border-[#47b9b9] bg-[#eefdfb]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-[10px]">
                        <div>
                          <div className="text-[13px] font-semibold text-[#2f2f7f]">
                            {note.courseTitle} · {note.lessonTitle}
                          </div>
                          <div className="mt-[4px] text-[11px] text-[#7b7f9a]">
                            {note.senderUsername
                              ? `${note.senderUsername}: `
                              : ""}
                            {note.messageContent}
                          </div>
                          {note.createdAt && (
                            <div className="mt-[4px] text-[10px] text-[#a0a6b8]">
                              {new Date(note.createdAt).toLocaleString()}
                            </div>
                          )}
                        </div>
                        {!note.isRead && (
                          <span className="mt-[2px] h-[8px] w-[8px] rounded-full bg-[#47b9b9]" />
                        )}
                      </div>
                      <div className="mt-[10px] flex flex-wrap gap-[8px]">
                        <button
                          className="rounded-full bg-[#47b9b9] px-[12px] py-[6px] text-[11px] font-semibold text-white"
                          onClick={() => handleNotificationClick(note)}
                        >
                          Darsga o'tish
                        </button>
                        {!note.isRead && (
                          <button
                            className="rounded-full border border-[#dbe6f2] px-[12px] py-[6px] text-[11px] text-[#2f2f7f]"
                            onClick={() => markNotificationRead(note.id)}
                          >
                            O'qildi
                          </button>
                        )}
                      
                        <button
                          className="rounded-full border border-[#dbe6f2] px-[12px] py-[6px] text-[11px] text-[#2f2f7f]"
                          onClick={() =>
                            setReplyingToId((prev) =>
                              prev === note.id ? null : note.id
                            )
                          }
                        >
                          Javob yozish
                        </button></div>
                      {replyingToId === note.id && (
                        <div className="mt-[10px] rounded-[12px] border border-[#e6eef7] bg-white p-[10px]">
                          <textarea
                            className="h-[70px] w-full resize-none rounded-[10px] border border-[#e4ebf5] px-[10px] py-[8px] text-[12px] outline-none focus:border-[#47b9b9]"
                            placeholder="Teacher javobi..."
                            value={replyText}
                            onChange={(event) => setReplyText(event.target.value)}
                            disabled={replySending}
                          />
                          <div className="mt-[8px] flex justify-end gap-[8px]">
                            <button
                              className="rounded-full border border-[#dbe6f2] px-[12px] py-[6px] text-[11px] text-[#5e627b]"
                              onClick={() => {
                                setReplyingToId(null);
                                setReplyText("");
                              }}
                              disabled={replySending}
                            >
                              Bekor
                            </button>
                            <button
                              className="rounded-full bg-[#47b9b9] px-[14px] py-[6px] text-[11px] font-semibold text-white disabled:opacity-60"
                              onClick={() => handleSendReply(note)}
                              disabled={replySending || !replyText.trim()}
                            >
                              {replySending ? "Yuborilmoqda..." : "Yuborish"}
                            </button>
                          </div>
                        </div>
                      )}

                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="mx-auto w-full max-w-[1440px] px-[24px] py-[26px] font-['Space_Grotesk']">
        <div className="flex flex-wrap items-center justify-between gap-[12px]">
          <button
            className="rounded-[12px] border border-[#dbe6f2] bg-white px-[16px] py-[8px] text-[14px] font-semibold text-[#2f2f7f] transition hover:border-[#47b9b9] hover:text-[#2aa3b2]"
            onClick={() => navigate("/courses")}
          >
            Back to courses
          </button>
          <div className="flex items-center gap-[10px]">
            {isTeacher && (
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  className="relative rounded-full border border-[#dbe6f2] bg-white p-[10px] text-[#2f2f7f] shadow-[0_12px_30px_rgba(40,60,100,0.12)]"
                  onClick={() => setNotifOpen(true)}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
                    <path d="M13.73 21a2 2 0 01-3.46 0" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -right-[2px] -top-[2px] grid h-[18px] w-[18px] place-items-center rounded-full bg-[#ff6b6b] text-[10px] font-semibold text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {false && (
                  <div className="absolute right-0 mt-[12px] w-[320px] rounded-[18px] border border-[#e6eef7] bg-white p-[12px] shadow-[0_24px_60px_rgba(20,40,80,0.18)]">
                    <div className="flex items-center justify-between">
                      <div className="text-[13px] font-semibold text-[#2f2f7f]">
                        O'qituvchi bildirishnomalari
                      </div>
                      {notifications.length > 0 && (
                        <button
                          className="text-[11px] font-semibold text-[#2aa3b2]"
                          onClick={markAllRead}
                        >
                          Hammasini o'qildi
                        </button>
                      )}
                    </div>
                    <div className="mt-[10px] max-h-[260px] space-y-[8px] overflow-auto pr-[4px]">
                      {notifications.length === 0 ? (
                        <div className="rounded-[12px] border border-dashed border-[#e6eef7] bg-[#fbfdff] px-[12px] py-[14px] text-[12px] text-[#8a8fa8]">
                          Yangi xabar yo'q.
                        </div>
                      ) : (
                        notifications.map((note) => (
                          <button
                            key={`note-${note.id}`}
                            className={`w-full rounded-[12px] border px-[12px] py-[10px] text-left text-[12px] transition ${
                              note.isRead
                                ? "border-[#edf2f8] bg-[#fbfdff] text-[#5e627b]"
                                : "border-[#47b9b9] bg-[#eefdfb] text-[#1f3f43]"
                            }`}
                            onClick={() => handleNotificationClick(note)}
                          >
                            <div className="font-semibold text-[#2f2f7f]">
                              {note.courseTitle} · {note.lessonTitle}
                            </div>
                            <div className="mt-[4px] text-[11px] text-[#7b7f9a]">
                              {note.senderUsername
                                ? `${note.senderUsername}: `
                                : ""}
                              {note.messageContent}
                            </div>
                            {note.createdAt && (
                              <div className="mt-[4px] text-[10px] text-[#a0a6b8]">
                                {new Date(note.createdAt).toLocaleString()}
                              </div>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="rounded-full bg-[#e7eff7] px-[14px] py-[6px] text-[12px] font-semibold text-[#2f2f7f]">
              {course.category} / {course.level ?? "Beginner"}
            </div>
          </div>
        </div>

        <div className="relative mt-[18px] overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0b0f1d] via-[#141a33] to-[#0f2f2a] p-[22px] shadow-[0_40px_90px_rgba(10,16,30,0.45)]">
          <div className="pointer-events-none absolute -top-[120px] -left-[120px] h-[280px] w-[280px] rounded-full bg-[#7c5cff]/40 blur-[80px]" />
          <div className="pointer-events-none absolute -bottom-[140px] right-[120px] h-[300px] w-[300px] rounded-full bg-[#3ce2c2]/30 blur-[90px]" />
          <div className="pointer-events-none absolute top-[40px] right-[40px] h-[160px] w-[160px] rounded-full bg-[#ffb347]/30 blur-[70px]" />

          <div className="relative grid gap-[26px] lg:grid-cols-[1.7fr_0.9fr]">
            <div>
              <div className="relative overflow-hidden rounded-[24px] bg-[#0b0f1d] ring-1 ring-white/10 shadow-[0_28px_70px_rgba(0,0,0,0.45)]">
                {currentVideoUrl ? (
                  <video
                    key={currentVideoUrl}
                    controls
                    className="h-[440px] w-full object-cover"
                    poster={course.image}
                  >
                    <source src={currentVideoUrl} type="video/mp4" />
                  </video>
                ) : (
                  <img
                    src={course.image}
                    alt={course.title}
                    className="h-[440px] w-full object-cover"
                  />
                )}
                {lessonLocked && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-[10px] bg-[#0b1220]/70 text-center text-white">
                    <div className="text-[18px] font-semibold">
                      This lesson is locked
                    </div>
                    <div className="text-[13px] text-white/70">
                      Unlock the full course to watch all videos.
                    </div>
                    <button
                      className="mt-[6px] rounded-[12px] bg-[#47b9b9] px-[18px] py-[10px] text-[13px] font-semibold text-white"
                      onClick={handlePurchase}
                      disabled={purchaseLoading}
                    >
                      {purchaseLoading ? "Unlocking..." : "Unlock full course"}
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-[12px] flex flex-wrap items-center justify-between gap-[8px] text-[12px] text-white/70">
                <div>
                  Now playing: {lessonDetail?.title ?? activeLesson?.title}
                </div>
                <div>{lessonDetail?.duration ?? activeLesson?.duration}</div>
              </div>
              <div className="mt-[10px] h-[6px] w-full rounded-full bg-white/20">
                <div className="h-full w-[45%] rounded-full bg-[#8a4dff]" />
              </div>
            </div>

            <aside className="rounded-[20px] bg-white/95 p-[16px] text-[#1f2440] shadow-[0_18px_40px_rgba(10,16,32,0.22)] backdrop-blur">
              <div className="flex items-center justify-between">
                <div className="text-[14px] font-semibold text-[#1f2440]">
                  Course content
                </div>
                {resources.length > 0 && (
                  <span className="rounded-full bg-[#eef3fb] px-[10px] py-[4px] text-[10px] font-semibold text-[#2f2f7f]">
                    Resources
                  </span>
                )}
              </div>
              <div className="mt-[6px] text-[12px] text-[#8a8fa8]">
                {course.lessons?.length ?? 0} lessons
              </div>
              <div className="mt-[12px] max-h-[520px] space-y-[8px] overflow-auto pr-[6px]">
                {(course.lessons ?? []).map((lesson, idx) => {
                  const isActive = activeLesson?.id
                    ? activeLesson.id === lesson.id
                    : activeLesson?.title === lesson.title &&
                      activeLesson?.duration === lesson.duration;
                  return (
                    <button
                      key={`${course.id}-sidebar-${idx}`}
                      className={`flex w-full items-center justify-between rounded-[12px] border px-[12px] py-[10px] text-left text-[12px] transition ${
                        isActive
                          ? "border-[#7c5cff] bg-[#f1edff] text-[#2f2f7f]"
                          : "border-[#edf2f8] bg-[#fbfdff] text-[#5e627b] hover:border-[#c7d9ef]"
                      } ${lesson.locked ? "opacity-60" : ""}`}
                      onClick={() => setActiveLesson(lesson)}
                    >
                      <div>
                        <div className="font-semibold text-[#2f2f7f]">
                          {idx + 1}. {lesson.title}
                        </div>
                        <div className="text-[11px] text-[#8a8fa8]">
                          {lesson.type ?? "video"}
                        </div>
                      </div>
                      <span className="text-[11px] text-[#8a8fa8]">
                        {lesson.locked ? "Locked" : lesson.duration}
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>
          </div>
        </div>

        <div className="mt-[18px] flex flex-wrap gap-[10px]">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`rounded-full px-[16px] py-[8px] text-[13px] font-semibold transition ${
                activeTab === tab
                  ? "bg-[#47b9b9] text-white shadow-[0_12px_24px_rgba(71,185,185,0.35)]"
                  : "border border-[#dbe6f2] bg-white text-[#2f2f7f] hover:border-[#47b9b9] hover:text-[#2aa3b2]"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tabLabel(tab)}
            </button>
          ))}
        </div>

        {activeTab === "Overview" && (
          <div className="mt-[18px] rounded-[18px] bg-white p-[22px] shadow-[0_18px_50px_rgba(40,60,100,0.12)]">
            <h1 className="text-[26px] font-semibold text-[#2f2f7f]">
              {course.title}
            </h1>
            <p className="mt-[10px] text-[15px] leading-[1.7] text-[#5e627b]">
              {course.summary}
            </p>
            <div className="mt-[18px] grid gap-[16px] lg:grid-cols-2">
              <div className="rounded-[18px] border border-[#e6eef7] bg-gradient-to-br from-[#ffffff] via-[#f7fbff] to-[#e7f4ff] p-[18px] shadow-[0_18px_40px_rgba(30,60,90,0.12)]">
                <div className="flex items-start justify-between gap-[12px]">
                  <div>
                    <div className="text-[13px] font-semibold text-[#2f2f7f]">
                      Course rating
                    </div>
                    <div className="mt-[6px] text-[28px] font-extrabold text-[#2f2f7f]">
                      {courseAvg.toFixed(1)}
                      <span className="ml-[8px] text-[12px] font-medium text-[#7a7fa0]">
                        ({courseCount} votes)
                      </span>
                    </div>
                  </div>
                  <div className="grid h-[44px] w-[44px] place-items-center rounded-[14px] bg-[#ffe7bd] text-[#8a5b00]">
                    ★
                  </div>
                </div>
                <div className="mt-[12px] text-[12px] text-[#7a7fa0]">
                  Your rating
                </div>
                <div className="mt-[8px] flex flex-wrap items-center gap-[12px]">
                  {renderStars(
                    courseRating.myRating ?? 0,
                    courseHover,
                    setCourseHover,
                    handleSetCourseRating,
                    ratingBusy || !isAuthed
                  )}
                  {!isAuthed && (
                    <span className="text-[12px] text-[#7a7fa0]">
                      Baholash uchun login qiling
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-[18px] border border-[#e6eef7] bg-gradient-to-br from-[#ffffff] via-[#f8f4ff] to-[#efe7ff] p-[18px] shadow-[0_18px_40px_rgba(30,60,90,0.12)]">
                <div className="flex items-start justify-between gap-[12px]">
                  <div>
                    <div className="text-[13px] font-semibold text-[#2f2f7f]">
                      Teacher rating
                    </div>
                    <div className="mt-[6px] text-[26px] font-extrabold text-[#2f2f7f]">
                      {teacherAvg.toFixed(1)}
                      <span className="ml-[8px] text-[12px] font-medium text-[#7a7fa0]">
                        ({teacherCount} votes)
                      </span>
                    </div>
                    <div className="mt-[6px] text-[12px] text-[#7a7fa0]">
                      {course.instructor}
                    </div>
                  </div>
                  <div className="grid h-[44px] w-[44px] place-items-center rounded-[14px] bg-[#e8dcff] text-[#4b2e8f]">
                    ✓
                  </div>
                </div>
                <div className="mt-[12px] text-[12px] text-[#7a7fa0]">
                  Your rating
                </div>
                <div className="mt-[8px] flex flex-wrap items-center gap-[12px]">
                  {renderStars(
                    teacherRating.myRating ?? 0,
                    teacherHover,
                    setTeacherHover,
                    handleSetTeacherRating,
                    ratingBusy || !isAuthed
                  )}
                  {!isAuthed && (
                    <span className="text-[12px] text-[#7a7fa0]">
                      Baholash uchun login qiling
                    </span>
                  )}
                </div>
              </div>
            </div>
            {ratingError && (
              <div className="mt-[10px] text-[12px] text-[#d44d4d]">
                {ratingError}
              </div>
            )}
            <div className="mt-[18px] grid gap-[16px] sm:grid-cols-2">
              <div className="rounded-[14px] border border-[#e6eef7] bg-[#f8fbff] p-[16px]">
                <div className="text-[13px] font-semibold text-[#2f2f7f]">
                  What you will learn
                </div>
                <ul className="mt-[10px] space-y-[6px] text-[13px] text-[#5e627b]">
                  {course.topics.map((topic, idx) => (
                    <li key={`${course.id}-topic-${idx}`}>- {topic}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[14px] border border-[#e6eef7] bg-[#f8fbff] p-[16px]">
                <div className="text-[13px] font-semibold text-[#2f2f7f]">
                  Course highlights
                </div>
                <ul className="mt-[10px] space-y-[6px] text-[13px] text-[#5e627b]">
                  <li>- {course.lessons?.length ?? 0} lessons</li>
                  <li>- Duration: {course.duration}</li>
                  <li>- Language: {course.language ?? "English"}</li>
                  <li>- Rating: {course.rating ?? 4.7}</li>
                </ul>
              </div>
            </div>

            {renderMaterials()}
          </div>
        )}

        {activeTab === "Messages" && (
          <div className="mt-[18px]">
            <div className="mb-[10px] flex justify-end">
              <div className="inline-flex items-center gap-[4px] rounded-full border border-[#dbe6f2] bg-white p-[4px] shadow-[0_8px_20px_rgba(30,50,90,0.08)]">
                <button
                  type="button"
                  className={`rounded-full px-[12px] py-[6px] text-[12px] font-semibold transition ${
                    messagePaneMode === "group"
                      ? "bg-[#4f7df0] text-white shadow-[0_10px_20px_rgba(79,125,240,0.35)]"
                      : "text-[#2f2f7f] hover:bg-[#f2f6ff]"
                  }`}
                  onClick={() => setMessagePaneMode("group")}
                >
                  # Group chat
                </button>
                <button
                  type="button"
                  className={`rounded-full px-[12px] py-[6px] text-[12px] font-semibold transition ${
                    messagePaneMode === "direct"
                      ? "bg-[#4f7df0] text-white shadow-[0_10px_20px_rgba(79,125,240,0.35)]"
                      : "text-[#2f2f7f] hover:bg-[#f2f6ff]"
                  }`}
                  onClick={() => setMessagePaneMode("direct")}
                >
                  @ Direct chat
                </button>
              </div>
            </div>
            {messagePaneMode === "group" ? renderChat() : renderDirectChat()}
          </div>
        )}

        {activeTab === "Assignments" && (
          <div className="mt-[18px]">{renderAssignments()}</div>
        )}

        {activeTab !== "Overview" &&
          activeTab !== "Messages" &&
          activeTab !== "Assignments" && (
          <div className="mt-[18px] rounded-[18px] bg-white p-[22px] text-[13px] text-[#7b7f9a] shadow-[0_18px_50px_rgba(40,60,100,0.12)]">
            {activeTab} content will appear here.
          </div>
        )}
      </div>
    </section>
  );
}

export default CourseDetail;
