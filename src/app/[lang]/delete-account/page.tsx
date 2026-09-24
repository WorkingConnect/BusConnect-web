import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile, ApiError } from "@/lib/api";
import { DeleteAccountForm } from "./delete-account-form";

export default async function DeleteAccountPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6 lg:px-8">
        <Link href="/login?next=/delete-account" className="font-medium text-brand underline dark:text-blue-400">
          Sign in to manage your account
        </Link>
      </div>
    );
  }

  let phone: string | null = null;
  try {
    phone = (await getMyProfile(session.access_token)).phone;
  } catch (e) {
    if (!(e instanceof ApiError)) throw e;
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <h1 className="font-heading text-3xl font-bold tracking-tight text-red-600 sm:text-4xl dark:text-red-400">
        Delete account
      </h1>
      <p className="ui mt-2 text-sm text-slate-600 dark:text-zinc-400">
        This permanently removes your personal details. Booking and payment history is kept for records and
        can&apos;t be recovered afterwards.
      </p>

      <div className="card-lg mt-8 p-6">
        <DeleteAccountForm phone={phone} />
      </div>
    </div>
  );
}
