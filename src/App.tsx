import { Routes, Route } from "react-router-dom"
import Home from "./pages/Home"
import MyContextApi from "./hooks/MyContextApi"
import { use, useContext, type ReactElement } from "react"
import { ToastContainer } from "react-toastify"
import Header from "./components/Header"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Admin from "./pages/admin/Admin"
import ProtectedRoute from "./utils"
import Shop from "./hooks/useShop"
import Chef from "./pages/admin/component/Chef"


function App(): ReactElement {


    return (
        <>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/cart" element={<Shop />} />"
                <Route path="/admin" element={
                    <ProtectedRoute role={"ADMIN"}>
                        <Admin />
                    </ProtectedRoute>

                } >
                   
                </Route>
                <Route path="/chef" element={<ProtectedRoute role={"ADMIN", "CHEF"}>
                        <Chef />
                    </ProtectedRoute>} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                 <Route path="/admin/*" element={<Admin />} />
                 <Route path="/chef/*" element={<Chef />} />


            </Routes>
            <ToastContainer />
        </>
    )
}

export default App