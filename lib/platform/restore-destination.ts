import { access, realpath } from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";

async function physicalPath(path: string): Promise<string> {
  try { return await realpath(path); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT" || dirname(path) === path) throw error;
    return join(await physicalPath(dirname(path)), basename(path));
  }
}

/** Resolve symlinked parents before checking that restore cannot touch active state. */
export async function resolveRestoreDestination(destination: string, activeState: string) {
  const folder = await physicalPath(resolve(destination));
  const active = await physicalPath(resolve(activeState));
  const child = relative(active, folder);
  if (!child || (!child.startsWith(`..${sep}`) && child !== ".." && !child.startsWith(sep))) {
    throw new Error("Restore destination must be outside the active state");
  }
  try { await access(folder); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return folder;
    throw error;
  }
  throw new Error("Restore directory must not exist");
}
