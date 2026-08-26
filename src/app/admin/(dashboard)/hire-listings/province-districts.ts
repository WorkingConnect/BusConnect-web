/**
 * Sri Lanka's 9 provinces and their districts, for the cascading
 * province -> district select on the edit form. Not exported from
 * lib/hire-listings.ts (out of scope to touch), so kept local to this
 * feature — same data BusConnect-mobile's post form uses.
 */
export const HIRE_PROVINCE_DISTRICTS: { province: string; districts: string[] }[] = [
  { province: "Western", districts: ["Colombo", "Gampaha", "Kalutara"] },
  { province: "Central", districts: ["Kandy", "Matale", "Nuwara Eliya"] },
  { province: "Southern", districts: ["Galle", "Matara", "Hambantota"] },
  { province: "Northern", districts: ["Jaffna", "Kilinochchi", "Mannar", "Vavuniya", "Mullaitivu"] },
  { province: "Eastern", districts: ["Trincomalee", "Batticaloa", "Ampara"] },
  { province: "North Western", districts: ["Kurunegala", "Puttalam"] },
  { province: "North Central", districts: ["Anuradhapura", "Polonnaruwa"] },
  { province: "Uva", districts: ["Badulla", "Monaragala"] },
  { province: "Sabaragamuwa", districts: ["Ratnapura", "Kegalle"] },
];

export const HIRE_PROVINCES: string[] = HIRE_PROVINCE_DISTRICTS.map((p) => p.province);

export function districtsFor(province: string): string[] {
  return HIRE_PROVINCE_DISTRICTS.find((p) => p.province === province)?.districts ?? [];
}
