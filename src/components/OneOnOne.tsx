import React from "react";

const imgLeft =
  "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=600&auto=format&fit=crop";
const imgRight =
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=600&auto=format&fit=crop";

function OneOnOne() {
  return (
    <section className="bg-white mt-[145px] mb-[40px]">
      <div className="mx-auto grid w-full max-w-[1920px] grid-cols-[0.95fr_1.05fr] items-center gap-[80px] px-[60px]">
        <div className="relative">
          <div className="absolute -left-[26px] -top-[26px] h-[140px] w-[140px] rounded-full bg-[#6fb7ff]" />
          <div className="absolute left-[120px] top-[-20px] h-[70px] w-[70px] rounded-full border-[14px] border-[#2fb4e9]" />
          <div className="absolute right-[-16px] top-[40px] h-[16px] w-[16px] rotate-45 bg-[#ff9b5c]" />

          <div className="relative rounded-[24px] bg-white p-[26px] shadow-[0_30px_70px_rgba(20,40,70,0.12)]">
            <div className="mb-[20px] flex items-center gap-[10px] rounded-full bg-[#f0f1f4] px-[18px] py-[10px]">
              <span className="h-[10px] w-[10px] rounded-full bg-[#f26b6b]" />
              <span className="h-[10px] w-[10px] rounded-full bg-[#f2c14e]" />
              <span className="h-[10px] w-[10px] rounded-full bg-[#67d96b]" />
            </div>

            <div className="grid grid-cols-[1fr_1fr] gap-[22px]">
              <div className="overflow-hidden rounded-[18px] shadow-[0_12px_26px_rgba(20,40,70,0.12)]">
                <img
                  src={imgLeft}
                  alt="Participant"
                  className="h-[170px] w-full object-cover"
                />
              </div>
              <div className="overflow-hidden rounded-[18px] shadow-[0_12px_26px_rgba(20,40,70,0.12)]">
                <img
                  src={imgRight}
                  alt="Participant"
                  className="h-[170px] w-full object-cover"
                />
              </div>
            </div>

            <div className="mt-[18px] flex items-center justify-between">
              <div>
                <div className="text-[20px] font-semibold text-[#5a5b90]">
                  Private Discussion
                </div>
                <div className="text-[14px] text-[#8a90a6]">
                  Your video can't be seen by others
                </div>
              </div>
              <button className="rounded-full bg-[#f25b5b] px-[26px] py-[10px] text-[16px] font-semibold text-white shadow-[0_16px_36px_rgba(242,91,91,0.35)]">
                End Discussion
              </button>
            </div>
          </div>

          <div className="absolute left-[-40px] top-[70px] grid h-[70px] w-[70px] place-items-center rounded-full bg-white shadow-[0_20px_50px_rgba(20,40,70,0.15)]">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              stroke="#2f7bf4"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="9" cy="8" r="3" />
              <circle cx="17" cy="9" r="2.5" />
              <path d="M4 20c0-3 3-5 6-5s6 2 6 5" />
              <path d="M14.5 18c.5-1.7 2.3-2.8 4.5-2.8 1.2 0 2.3.3 3 1" />
            </svg>
          </div>
        </div>

        <div>
          <h2 className="text-[44px] font-bold leading-[1.2] text-[#2f2f7f]">
            One-on-One <span className="text-[#20c6bd]">Discussions</span>
          </h2>
          <p className="mt-[20px] max-w-[520px] text-[20px] leading-[1.7] text-[#6b79a0]">
            Teachers and teacher assistants can talk with students privately
            without leaving the Zoom environment.
          </p>
        </div>

        <div className="col-span-2 mt-[100px] flex justify-center">
          <button className="rounded-full border border-[#5ecbe0] px-[40px] py-[14px] text-[18px] font-semibold text-[#5ecbe0]">
            See more features
          </button>
        </div>
      </div>
    </section>
  );
}

export default OneOnOne;

