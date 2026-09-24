import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOperatorProfile, ApiError, type OperatorProfile } from "@/lib/api";
import { ProfileForm } from "./profile-form";
import { BankDetailsForm } from "./bank-details-form";

export default async function OperatorProfilePage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <Link href="/login?next=/operator/profile" className="font-medium text-brand underline dark:text-blue-400">
        Sign in to view your profile
      </Link>
    );
  }

  let profile: OperatorProfile | null = null;
  let error: string | null = null;
  try {
    profile = await getOperatorProfile(session.access_token);
  } catch (e) {
    error =
      e instanceof ApiError
        ? e.status === 403
          ? "Your account isn't linked to a bus operator."
          : e.message
        : "Could not reach BusConnect-api. Is it running?";
  }

  if (error || !profile) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
        {error}
      </p>
    );
  }

  const editable = profile.role === "owner";

  return (
    <div>
      <h1 className="font-heading text-3xl font-bold tracking-tight">Profile</h1>
      <p className="ui mt-2 text-sm font-medium text-slate-600 dark:text-zinc-300">
        {editable
          ? "Your company's contact details on file with BusConnect."
          : "Contact details for the operator you work under."}
      </p>

      <div className="mt-8 grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <div className="card-lg p-6">
          <ProfileForm profile={profile} editable={editable} />
        </div>
        {editable && (
          <div className="card-lg p-6">
            <BankDetailsForm payoutAccount={profile.payout_account} />
          </div>
        )}
      </div>
    </div>
  );
}
