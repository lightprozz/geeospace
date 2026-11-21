import { notFound } from "next/navigation";
import { UiKitShowcase } from "./showcase";
import { accents } from "@/lib/desktop/appearance";

export default async function UiKitPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const query = await searchParams;
  const theme = query.theme === "dark" ? "dark" : "light";
  const accent = typeof query.accent === "string" && Object.hasOwn(accents, query.accent) ? accents[query.accent as keyof typeof accents] : accents.geeo;
  return <UiKitShowcase theme={theme} accent={accent} />;
}
