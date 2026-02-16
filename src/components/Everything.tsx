import React from "react";

const classroomImage =
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop";

function Everything() {
  return (
    <section className="bg-white mt-[180px] mb-[40px]">
      <div className="mx-auto grid w-full max-w-[1920px] grid-cols-[1.05fr_0.95fr] items-center gap-[60px] px-[60px]">
        <div className="relative">
          <div className="absolute left-[-18px] top-[-10px] h-[70px] w-[70px] rounded-full bg-[#27e2a4]" />
          <h2 className="relative text-[44px] font-bold leading-[1.2] text-[#2f2f7f]">
            Everything you can do in a physical classroom,{" "}
            <span className="text-[#20c6bd]">you can do with TOTC</span>
          </h2>
          <p className="mt-[24px] max-w-[560px] text-[20px] leading-[1.7] text-[#6b79a0]">
            TOTC's school management software helps traditional and online
            schools manage scheduling, attendance, payments and virtual
            classrooms all in one secure cloud-based system.
          </p>
          <div className="mt-[24px] text-[18px] font-semibold text-[#6b79a0] underline">
            Learn more
          </div>
        </div>

        <div className="relative">
          <div className="absolute right-[-18px] top-[-18px] h-[90px] w-[90px] rounded-[18px] border-[6px] border-[#2fb4e9]" />
          <div className="absolute bottom-[-18px] right-[-18px] h-[90px] w-[90px] rounded-[18px] bg-[#27e2a4]" />
          <div className="relative overflow-hidden rounded-[24px] shadow-[0_20px_50px_rgba(26,36,72,0.15)]">
            <img
              src={classroomImage}
              alt="Classroom"
              className="h-[360px] w-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="grid h-[62px] w-[62px] place-items-center rounded-full bg-white/90 text-[#20c6bd] shadow-[0_16px_40px_rgba(0,0,0,0.2)]">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M8 5L19 12L8 19V5Z"
                    fill="#20c6bd"
                  />
                </svg>
              </div>
            </div>
          </div>
          <div className="absolute left-[-22px] top-[45%] h-[22px] w-[22px] rounded-full bg-[#27e2a4]" />
        </div>
      </div>
    </section>
  );
}

export default Everything;
