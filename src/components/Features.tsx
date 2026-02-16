import React from "react";

const icons = {
  document: (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M7 2h7l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  ),
  calendar: (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="3" />
      <path d="M8 2v4M16 2v4M3 10h18" />
      <path d="M8 14h3M13 14h3M8 18h3M13 18h3" />
    </svg>
  ),
  users: (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M4 20c0-3 3-5 6-5s6 2 6 5" />
      <path d="M14.5 18c.5-1.7 2.3-2.8 4.5-2.8 1.2 0 2.3.3 3 1" />
    </svg>
  ),
};

const cards = [
  {
    title: "Online Billing, Invoicing, & Contracts",
    text:
      "Simple and secure control of your organization's financial and legal transactions. Send customized invoices and contracts.",
    icon: icons.document,
    color: "bg-[#5b6bff]",
  },
  {
    title: "Easy Scheduling & Attendance Tracking",
    text:
      "Schedule and reserve classrooms at one campus or multiple campuses. Keep detailed records of student attendance.",
    icon: icons.calendar,
    color: "bg-[#21c7c2]",
  },
  {
    title: "Customer Tracking",
    text:
      "Automate and track emails to individuals or groups. Skilline's built-in system helps organize your organization.",
    icon: icons.users,
    color: "bg-[#2fb4e9]",
  },
];

function Features() {
  return (
    <section className="bg-white mb-[40px]">
      <div className="mx-auto h-[761px] w-[1920px] max-w-full rounded-[10px] px-[70px] pb-[40px] pt-[46px] text-center">
        <h2 className="text-[40px] font-bold tracking-[-0.2px] text-[#2f2f7f]">
          All-In-One <span className="text-[#20c6bd]">Cloud Software.</span>
        </h2>
        <p className="mx-auto mt-[12px] max-w-[720px] text-[24px] leading-[1.6] text-[#6b79a0]">
          TOTC is one powerful online software suite that combines all the tools
          needed to run a successful school or office.
        </p>
        <div className="mt-[40px] grid grid-cols-3 gap-[60px]">
          {cards.map((card) => (
            <article
              key={card.title}
              className="grid gap-[16px] rounded-[18px] bg-white px-[26px] pb-[34px] pt-[70px] text-center shadow-[0_14px_28px_rgba(28,45,87,0.08)]"
            >
              <div
                className={`mx-auto grid h-[56px] w-[56px] place-items-center rounded-full text-white ${card.color}`}
              >
                {card.icon}
              </div>
              <h3 className="text-[30px] font-bold text-[#2f2f7f]">
                {card.title}
              </h3>
              <p className="text-[20px] leading-[1.6] text-[#6b79a0]">
                {card.text}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Features;
