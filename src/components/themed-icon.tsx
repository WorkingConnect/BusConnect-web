import Image from "next/image";

/** `/public/<base>-light.png` + `/public/<base>-dark.png` — swapped via CSS
 *  (`dark:` variants), matching Logo (src/components/logo.tsx). Shared by
 *  NavIcon and TravelModeIcon so this pattern only lives in one place. */
export function ThemedIcon({
  base,
  size = 20,
  className = "",
}: {
  base: string;
  size?: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex shrink-0 ${className}`} style={{ width: size, height: size }}>
      <Image src={`/${base}-light.png`} alt="" width={size} height={size} className="block dark:hidden" />
      <Image src={`/${base}-dark.png`} alt="" width={size} height={size} className="hidden dark:block" />
    </span>
  );
}
