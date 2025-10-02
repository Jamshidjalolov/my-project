import axios, { type AxiosInstance } from "axios";

export const client: AxiosInstance = axios.create({
  baseURL: "http://localhost:3000",
})


import { Navigate } from "react-router-dom";
import { useContextApi } from "./hooks/useContextApi";

interface Props {
  role: string;
  children: React.ReactNode;
}
function ProtectedRoute({ role, children }: Props) {

  const { state: { user,isLoading } } = useContextApi();

  if (!isLoading && !user?.roles.includes(role)) {
    return <Navigate to="/" replace />;
  }
  return (
    children
  )
}

export default ProtectedRoute

