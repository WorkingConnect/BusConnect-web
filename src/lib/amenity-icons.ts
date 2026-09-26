import {
  Armchair,
  Wifi,
  Snowflake,
  Usb,
  Plug,
  Tv,
  Camera,
  Navigation,
  Lightbulb,
  BedDouble,
  Toilet,
  Accessibility,
  Luggage,
  DoorOpen,
  Flame,
  CupSoda,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

// Maps the fixed amenity labels operators pick from (see
// src/lib/bus-constants.ts PREDEFINED_AMENITIES) to an icon. Operators can
// also type a free-text amenity that won't be a key here — Sparkles covers
// that case.
export const AMENITY_ICONS: Record<string, LucideIcon> = {
  "Air Conditioning (AC)": Snowflake,
  "Wi-Fi": Wifi,
  "USB Charging": Usb,
  "Power Outlets": Plug,
  "Reclining Seats": Armchair,
  "TV / Entertainment": Tv,
  CCTV: Camera,
  "GPS Tracking": Navigation,
  "Reading Lights": Lightbulb,
  "Blankets (Sleeper)": BedDouble,
  Washroom: Toilet,
  "Wheelchair Accessible": Accessibility,
  "Luggage Storage": Luggage,
  Refreshments: CupSoda,
  "Emergency Exit": DoorOpen,
  "Fire Extinguisher": Flame,
};

export { Sparkles as DefaultAmenityIcon };
