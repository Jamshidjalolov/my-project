import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    const ok = window.confirm("Admin paneldan chiqmoqchimisiz?");
    if (!ok) return;
    navigate("/");
  };

  const links = [
    { to: "/admin/dashboard", label: "Dashboard" },
    { to: "/admin/product", label: "Products" },
    { to: "/admin/category", label: "Categories" },
    { to: "/admin/carusel", label: "Carusel/Slider" },
    { to: "/admin/combo", label: "Combo" },
    { to: "/admin/users", label: "Users" },
    { to: "/admin/orders", label: "Orders" },
  ];

  return (
    <div className={`admin-sidebar ${isOpen ? "open" : "collapsed"}`}>
      <div className="admin-sidebar__header">
        {isOpen && (
          <div className="admin-brand">
            <span className="admin-brand__dot" />
            <div>
              <h2>Control</h2>
              <p>Command Center</p>
            </div>
          </div>
        )}
        <button
          className="admin-toggle"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? "⟨" : "⟩"}
        </button>
      </div>

      <div className="admin-sidebar__links">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`admin-link ${location.pathname === link.to ? "active" : ""}`}
          >
            <span className="admin-link__icon">{link.label.charAt(0)}</span>
            {isOpen && <span className="admin-link__text">{link.label}</span>}
          </Link>
        ))}
      </div>

      <div className="admin-sidebar__footer">
        <button
          onClick={handleLogout}
          className="admin-logout"
        >
          <span className="admin-link__icon">⇢</span>
          {isOpen && <span>Exit</span>}
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
