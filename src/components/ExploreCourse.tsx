import React from "react";

import StarRow from "./StarRow";

const courseChips = [
  { label: "Ut Sed Eros", color: "bg-[#ff7a00]" },
  { label: "Curabitur Egestas", color: "bg-[#ff6b6b]" },
  { label: "Quisque Conseq", color: "bg-[#b85a17]" },
  { label: "Cras Convallis", color: "bg-[#ffb000]" },
  { label: "Vestibulum Facili", color: "bg-[#b77dff]" },
  { label: "Ut Sed Eros", color: "bg-[#00a8ff]" },
  { label: "Vestibulum Facili", color: "bg-[#74c0a8]" },
];

const chipTilt = 10.02;

function ExploreCourse() {
  return (
    <section className="mt-[50px] mb-0 w-full max-w-[1920px] bg-transparent mx-auto overflow-hidden">
      <div className="mx-auto w-full max-w-[1920px] px-[60px] py-[60px]">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[38px] font-bold text-[#1f2a37]">
              Explore Course
            </h2>
            <p className="mt-[8px] text-[18px] text-[#6b7280]">
              Ut sed eros finibus, placerat orci id, dapibus.
            </p>
          </div>
          <button className="flex items-center gap-[10px] text-[16px] font-semibold text-[#00a8c9]">
            SEE ALL
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5 12H19"
                stroke="#00a8c9"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M13 6L19 12L13 18"
                stroke="#00a8c9"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className="mt-[36px] flex items-center gap-[12px] text-[18px] font-semibold text-[#1f2a37]">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 3C7.58 3 4 6.58 4 11C4 15.42 7.58 19 12 19C16.42 19 20 15.42 20 11C20 6.58 16.42 3 12 3Z"
              fill="#7d8499"
            />
            <circle cx="9" cy="9" r="1.5" fill="#f5f7fb" />
            <circle cx="14.5" cy="8" r="1.3" fill="#f5f7fb" />
            <circle cx="15.5" cy="12.5" r="1.3" fill="#f5f7fb" />
            <circle cx="10.5" cy="13.5" r="1.3" fill="#f5f7fb" />
          </svg>
          Lorem Ipsum
        </div>

        <div className="relative mt-[30px]">
          <div className="absolute -bottom-[6px] left-[20px] h-[24px] w-[440px] rounded-full bg-[#d8e6f6]" />

          <div className="flex items-end gap-[16px]">
            {courseChips.map((chip, index) => (
              <div
                key={`${chip.label}-${index}`}
                className="relative rounded-[22px] bg-white p-[12px] shadow-[0_16px_30px_rgba(16,24,40,0.1)]"
                style={{
                  width: "104.3941866857977px",
                  height: "418.42580858485815px",
                  transform: `rotate(${chipTilt}deg)`,
                }}
              >
                <div
                  className="absolute left-[12px] top-[12px] rounded-[18px] bg-[#c8f7b2]"
                  style={{ width: "80px", height: "382px" }}
                />
                <div
                  className={`absolute left-[16px] top-[22px] rounded-[16px] ${chip.color}`}
                  style={{
                    width: "72px",
                    height: "354px",
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[16px] font-semibold text-white [writing-mode:vertical-rl]">
                    {chip.label}
                  </span>
                </div>
              </div>
            ))}

            <div
              className="ml-[30px] rounded-[26px] border border-[#7bb9c9] bg-white p-[20px] shadow-[0_20px_40px_rgba(16,24,40,0.12)]"
              style={{
                width: "684.7810668945312px",
                height: "429.61175537109375px",
              }}
            >
              <div className="flex gap-[16px]">
                <div className="relative h-[290px] w-[190px] overflow-hidden rounded-[18px] bg-[#f3f4f6]">
                  <img
                    src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop"
                    alt="Food"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="h-[110px] w-[110px] rounded-full bg-white/90 text-center text-[14px] font-bold text-[#ff9b24] shadow-[0_12px_24px_rgba(0,0,0,0.15)]">
                      <div className="mt-[28px]">LOREM</div>
                      <div>IPSUM</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-[8px]">
                  <h3 className="text-[40px] font-bold text-[#1f2a37] leading-[1.2]">
                    Integer id Orc Sed Ante Tincidunt
                  </h3>
                  <p className="text-[22px] leading-[1.6] text-[#6b7280]">
                    Cras convallis lacus orci, tristique tincidunt magna
                    fringilla at faucibus vel.
                  </p>
                  <div className="flex items-center justify-between">
                    <StarRow className="text-[#f6b54c]" size={18} />
                    <div className="text-[18px] font-semibold">$ 450</div>
                  </div>
                  <button className="mt-[10px] rounded-full border border-[#5ecbe0] px-[22px] py-[10px] text-[16px] font-semibold text-[#00a8c9]">
                    EXPLORE
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ExploreCourse;

