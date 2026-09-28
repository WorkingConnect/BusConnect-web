import Image from "next/image";

/** `/public/<icon>-light.png` + `/public/<icon>-dark.png` — same light/dark
 *  swap-via-CSS pattern as Logo (src/components/logo.tsx), so it always
 *  matches the current theme with no client JS needed to pick one. */
export function TravelModeIcon({ icon, size = 20 }: { icon: string; size?: number }) {
  return (
    <>
      <Image
        src={`/${icon}-light.png`}
        alt=""
        width={size}
        height={size}
        className="inline-block dark:hidden"
      />
      <Image
        src={`/${icon}-dark.png`}
        alt=""
        width={size}
        height={size}
        className="hidden dark:inline-block"
      />
    </>
  );
}
