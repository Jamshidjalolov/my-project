import { useContext } from "react";
import { MyContext } from "../context/AppContext";
import { type ContextValue } from "../types";

export function useContextApi(): ContextValue {
    const context = useContext(MyContext);
    if (!context) {
        throw new Error("useContextApi must be used within a MyContext.Provider");
    }
    return context;
}



