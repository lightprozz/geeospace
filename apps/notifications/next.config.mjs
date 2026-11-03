import { appHeaders } from "@geeo/embedded-app/server";
import { fileURLToPath } from "node:url";
const config = { poweredByHeader: false, transpilePackages: ["@geeo/embedded-app"], outputFileTracingRoot: fileURLToPath(new URL("../../", import.meta.url)), async headers() { return [{ source: "/:path*", headers: appHeaders() }]; } };
export default config;
