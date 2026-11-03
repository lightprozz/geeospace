import type { ReactNode } from "react";
import "@fontsource-variable/inter";
import "@geeo/embedded-app/theme.css";
import "./globals.css";
import { SpaceOSProvider } from "@geeo/embedded-app/bridge";
import { parentOrigin } from "@geeo/embedded-app/server";
export const dynamic = "force-dynamic";
export const metadata = { title: "GeeO Calendar", robots: { index: false, follow: false } };
export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="vi" suppressHydrationWarning><body><SpaceOSProvider parentOrigin={parentOrigin()}>{children}</SpaceOSProvider><noscript>Bật JavaScript để sử dụng ứng dụng. Enable JavaScript to use this app.</noscript></body></html>;
}
