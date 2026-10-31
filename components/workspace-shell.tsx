import { isDesktopApp } from "@/lib/desktop/apps";
import { DesktopWorkspace } from "@/components/desktop/desktop-workspace";

export function WorkspaceShell({ active }: { active?: string }) {
  return <DesktopWorkspace key={active ?? "home"} initialApp={isDesktopApp(active) ? active : undefined} initialTime={new Date().toISOString()} launch={active === "more"} />;
}
