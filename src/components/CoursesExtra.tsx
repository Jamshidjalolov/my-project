import React from "react";

type Props = {
  categories: string[];
  activeCategory?: string;
  onSelect?: (category: string) => void;
};

function CoursesExtra({ categories, activeCategory, onSelect }: Props) {
  const palette = [
    "#cfeeee",
    "#cfd6ff",
    "#dbe9ff",
    "#c5f1ea",
    "#ffe1b8",
    "#ffd3d3",
    "#cfd0d8",
    "#c5f1ea",
  ];

  const displayCategories = categories.length
    ? categories
    : ["All", "Design", "Development", "Business", "Marketing", "Photography"];

  return (
    <section className="bg-white py-[80px]">
      <div className="mx-auto w-full max-w-[1920px] px-[40px]">
        <h2 className="text-[26px] font-semibold text-[#2f2f7f]">
          Choice favourite course from top category
        </h2>

        <div className="mt-[28px] courses-extra-grid">
          {displayCategories.map((title, index) => (
            <article
              key={`${title}-${index}`}
              className={`cursor-pointer rounded-[18px] bg-white p-[24px] shadow-[0_20px_50px_rgba(40,60,100,0.12)] transition-transform duration-200 hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(40,60,100,0.18)] ${
                activeCategory === title ? "ring-2 ring-[#47b9b9]" : ""
              }`}
              onClick={() => onSelect?.(title)}
            >
              <div
                className="grid h-[56px] w-[56px] place-items-center rounded-[10px]"
                style={{ backgroundColor: palette[index % palette.length] }}
              >
                <div className="h-[18px] w-[18px] rounded-[4px] bg-[#2f2f7f]" />
              </div>
              <div className="mt-[16px] text-[18px] font-semibold text-[#222742]">
                {title}
              </div>
              <p className="mt-[10px] text-[14px] leading-[1.6] text-[#7b7f9a]">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
                eiusmod
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default CoursesExtra;
