// Admin.tsx
import { Routes, Route } from "react-router-dom"
import Sidebar from "./SidebarChef"

import Orders from "./Orders"

function Chef() {
  return (
    <div className="d-flex">
      <Sidebar />
      <div className="flex-grow-1 p-3">
        <Routes>
          <Route path="orders" element={<Orders />} />

        </Routes>
      </div>
    </div>
  )
}

export default Chef
