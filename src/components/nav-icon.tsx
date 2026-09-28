import { ThemedIcon } from "./themed-icon";

const ICON_FILES = {
  search: "search",
  route: "popular-path",
  ticket: "ticket",
  bus: "bus-icon",
} as const;

export type NavIconName = keyof typeof ICON_FILES;

/** These are flat single-color line icons, so "active" is shown via opacity
 *  rather than recoloring the image itself. */
export function NavIcon({
  icon,
  size = 20,
  active = true,
  className = "",
}: {
  icon: NavIconName;
  size?: number;
  active?: boolean;
  className?: string;
}) {
  return (
    <ThemedIcon
      base={ICON_FILES[icon]}
      size={size}
      className={`transition-opacity duration-300 ${active ? "" : "opacity-50"} ${className}`}
    />
  );
}
