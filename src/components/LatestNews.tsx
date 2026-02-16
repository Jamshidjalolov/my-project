import React from "react";

const mainImage =
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop";
const side1 =
  "https://images.unsplash.com/photo-1516627145497-ae6968895b74?q=80&w=800&auto=format&fit=crop";
const side2 =
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=800&auto=format&fit=crop";
const side3 =
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=800&auto=format&fit=crop";

function LatestNews() {
  return (
    <section className="bg-white mt-[150px] mb-[80px]">
      <div className="mx-auto w-full max-w-[1920px] px-[60px]">
        <div className="text-center">
          <h2 className="text-[42px] font-bold text-[#2f2f7f]">
            Lastest News and Resources
          </h2>
          <p className="mt-[12px] text-[18px] text-[#6b79a0]">
            See the developments that have occurred to TOTC in the world
          </p>
        </div>

        <div className="mt-[50px] grid grid-cols-[1.1fr_0.9fr] gap-[50px]">
          <div>
            <div className="overflow-hidden rounded-[20px]">
              <img src={mainImage} alt="News" className="h-[280px] w-full object-cover" />
            </div>
            <span className="mt-[16px] inline-flex rounded-full bg-[#39c5bb] px-[16px] py-[6px] text-[14px] font-semibold text-white">
              NEWS
            </span>
            <h3 className="mt-[14px] text-[26px] font-bold text-[#2f2f7f]">
              Class adds $30 million to its balance sheet for a Zoom-friendly edtech solution
            </h3>
            <p className="mt-[10px] text-[16px] leading-[1.6] text-[#6b79a0]">
              Class, launched less than a year ago by Blackboard co-founder
              Michael Chasen, integrates exclusively...
            </p>
            <button className="mt-[12px] text-[16px] font-semibold text-[#2f2f7f] underline">
              Read more
            </button>
          </div>

          <div className="space-y-[26px]">
            <div className="flex gap-[20px]">
              <div className="relative h-[120px] w-[180px] overflow-hidden rounded-[16px]">
                <img src={side1} alt="Press" className="h-full w-full object-cover" />
                <span className="absolute bottom-[10px] left-[10px] rounded-full bg-[#39c5bb] px-[12px] py-[4px] text-[12px] font-semibold text-white">
                  PRESS RELEASE
                </span>
              </div>
              <div>
                <h4 className="text-[18px] font-bold text-[#2f2f7f]">
                  Class Technologies Inc. Closes $30 Million Series A Financing to Meet High Demand
                </h4>
                <p className="mt-[6px] text-[14px] text-[#6b79a0]">
                  Class Technologies Inc., the company that created Class,...
                </p>
              </div>
            </div>

            <div className="flex gap-[20px]">
              <div className="relative h-[120px] w-[180px] overflow-hidden rounded-[16px]">
                <img src={side2} alt="News" className="h-full w-full object-cover" />
                <span className="absolute bottom-[10px] left-[10px] rounded-full bg-[#39c5bb] px-[12px] py-[4px] text-[12px] font-semibold text-white">
                  NEWS
                </span>
              </div>
              <div>
                <h4 className="text-[18px] font-bold text-[#2f2f7f]">
                  Zoom's earliest investors are betting millions on a better Zoom for schools
                </h4>
                <p className="mt-[6px] text-[14px] text-[#6b79a0]">
                  Zoom was never created to be a consumer product. Nonetheless, the...
                </p>
              </div>
            </div>

            <div className="flex gap-[20px]">
              <div className="relative h-[120px] w-[180px] overflow-hidden rounded-[16px]">
                <img src={side3} alt="News" className="h-full w-full object-cover" />
                <span className="absolute bottom-[10px] left-[10px] rounded-full bg-[#39c5bb] px-[12px] py-[4px] text-[12px] font-semibold text-white">
                  NEWS
                </span>
              </div>
              <div>
                <h4 className="text-[18px] font-bold text-[#2f2f7f]">
                  Former Blackboard CEO Raises $16M to Bring LMS Features to Zoom Classrooms
                </h4>
                <p className="mt-[6px] text-[14px] text-[#6b79a0]">
                  This year, investors have reaped big financial returns from betting on Zoom...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default LatestNews;

