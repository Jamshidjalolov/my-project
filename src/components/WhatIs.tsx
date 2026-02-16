import React from "react";

const leftImage =
  "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=1200&auto=format&fit=crop";
const rightImage =
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop";

function WhatIs() {
  return (
    <section className="bg-white mt-[150px] mb-[40px]">
      <div className="mx-auto w-full max-w-[1920px] px-[60px] text-center">
        <h2 className="text-[48px] font-bold text-[#2f2f7f]">
          What is <span className="text-[#20c6bd]">TOTC?</span>
        </h2>
        <p className="mx-auto mt-[20px] max-w-[980px] text-[22px] leading-[1.7] text-[#6b79a0]">
          TOTC is a platform that allows educators to create online classes
          whereby they can store the course materials online; manage
          assignments, quizzes and exams; monitor due dates; grade results and
          provide students with feedback all in one place.
        </p>

        <div className="mt-[70px] grid grid-cols-2 gap-[60px]">
          <div className="relative overflow-hidden rounded-[24px] shadow-[0_20px_50px_rgba(26,36,72,0.15)]">
            <img
              src={leftImage}
              alt="For instructors"
              className="h-[360px] w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-[18px] text-white">
              <span className="text-[24px] font-bold tracking-wide">
                FOR INSTRUCTORS
              </span>
              <button className="rounded-full border border-white/80 px-[32px] py-[12px] text-[18px] font-semibold">
                Start a class today
              </button>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[24px] shadow-[0_20px_50px_rgba(26,36,72,0.15)]">
            <img
              src={rightImage}
              alt="For students"
              className="h-[360px] w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-[18px] text-white">
              <span className="text-[24px] font-bold tracking-wide">
                FOR STUDENTS
              </span>
              <button className="rounded-full bg-[#27c1f1] px-[32px] py-[12px] text-[18px] font-semibold">
                Enter access code
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default WhatIs;

