import React from "react";
import iconImage from "../image/icon 2.png";

function NewsletterFooter() {
  return (
    <section className="mt-[110px] bg-[#24264a]">
      <div className="mx-auto flex w-full max-w-[1920px] flex-col items-center gap-[26px] px-[40px] py-[70px] text-center text-white">
        <div className="flex items-center gap-[24px] text-[20px] font-semibold">
          <div className="flex items-center gap-[16px]">
            <img src={iconImage} alt="Logo" className="h-[64px] w-[90px]" />
            <div className="h-[44px] w-[1px] bg-[#3d3f6b]" />
          </div>
          <span>Virtual Class for Zoom</span>
        </div>

        <h3 className="mt-[6px] text-[22px] font-medium text-[#b5b8d4]">
          Subscribe to get our Newsletter
        </h3>

        <div className="flex items-center gap-[14px]">
          <input
            className="h-[48px] w-[360px] rounded-full border border-[#4b4f6f] bg-transparent px-[22px] text-[16px] text-white placeholder:text-[#7f84a4] outline-none"
            placeholder="Your Email"
          />
          <button className="h-[48px] rounded-full bg-[#39c5bb] px-[28px] text-[16px] font-semibold text-white">
            Subscribe
          </button>
        </div>

        <div className="mt-[18px] flex items-center gap-[16px] text-[16px] text-[#b5b8d4]">
          <span>Careers</span>
          <span className="text-[#4b4f6f]">|</span>
          <span>Privacy Policy</span>
          <span className="text-[#4b4f6f]">|</span>
          <span>Terms &amp; Conditions</span>
        </div>
        <div className="text-[14px] text-[#8b8fb2]">
          (c) 2021 Class Technologies Inc.
        </div>
      </div>
    </section>
  );
}

export default NewsletterFooter;
