import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PageNotFound from "./pages/PageNotFound";
import Admin from "./pages/admin/Admin";
import Chef from "./pages/admin/component/Chef";
import ProtectedRoute from "./utils";
import Cart from "./hooks/useShop";
import Notifications from "./pages/Notifications";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/cart" element={<Cart />} />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute roles={["admin"]}>
            <Admin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chef/*"
        element={
          <ProtectedRoute roles={["admin", "chef"]}>
            <Chef />
          </ProtectedRoute>
        }
      />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}

export default App;
