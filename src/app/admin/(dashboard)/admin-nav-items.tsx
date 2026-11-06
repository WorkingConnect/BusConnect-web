import {
  LayoutDashboard,
  Building2,
  Wallet,
  PiggyBank,
  Search,
  Bus,
  Route,
  Images,
  IdCard,
  CalendarRange,
  HandCoins,
  TrendingUp,
  Users,
  ClipboardCheck,
  Megaphone,
  MapPin,
  Tag,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  label: string;
  /** Shorter label for the mobile bottom tab bar. */
  short: string;
  href: string;
  icon: LucideIcon;
  /** Eligible for the mobile bottom tab bar (the first few are shown; the
   *  rest live behind the "More" tab / drawer). */
  mobile: boolean;
};

/** Single source of truth for the admin workspace nav — consumed by the
 *  sidebar/drawer list (AdminNav) and the mobile bottom tab bar. */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { label: "Overview", short: "Overview", href: "/admin", icon: LayoutDashboard, mobile: true },
  { label: "Users", short: "Users", href: "/admin/users", icon: Users, mobile: true },
  { label: "Operators", short: "Operators", href: "/admin/operators", icon: Building2, mobile: true },
  { label: "Review", short: "Review", href: "/admin/review", icon: ClipboardCheck, mobile: true },
  { label: "Timetable", short: "Timetable", href: "/admin/timetable", icon: CalendarRange, mobile: false },
  { label: "Revenue", short: "Revenue", href: "/admin/revenue", icon: TrendingUp, mobile: false },
  { label: "Payouts", short: "Payouts", href: "/admin/payouts", icon: HandCoins, mobile: false },
  { label: "Wallet", short: "Wallet", href: "/admin/wallet", icon: PiggyBank, mobile: false },
  { label: "Fleet", short: "Fleet", href: "/admin/fleet", icon: Bus, mobile: false },
  { label: "Locations", short: "Locations", href: "/admin/locations", icon: MapPin, mobile: false },
  { label: "Routes", short: "Routes", href: "/admin/routes", icon: Route, mobile: false },
  { label: "Route Cards", short: "Route Cards", href: "/admin/route-cards", icon: Images, mobile: false },
  { label: "Pilots", short: "Pilots", href: "/admin/pilots", icon: IdCard, mobile: false },
  { label: "Refunds", short: "Refunds", href: "/admin/refunds", icon: Wallet, mobile: false },
  { label: "Bookings", short: "Bookings", href: "/admin/bookings", icon: Search, mobile: false },
  { label: "Hire Listings", short: "Hire", href: "/admin/hire-listings", icon: Megaphone, mobile: false },
  { label: "Offers", short: "Offers", href: "/admin/offers", icon: Tag, mobile: false },
];
