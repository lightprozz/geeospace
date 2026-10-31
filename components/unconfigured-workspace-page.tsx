import { WorkspaceShell } from "./workspace-shell";
export function UnconfiguredWorkspacePage({ section }: { section: string }) {
  return <WorkspaceShell active={section} />;
}
