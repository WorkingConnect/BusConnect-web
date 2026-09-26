import Link from "next/link";
import Image from "next/image";

export function Logo({
  className = "",
  height = 28,
  /** Where the logo links to. Defaults to the site root (the proxy then
   *  redirects to the visitor's locale); pass a localized path to skip the hop. */
  href = "/",
  /** Surfaces that are always dark (e.g. the footer) regardless of the
   *  site's light/dark toggle — always show the dark-mode logo. */
  onDark = false,
}: {
  className?: string;
  height?: number;
  href?: string;
  onDark?: boolean;
}) {
  const width = height * 4;

  if (onDark) {
    return (
      <Link href={href} className={`inline-flex items-center ${className}`}>
        <Image
          src="/logo-dark.png"
          alt="BusConnect"
          width={width}
          height={height}
          style={{ height, width: "auto" }}
        />
      </Link>
    );
  }

  return (
    <Link href={href} className={`inline-flex items-center ${className}`}>
      <Image
        src="/logo.png"
        alt="BusConnect"
        width={width}
        height={height}
        style={{ height, width: "auto" }}
        className="block dark:hidden"
      />
      <Image
        src="/logo-dark.png"
        alt="BusConnect"
        width={width}
        height={height}
        style={{ height, width: "auto" }}
        className="hidden dark:block"
      />
    </Link>
  );
}
