"use client";

import { createContext, useCallback, useContext, useState, type ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { resolveLmsPortalContainer } from "./lms-ui-environment";

const PortalContainer = createContext<Element | undefined>(undefined);

export function useLmsPortalContainer() {
  return useContext(PortalContainer) ?? (typeof document === "undefined" ? undefined : document.body);
}

export function LmsUiScope({ className, children, ...props }: ComponentProps<"div">) {
  const [container, setContainer] = useState<Element>();
  const ref = useCallback((element: HTMLDivElement | null) => {
    if (element) setContainer(resolveLmsPortalContainer(element));
  }, []);
  return <PortalContainer.Provider value={container}><div {...props} ref={ref} className={cn("lms-ui", className)}>{children}</div></PortalContainer.Provider>;
}
