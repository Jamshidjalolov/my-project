import { useForm, type SubmitHandler } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { API_URL, parseJsonResponse } from "../lib/api";
import { setToken } from "../lib/auth";
import { useState } from "react";

type LoginFormInputs = {
  email: string;
  password: string;
};

export default function Login() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>();

  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | undefined)?.from?.pathname || "/";
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
    setIsLoading(true);
    try {
      // OAuth2 token olish (Swagger bilan bir xil yo'l).
      const body = new URLSearchParams();
      body.set("username", data.email);
      body.set("password", data.password);
      body.set("grant_type", "password");

      const res = await fetch(`${API_URL}/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      if (!res.ok) {
        const errData = await parseJsonResponse<{ detail?: string }>(res);
        throw new Error(errData.detail || "Login failed. Please try again.");
      }
      const payload = await parseJsonResponse<{
        access_token: string;
        token_type: string;
        user: { name: string };
      }>(res);
      setToken(payload.access_token);
      toast.success(`Welcome back, ${payload.user?.name || "User"}!`);
      // Login bo'lgandan keyin oldingi sahifaga qaytish.
      navigate(from, { replace: true });
    } catch (error: any) {
      toast.error(error.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-gradient">
      <div className="card shadow-lg p-5 login-card">
        <h2 style={{ color: "#E21A43" }} className="text-center mb-4 fw-bold">
          Login
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="login-form">
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
              className={`form-control rounded-pill px-3 py-2 ${
                errors.password ? "is-invalid" : "shadow-sm"
              }`}
              placeholder="Enter your password"
              {...register("password", {
                required: "Password is required",
                minLength: { value: 6, message: "Minimum 6 characters" },
              })}
              disabled={isLoading}
            />
            {errors.password && <div className="invalid-feedback">{errors.password.message}</div>}
          </div>

          <button type="submit" className="btn w-100 rounded-pill fw-bold shadow login-btn" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="text-center text-muted mt-4">
          Don't have an account?{" "}
          <Link to="/register" className="text-decoration-none text-primary fw-semibold">
            Register
          </Link>
        </p>
      </div>

    </div>
  );
}
