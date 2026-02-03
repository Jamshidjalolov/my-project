import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthRole } from "./hooks/useAuthRole";

interface Props {
  roles?: string[];
  children: ReactNode;
}

function ProtectedRoute({ roles, children }: Props) {
  const { user, roles: userRoles, loading } = useAuthRole();
  const location = useLocation();

  if (loading) {
    return <div style={{ padding: "2rem" }}>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && roles.length > 0) {
    const allowed = roles.map((r) => r.toLowerCase());
    const currentRoles =
      userRoles && userRoles.length > 0
        ? userRoles.map((r) => r.toLowerCase())
        : user?.role
          ? [user.role.toLowerCase()]
          : ["user"];
    if (!currentRoles.some((r) => allowed.includes(r))) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}

export default ProtectedRoute;
