import React from "react";

const quizImage =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop";

function Assessments() {
  return (
    <section className="bg-white mt-[160px] mb-[40px]">
      <div className="mx-auto grid w-full max-w-[1920px] grid-cols-[0.9fr_1.1fr] items-center gap-[80px] px-[60px]">
        <div className="relative">
          <div className="absolute left-[-30px] top-[-30px] h-[120px] w-[120px] rounded-full bg-[#5b6bff]" />
          <div className="absolute left-[110px] top-[-40px] h-[18px] w-[18px] rounded-full bg-[#ffa86a]" />
          <div className="absolute right-[40px] top-[120px] h-[14px] w-[14px] rounded-full bg-[#ff6f91]" />
          <div className="absolute bottom-[-20px] left-[10px] h-[16px] w-[16px] rounded-full bg-[#2ee6a4]" />

          <div className="relative rounded-[24px] bg-white px-[36px] pb-[30px] pt-[28px] shadow-[0_30px_70px_rgba(20,40,70,0.12)]">
            <div className="mb-[18px] inline-flex rounded-full bg-[#dfe7ff] px-[22px] py-[8px] text-[18px] font-semibold text-[#6b79a0]">
              Question 1
            </div>
            <h3 className="text-[26px] font-bold leading-[1.4] text-[#5a5b90]">
              True or false? This play takes place in Italy
            </h3>

            <div className="mt-[20px] overflow-hidden rounded-[18px]">
              <img
                src={quizImage}
                alt="Question visual"
                className="h-[220px] w-full object-cover"
              />
            </div>

            <div className="absolute right-[24px] top-[-18px] flex flex-col gap-[10px]">
              <div className="grid h-[52px] w-[52px] place-items-center rounded-full bg-white shadow-[0_18px_40px_rgba(20,40,70,0.15)]">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M6 6L18 18M18 6L6 18"
                    stroke="#ff4f87"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="grid h-[52px] w-[52px] place-items-center rounded-full bg-white shadow-[0_18px_40px_rgba(20,40,70,0.15)]">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M5 13L9 17L19 7"
                    stroke="#2ee6a4"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            <div className="absolute bottom-[-20px] left-[140px] flex items-center gap-[14px] rounded-[18px] bg-white px-[18px] py-[10px] text-[16px] font-semibold text-[#2ee6a4] shadow-[0_18px_40px_rgba(20,40,70,0.12)]">
              <span className="grid h-[34px] w-[34px] place-items-center rounded-full bg-[#e6fff5]">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M4 12L20 4L14 20L11 13L4 12Z"
                    stroke="#2ee6a4"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              Your answer was sent successfully
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-[44px] font-bold leading-[1.2] text-[#2f2f7f]">
            Assessments, <span className="text-[#20c6bd]">Quizzes</span>, Tests
          </h2>
          <p className="mt-[20px] max-w-[520px] text-[20px] leading-[1.7] text-[#6b79a0]">
            Easily launch live assignments, quizzes, and tests. Student results
            are automatically entered in the online gradebook.
          </p>
        </div>
      </div>
    </section>
  );
}

export default Assessments;

