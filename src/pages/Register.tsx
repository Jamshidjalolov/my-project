// src/pages/Register.tsx
import { useForm, type SubmitHandler } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../pages/admin/component/Firebase";
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
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit: SubmitHandler<RegisterFormInputs> = async (data) => {
    const { name, email, password } = data;
    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name,
        email,
        role: "user",
        createdAt: new Date(),
      });

      toast.success("Registration successful!");
      navigate("/login");
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

      <style>{`
        .bg-gradient {
          background: linear-gradient(135deg, #6c63ff 0%, #00d4ff 100%);
        }

        .register-card {
          width: 420px;
          border-radius: 20px;
          transition: transform 0.3s, box-shadow 0.3s;
        }

        .register-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        }

        .register-form input:focus {
          border-color: #E21A43;
          box-shadow: 0 0 8px rgba(226,26,67,0.3);
          outline: none;
        }

        .register-btn {
          background-color: #E21A43;
          color: #fff;
          padding: 0.6rem;
          font-size: 1rem;
          transition: all 0.3s;
        }

        .register-btn:hover {
          background-color: #c01638;
          transform: translateY(-2px);
          box-shadow: 0 6px 15px rgba(226,26,67,0.4);
        }

        .invalid-feedback {
          font-size: 0.875rem;
        }

        @media(max-width: 480px) {
          .register-card {
            width: 90%;
            padding: 2rem;
          }
        }
      `}</style>
    </div>
  );
}
