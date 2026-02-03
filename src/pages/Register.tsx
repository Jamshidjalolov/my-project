import { useForm, type SubmitHandler } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { API_URL, parseJsonResponse } from "../lib/api";
import { setToken } from "../lib/auth";
import { useState } from "react";

type RegisterFormInputs = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export default function Register() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormInputs>();

  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | undefined)?.from?.pathname || "/";
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit: SubmitHandler<RegisterFormInputs> = async (data) => {
    const { name, email, password } = data;
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        const errData = await parseJsonResponse<{ detail?: string }>(res);
        throw new Error(errData.detail || "Registration failed. Please try again.");
      }
      // Ro'yxatdan o'tgandan keyin token olish (OAuth2).
      const tokenBody = new URLSearchParams();
      tokenBody.set("username", email);
      tokenBody.set("password", password);
      tokenBody.set("grant_type", "password");

      const loginRes = await fetch(`${API_URL}/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: tokenBody,
      });
      if (loginRes.ok) {
        const payload = await parseJsonResponse<{
          access_token: string;
          token_type: string;
        }>(loginRes);
        setToken(payload.access_token);
        toast.success("Registration successful!");
        // Ro'yxatdan o'tgandan keyin oldingi sahifaga qaytaramiz.
        navigate(from, { replace: true });
      } else {
        toast.success("Registration successful!");
        // Agar auto-login ishlamasa, login sahifasiga yo'naltiramiz.
        navigate("/login", { state: { from: { pathname: from } } });
      }
    } catch (error: any) {
      toast.error(error.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-gradient">
      <div className="card shadow-lg p-5 register-card">
        <h2 style={{ color: "#E21A43" }} className="text-center mb-4 fw-bold">Register</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="register-form">
          <div className="mb-3">
            <label className="form-label fw-semibold">Full Name</label>
            <input
              type="text"
              className={`form-control rounded-pill px-3 py-2 ${errors.name ? "is-invalid" : "shadow-sm"}`}
              placeholder="Enter your name"
              {...register("name", { required: "Name is required" })}
              disabled={isLoading}
            />
            {errors.name && <div className="invalid-feedback">{errors.name.message}</div>}
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Email</label>
            <input
              type="email"
              className={`form-control rounded-pill px-3 py-2 ${errors.email ? "is-invalid" : "shadow-sm"}`}
              placeholder="Enter your email"
              {...register("email", {
                required: "Email is required",
                pattern: { value: /\S+@\S+\.\S+/, message: "Enter a valid email" },
              })}
              disabled={isLoading}
            />
            {errors.email && <div className="invalid-feedback">{errors.email.message}</div>}
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Password</label>
            <input
              type="password"
              className={`form-control rounded-pill px-3 py-2 ${errors.password ? "is-invalid" : "shadow-sm"}`}
              placeholder="Enter your password"
              {...register("password", {
                required: "Password is required",
                minLength: { value: 6, message: "Minimum 6 characters" },
              })}
              disabled={isLoading}
            />
            {errors.password && <div className="invalid-feedback">{errors.password.message}</div>}
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Confirm Password</label>
            <input
              type="password"
              className={`form-control rounded-pill px-3 py-2 ${errors.confirmPassword ? "is-invalid" : "shadow-sm"}`}
              placeholder="Re-enter your password"
              {...register("confirmPassword", {
                required: "Please confirm your password",
                validate: (value) => value === watch("password") || "Passwords do not match",
              })}
              disabled={isLoading}
            />
            {errors.confirmPassword && (
              <div className="invalid-feedback">{errors.confirmPassword.message}</div>
            )}
          </div>

          <button
            type="submit"
            className="btn w-100 rounded-pill fw-bold shadow register-btn"
            disabled={isLoading}
          >
            {isLoading ? "Registering..." : "Register"}
          </button>
        </form>

        <p className="text-center text-muted mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-decoration-none text-primary fw-semibold">
            Login
          </Link>
        </p>
      </div>

    </div>
  );
}
