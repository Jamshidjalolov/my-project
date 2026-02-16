import React from "react";

const avatars = [
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=300&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=300&auto=format&fit=crop",
];

function ClassManagement() {
  return (
    <section className="bg-white mt-[170px] mb-[40px]">
      <div className="mx-auto grid w-full max-w-[1920px] grid-cols-[1fr_1fr] items-center gap-[80px] px-[60px]">
        <div>
          <h2 className="text-[44px] font-bold leading-[1.2] text-[#2f2f7f]">
            <span className="text-[#20c6bd]">Class Management</span>
            <br />
            Tools for Educators
          </h2>
          <p className="mt-[24px] max-w-[560px] text-[20px] leading-[1.7] text-[#6b79a0]">
            Class provides tools to help run and manage the class such as Class
            Roster, Attendance, and more. With the Gradebook, teachers can
            review and grade tests and quizzes in real-time.
          </p>
        </div>

        <div className="relative">
          <div className="absolute -left-[30px] -top-[20px] h-[90px] w-[90px] rounded-full bg-[#a6d7ff]" />
          <div className="absolute right-[10px] top-[10px] h-[18px] w-[18px] rounded-full bg-[#9fd3ff]" />
          <div className="absolute right-[40px] top-[35px] h-[10px] w-[10px] rounded-full bg-[#9fd3ff]" />

          <div className="relative rounded-[24px] bg-white p-[26px] shadow-[0_30px_70px_rgba(20,40,70,0.12)]">
            <div className="flex items-center justify-between rounded-[18px] bg-[#58a9e8] px-[28px] py-[14px] text-[20px] font-semibold text-white">
              <span className="grid h-[42px] w-[42px] place-items-center rounded-full bg-white/80">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="#f6b54c"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path d="M10 1.5l2.35 4.76 5.25.76-3.8 3.7.9 5.24L10 13.98l-4.7 2.48.9-5.24-3.8-3.7 5.25-.76L10 1.5z" />
                </svg>
              </span>
              GradeBook
              <span className="grid h-[42px] w-[42px] place-items-center rounded-full bg-white/80">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  stroke="#2f7bf4"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M4 5a3 3 0 0 1 3-3h10a2 2 0 0 1 2 2v16a1 1 0 0 0-1-1H7a3 3 0 0 0-3 3V5z" />
                  <path d="M7 2v17" />
                </svg>
              </span>
            </div>

            <div className="mt-[26px] space-y-[26px]">
              <div className="relative h-[14px] rounded-full bg-[#3dc0f2]">
                <div className="absolute -top-[22px] left-[25%] flex items-center gap-[10px]">
                  <img
                    src={avatars[0]}
                    alt="Student"
                    className="h-[44px] w-[44px] rounded-full object-cover"
                  />
                  <span className="rounded-full bg-[#cfefff] px-[18px] py-[6px] text-[18px] font-semibold text-[#5b6bff]">
                    100
                  </span>
                </div>
              </div>

              <div className="relative h-[14px] rounded-full bg-[#3d7cff]">
                <div className="absolute -top-[22px] left-[55%] flex items-center gap-[10px]">
                  <img
                    src={avatars[1]}
                    alt="Student"
                    className="h-[44px] w-[44px] rounded-full object-cover"
                  />
                  <span className="rounded-full bg-[#d7e8ff] px-[18px] py-[6px] text-[18px] font-semibold text-[#5b6bff]">
                    9
                  </span>
                </div>
              </div>

              <div className="relative h-[14px] rounded-full bg-[#63e64b]">
                <div className="absolute -top-[22px] left-[40%] flex items-center gap-[10px]">
                  <img
                    src={avatars[2]}
                    alt="Student"
                    className="h-[44px] w-[44px] rounded-full object-cover"
                  />
                  <span className="rounded-full bg-[#d6f6c9] px-[18px] py-[6px] text-[18px] font-semibold text-[#4d8a3a]">
                    85
                  </span>
                </div>
              </div>

              <div className="relative h-[14px] rounded-full bg-[#f25858]">
                <div className="absolute -top-[22px] right-[10%] flex items-center gap-[10px]">
                  <img
                    src={avatars[0]}
                    alt="Student"
                    className="h-[44px] w-[44px] rounded-full object-cover"
                  />
                  <span className="rounded-full bg-[#ffd4d4] px-[18px] py-[6px] text-[18px] font-semibold text-[#d44d4d]">
                    75
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-[26px] flex justify-end">
              <button className="rounded-full bg-[#5b6bff] px-[34px] py-[12px] text-[18px] font-semibold text-white shadow-[0_16px_36px_rgba(45,70,180,0.25)]">
                Export
              </button>
            </div>
          </div>

          <div className="absolute -left-[20px] bottom-[10px] h-[80px] w-[80px] rounded-[16px] bg-[#cfe2ff]" />
          <div className="absolute -left-[6px] bottom-[34px] h-[30px] w-[30px] rounded-full border-[3px] border-[#a1c7ff]" />
        </div>
      </div>
    </section>
  );
}

export default ClassManagement;
