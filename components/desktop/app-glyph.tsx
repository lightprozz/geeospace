import { Bell, BookOpen, CalendarDays, Clock3, GraduationCap, Home, Inbox, Palette, Sparkles, UserRound } from "lucide-react";
import { appDefinition, type DesktopAppId } from "@/lib/desktop/apps";

const icons = { home: Home, calendar: CalendarDays, inbox: Inbox, book: BookOpen, clock: Clock3, bell: Bell, sparkles: Sparkles, school: GraduationCap, user: UserRound, palette: Palette };
export function AppGlyph({ id }: { id: DesktopAppId }) {
  const Icon = icons[appDefinition(id).icon];
  return <span className={`os-glyph os-glyph-${id}`} aria-hidden="true"><Icon size={25} strokeWidth={1.7} /></span>;
}
