// Admin.tsx
import { Routes, Route } from "react-router-dom"
import Sidebar from "./component/Sidebar"

import Product from "./component/Products"
import Categories from "./component/Categories"
import Carusel from "./component/Carusel"
import Users from "./component/Users"
import Orders from "./component/Orders"
import Dashboard from "./component/Dashboard"

function Admin() {
  return (
    <div className="d-flex">
      <Sidebar />
      <div className="flex-grow-1 p-3">
        <Routes>
          <Route path="dashboard" element={<Dashboard/>} />
          <Route path="product" element={<Product />} />
          <Route path="category" element={<Categories />} />
          <Route path="carusel" element={<Carusel />} />
          <Route path="users" element={<Users />} />
          <Route path="orders" element={<Orders />} />

        </Routes>
      </div>
    </div>
  )
}

export default Admin
