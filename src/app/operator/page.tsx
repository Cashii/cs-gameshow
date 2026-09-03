import { readFile } from "node:fs/promises";
import path from "node:path";
import { OperatorShell } from "@/components/operator/OperatorShell";

export default async function OperatorPage() {
  const changelogMarkdown = await readFile(
    path.join(process.cwd(), "CHANGELOG.md"),
    "utf8",
  );
  return <OperatorShell changelogMarkdown={changelogMarkdown} />;
}
