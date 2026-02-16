import React from "react";

type StarRowProps = {
  className?: string;
  size?: number;
  gap?: number;
};

const StarRow: React.FC<StarRowProps> = ({
  className = "",
  size = 18,
  gap = 4,
}) => {
  return (
    <div className={`flex items-center ${className}`} style={{ gap }}>
      {Array.from({ length: 5 }).map((_, index) => (
        <svg
          key={index}
          width={size}
          height={size}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M10 1.5l2.35 4.76 5.25.76-3.8 3.7.9 5.24L10 13.98l-4.7 2.48.9-5.24-3.8-3.7 5.25-.76L10 1.5z" />
        </svg>
      ))}
    </div>
  );
};

export default StarRow;
