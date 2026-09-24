import Link from "next/link";

/** Title on the left, an optional action link on the right — matches
 * MK admin's plain `.section-heading` (no icon badge). */
export function SectionHeading({
  title,
  action,
}: {
  title: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="font-heading text-2xl font-semibold">{title}</h2>
      {action && (
        <Link href={action.href} className="ui text-sm font-medium text-brand hover:underline dark:text-blue-400">
          {action.label}
        </Link>
      )}
    </div>
  );
}
