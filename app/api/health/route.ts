import { runtimeSettings } from "@/lib/platform/runtime";
import { problemResponse } from "@/lib/http/problem";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const { capabilities } = await runtimeSettings();
    return Response.json({ status: "ok", service: "geeospace", stage: "foundation", capabilities }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return problemResponse(503, "CONFIGURATION_INVALID", "Cần kiểm tra cấu hình máy chủ.", false);
  }
}
