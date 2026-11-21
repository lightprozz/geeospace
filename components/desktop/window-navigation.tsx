"use client";
import { createContext, useContext } from "react";

type WindowNavigation = { path: string; canGoBack: boolean; navigate: (path: string) => void; back: () => void };
export const WindowNavigationContext = createContext<WindowNavigation>({ path: "", canGoBack: false, navigate: () => {}, back: () => {} });
export function useWindowNavigation() { return useContext(WindowNavigationContext); }
