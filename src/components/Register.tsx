import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getRedirectResult,
  sendEmailVerification,
  signInWithRedirect,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import type { User } from "firebase/auth";
import { auth, googleProvider } from "../firebase";

const heroImage =
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1200&auto=format&fit=crop";

function Register() {
  const [tab, setTab] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pendingGoogleUser, setPendingGoogleUser] = useState<User | null>(null);
  const [useEmailCode, setUseEmailCode] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const apiBase = "http://127.0.0.1:8000";

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
        return "Google orqali ro'yxatdan o'tishda xatolik bo'ldi.";
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

  useEffect(() => {
    setEmailCode("");
    setCodeSent(false);
    setCodeVerified(false);
    if (!useEmailCode) {
      setPendingGoogleUser(null);
    }
  }, [email, useEmailCode]);

  const requestEmailCode = async (targetEmail: string) => {
    const normalizedEmail = targetEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Email kiriting.");
      return;
    }
    setError("");
    setSuccess("");
    setSendingCode(true);
    try {
      const res = await fetch(`${apiBase}/auth/email-code/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      if (!res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          throw new Error(data.detail || "Kod yuborilmadi.");
        } catch {
          throw new Error(text || "Kod yuborilmadi.");
        }
      }
      setCodeSent(true);
      setCodeVerified(false);
      setSuccess("Kod yuborildi. Emailni tekshiring.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kod yuborilmadi.");
    } finally {
      setSendingCode(false);
    }
  };

  const verifyEmailCode = async (targetEmail: string, code: string) => {
    const normalizedEmail = targetEmail.trim().toLowerCase();
    const normalizedCode = code.trim();
    if (!normalizedEmail || !normalizedCode) {
      setError("Email va kodni kiriting.");
      return;
    }
    setError("");
    setSuccess("");
    setVerifyingCode(true);
    try {
      const res = await fetch(`${apiBase}/auth/email-code/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, code: normalizedCode }),
      });
      if (!res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          throw new Error(data.detail || "Kod noto'g'ri.");
        } catch {
          throw new Error(text || "Kod noto'g'ri.");
        }
      }
      setCodeVerified(true);
      setSuccess("Email tasdiqlandi.");
      if (pendingGoogleUser) {
        const user = pendingGoogleUser;
        setPendingGoogleUser(null);
        await finalizeGoogleUser(user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kod noto'g'ri.");
    } finally {
      setVerifyingCode(false);
    }
  };

  const finalizeGoogleUser = async (user: User) => {
    if (!user.email) {
      throw new Error("Email topilmadi.");
    }
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
      setError(syncResult.detail || "Google login tasdiqlanmadi.");
      return;
    }
    navigate("/");
  };

  useEffect(() => {
    let mounted = true;
    const finalizeRedirect = async () => {
      const result = await getRedirectResult(auth);
      if (result?.user && mounted) {
        await finalizeGoogleUser(result.user);
      }
    };
    finalizeRedirect().catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (useEmailCode && !codeVerified) {
      setError("Email kodini tasdiqlang.");
      return;
    }
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    if (!trimmedEmail || !trimmedUsername || !trimmedPassword) {
      setError("Email, username va parolni to'liq kiriting.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          username: trimmedUsername,
          password: trimmedPassword,
          roles: ["user"],
          require_email_code: useEmailCode,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          throw new Error(data.detail || "Ro'yxatdan o'tish xatosi.");
        } catch {
          throw new Error(text || "Ro'yxatdan o'tish xatosi.");
        }
      }
      navigate("/login", {
        state: {
          prefillIdentifier: trimmedEmail,
          prefillPassword: trimmedPassword,
          autoLogin: true,
          message: "Ro'yxatdan o'tdingiz. Login qilinmoqda...",
        },
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ro'yxatdan o'tishda xatolik."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const credential = await signInWithPopup(auth, googleProvider);
      const googleEmail = credential.user.email?.trim().toLowerCase() || "";
      const sameVerifiedEmail =
        codeVerified && email.trim().toLowerCase() === googleEmail;
      if (googleEmail) {
        setEmail(googleEmail);
      }

      if (useEmailCode) {
        if (!googleEmail) {
          throw new Error("Google akkauntdan email olinmadi.");
        }
        if (sameVerifiedEmail) {
          await finalizeGoogleUser(credential.user);
          return;
        }
        setPendingGoogleUser(credential.user);
        await requestEmailCode(googleEmail);
        setSuccess("Kod yuborildi. Tasdiqlagandan keyin Google bilan davom eting.");
        return;
      }

      await finalizeGoogleUser(credential.user);
    } catch (err) {
      const code = getAuthCode(err);
      if (
        code === "auth/popup-blocked" ||
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request"
      ) {
        if (useEmailCode) {
          setError(
            "Kod bilan Google kirish uchun popupga ruxsat bering va qayta urinib ko'ring."
          );
          return;
        }
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

            <form className="mt-[18px] space-y-[16px]" onSubmit={handleRegister}>
              <div>
                <label className="text-[13px] font-semibold text-[#2f2f7f]">
                  Email Address
                </label>
                <input
                  className="mt-[8px] h-[44px] w-full rounded-full border border-[#70d0d1] px-[18px] text-[14px] outline-none"
                  placeholder="Enter your Email Address"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className="rounded-[16px] border border-[#e7f4f4] bg-[#f7fbfb] p-[14px]">
                <label className="flex items-center justify-between gap-[10px] text-[13px] font-semibold text-[#2f2f7f]">
                  <span>Email kod bilan tasdiqlash (ixtiyoriy)</span>
                  <button
                    type="button"
                    className={`rounded-full px-[12px] py-[6px] text-[11px] font-semibold ${
                      useEmailCode
                        ? "bg-[#4bb7b7] text-white"
                        : "bg-white text-[#4bb7b7] border border-[#4bb7b7]"
                    }`}
                    onClick={() => setUseEmailCode((prev) => !prev)}
                  >
                    {useEmailCode ? "Yoqilgan" : "Oddiy o'tish"}
                  </button>
                </label>

                {useEmailCode ? (
                  <>
                    <div className="mt-[10px] flex flex-wrap items-center gap-[10px]">
                      <input
                        className="h-[40px] flex-1 rounded-full border border-[#70d0d1] px-[16px] text-[14px] outline-none"
                        placeholder="6 xonali kod"
                        value={emailCode}
                        onChange={(event) => setEmailCode(event.target.value)}
                      />
                      <button
                        type="button"
                        className="h-[40px] rounded-full border border-[#4bb7b7] px-[16px] text-[13px] font-semibold text-[#2f2f7f]"
                        onClick={() => requestEmailCode(email)}
                        disabled={sendingCode || !email}
                      >
                        {sendingCode ? "Yuborilmoqda..." : "Kod yuborish"}
                      </button>
                      <button
                        type="button"
                        className="h-[40px] rounded-full bg-[#4bb7b7] px-[16px] text-[13px] font-semibold text-white"
                        onClick={() => verifyEmailCode(email, emailCode)}
                        disabled={verifyingCode || !codeSent || !emailCode}
                      >
                        {verifyingCode ? "Tekshirilmoqda..." : "Tasdiqlash"}
                      </button>
                    </div>
                    <p className="mt-[8px] text-[12px] text-[#7a7fa0]">
                      Kodni tasdiqlagandan keyin register yoki Google kirish yakunlanadi.
                    </p>
                    {codeVerified && (
                      <div className="mt-[8px] text-[12px] text-[#2f7f5f]">
                        Email tasdiqlandi.
                      </div>
                    )}
                  </>
                ) : (
                  <p className="mt-[8px] text-[12px] text-[#7a7fa0]">
                    Kodsiz oddiy ro'yxatdan o'tish ishlaydi.
                  </p>
                )}
              </div>
              <div>
                <label className="text-[13px] font-semibold text-[#2f2f7f]">
                  User name
                </label>
                <input
                  className="mt-[8px] h-[44px] w-full rounded-full border border-[#70d0d1] px-[18px] text-[14px] outline-none"
                  placeholder="Enter your User name"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
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

              <button
                className="mt-[22px] h-[44px] w-full rounded-full bg-[#4bb7b7] text-[14px] font-semibold text-white"
                type="submit"
                disabled={loading}
              >
                {loading ? "Loading..." : "Register"}
              </button>
            </form>

            <button
              className="mt-[14px] flex h-[44px] w-full items-center justify-center gap-[10px] rounded-full border border-[#4bb7b7] text-[14px] font-semibold text-[#2f2f7f]"
              type="button"
              onClick={handleGoogleRegister}
              disabled={loading}
            >
              Google orqali ro'yxatdan o'tish
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Register;
