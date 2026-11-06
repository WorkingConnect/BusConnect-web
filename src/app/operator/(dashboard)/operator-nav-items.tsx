import {
  LayoutDashboard,
  Bus,
  CalendarClock,
  CalendarRange,
  Wallet,
  UserPlus,
  UserCircle,
  ScanLine,
  type LucideIcon,
} from "lucide-react";

export type OperatorNavItem = {
  label: string;
  /** Shorter label for the mobile bottom tab bar. */
  short: string;
  href: string;
  icon: LucideIcon;
  ownerOnly: boolean;
  /** Eligible for the mobile bottom tab bar (the first few are shown; the
   *  rest live behind the “More” tab / drawer). */
  mobile: boolean;
};

/** Single source of truth for the operator workspace nav — consumed by the
 *  sidebar/drawer list (OperatorNav) and the mobile bottom tab bar. */
export const OPERATOR_NAV_ITEMS: OperatorNavItem[] = [
  { label: "Overview", short: "Overview", href: "/operator", icon: LayoutDashboard, ownerOnly: false, mobile: true },
  { label: "Pilots", short: "Pilots", href: "/operator/pilots", icon: UserPlus, ownerOnly: true, mobile: false },
  { label: "Fleet", short: "Fleet", href: "/operator/fleet", icon: Bus, ownerOnly: true, mobile: false },
  { label: "Journeys", short: "Journeys", href: "/operator/journeys", icon: CalendarClock, ownerOnly: true, mobile: false },
  { label: "Timetable", short: "Trips", href: "/operator/timetable", icon: CalendarRange, ownerOnly: true, mobile: true },
  { label: "Revenue", short: "Revenue", href: "/operator/revenue", icon: Wallet, ownerOnly: true, mobile: true },
  { label: "Scan tickets", short: "Scan", href: "/operator/scan", icon: ScanLine, ownerOnly: false, mobile: true },
  { label: "Profile", short: "Profile", href: "/operator/profile", icon: UserCircle, ownerOnly: false, mobile: true },
];
