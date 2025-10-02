import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const location = useLocation();

  const handleLogout = () => {
    window.location.href = "/";
    localStorage.removeItem("user");
  };

  const linkStyle = {
    padding: "12px 16px",
    textDecoration: "none",
    color: "white",
    borderRadius: "8px",
    margin: "6px 10px",
    fontSize: "15px",
    fontWeight: "500",
    display: "block",
    transition: "all 0.3s ease",
  };

  return (
    <div
      className="sidebar-container"
      style={{
        width: isOpen ? "220px" : "70px",
        overflow: "hidden",
        background: "#1f1f2e",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        transition: "all 0.3s ease",
        height: "100vh",
      }}
    >
      <div className="sidebar-header" style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "1rem",
        borderBottom: "1px solid rgba(255,255,255,0.2)"
      }}>
        {isOpen && <h2 className="m-0">Admin</h2>}
        <button
          className="toggle-btn"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            border: "none",
            background: "rgba(255,255,255,0.1)",
            color: "white",
            borderRadius: "6px",
            padding: "4px 8px",
            cursor: "pointer",
            fontWeight: "bold",
            transition: "all 0.3s ease"
          }}
        >
          {isOpen ? "⬅" : "➡"}
        </button>
      </div>

      <div className="sidebar-links" style={{ flex: 1, display: "flex", flexDirection: "column", marginTop: "1rem" }}>
        {[
          { to: "/admin/dashboard", label: "🏛️ Dashboard" },
          { to: "/admin/product", label: "📦 Products" },
          { to: "/admin/category", label: "📂 Categories" },
          { to: "/admin/carusel", label: "🖼️ Carusel/Slider" },
          { to: "/admin/users", label: "👤 Users" },
          { to: "/admin/orders", label: "📦 Orders" },
        ].map((link) => (
          <Link
            key={link.to}
            to={link.to}
            style={{
              ...linkStyle,
              background: location.pathname === link.to ? "#495057" : "transparent",
            }}
            className="sidebar-link"
          >
            {isOpen ? link.label : link.label.charAt(0)}
          </Link>
        ))}
      </div>

      <div className="sidebar-footer" style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.2)" }}>
        <button
          onClick={handleLogout}
          className="logout-btn"
          style={{
            background: "transparent",
            color: "white",
            fontWeight: "500",
            border: "none",
            width: "100%",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
            transition: "all 0.3s ease",
          }}
        >
          {isOpen && <span>🚪 Exit</span>}
        </button>
      </div>

      <style>{`
        .sidebar-link:hover {
          background: #6c757d !important;
          transform: translateX(6px);
        }
        .toggle-btn:hover {
          background: rgba(255,255,255,0.2);
        }
        .logout-btn:hover {
          background: #dc3545;
          color: white;
          transform: translateX(4px);
        }
        .sidebar-container {
          box-shadow: 2px 0 8px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  );
}

export default Sidebar;
