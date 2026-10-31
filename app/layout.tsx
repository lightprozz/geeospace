import type { Metadata } from "next";
import Link from "next/link";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Geeospace · Không gian làm việc", template: "%s · Geeospace" },
  description: "Không gian làm việc dành cho giáo viên và nhân viên Gee-O.",
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}<noscript><style>{"body > :not(noscript) { display: none !important; }"}</style><main className="standalone-message"><h1>Geeospace cần JavaScript</h1><p>Bật JavaScript trong trình duyệt rồi tải lại trang để mở không gian làm việc. Nếu vẫn không mở được, liên hệ quản trị Gee-O.</p><Link href="/">Tải lại Geeospace</Link></main></noscript></body></html>;
}
