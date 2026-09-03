import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import { ChangelogPage } from "@/components/operator/ChangelogPage";

export const metadata: Metadata = {
  title: "Updates",
};

export default async function OperatorChangelogRoute() {
  const markdown = await readFile(
    path.join(process.cwd(), "CHANGELOG.md"),
    "utf8",
  );
  return <ChangelogPage markdown={markdown} />;
}
