import { useEffect, useReducer, type ReactNode } from "react"
import { type AppState, type Action } from "../types"
import { MyContext } from "../context/AppContext"
import { client } from "../utils";
import { toast } from "react-toastify";
import { useLocation } from "react-router-dom"

function Reducer(state: AppState, action: Action): AppState {
    switch (action.type) {
        case "SET_USER":
            return { ...state, user: action.payload }
        case "LOG_OUT":
            localStorage.removeItem("accessToken")
            return { ...state, user: null }
        case "SET_LOADING":
            return { ...state, isLoading: false }
        default:
            return state;
    }
}

interface MyContextApiProps {
    children: ReactNode;
}

function MyContextApi({ children }: MyContextApiProps) {
    const [state, dispatch] = useReducer(Reducer, {
        user: null,
        isLoading: true
    })
    const location = useLocation();

    useEffect(() => {
        let token = localStorage.getItem("accessToken")
        if (token) {
            client.get("/users?id=" + token).then(res => {
                if (res.data.length === 0) {
                    toast.error("Session expired. Please log in again.")
                    localStorage.removeItem("accessToken")
                } else {
                    let user = res.data[0]
                    dispatch({ type: "SET_USER", payload: user })
                }
            }).finally(() => {
                dispatch({ type: "SET_LOADING" })
            })
        }
    }, [location.pathname])

    return (
        <MyContext.Provider value={{ state, dispatch }} >
            {children}
        </MyContext.Provider>
    )
}

export default MyContextApi