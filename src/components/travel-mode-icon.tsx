import { ThemedIcon } from "./themed-icon";

export function TravelModeIcon({ icon, size = 20 }: { icon: string; size?: number }) {
  return <ThemedIcon base={icon} size={size} />;
}
