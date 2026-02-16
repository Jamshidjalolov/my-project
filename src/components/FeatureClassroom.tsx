import React from "react";

const cardImages = [
  "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=600&auto=format&fit=crop",
];

function FeatureClassroom() {
  return (
    <section className="bg-white mt-[160px] mb-[40px]">
      <div className="mx-auto w-full max-w-[1920px] px-[60px]">
        <div className="text-center">
          <h2 className="text-[40px] font-bold text-[#2f2f7f]">
            Our <span className="text-[#20c6bd]">Features</span>
          </h2>
          <p className="mx-auto mt-[16px] max-w-[820px] text-[22px] leading-[1.6] text-[#6b79a0]">
            This very extraordinary feature, can make learning activities more
            efficient
          </p>
        </div>

        <div className="mt-[70px] grid grid-cols-[1.1fr_0.9fr] items-center gap-[80px]">
          <div className="relative">
            <div className="absolute left-[20px] top-[-40px] h-[90px] w-[90px] rounded-full bg-[#2ee6a4]" />
            <div className="absolute left-[120px] top-[-30px] h-[24px] w-[24px] rounded-full bg-[#2fb4e9]" />
            <div className="absolute bottom-[-40px] right-[120px] h-[90px] w-[90px] rounded-full bg-[#5a67ff]" />
            <div className="absolute bottom-[-20px] right-[60px] h-[22px] w-[22px] rounded-full bg-[#f16060]" />

            <div className="relative rounded-[24px] bg-white px-[40px] pb-[40px] pt-[24px] shadow-[0_30px_70px_rgba(20,40,70,0.12)]">
              <div className="mb-[26px] flex h-[26px] items-center gap-[10px] rounded-full bg-[#e3f3ee] px-[18px]">
                <span className="h-[14px] w-[14px] rounded-full bg-[#f26b6b]" />
                <span className="h-[14px] w-[14px] rounded-full bg-[#f2c14e]" />
                <span className="h-[14px] w-[14px] rounded-full bg-[#67d96b]" />
              </div>

              <div className="grid grid-cols-[260px_220px_220px] gap-[24px]">
                <div className="flex flex-col gap-[14px]">
                  <div className="overflow-hidden rounded-[22px] bg-white shadow-[0_12px_26px_rgba(20,40,70,0.12)]">
                    <img
                      src={cardImages[0]}
                      alt="Presenter"
                      className="h-[190px] w-full object-cover object-center"
                    />
                  </div>
                  <div className="flex items-center gap-[12px]">
                    <button className="rounded-full bg-[#3d63ff] px-[26px] py-[10px] text-[16px] font-semibold text-white">
                      Present
                    </button>
                    <button className="rounded-full bg-[#f75c86] px-[26px] py-[10px] text-[16px] font-semibold text-white">
                      Call
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-[18px]">
                  <div className="overflow-hidden rounded-[22px] bg-white shadow-[0_12px_26px_rgba(20,40,70,0.12)]">
                    <img
                      src={cardImages[1]}
                      alt="Student"
                      className="h-[140px] w-full object-cover object-center"
                    />
                  </div>
                  <div className="overflow-hidden rounded-[22px] bg-white shadow-[0_12px_26px_rgba(20,40,70,0.12)]">
                    <img
                      src={cardImages[2]}
                      alt="Student"
                      className="h-[140px] w-full object-cover object-center"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-[18px]">
                  <div className="overflow-hidden rounded-[22px] bg-white shadow-[0_12px_26px_rgba(20,40,70,0.12)]">
                    <img
                      src={cardImages[3]}
                      alt="Student"
                      className="h-[140px] w-full object-cover object-center"
                    />
                  </div>
                  <div className="overflow-hidden rounded-[22px] bg-white shadow-[0_12px_26px_rgba(20,40,70,0.12)]">
                    <img
                      src={cardImages[4]}
                      alt="Student"
                      className="h-[140px] w-full object-cover object-center"
                    />
                  </div>
                </div>
              </div>

              <div className="absolute left-[48%] top-[56%] h-[58px] w-[58px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[8px] border-white bg-[#f6f7fb]" />
            </div>
          </div>

          <div className="space-y-[28px]">
            <h3 className="text-[34px] font-bold leading-[1.3] text-[#2f2f7f]">
              A <span className="text-[#20c6bd]">user interface</span> designed
              for the classroom
            </h3>

            <div className="flex items-start gap-[18px]">
              <div className="mt-[4px] rounded-[14px] bg-white p-[12px] shadow-[0_18px_40px_rgba(20,40,70,0.12)]">
                <div className="h-[14px] w-[14px] rounded-[4px] bg-[#2f2f7f]" />
                <div className="mt-[6px] h-[14px] w-[14px] rounded-[4px] bg-[#f6b54c]" />
              </div>
              <p className="text-[20px] leading-[1.7] text-[#6b79a0]">
                Teachers don't get lost in the grid view and have a dedicated
                Podium space.
              </p>
            </div>

            <div className="flex items-start gap-[18px]">
              <div className="mt-[4px] rounded-[14px] bg-white p-[12px] shadow-[0_18px_40px_rgba(20,40,70,0.12)]">
                <div className="h-[14px] w-[14px] rounded-[4px] bg-[#f6b54c]" />
                <div className="mt-[6px] h-[14px] w-[14px] rounded-[4px] bg-[#2f2f7f]" />
              </div>
              <p className="text-[20px] leading-[1.7] text-[#6b79a0]">
                TA's and presenters can be moved to the front of the class.
              </p>
            </div>

            <div className="flex items-start gap-[18px]">
              <div className="mt-[4px] rounded-[14px] bg-white p-[12px] shadow-[0_18px_40px_rgba(20,40,70,0.12)]">
                <div className="h-[14px] w-[14px] rounded-[4px] bg-[#2f2f7f]" />
                <div className="mt-[6px] h-[14px] w-[14px] rounded-[4px] bg-[#20c6bd]" />
              </div>
              <p className="text-[20px] leading-[1.7] text-[#6b79a0]">
                Teachers can easily see all students and class data at one
                time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default FeatureClassroom;

