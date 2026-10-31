import { problemResponse } from "@/lib/http/problem";
export function GET() {
  return problemResponse(503, "GEEO_AUTH_NOT_READY", "Kết nối Gee-O Auth chưa sẵn sàng.", false);
}
