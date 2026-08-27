import Link from "next/link";
import { MessageCircle, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile, ApiError, type MyProfile } from "@/lib/api";
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

      <div className="card-lg mt-6 p-6">
        <ProfileForm profile={profile} />
      </div>

      <a
        href={`https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi, I need help with my BusConnect booking.")}`}
        target="_blank"
        rel="noreferrer"
        className="card-lg mt-6 flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-zinc-900"
      >
        <MessageCircle size={18} className="text-slate-500 dark:text-zinc-400" />
        <span className="font-medium">Help center</span>
      </a>

      <Link
        href="/delete-account"
        className="ui card-lg mt-6 flex items-center gap-3 p-4 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
      >
        <Trash2 size={18} />
        <span className="font-medium">Delete account</span>
      </Link>
    </div>
  );
}
