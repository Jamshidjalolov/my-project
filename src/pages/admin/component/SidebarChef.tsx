import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { clearToken } from "../../../lib/auth";

function SidebarChef() {
  const [isOpen, setIsOpen] = useState(true);
  const location = useLocation();

  const handleLogout = () => {
    clearToken();
    window.location.href = "/";
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
    transition: "all 0.3s",
  };

  return (
    <div
      className="bg-dark text-white vh-100 d-flex flex-column transition-all"
      style={{
        width: isOpen ? "220px" : "70px",
        overflow: "hidden",
      }}
    >
      <div className="d-flex justify-content-between align-items-center p-3 border-bottom border-secondary">
        {isOpen && <h2 className="m-0">Chef</h2>}
        <button className="btn btn-outline-light btn-sm" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? "<" : ">"}
        </button>
      </div>

      <div style={{ display: isOpen ? "flex" : "none", flexDirection: "column", transition: "all 0.3s" }}>
        <Link
          to="/chef/orders"
          style={{
            ...linkStyle,
            background: location.pathname === "/chef/orders" ? "#495057" : "transparent",
          }}
          className="sidebar-link"
        >
          Orders
        </Link>
      </div>

      <div className="mt-auto border-top border-secondary">
        <button
          onClick={handleLogout}
          className="btn w-100 d-flex align-items-center gap-2 px-3 py-2"
          style={{
            background: "transparent",
            color: "white",
            fontWeight: "500",
          }}
        >
          {isOpen && <span>Exit</span>}
        </button>
      </div>

      <style>{`
        .sidebar-link:hover {
          background: #6c757d !important;
          transform: translateX(4px);
        }
        button:hover {
          opacity: 0.85;
        }
      `}</style>
    </div>
  );
}

export default SidebarChef;
