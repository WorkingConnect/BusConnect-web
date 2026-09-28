import type { TravelMode } from "@/lib/api";

export const TRAVEL_MODE_OPTIONS: { value: TravelMode; icon: string; label: string }[] = [
  { value: "bike", icon: "bike", label: "Bike" },
  { value: "three_wheeler", icon: "three-wheel-car", label: "Tuk tuk" },
  { value: "car", icon: "car", label: "Car" },
  { value: "van", icon: "van", label: "Van" },
];
