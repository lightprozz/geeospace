import { handleCalendar } from "../../../lib/http-handler.mjs";
export const dynamic = "force-dynamic";
export function GET(request: Request) { return handleCalendar(request); }
