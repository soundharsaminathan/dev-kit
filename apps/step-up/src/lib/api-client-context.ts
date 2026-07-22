import { createContext } from "react";
import type { ApiClient } from "@/lib/api";

export const ApiContext = createContext<ApiClient | null>(null);
