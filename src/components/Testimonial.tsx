import React from "react";

import StarRow from "./StarRow";

const personImage =
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=900&auto=format&fit=crop";

function Testimonial() {
  return (
    <section className="bg-white mt-[80px] mb-[80px]">
      <div className="mx-auto grid w-full max-w-[1920px] grid-cols-[1fr_1fr] items-center gap-[80px] px-[60px]">
        <div>
          <div className="flex items-center gap-[12px] text-[14px] uppercase tracking-[4px] text-[#7a7fa0]">
            <span className="h-[2px] w-[40px] bg-[#7a7fa0]" />
            Testimonial
          </div>
          <h2 className="mt-[18px] text-[48px] font-bold text-[#2f2f7f]">
            What They Say?
          </h2>
          <p className="mt-[22px] max-w-[520px] text-[20px] leading-[1.7] text-[#6b79a0]">
            TOTC has got more than 100k positive ratings from our users around
            the world.
          </p>
          <p className="mt-[18px] max-w-[520px] text-[20px] leading-[1.7] text-[#6b79a0]">
            Some of the students and teachers were greatly helped by the
            Skilline.
          </p>
          <p className="mt-[18px] max-w-[520px] text-[20px] leading-[1.7] text-[#6b79a0]">
            Are you too? Please give your assessment
          </p>
          <button className="mt-[30px] inline-flex items-center gap-[14px] rounded-full border border-[#5ecbe0] px-[28px] py-[12px] text-[18px] font-semibold text-[#5ecbe0]">
            Write your assessment
            <span className="grid h-[34px] w-[34px] place-items-center rounded-full border border-[#5ecbe0]">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M5 12H19"
                  stroke="#5ecbe0"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M13 6L19 12L13 18"
                  stroke="#5ecbe0"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </button>
        </div>

        <div className="relative flex justify-center">
          <div className="relative overflow-hidden rounded-[26px] shadow-[0_30px_70px_rgba(20,40,70,0.12)]">
            <img
              src={personImage}
              alt="Student"
              className="h-[460px] w-[360px] object-cover"
            />
          </div>
          <div className="absolute right-[-18px] top-[42%] grid h-[58px] w-[58px] place-items-center rounded-full bg-white text-[#2fb4e9] shadow-[0_18px_40px_rgba(20,40,70,0.15)]">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M9 6L15 12L9 18"
                stroke="#2fb4e9"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className="absolute -bottom-[40px] right-[10px] w-[420px] rounded-[20px] bg-white p-[22px] shadow-[0_24px_50px_rgba(20,40,70,0.12)]">
            <div className="absolute left-0 top-0 h-full w-[6px] rounded-l-[20px] bg-[#ff7a6b]" />
            <p className="text-[16px] leading-[1.7] text-[#6b79a0]">
              "Thank you so much for your help. It's exactly what I've been
              looking for. You won't regret it. It really saves me time and
              effort. TOTC is exactly what our business has been lacking."
            </p>
            <div className="mt-[16px] flex items-center justify-between">
              <div className="text-[18px] font-semibold text-[#2f2f7f]">
                Gloria Rose
              </div>
              <div className="text-right">
                <StarRow className="text-[#f6b54c] justify-end" size={18} />
                <div className="text-[12px] text-[#8c90a4]">
                  12 reviews at Yelp
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Testimonial;

