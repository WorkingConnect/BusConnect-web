import Link from "next/link";
import { Bus, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listAdminHireListings, ApiError, type AdminHireListing } from "@/lib/api";

type ReviewStatus = "pending" | "approved" | "rejected";
type TabId = ReviewStatus | "all";

const TABS: { id: TabId; label: string }[] = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "all", label: "All" },
];

const MODERATION_STYLE: Record<ReviewStatus, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

const MODERATION_LABEL: Record<ReviewStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export default async function AdminHireListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: rawStatus } = await searchParams;
  const activeTab: TabId = TABS.some((t) => t.id === rawStatus) ? (rawStatus as TabId) : "pending";
  const reviewStatus = activeTab === "all" ? undefined : activeTab;

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <Link href="/login?next=/admin/hire-listings" className="font-medium text-brand underline dark:text-blue-400">
        Sign in to access the admin dashboard
      </Link>
    );
  }

  let listings: AdminHireListing[] = [];
  let error: string | null = null;
  try {
    listings = await listAdminHireListings(session.access_token, reviewStatus);
  } catch (e) {
    error =
      e instanceof ApiError
        ? e.status === 403
          ? "Your account does not have admin access."
          : e.message
        : "Could not reach BusConnect-api. Is it running?";
  }

  if (error) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
        {error}
      </p>
    );
  }

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Hire Listings</h1>
        <p className="ui mt-1 text-sm text-slate-500 dark:text-zinc-400">
          Bus-for-hire classifieds posted by passengers from the app — every listing needs review before it
          goes public. Posting/editing is passenger-owned in BusConnect-mobile; open a listing to review,
          optionally edit, and approve or reject it.
        </p>
      </div>

      <div className="ui mt-6 flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-zinc-800">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/admin/hire-listings?status=${t.id}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
              activeTab === t.id
                ? "bg-white text-slate-900 shadow-sm dark:bg-zinc-950 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {listings.length === 0 ? (
        <div className="card mt-6 p-12 text-center text-slate-500 dark:text-zinc-400">
          No {activeTab === "all" ? "" : activeTab} listings here.
        </div>
      ) : (
        <div className="card mt-6 divide-y divide-border overflow-hidden">
          {listings.map((l) => (
            <Link
              key={l.id}
              href={`/admin/hire-listings/${l.id}`}
              className="card-hover flex items-start gap-4 p-4 transition-colors"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 dark:bg-zinc-800">
                {l.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.images[0]} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Bus size={20} className="text-slate-400 dark:text-zinc-600" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium">{l.title}</p>
                  <span className={`ui rounded-full px-2 py-0.5 text-[11px] font-semibold ${MODERATION_STYLE[l.moderation_status]}`}>
                    {MODERATION_LABEL[l.moderation_status]}
                  </span>
                  {l.is_archived && (
                    <span className="ui rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-zinc-800 dark:text-zinc-400">
                      Archived
                    </span>
                  )}
                </div>
                <p className="ui mt-0.5 text-xs text-slate-500 dark:text-zinc-500">
                  {l.poster?.name ?? "Unknown"} · {l.poster?.phone ?? l.contact_phone} ·{" "}
                  {new Date(l.created_at).toLocaleDateString("en-LK", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                {l.area && <p className="ui mt-1 text-xs text-slate-500 dark:text-zinc-500">{l.area}</p>}
              </div>
              <ChevronRight size={16} className="mt-1 shrink-0 text-slate-300 dark:text-zinc-700" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
