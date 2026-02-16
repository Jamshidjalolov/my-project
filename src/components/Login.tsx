import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import type { User } from "firebase/auth";
import { auth, googleProvider } from "../firebase";

const heroImage =
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1200&auto=format&fit=crop";

type LoginLocationState = {
  prefillIdentifier?: string;
  prefillPassword?: string;
  autoLogin?: boolean;
  message?: string;
};

function Login() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const autoLoginAttemptedRef = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();
  const apiBase = "http://127.0.0.1:8000";
  const loginState = (location.state as LoginLocationState | null) ?? null;

  const getAuthCode = (err: unknown) => {
    return typeof err === "object" && err && "code" in err
      ? (err as { code?: string }).code
      : "";
  };

  const mapAuthError = (err: unknown) => {
    if (err instanceof Error && err.message) {
      return err.message;
    }
    const code = getAuthCode(err);
    switch (code) {
      case "auth/popup-blocked":
        return "Popup bloklangan. Brauzerda popupga ruxsat bering.";
      case "auth/popup-closed-by-user":
        return "Popup yopildi. Qayta urinib ko'ring.";
      case "auth/cancelled-popup-request":
        return "Popup bekor qilindi. Qayta urinib ko'ring.";
      case "auth/unauthorized-domain":
        return "Firebase Auth > Settings > Authorized domains ga 127.0.0.1 va localhost qo'shing.";
      case "auth/operation-not-allowed":
        return "Firebase'da Google sign-in yoqilmagan.";
      default:
        return "Google orqali kirishda xatolik bo'ldi.";
    }
  };

  const syncUser = async (token: string): Promise<{ ok: boolean; detail?: string }> => {
    const res = await fetch(`${apiBase}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, detail: data.detail || "Backend sync xatoligi." };
    }
    const data = await res.json().catch(() => null);
    if (!data?.username) {
      return { ok: false, detail: "Google login tasdiqlanmadi." };
    }
    return { ok: true };
  };

  const handleGoogleUser = async (user: User) => {
    await user.reload();
    if (!user.emailVerified) {
      await sendEmailVerification(user);
      setSuccess(
        "Emailga tasdiqlash havolasi yuborildi. Havolani bosib, qayta kirish qiling."
      );
      await signOut(auth);
      return;
    }
    const token = await user.getIdToken();
    localStorage.setItem("access_token", token);
    const syncResult = await syncUser(token);
    if (!syncResult.ok) {
      localStorage.removeItem("access_token");
      setError(syncResult.detail || "Google login xatoligi.");
      return;
    }
    navigate("/");
  };

  useEffect(() => {
    let mounted = true;
    const finalizeRedirect = async () => {
      const result = await getRedirectResult(auth);
      if (result?.user && mounted) {
        await handleGoogleUser(result.user);
      }
    };
    finalizeRedirect().catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!loginState) return;
    const prefillIdentifier = loginState.prefillIdentifier?.trim() ?? "";
    const prefillPassword = loginState.prefillPassword?.trim() ?? "";

    if (prefillIdentifier) {
      setEmail(prefillIdentifier);
    }
    if (prefillPassword) {
      setPassword(prefillPassword);
    }
    if (loginState.message) {
      setSuccess(loginState.message);
    }

    if (
      !loginState.autoLogin ||
      !prefillIdentifier ||
      !prefillPassword ||
      autoLoginAttemptedRef.current
    ) {
      return;
    }

    autoLoginAttemptedRef.current = true;
    setError("");
    setLoading(true);
    fetch(`${apiBase}/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        username: prefillIdentifier,
        password: prefillPassword,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || "Login yoki parol noto'g'ri.");
        }
        const data = await res.json();
        localStorage.setItem("access_token", data.access_token);
        navigate("/");
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Login yoki parol noto'g'ri."
        );
      })
      .finally(() => setLoading(false));
  }, [apiBase, loginState, navigate]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    if (!trimmedEmail || !trimmedPassword) {
      setError("Login va parolni kiriting.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          username: trimmedEmail,
          password: trimmedPassword,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Login yoki parol noto'g'ri.");
      }
      const data = await res.json();
      localStorage.setItem("access_token", data.access_token);
      navigate("/");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login yoki parol noto'g'ri."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const credential = await signInWithPopup(auth, googleProvider);
      await handleGoogleUser(credential.user);
    } catch (err) {
      const code = getAuthCode(err);
      if (
        code === "auth/popup-blocked" ||
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request"
      ) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-white py-[80px]">
      <div className="mx-auto w-full max-w-[1200px] px-[24px]">
        <div className="grid overflow-hidden rounded-[26px] bg-white shadow-[0_30px_80px_rgba(0,0,0,0.12)] md:grid-cols-[1.05fr_0.95fr]">
          <div className="relative">
            <img
              src={heroImage}
              alt="Classroom"
              className="h-full min-h-[520px] w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-[28px] text-white">
              <h3 className="text-[28px] font-bold">Lorem Ipsum is simply</h3>
              <p className="mt-[6px] text-[16px] text-white/80">
                Lorem Ipsum is simply
              </p>
            </div>
          </div>

          <div className="px-[44px] py-[36px]">
            <div className="text-center text-[16px] text-[#6b79a0]">
              Welcome to lorem..!
            </div>

            <div className="mt-[16px] flex items-center justify-center rounded-full bg-[#dff3f3] p-[6px]">
              <Link
                to="/login"
                className={`flex-1 rounded-full py-[10px] text-center text-[14px] font-semibold ${
                  tab === "login"
                    ? "bg-[#4bb7b7] text-white"
                    : "text-[#4bb7b7]"
                }`}
                onClick={() => setTab("login")}
              >
                Login
              </Link>
              <Link
                to="/register"
                className={`flex-1 rounded-full py-[10px] text-center text-[14px] font-semibold ${
                  tab === "register"
                    ? "bg-[#4bb7b7] text-white"
                    : "text-[#4bb7b7]"
                }`}
                onClick={() => setTab("register")}
              >
                Register
              </Link>
            </div>

            <p className="mt-[22px] text-[14px] leading-[1.6] text-[#7a7fa0]">
              Lorem Ipsum is simply dummy text of the printing and typesetting
              industry.
            </p>

            <form className="mt-[18px] space-y-[16px]" onSubmit={handleLogin}>
              <div>
                <label className="text-[13px] font-semibold text-[#2f2f7f]">
                  Username yoki Email
                </label>
                <input
                  className="mt-[8px] h-[44px] w-full rounded-full border border-[#70d0d1] px-[18px] text-[14px] outline-none"
                  placeholder="Admin yoki teacher login"
                  type="text"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div>
                <label className="text-[13px] font-semibold text-[#2f2f7f]">
                  Password
                </label>
                <div className="mt-[8px] flex h-[44px] items-center rounded-full border border-[#70d0d1] px-[18px]">
                  <input
                    className="h-full w-full text-[14px] outline-none"
                    placeholder="Enter your Password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"
                      stroke="#2f2f7f"
                      strokeWidth="1.5"
                    />
                    <circle cx="12" cy="12" r="3" stroke="#2f2f7f" strokeWidth="1.5" />
                  </svg>
                </div>
              </div>
              {error && (
                <div className="text-[13px] text-[#d44d4d]">{error}</div>
              )}
              {success && (
                <div className="text-[13px] text-[#2f7f5f]">{success}</div>
              )}

              <div className="mt-[10px] flex items-center justify-between text-[12px] text-[#7a7fa0]">
                <label className="flex items-center gap-[8px]">
                  <input type="checkbox" />
                  Remember me
                </label>
                <button className="text-[#7a7fa0]" type="button">
                  Forgot Password ?
                </button>
              </div>

              <button
                className="mt-[22px] h-[44px] w-full rounded-full bg-[#4bb7b7] text-[14px] font-semibold text-white"
                type="submit"
                disabled={loading}
              >
                {loading ? "Loading..." : "Login"}
              </button>
            </form>

            <button
              className="mt-[14px] flex h-[44px] w-full items-center justify-center gap-[10px] rounded-full border border-[#4bb7b7] text-[14px] font-semibold text-[#2f2f7f]"
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              Google orqali kirish
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Login;
