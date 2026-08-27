import Link from "next/link";
import { ChevronRight, MessageCircle, ShieldCheck, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile, ApiError, type MyProfile } from "@/lib/api";
import { formatPhoneDisplay } from "@/lib/phone";
import { ProfileForm } from "./profile-form";

// Same number used for phone support on the Help Centre page.
const SUPPORT_WHATSAPP_NUMBER = "94764670645";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6 lg:px-8">
        <Link href="/login?next=/profile" className="font-medium text-brand underline dark:text-blue-400">
          Sign in to view your profile
        </Link>
      </div>
    );
  }

  let profile: MyProfile | null = null;
  let error: string | null = null;
  try {
    profile = await getMyProfile(session.access_token);
  } catch (e) {
    error = e instanceof ApiError ? e.message : "Could not reach BusConnect-api. Is it running?";
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6 lg:px-8">
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-heading text-2xl font-bold tracking-tight">Profile</h1>
      <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
        Your personal details on file with BusConnect.
      </p>

      <div className="card mt-6 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft font-heading text-lg font-bold text-brand dark:bg-brand-soft-dark dark:text-blue-300">
            {(profile.name || "?").slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate font-heading text-base font-bold">{profile.name || "Your account"}</p>
            <p className="ui truncate text-sm text-slate-600 dark:text-zinc-400">
              {formatPhoneDisplay(profile.phone)}
            </p>
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-6">
          <ProfileForm profile={profile} />
        </div>
      </div>

      <p className="ui mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">
        Support
      </p>
      <div className="card mt-2 divide-y divide-border overflow-hidden">
        <a
          href={`https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi, I need help with my BusConnect booking.")}`}
          target="_blank"
          rel="noreferrer"
          className="ui flex items-center gap-3 p-5 text-sm font-medium transition-colors hover:bg-muted sm:p-6"
        >
          <MessageCircle size={18} className="text-brand dark:text-blue-400" />
          Help center
          <ChevronRight size={16} className="ml-auto shrink-0 text-slate-400 dark:text-zinc-600" />
        </a>

        <Link
          href="/privacy"
          className="ui flex items-center gap-3 p-5 text-sm font-medium transition-colors hover:bg-muted sm:p-6"
        >
          <ShieldCheck size={18} className="text-brand dark:text-blue-400" />
          Privacy policy
          <ChevronRight size={16} className="ml-auto shrink-0 text-slate-400 dark:text-zinc-600" />
        </Link>
      </div>

      <Link
        href="/delete-account"
        className="ui mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-300 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500"
      >
        <Trash2 size={16} />
        Delete account
      </Link>
    </div>
  );
}
