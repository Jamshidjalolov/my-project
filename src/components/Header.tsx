import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import Dropdown from "react-bootstrap/Dropdown";
import { useAuthRole } from "../hooks/useAuthRole";
import { clearToken } from "../lib/auth";
import { apiFetch } from "../lib/api";
import { getCart, subscribeCart } from "../lib/cart";

function Header() {
  const navigate = useNavigate();
  const { user, roles } = useAuthRole();
  const [cartCount, setCartCount] = useState<number>(0);

  const initials = useMemo(() => {
    if (!user) return "G";
    const source = user.name || user.email || "U";
    return source.trim().charAt(0).toUpperCase();
  }, [user]);

  const handleLogout = () => {
    clearToken();
    navigate("/");
  };

  useEffect(() => {
    const updateCount = () => {
      const items = getCart();
      const total = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      setCartCount(total);
    };
    updateCount();
    const unsubscribe = subscribeCart(updateCount);
    return () => unsubscribe();
  }, []);



  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="brand">
          <span className="brand-mark">SOB</span>
          <span className="brand-text">
            READY
            <span className="brand-sub">fresh market</span>
          </span>
        </Link>

        <nav className="site-nav" aria-label="Primary">
          <ul className="nav-links">
            <li>
              <a href="#home">Home</a>
            </li>
            <li>
              <a href="#categories">Category</a>
            </li>
            <li>
              <a href="#shop">Shop</a>
            </li>
            <li>
              <a href="#best-selling">Blog</a>
            </li>
            <li>
              <a href="#footer">Page</a>
            </li>
          </ul>
        </nav>

          <div className="header-actions">
            <div className="search">
              <input type="search" placeholder="Search products..." aria-label="Search" />
              <button type="button" className="search-btn">
                Search
              </button>
            </div>

          <button type="button" className="cart-btn" aria-label="Cart" onClick={() => navigate("/cart")}>
            <span className="cart-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                <path
                  d="M3 4h2l2.4 10.2a2 2 0 0 0 2 1.5h7.6a2 2 0 0 0 2-1.5L21 7H7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="10" cy="19" r="1.5" fill="currentColor" />
                <circle cx="17" cy="19" r="1.5" fill="currentColor" />
              </svg>
            </span>
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>

          <Dropdown align="end" className="user-dropdown">
              <Dropdown.Toggle className="user-toggle" id="user-menu">
              <span className="user-label">{user ? user.name || user.email : "Account"}</span>
              <span className={`user-avatar ${user ? "" : "user-avatar--guest"}`}>{initials}</span>
              </Dropdown.Toggle>

            <Dropdown.Menu className="user-menu">
              {user && <Dropdown.Header className="user-header">{user.email}</Dropdown.Header>}
              {roles?.map((r) => r.toLowerCase()).includes("admin") && (
                <Dropdown.Item as={Link} to="/admin">
                  Admin
                </Dropdown.Item>
              )}
              {roles?.some((r) => ["chef", "admin"].includes(r.toLowerCase())) && (
                <Dropdown.Item as={Link} to="/chef">
                  Chef
                </Dropdown.Item>
              )}
              {!user && (
                <Dropdown.Item as={Link} to="/login">
                  Login
                </Dropdown.Item>
              )}
              {!user && (
                <Dropdown.Item as={Link} to="/register">
                  Register
                </Dropdown.Item>
              )}
              {user && (
                <Dropdown.Item as={Link} to="/" onClick={handleLogout}>
                  Log out
                </Dropdown.Item>
              )}
            </Dropdown.Menu>
          </Dropdown>
          {user && (
            <button
              type="button"
              className="notify-btn"
              onClick={() => navigate("/notifications")}
              aria-label="Notifications"
            >
              🔔
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
