import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import heroImage from "../image/lovely-teenage-girl-with-curly-hair-posing-yellow-tshirt-min 1.png";
import iconImage from "../image/icon 2.png";

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    if (!payload?.exp) return false;
    return Date.now() >= Number(payload.exp) * 1000;
  } catch {
    return true;
  }
}

function Home() {
  const [userName, setUserName] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem("access_token");
    if (!stored || stored === "null" || stored === "undefined") {
      localStorage.removeItem("access_token");
      setToken(null);
      return;
    }
    if (isTokenExpired(stored)) {
      localStorage.removeItem("access_token");
      setToken(null);
      return;
    }
    setToken(stored);
  }, []);

  useEffect(() => {
    if (!token) {
      setUserName(null);
      return;
    }
    if (isTokenExpired(token)) {
      localStorage.removeItem("access_token");
      setToken(null);
      setUserName(null);
      return;
    }
    fetch("http://127.0.0.1:8000/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.username) {
          setUserName(data.username);
        } else {
          localStorage.removeItem("access_token");
          setToken(null);
          setUserName(null);
        }
      })
      .catch(() => {
        localStorage.removeItem("access_token");
        setToken(null);
        setUserName(null);
      });
  }, [token]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!menuRef.current || !target) return;
      if (!menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    setToken(null);
    setUserName(null);
    setMenuOpen(false);
    navigate("/login");
  };

  return (
    <main className="relative mx-auto mb-[40px] h-[1119px] w-full max-w-[1920px] overflow-hidden bg-white px-[80px] pb-[120px] pt-[34px]">
      <div className="pointer-events-none absolute left-0 right-0 top-0 h-[90%] w-full rounded-b-[10%] bg-[#48b6ba] z-0" />

      <header className="relative z-[40] flex items-center justify-between gap-6 text-white">
        <div className="flex items-center gap-[10px] px-[14px] py-[10px] text-[16px] font-extrabold tracking-[2px]">
          <img
            src={iconImage}
            alt="Logo"
            className="h-[83px] w-[114px] rounded-[6px]"
          />
        </div>
        <nav className="flex items-center gap-7 text-[15px] font-semibold">
          <a href="#" className="text-white no-underline">
            Home
          </a>
          <Link to="/courses" className="text-white no-underline">
            Courses
          </Link>
          <a href="#" className="text-white no-underline">
            Careers
          </a>
          <a href="#" className="text-white no-underline">
            Blog
          </a>
          <a href="#" className="text-white no-underline">
            About Us
          </a>
        </nav>
        <div className="flex items-center gap-3">
          {userName ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                className="flex items-center gap-[12px] text-white"
                onClick={() => setMenuOpen((prev) => !prev)}
              >
                <div className="grid h-[54px] w-[54px] place-items-center overflow-hidden rounded-full bg-white text-[20px] font-bold text-[#2b5b60] shadow-[0_16px_40px_rgba(12,39,44,0.18)]">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="text-[18px] font-semibold">{userName}</div>
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6 9L12 15L18 9"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 z-[160] mt-[10px] w-[210px] rounded-[16px] bg-white p-[10px] text-[#2b5b60] shadow-[0_22px_60px_rgba(12,39,44,0.25)]">
                  <div className="absolute -top-[7px] right-[16px] h-[14px] w-[14px] rotate-45 bg-white shadow-[-6px_-6px_14px_rgba(12,39,44,0.06)]" />
                  <button
                    type="button"
                    className="w-full rounded-[10px] px-[12px] py-[8px] text-left text-[14px] hover:bg-[#eef6f6]"
                  >
                    Profile
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-[10px] px-[12px] py-[8px] text-left text-[14px] hover:bg-[#eef6f6]"
                  >
                    Settings
                  </button>
                  <div className="my-[6px] h-[1px] bg-[#eef2f2]" />
                  <button
                    type="button"
                    className="w-full rounded-[10px] px-[12px] py-[8px] text-left text-[14px] text-[#d44d4d] hover:bg-[#fff1f1]"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      handleLogout();
                    }}
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-[30px] bg-white px-[28px] py-[11px] text-[15px] font-bold text-[#2b5b60] shadow-[0_20px_60px_rgba(12,39,44,0.18)]"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-[30px] bg-[#7bd3d6] px-[28px] py-[11px] text-[15px] font-bold text-[#19484d]"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="relative z-[10] mt-[80px] grid grid-cols-[1.1fr_0.9fr] items-center gap-12">
        <div>
          <h1 className="m-0 text-[64px] font-extrabold leading-[1.05] text-white">
            <span className="text-[#f6b54c]">Studying</span> Online is now
            <br />
            much easier
          </h1>
          <p className="mt-5 max-w-[560px] text-[20px] leading-[1.6] text-white/75">
            TOTC is an interesting platform that will teach you in a more an
            interactive way
          </p>
          <div className="mt-[30px] flex items-center gap-[22px]">
            <button className="rounded-full bg-[#6ad0d4] px-[34px] py-[16px] text-[15px] font-bold text-[#164147] shadow-[0_20px_60px_rgba(12,39,44,0.18)]">
              Join for free
            </button>
            <button className="flex items-center gap-3 bg-transparent text-[15px] font-semibold text-white">
              <span className="inline-flex h-[44px] w-[44px] items-center justify-center rounded-full bg-white text-[#48b6ba] shadow-[0_20px_60px_rgba(12,39,44,0.18)]">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M8 5.5L19 12L8 18.5V5.5Z" />
                </svg>
              </span>
              Watch how it works
            </button>
          </div>
        </div>

        <div className="relative grid place-items-center">
          <div className="grid h-[520px] w-[360px] place-items-center rounded-[180px_180px_36px_36px] bg-transparent">
            <img
              src={heroImage}
              alt="Student"
              className="h-[790px] w-[620px] rounded-[170px_170px_26px_26px] object-cover"
            />
          </div>

          <div className="absolute left-0 top-[12%] flex items-center gap-3 rounded-[16px] bg-white px-4 py-3 text-[13px] text-[#2b5b60] shadow-[0_20px_60px_rgba(12,39,44,0.18)]">
            <div className="grid h-[36px] w-[36px] place-items-center rounded-[10px] bg-[#e7f6f6]">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2b5b60"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2.5" x2="16" y2="6.5" />
                <line x1="8" y1="2.5" x2="8" y2="6.5" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div>
              <strong className="block text-[15px]">250k</strong>
              <span className="opacity-70">Assisted Student</span>
            </div>
          </div>

          <div className="absolute right-[-10%] top-[38%] flex items-center gap-3 rounded-[16px] bg-white px-4 py-3 text-[13px] text-[#2b5b60] shadow-[0_20px_60px_rgba(12,39,44,0.18)]">
            <div className="grid h-[36px] w-[36px] place-items-center rounded-[10px] bg-[#e7f6f6]">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2b5b60"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M4 4H20V16H4z" />
                <path d="M22 20H2" />
                <path d="M4 4L12 11L20 4" />
              </svg>
            </div>
            <div>
              <strong className="block text-[15px]">Congratulations</strong>
              <span className="opacity-70">Your admission completed</span>
            </div>
          </div>

          <div className="absolute bottom-[12%] left-[-8%] grid grid-cols-[auto_1fr] items-center gap-[10px] rounded-[16px] bg-white px-4 py-3 text-[13px] text-[#2b5b60] shadow-[0_20px_60px_rgba(12,39,44,0.18)]">
            <div className="grid h-[36px] w-[36px] place-items-center rounded-[10px] bg-[#e7f6f6]">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2b5b60"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
              </svg>
            </div>
            <div>
              <strong className="block text-[15px]">User Experience Class</strong>
              <span className="opacity-70">Today at 12.00 PM</span>
              <button className="mt-2 rounded-full bg-[#ff6f91] px-4 py-1 text-[12px] font-semibold text-white">
                Join Now
              </button>
            </div>
          </div>

          <div className="absolute right-[2%] top-[30%] grid h-[44px] w-[44px] place-items-center rounded-[14px] bg-[#ff6f91] text-white shadow-[0_20px_60px_rgba(12,39,44,0.18)]">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              xmlns="http://www.w3.org/2000/svg"
            >
              <line x1="4" y1="20" x2="20" y2="20" />
              <rect x="6" y="12" width="3" height="6" />
              <rect x="11" y="9" width="3" height="9" />
              <rect x="16" y="6" width="3" height="12" />
            </svg>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Home;
