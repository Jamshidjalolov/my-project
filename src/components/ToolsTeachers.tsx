import React from "react";
import girlImage from "../image/lovely-teenage-girl-with-curly-hair-posing-yellow-tshirt-min 1.png";

function ToolsTeachers() {
  return (
    <section className="bg-white mt-[160px] mb-[40px]">
      <div className="mx-auto grid w-full max-w-[1920px] grid-cols-[1.05fr_0.95fr] items-center gap-[80px] px-[60px]">
        <div>
          <h2 className="text-[44px] font-bold leading-[1.2] text-[#2f2f7f]">
            <span className="text-[#20c6bd]">Tools</span> For Teachers
            <br />
            And Learners
          </h2>
          <p className="mt-[24px] max-w-[560px] text-[20px] leading-[1.7] text-[#6b79a0]">
            Class has a dynamic set of teaching tools built to be deployed and
            used during class. Teachers can handout assignments in real-time for
            students to complete and submit.
          </p>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 -z-20 flex flex-wrap gap-[18px] opacity-70">
            {Array.from({ length: 48 }).map((_, i) => (
              <span
                key={i}
                className="h-[8px] w-[8px] rounded-full bg-[#d7dff0]"
              />
            ))}
          </div>
          <div className="absolute -z-10 h-[280px] w-[280px] rounded-full bg-[#ff7c7c]" />
          <div className="absolute right-[40px] top-[10px] h-[14px] w-[14px] rounded-full bg-[#5ee3a2]" />
          <div className="absolute bottom-[40px] left-[20px] h-[16px] w-[16px] rounded-full bg-[#ff9b7c]" />
          <div className="absolute bottom-[10px] right-[60px] h-[14px] w-[14px] rounded-full bg-[#7a6bff]" />

          <div className="relative">
            <div className="absolute left-[-30px] top-[60px] grid h-[56px] w-[56px] place-items-center rounded-[16px] bg-white/90 shadow-[0_14px_30px_rgba(20,40,70,0.15)]">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <rect x="4" y="4" width="6" height="6" rx="1.5" fill="#2f2f7f" />
                <rect x="14" y="4" width="6" height="6" rx="1.5" fill="#2f2f7f" />
                <rect x="4" y="14" width="6" height="6" rx="1.5" fill="#2f2f7f" />
                <rect x="14" y="14" width="6" height="6" rx="1.5" fill="#2f2f7f" />
              </svg>
            </div>
            <div className="absolute right-[-30px] top-[110px] grid h-[56px] w-[56px] place-items-center rounded-[16px] bg-white/90 shadow-[0_14px_30px_rgba(20,40,70,0.15)]">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                stroke="#2f2f7f"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="9" cy="8" r="3" />
                <circle cx="17" cy="9" r="2.5" />
                <path d="M4 20c0-3 3-5 6-5s6 2 6 5" />
                <path d="M14.5 18c.5-1.7 2.3-2.8 4.5-2.8 1.2 0 2.3.3 3 1" />
              </svg>
            </div>

            <img
              src={girlImage}
              alt="Student"
              className="h-[420px] w-[320px] object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default ToolsTeachers;
