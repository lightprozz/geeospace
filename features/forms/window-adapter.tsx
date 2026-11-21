"use client"

import {
  createContext, useCallback, useContext, useLayoutEffect, useMemo, useState,
  type ComponentProps, type Dispatch, type ReactNode, type SetStateAction,
} from "react"
import { useWindowNavigation } from "@/components/desktop/window-navigation"

type HeaderConfig = { breadcrumbs: ReactNode; actions?: ReactNode }
const HeaderValue = createContext<HeaderConfig | null>(null)
const HeaderSetter = createContext<Dispatch<SetStateAction<HeaderConfig | null>> | null>(null)
const QueryState = createContext<{
  values: Record<string, string>
  setValues: Dispatch<SetStateAction<Record<string, string>>>
} | null>(null)
const RouteBase = createContext("/requests")

export function toWindowPath(href: string, base: string): string {
  const [pathname] = href.split("?")
  if (pathname === base || pathname === base + "/") return ""
  if (pathname.startsWith(base + "/")) return pathname.slice(base.length + 1)
  if (!pathname.startsWith("/")) return pathname
  throw new Error("Cannot navigate outside this forms window")
}

export function FormsWindowAdapter({ base, children }: { base: string; children: ReactNode }) {
  const [header, setHeader] = useState<HeaderConfig | null>(null)
  const { path } = useWindowNavigation()
  const [values, setValues] = useState<Record<string, string>>(
    () => Object.fromEntries(new URLSearchParams(path.split("?")[1])),
  )
  const query = useMemo(() => ({ values, setValues }), [values])
  return (
    <RouteBase.Provider value={base}>
      <QueryState.Provider value={query}>
        <HeaderSetter.Provider value={setHeader}>
          <HeaderValue.Provider value={header}>
            <FormsHeader />
          </HeaderValue.Provider>
          {children}
        </HeaderSetter.Provider>
      </QueryState.Provider>
    </RouteBase.Provider>
  )
}

function FormsHeader() {
  const header = useContext(HeaderValue)
  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2">
      <div className="min-w-0">{header?.breadcrumbs}</div>
      <div className="flex shrink-0 items-center gap-2">{header?.actions}</div>
    </header>
  )
}

export function useSetDashboardHeader(config: HeaderConfig, deps?: string) {
  const setHeader = useContext(HeaderSetter)
  useLayoutEffect(() => {
    setHeader?.(config)
    return () => setHeader?.(null)
  }, [setHeader, config, deps])
}

export function useQueryState(key: string): [string | null, (value: string | null) => void] {
  const query = useContext(QueryState)
  const setValues = query?.setValues
  const setValue = useCallback((value: string | null) => {
    setValues?.(previous => {
      const next = { ...previous }
      if (value === null) delete next[key]
      else next[key] = value
      return next
    })
  }, [key, setValues])
  return [query?.values[key] ?? null, setValue]
}

export function useRouter() {
  const { navigate, back } = useWindowNavigation()
  const base = useContext(RouteBase)
  const setValues = useContext(QueryState)?.setValues
  return useMemo(() => ({
    push(href: string) {
      const path = toWindowPath(href, base)
      if (href.includes("?")) {
        setValues?.(Object.fromEntries(new URLSearchParams(href.split("?")[1])))
      }
      navigate(path)
    },
    back,
  }), [navigate, back, base, setValues])
}

export function WindowLink({ href = "", onClick, children, ...props }: ComponentProps<"a">) {
  const router = useRouter()
  return (
    <a {...props} href={href} onClick={event => {
      onClick?.(event)
      if (event.defaultPrevented) return
      event.preventDefault()
      router.push(href)
    }}>{children}</a>
  )
}

export default WindowLink
