import type { NextConfig } from "next";

const config: NextConfig = {
  distDir: process.env.GEEOSPACE_DIST_DIR || ".next",
  poweredByHeader: false,
  webpack(config) {
    config.resolve.alias["pdfjs-dist$"] = "pdfjs-dist/build/pdf.min.mjs";
    return config;
  },
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
