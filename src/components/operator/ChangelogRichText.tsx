import { parseChangelogInline } from "@/lib/changelog";

export function ChangelogRichText({
  text,
  className,
}: Readonly<{ text: string; className?: string }>) {
  return (
    <span className={className}>
      {parseChangelogInline(text).map((part, index) =>
        part.bold ? (
          <strong key={index} className="font-semibold text-neutral-200">
            {part.text}
          </strong>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </span>
  );
}
