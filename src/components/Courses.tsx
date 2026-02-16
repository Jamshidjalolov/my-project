import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import iconImage from "../image/icon 2.png";
import CoursesExtra from "./CoursesExtra";
import CoursesRecommended from "./CoursesRecommended";
import CoursesChoice from "./CoursesChoice";
import CoursesCta from "./CoursesCta";
import CoursesPersonal from "./CoursesPersonal";
import CoursesViewing from "./CoursesViewing";
import NewsletterFooter from "./NewsletterFooter";
import type { Course } from "../types/course";
import { coursesSeed } from "../data/courses";

function Courses() {
  const [userName, setUserName] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{
    id: number;
    username: string;
    roles: string[];
  } | null>(null);
  const [notifications, setNotifications] = useState<
    {
      id: number;
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("All");
  const [allCourses, setAllCourses] = useState<Course[]>(coursesSeed);
  const [categoryCourses, setCategoryCourses] = useState<Course[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [loadingCategory, setLoadingCategory] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const categoryPalette = [
    "#cfeeee",
    "#cfd6ff",
    "#dbe9ff",
    "#c5f1ea",
    "#ffe1b8",
    "#ffd3d3",
    "#cfd0d8",
    "#c5f1ea",
  ];

  const courseCategories = useMemo(() => {
    if (categories.length) {
      return ["All", ...categories];
    }
    return ["All", ...Array.from(new Set(allCourses.map((c) => c.category)))];
  }, [categories, allCourses]);

  const topCourses =
    activeCategory === "All" ? allCourses : categoryCourses;

  const baseCourses = allCourses.length ? allCourses : coursesSeed;
  const sectionCourses = useMemo(() => {
    if (!baseCourses.length) {
      return {
        recommended: [],
        choice: [],
        personal: [],
        viewing: [],
      };
    }
    const take = (start: number, size: number) =>
      Array.from({ length: size }, (_, idx) => {
        const i = (start + idx) % baseCourses.length;
        return baseCourses[i];
      });
    return {
      recommended: take(0, 4),
      choice: take(4, 4),
      personal: take(8, 4),
      viewing: take(12, 4),
    };
  }, [baseCourses]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setUserName(null);
      setCurrentUser(null);
      return;
    }
    fetch("http://127.0.0.1:8000/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.username) {
          setUserName(data.username);
          setCurrentUser({
            id: data.id,
            username: data.username,
            roles: Array.isArray(data.roles) ? data.roles : [],
          });
        } else {
          setUserName(null);
          setCurrentUser(null);
        }
      })
      .catch(() => {
        setUserName(null);
        setCurrentUser(null);
      });
  }, []);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/courses/categories")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length) {
          setCategories(data);
        }
      })
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setLoadingAll(true);
    const token = localStorage.getItem("access_token");
    fetch("http://127.0.0.1:8000/courses", {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const normalized = data.map((raw) => ({
            id: raw.id,
            title: raw.title,
            image: raw.image,
            category: raw.category,
            duration: raw.duration,
            price: raw.price,
            oldPrice: raw.old_price ?? raw.oldPrice,
            instructor: raw.instructor,
            summary: raw.summary,
            topics: raw.topics ?? [],
            level: raw.level,
            rating: raw.rating,
            ratingCount: raw.rating_count ?? raw.ratingCount,
            teacherRating: raw.teacher_rating ?? raw.teacherRating,
            teacherRatingCount:
              raw.teacher_rating_count ?? raw.teacherRatingCount,
            students: raw.students,
            language: raw.language,
            lessons: (raw.lessons ?? []).map((lesson: any) => ({
              ...lesson,
              videoUrl: lesson.video_url ?? lesson.videoUrl,
              position: lesson.position,
              isFree: lesson.is_free ?? lesson.isFree,
              locked: Boolean(lesson.locked),
            })),
            codeSamples: raw.code_samples ?? raw.codeSamples ?? [],
            freeLessons: raw.free_lessons ?? raw.freeLessons,
            isPurchased: raw.is_purchased ?? raw.isPurchased,
          }));
          setAllCourses(normalized);
        } else {
          setAllCourses(coursesSeed);
        }
      })
      .catch(() => setAllCourses(coursesSeed))
      .finally(() => setLoadingAll(false));
  }, []);

  useEffect(() => {
    if (activeCategory === "All") {
      setCategoryCourses([]);
      return;
    }
    setLoadingCategory(true);
    const token = localStorage.getItem("access_token");
    fetch(
      `http://127.0.0.1:8000/courses?category=${encodeURIComponent(
        activeCategory
      )}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const normalized = data.map((raw) => ({
            id: raw.id,
            title: raw.title,
            image: raw.image,
            category: raw.category,
            duration: raw.duration,
            price: raw.price,
            oldPrice: raw.old_price ?? raw.oldPrice,
            instructor: raw.instructor,
            summary: raw.summary,
            topics: raw.topics ?? [],
            level: raw.level,
            rating: raw.rating,
            ratingCount: raw.rating_count ?? raw.ratingCount,
            teacherRating: raw.teacher_rating ?? raw.teacherRating,
            teacherRatingCount:
              raw.teacher_rating_count ?? raw.teacherRatingCount,
            students: raw.students,
            language: raw.language,
            lessons: (raw.lessons ?? []).map((lesson: any) => ({
              ...lesson,
              videoUrl: lesson.video_url ?? lesson.videoUrl,
              position: lesson.position,
              isFree: lesson.is_free ?? lesson.isFree,
              locked: Boolean(lesson.locked),
            })),
            codeSamples: raw.code_samples ?? raw.codeSamples ?? [],
            freeLessons: raw.free_lessons ?? raw.freeLessons,
            isPurchased: raw.is_purchased ?? raw.isPurchased,
          }));
          setCategoryCourses(normalized);
        } else {
          setCategoryCourses([]);
        }
      })
      .catch(() => setCategoryCourses([]))
      .finally(() => setLoadingCategory(false));
  }, [activeCategory]);

  useEffect(() => {
    if (!courseCategories.includes(activeCategory)) {
      setActiveCategory("All");
    }
  }, [activeCategory, courseCategories]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!menuRef.current || !target) return;
      if (!menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

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

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    setUserName(null);
    setCurrentUser(null);
    setMenuOpen(false);
    navigate("/login");
  };

  const isTeacher = Boolean(
    currentUser?.roles?.some((role) => role === "teacher" || role === "admin")
  );
  const unreadCount = notifications.filter((item) => !item.isRead).length;
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
    navigate(`/courses/${note.courseId}?lesson=${note.lessonId}`);
  };

  const handleStartReply = (noteId: number) => {
    setReplyingToId(noteId);
    setReplyText("");
  };

  const handleSendReply = async (note: (typeof notifications)[number]) => {
    const token = localStorage.getItem("access_token");
    if (!token || !replyText.trim()) return;
    setReplySending(true);
    try {
      let res = await fetch(
        `http://127.0.0.1:8000/lessons/${note.lessonId}/teacher/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content: replyText.trim() }),
        }
      );
      if (!res.ok && res.status == 404) {
        res = await fetch(
          `http://127.0.0.1:8000/lessons/${note.lessonId}/messages`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ content: replyText.trim() }),
          }
        );
      }
      if (!res.ok) return;
      await markNotificationRead(note.id);
      setReplyingToId(null);
      setReplyText("");
      fetchNotifications();
    } finally {
      setReplySending(false);
    }
  };


  useEffect(() => {
    if (!isTeacher) return;
    fetchNotifications();
    const interval = window.setInterval(fetchNotifications, 10000);
    return () => window.clearInterval(interval);
  }, [isTeacher]);

  const handleCourseClick = (course: Course) => {
    navigate(`/courses/${course.id}`);
  };

  return (
    <>
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
      <section className="bg-white py-[30px]">
        <div className="mx-auto w-full max-w-[1920px] px-[40px]">
          <header className="mb-[26px] flex items-center justify-between">
            <div className="flex items-center gap-[10px] px-[8px] py-[6px] text-[16px] font-extrabold tracking-[2px] text-black">
              <img
                src={iconImage}
                alt="Logo"
                className="h-[48px] w-[66px] rounded-[6px]"
              />
            </div>
            <nav className="flex items-center gap-8 text-[15px] font-semibold text-[#2f2f7f]">
              <Link to="/" className="text-[#2f2f7f] no-underline">
                Home
              </Link>
              <Link to="/courses" className="text-[#2f2f7f] no-underline">
                Courses
              </Link>
              <a href="#" className="text-[#2f2f7f] no-underline">
                Careers
              </a>
              <a href="#" className="text-[#2f2f7f] no-underline">
                Blog
              </a>
              <a href="#" className="text-[#2f2f7f] no-underline">
                About Us
              </a>
            </nav>
            <div className="flex items-center gap-[10px] text-[#2f2f7f]">
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
                    <div className="absolute right-0 mt-[12px] w-[320px] rounded-[18px] border border-[#e6eef7] bg-white p-[12px] shadow-[0_24px_60px_rgba(20,40,80,0.18)] z-[70]">
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
              {userName ? (
                <div className="relative" ref={menuRef}>
                  <button
                    type="button"
                    className="flex items-center gap-[10px] text-[#2f2f7f]"
                    onClick={() => setMenuOpen((prev) => !prev)}
                  >
                    <div className="grid h-[40px] w-[40px] place-items-center overflow-hidden rounded-full bg-[#e8f0f6] text-[14px] font-semibold text-[#2f2f7f]">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[16px] font-semibold">{userName}</span>
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M6 9L12 15L18 9"
                        stroke="#2f2f7f"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>

                  {menuOpen && (
                    <div className="absolute right-0 mt-[10px] w-[210px] rounded-[16px] bg-white p-[10px] text-[#2f2f7f] shadow-[0_22px_60px_rgba(40,60,100,0.18)] z-[60]">
                      <div className="absolute -top-[7px] right-[16px] h-[14px] w-[14px] rotate-45 bg-white shadow-[-6px_-6px_14px_rgba(40,60,100,0.06)]" />
                      <button
                        type="button"
                        className="w-full rounded-[10px] px-[12px] py-[8px] text-left text-[14px] hover:bg-[#eef3f8]"
                      >
                        Profile
                      </button>
                      <button
                        type="button"
                        className="w-full rounded-[10px] px-[12px] py-[8px] text-left text-[14px] hover:bg-[#eef3f8]"
                      >
                        Settings
                      </button>
                      <div className="my-[6px] h-[1px] bg-[#eef2f6]" />
                      <button
                        type="button"
                        className="w-full rounded-[10px] px-[12px] py-[8px] text-left text-[14px] text-[#d44d4d] hover:bg-[#fff1f1]"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          handleLogout();
                        }}
                      >
                        Log out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="rounded-[30px] bg-white px-[28px] py-[11px] text-[15px] font-bold text-[#2b5b60] shadow-[0_20px_60px_rgba(12,39,44,0.18)]"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="rounded-[30px] bg-[#7bd3d6] px-[28px] py-[11px] text-[15px] font-bold text-[#19484d]"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </header>

          <div className="category-bar mt-[14px]">
            {courseCategories.map((category, idx) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`category-pill ${
                  activeCategory === category ? "is-active" : ""
                }`}
                style={
                  {
                    "--cat-color": categoryPalette[idx % categoryPalette.length],
                  } as React.CSSProperties
                }
              >
                <span className="category-icon">
                  {category.charAt(0).toUpperCase()}
                </span>
                <span>{category}</span>
              </button>
            ))}
          </div>

          <div className="rounded-[18px] border border-[#6ab7ff] bg-[#eaf4ff] px-[28px] py-[24px] shadow-[0_20px_60px_rgba(40,60,100,0.12)]">
            <div className="flex items-center justify-between">
              <h2 className="text-[26px] font-semibold text-[#2f2f7f]">
                Welcome back, ready for your next lesson?
              </h2>
              <button className="text-[14px] font-semibold text-[#45b4c2] transition-colors duration-200 hover:text-[#2aa3b2]">
                View history
              </button>
            </div>

            <div className="mt-[18px] grid grid-cols-3 gap-[22px]">
              {(activeCategory === "All" ? loadingAll : loadingCategory) &&
                topCourses.length === 0 && (
                <div className="col-span-3 rounded-[16px] bg-white p-[24px] text-center text-[14px] text-[#7b7f9a]">
                  Loading courses...
                </div>
              )}
              {!(activeCategory === "All" ? loadingAll : loadingCategory) &&
                topCourses.length === 0 && (
                <div className="col-span-3 rounded-[16px] bg-white p-[24px] text-center text-[14px] text-[#7b7f9a]">
                  No courses found for this category.
                </div>
              )}
              {topCourses.map((course) => (
                <article
                  key={course.id}
                  className="course-card cursor-pointer rounded-[16px] bg-white p-[16px] shadow-[0_20px_60px_rgba(40,60,100,0.12)] transition-transform duration-200 hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(40,60,100,0.18)]"
                  onClick={() => handleCourseClick(course)}
                >
                  <div className="course-media overflow-hidden rounded-[14px]">
                    <img
                      src={course.image}
                      alt={course.title}
                      className="h-[180px] w-full object-cover"
                    />
                  </div>

                  <h3 className="course-title mt-[12px] text-[16px] font-semibold text-[#2f2f7f]">
                    {course.title}
                  </h3>
                  {course.lessons?.length ? (
                    <div className="course-lessons mt-[10px]">
                      {course.lessons.slice(0, 2).map((lesson, idx) => (
                        <div
                          key={`${course.id}-lesson-${idx}`}
                          className="flex items-center gap-[6px] text-[12px] text-[#7b7f9a]"
                        >
                          <span className="lesson-dot" />
                          <span
                            className={lesson.locked ? "text-[#b5bacb]" : ""}
                          >
                            {lesson.title}
                          </span>
                          {lesson.locked && (
                            <span className="lesson-lock">Locked</span>
                          )}
                        </div>
                      ))}
                      {course.lessons.length > 2 && (
                        <div className="lesson-more">
                          +{course.lessons.length - 2} more lessons
                        </div>
                      )}
                    </div>
                  ) : null}

                  <div className="mt-[12px] flex items-center gap-[8px] text-[13px] text-[#2f2f7f]">
                    <div className="course-avatar grid h-[26px] w-[26px] place-items-center overflow-hidden rounded-full bg-[#e8f0f6] text-[12px] font-semibold text-[#2f2f7f]">
                      {userName ? userName.charAt(0).toUpperCase() : "U"}
                    </div>
                    <span>{course.instructor}</span>
                  </div>

                  <div className="mt-[12px]">
                    <div className="h-[6px] w-full rounded-full bg-[#e2e2e2]">
                      <div className="h-[6px] w-[70%] rounded-full bg-[#47b9b9]" />
                    </div>
                    <div className="mt-[6px] text-right text-[12px] text-[#7a7fa0]">
                      {course.duration}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-[18px] flex justify-end gap-[10px]">
              <button className="grid h-[36px] w-[36px] place-items-center rounded-[6px] bg-[#a9d9d9] text-white transition-all duration-200 hover:bg-[#8bcaca] hover:shadow-[0_12px_24px_rgba(71,185,185,0.35)]">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M15 6L9 12L15 18"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button className="grid h-[36px] w-[36px] place-items-center rounded-[6px] bg-[#47b9b9] text-white transition-all duration-200 hover:bg-[#2aa3b2] hover:shadow-[0_12px_24px_rgba(71,185,185,0.35)]">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M9 6L15 12L9 18"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>
      <CoursesExtra
        categories={courseCategories.filter((item) => item !== "All")}
        activeCategory={activeCategory}
        onSelect={setActiveCategory}
      />
      <div className="bg-[#eaf4ff]">
        <CoursesRecommended
          courses={sectionCourses.recommended}
          onSelect={handleCourseClick}
        />
        <CoursesChoice
          courses={sectionCourses.choice}
          onSelect={handleCourseClick}
        />
      </div>
      <CoursesCta />
      <div className="bg-[#eaf4ff]">
        <CoursesPersonal
          courses={sectionCourses.personal}
          onSelect={handleCourseClick}
        />
        <CoursesViewing
          courses={sectionCourses.viewing}
          onSelect={handleCourseClick}
        />
      </div>
      <NewsletterFooter />

    </>
  );
}

export default Courses;

