import type { NextConfig } from "next";

const config: NextConfig = {
  distDir: process.env.GEEOSPACE_DIST_DIR || ".next",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "same-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" }
    ] }];
  }
};

export default config;
