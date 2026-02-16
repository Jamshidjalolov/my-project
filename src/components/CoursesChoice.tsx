import React from "react";
import type { Course } from "../types/course";

type Props = {
  courses: Course[];
  onSelect?: (course: Course) => void;
  selectedId?: string | null;
};

function CoursesChoice({ courses, onSelect, selectedId }: Props) {
  return (
    <section className="courses-section courses-choice bg-white py-[70px]">
      <div className="mx-auto w-full max-w-[1920px] px-[40px]">
        <div className="flex items-center justify-between">
          <h2 className="text-[26px] font-semibold text-[#2f2f7f]">
            Get choice of your course
          </h2>
          <button className="text-[14px] font-semibold text-[#45b4c2] transition-colors duration-200 hover:text-[#2aa3b2]">
            See all
          </button>
        </div>

        <div className="mt-[28px] grid grid-cols-4 gap-[24px]">
          {courses.map((card, index) => (
            <article
              key={`${card.id}-${index}`}
              className={`course-card cursor-pointer rounded-[18px] bg-white p-[16px] shadow-[0_22px_60px_rgba(40,60,100,0.12)] transition-transform duration-200 hover:-translate-y-1 hover:shadow-[0_30px_70px_rgba(40,60,100,0.18)] ${
                selectedId === card.id ? "ring-2 ring-[#47b9b9]" : ""
              }`}
              onClick={() => onSelect?.(card)}
            >
              <span className="course-badge course-badge--choice">Best match</span>
              <div className="course-media overflow-hidden rounded-[14px]">
                <img
                  src={card.image}
                  alt={card.title}
                  className="h-[170px] w-full object-cover"
                />
              </div>

              <div className="mt-[12px] flex items-center justify-between text-[12px] text-[#7b7f9a]">
                <div className="flex items-center gap-[6px]">
                  <span className="course-meta-icon inline-block h-[12px] w-[12px] rounded-[3px] border border-[#d7dbe8]" />
                  <span>{card.category}</span>
                </div>
                <div className="flex items-center gap-[6px]">
                  <span className="course-meta-icon inline-block h-[14px] w-[14px] rounded-full border border-[#d7dbe8]" />
                  <span>{card.duration}</span>
                </div>
              </div>

              <h3 className="course-title mt-[10px] text-[16px] font-semibold text-[#2f2f7f]">
                {card.title}
              </h3>
              <p className="course-summary mt-[8px] text-[13px] leading-[1.6] text-[#7b7f9a]">
                {card.summary}
              </p>
              <div className="course-stats mt-[10px]">
                <span className="course-stat">
                  {card.level ?? "Intermediate"}
                </span>
                <span className="course-stat">
                  {card.students ?? "9k"} learners
                </span>
              </div>
              {card.lessons?.length ? (
                <div className="course-lessons mt-[10px]">
                  {card.lessons.slice(0, 2).map((lesson, idx) => (
                    <div
                      key={`${card.id}-lesson-${idx}`}
                      className="flex items-center gap-[6px] text-[12px] text-[#7b7f9a]"
                    >
                      <span className="lesson-dot" />
                      <span className={lesson.locked ? "text-[#b5bacb]" : ""}>
                        {lesson.title}
                      </span>
                      {lesson.locked && (
                        <span className="lesson-lock">Locked</span>
                      )}
                    </div>
                  ))}
                  {card.lessons.length > 2 && (
                    <div className="lesson-more">
                      +{card.lessons.length - 2} more lessons
                    </div>
                  )}
                </div>
              ) : null}

              <div className="mt-[12px] flex items-center justify-between">
                <div className="flex items-center gap-[8px] text-[12px] text-[#2f2f7f]">
                  <div className="course-avatar grid h-[22px] w-[22px] place-items-center rounded-full bg-[#e8f0f6] text-[11px] font-semibold">
                    {card.instructor.charAt(0).toUpperCase()}
                  </div>
                  <span>{card.instructor}</span>
                </div>
                <div className="flex items-center gap-[10px] text-[14px]">
                  {card.oldPrice && (
                    <span className="course-old text-[#b8bccb] line-through">
                      {card.oldPrice}
                    </span>
                  )}
                  <span className="course-price font-semibold text-[#45b4c2]">
                    {card.price}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default CoursesChoice;
