import Link from "next/link";
import { Bus, ChevronRight, ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listAdminHireListings, ApiError, type AdminHireListing } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { KpiCard, EmptyState } from "../dashboard-ui";

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

  let allListings: AdminHireListing[] = [];
  let error: string | null = null;
  try {
    allListings = await listAdminHireListings(session.access_token);
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

  const pendingCount = allListings.filter((l) => l.moderation_status === "pending").length;
  const approvedCount = allListings.filter((l) => l.moderation_status === "approved").length;
  const rejectedCount = allListings.filter((l) => l.moderation_status === "rejected").length;
  const listings = activeTab === "all" ? allListings : allListings.filter((l) => l.moderation_status === activeTab);

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Hire Listings</h1>
        <p className="ui mt-1 text-sm text-muted-foreground">
          Bus-for-hire classifieds posted by passengers from the app. Every listing needs review before it
          goes public. Posting/editing is passenger-owned in BusConnect-mobile; open a listing to review,
          optionally edit, and approve or reject it.
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard icon={<ClipboardList size={16} />} tone="amber" label="Pending" value={String(pendingCount)} />
        <KpiCard icon={<ClipboardList size={16} />} tone="emerald" label="Approved" value={String(approvedCount)} />
        <KpiCard icon={<ClipboardList size={16} />} tone="slate" label="Rejected" value={String(rejectedCount)} />
        <KpiCard icon={<ClipboardList size={16} />} tone="blue" label="Total" value={String(allListings.length)} />
      </div>

      <div className="ui mt-6 flex flex-wrap gap-1 rounded-xl bg-muted p-1">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/admin/hire-listings?status=${t.id}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
              activeTab === t.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {listings.length === 0 ? (
        <EmptyState
          title={`No ${activeTab === "all" ? "" : activeTab} listings`}
          subtitle="New postings from the app will show up here."
        />
      ) : (
        <Card className="mt-6 divide-y divide-border overflow-hidden">
          {listings.map((l) => (
            <Link
              key={l.id}
              href={`/admin/hire-listings/${l.id}`}
              className="card-hover flex items-start gap-4 p-4 transition-colors"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                {l.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.images[0]} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Bus size={20} className="text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium">{l.title}</p>
                  <span className={`ui rounded-full px-2 py-0.5 text-[11px] font-semibold ${MODERATION_STYLE[l.moderation_status]}`}>
                    {MODERATION_LABEL[l.moderation_status]}
                  </span>
                  {l.is_archived && (
                    <span className="ui rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      Archived
                    </span>
                  )}
                </div>
                <p className="ui mt-0.5 text-xs text-muted-foreground">
                  {l.poster?.name ?? "Unknown"} · {l.poster?.phone ?? l.contact_phone} ·{" "}
                  {new Date(l.created_at).toLocaleDateString("en-LK", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                {l.area && <p className="ui mt-1 text-xs text-muted-foreground">{l.area}</p>}
              </div>
              <ChevronRight size={16} className="mt-1 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
