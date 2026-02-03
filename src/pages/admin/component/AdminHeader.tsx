import { ReactNode } from "react";

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

function AdminHeader({ title, subtitle, right }: AdminHeaderProps) {
  return (
    <div className="admin-hero">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {right && <div className="admin-hero__right">{right}</div>}
    </div>
  );
}

export default AdminHeader;
