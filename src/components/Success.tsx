import React from "react";

const stats = [
  { value: "15K+", label: "Students" },
  { value: "75%", label: "Total success" },
  { value: "35", label: "Main questions" },
  { value: "26", label: "Chief experts" },
  { value: "16", label: "Years of experience" },
];

function Success() {
  return (
    <section className="bg-white mb-[40px] py-[60px]">
      <div className="mx-auto h-[375px] w-full max-w-[1920px] rounded-[10px] px-[24px] pb-[18px] pt-[24px] text-center md:px-[60px] lg:px-[190px]">
        <h2 className="mb-[12px] text-[clamp(36px,4vw,48px)] font-bold">
          Our Success
        </h2>
        <p className="mx-auto mb-[34px] max-w-[680px] text-[clamp(14px,2vw,18px)] leading-[1.6] text-[#4d6b70]">
          Ornare id fames interdum porttitor nulla turpis etiam. Diam vitae
          sollicitudin at nec nam et pharetra gravida. Adipiscing a quis
          ultrices eu ornare tristique.
        </p>
        <div className="flex flex-nowrap items-start justify-between gap-x-[20px] md:gap-x-[32px] lg:gap-x-[40px]">
          {stats.map((item) => (
            <div
              key={item.label}
              className="grid place-items-center gap-[6px]"
            >
              <span className="text-[clamp(44px,8vw,96px)] font-bold text-[#2aa8ff]">
                {item.value}
              </span>
              <span className="whitespace-nowrap text-[clamp(16px,2.4vw,28px)] text-[#3b4750]">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Success;
