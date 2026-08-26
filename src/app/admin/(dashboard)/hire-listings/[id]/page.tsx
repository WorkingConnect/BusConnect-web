import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAdminHireListing, ApiError, type AdminHireListing } from "@/lib/api";
import { HireListingDetailCard } from "./hire-listing-detail-card";

export default async function AdminHireListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <Link
        href={`/login?next=/admin/hire-listings/${id}`}
        className="font-medium text-brand underline dark:text-blue-400"
      >
        Sign in to view this listing
      </Link>
    );
  }

  let listing: AdminHireListing | null = null;
  let error: string | null = null;
  try {
    listing = await getAdminHireListing(session.access_token, id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
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
  if (!listing) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link
        href="/admin/hire-listings"
        className="ui inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft size={15} /> Back to hire listings
      </Link>

      <div className="mt-4">
        <HireListingDetailCard listing={listing} />
      </div>
    </div>
  );
}
