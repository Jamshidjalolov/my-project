import React from "react";

function CoursesCta() {
  return (
    <section className="bg-white py-[80px]">
      <div className="mx-auto w-full max-w-[1920px] px-[40px]">
        <div className="rounded-[28px] bg-[#26264a] px-[80px] py-[70px] text-center text-white shadow-[0_30px_80px_rgba(24,24,56,0.25)] transition-transform duration-200 hover:-translate-y-1">
          <h2 className="text-[32px] font-semibold">
            Online coaching lessons for remote learning.
          </h2>
          <p className="mx-auto mt-[18px] max-w-[900px] text-[18px] text-white/80">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempos Lorem ipsum dolor sitamet, consectetur adipiscing
            elit, sed do eiusmod tempor
          </p>
          <button className="mt-[28px] h-[48px] rounded-[12px] bg-[#4cc3c7] px-[34px] text-[15px] font-semibold text-white shadow-[0_18px_40px_rgba(76,195,199,0.35)] transition-all duration-200 hover:bg-[#36b1b6] hover:shadow-[0_22px_44px_rgba(76,195,199,0.45)]">
            Start learning now
          </button>
        </div>
      </div>
    </section>
  );
}

export default CoursesCta;
