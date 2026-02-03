// Admin.tsx
import { Routes, Route, useLocation, Navigate } from "react-router-dom"
import Sidebar from "./component/Sidebar"

import Product from "./component/Products"
import Categories from "./component/Categories"
import Carusel from "./component/Carusel"
import Users from "./component/Users"
import Orders from "./component/Orders"
import Dashboard from "./component/Dashboard"
import Combo from "./component/Combo"

function Admin() {
  const location = useLocation()
  const titleMap: Record<string, string> = {
    "/admin/dashboard": "Dashboard",
    "/admin/product": "Products",
    "/admin/category": "Categories",
    "/admin/carusel": "Carusel / Slider",
    "/admin/combo": "Combo",
    "/admin/users": "Users",
    "/admin/orders": "Orders",
  }
  const pageTitle = titleMap[location.pathname] || "Admin Panel"

  return (
    <div className="admin-shell">
      <Sidebar />
      <div className="admin-content">
        <div className="admin-page">
          <Routes>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="product" element={<Product />} />
            <Route path="category" element={<Categories />} />
            <Route path="carusel" element={<Carusel />} />
            <Route path="combo" element={<Combo />} />
            <Route path="users" element={<Users />} />
            <Route path="orders" element={<Orders />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

export default Admin
