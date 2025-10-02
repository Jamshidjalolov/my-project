// src/pages/Login.tsx
import { useForm, type SubmitHandler } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../pages/admin/component/Firebase"; 
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
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        toast.success(`Welcome back, ${userData.name}!`);
        navigate("/");
      } else {
        toast.error("User data not found in database.");
      }
    } catch (error: any) {
      toast.error(error.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-gradient">
      <div className="card shadow-lg p-5 login-card">
        <h2  style={{ color: "#E21A43" }} className="text-center mb-4 fw-bold">Login</h2>

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

          <button
            type="submit"
            className="btn w-100 rounded-pill fw-bold shadow login-btn"
            disabled={isLoading}
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="text-center text-muted mt-4">
          Don’t have an account?{" "}
          <Link to="/register" className="text-decoration-none text-primary fw-semibold">
            Register
          </Link>
        </p>
      </div>

      <style>{`
        .bg-gradient {
          background: linear-gradient(135deg, #ff6363ff 0%, #00d4ff 100%);
        }

        .login-card {
          width: 400px;
          border-radius: 20px;
          transition: transform 0.3s, box-shadow 0.3s;
        }

        .login-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        }

        .login-form input:focus {
          border-color: #E21A43;
          box-shadow: 0 0 8px rgba(226,26,67,0.3);
          outline: none;
        }

        .login-btn {
          background-color: #E21A43;
          color: #fff;
          padding: 0.6rem;
          font-size: 1rem;
          transition: all 0.3s;
        }

        .login-btn:hover {
          background-color: #c01638;
          transform: translateY(-2px);
          box-shadow: 0 6px 15px rgba(226,26,67,0.4);
        }

        .invalid-feedback {
          font-size: 0.875rem;
        }

        @media(max-width: 480px) {
          .login-card {
            width: 90%;
            padding: 2rem;
          }
        }
      `}</style>
    </div>
  );
}
