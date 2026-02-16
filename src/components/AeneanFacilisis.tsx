import React from "react";

import StarRow from "./StarRow";

const courseChipsLeft = [
  { label: "Ut Sed Eros", color: "bg-[#ff7a00]" },
];

const courseChipsRight = [
  { label: "Curabitur Egestas", color: "bg-[#ff6b6b]" },
  { label: "Quisque Conseq", color: "bg-[#b85a17]" },
  { label: "Cras Convallis", color: "bg-[#ffb000]" },
  { label: "Vestibulum", color: "bg-[#2e8b9b]" },
  { label: "Ut Sed Eros", color: "bg-[#00a8ff]" },
  { label: "Vestibulum", color: "bg-[#74c0a8]" },
];

const chipTilt = 10.02;

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <div
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
        className={`absolute left-[16px] top-[22px] rounded-[16px] ${color}`}
        style={{
          width: "72px",
          height: "354px",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[16px] font-semibold text-white [writing-mode:vertical-rl]">
          {label}
        </span>
      </div>
    </div>
  );
}

function AeneanFacilisis() {
  return (
    <section className="bg-transparent mt-0">
      <div className="mx-auto w-full max-w-[1920px] px-[60px] py-[60px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-[12px] text-[22px] font-semibold text-[#1f2a37]">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle cx="12" cy="8" r="4" fill="#f6b54c" />
              <path
                d="M9 12L7 20L12 17L17 20L15 12"
                fill="#ff7a6b"
              />
            </svg>
            Aenean Facilisis
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

        <div className="relative mt-[28px]">
          <div className="absolute -bottom-[2px] left-[0px] h-[16px] w-[240px] rounded-full bg-[#d8e6f6] z-0" />

          <div className="flex items-end gap-[18px]">
            {courseChipsLeft.map((chip, index) => (
              <Chip key={`${chip.label}-${index}`} label={chip.label} color={chip.color} />
            ))}

            <div
              className="mx-[20px] rounded-[26px] border border-[#41b8c9] bg-white p-[24px] shadow-[0_20px_40px_rgba(16,24,40,0.12)] z-10"
              style={{
                width: "684.7810668945312px",
                height: "429.61175537109375px",
              }}
            >
              <div className="flex gap-[20px]">
                <div className="relative h-[190px] w-[210px] overflow-hidden rounded-[18px] bg-[#f3f4f6]">
                  <img
                    src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=800&auto=format&fit=crop"
                    alt="Camera"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex flex-col justify-end p-[16px]">
                    <div className="text-[22px] font-bold text-white">
                      LOREM IPSUM
                    </div>
                    <div className="text-[12px] text-white/80">
                      Lorem ipsum dolor sit amet
                    </div>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-[10px]">
                  <h3 className="text-[40px] font-bold leading-[1.2] text-[#1f2a37]">
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
                  <button className="mt-[6px] rounded-full border border-[#5ecbe0] px-[22px] py-[10px] text-[16px] font-semibold text-[#00a8c9]">
                    EXPLORE
                  </button>
                </div>
              </div>
            </div>

            {courseChipsRight.map((chip, index) => (
              <Chip key={`${chip.label}-right-${index}`} label={chip.label} color={chip.color} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default AeneanFacilisis;

