import { createContext } from "react"
import { type ContextValue } from "../types"

export const MyContext = createContext<ContextValue | undefined>(undefined);

