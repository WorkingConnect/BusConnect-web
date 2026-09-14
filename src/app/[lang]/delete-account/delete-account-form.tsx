"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deleteMyAccount, ApiError } from "@/lib/api";

/**
 * Deleting is really "deactivate + anonymize" server-side (see
 * BusConnect-api's DELETE /me/account) — booking/payment history survives,
 * only the passenger's own identifying fields are scrubbed and the account
 * is banned from signing back in.
 *
 * Re-verification before something this destructive: if the account has a
 * phone number on file, send a fresh OTP and require it (proves whoever's
 * at this browser right now can still receive it). Accounts with no phone
 * (Google sign-in, never added one) fall back to typing a confirmation
 * phrase.
 */
export function DeleteAccountForm({ phone }: { phone: string | null }) {
  const router = useRouter();
  const [stage, setStage] = useState<"confirm" | "otp">("confirm");
  const [otp, setOtp] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    if (!phone) return;
    setError(null);
    setLoading(true);
    const { error } = await createClient().auth.signInWithOtp({ phone });
    setLoading(false);
    if (error) return setError(error.message);
    setStage("otp");
  }

  async function verifyAndDelete(e: React.FormEvent) {
    e.preventDefault();
    if (!phone) return;
    setError(null);
    setLoading(true);
    const { error: verifyError } = await createClient().auth.verifyOtp({ phone, token: otp, type: "sms" });
    if (verifyError) {
      setLoading(false);
      return setError(verifyError.message);
    }
    await finishDelete();
  }

  async function confirmWithText(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    await finishDelete();
  }

  async function finishDelete() {
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expired. Sign in again to delete your account.");
      await deleteMyAccount(session.access_token);
      await supabase.auth.signOut();
      router.replace("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
      setLoading(false);
    }
  }

  if (stage === "otp") {
    return (
      <form onSubmit={verifyAndDelete} className="flex flex-col gap-4">
        <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
          Enter the code sent to {phone}
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
            className="field tracking-[0.4em]"
          />
        </label>
        {error && <p className="ui text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading || !otp}
          className="ui inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          Verify & delete
        </button>
      </form>
    );
  }

  if (phone) {
    return (
      <div className="flex flex-col gap-4">
        {error && <p className="ui text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="button"
          onClick={sendCode}
          disabled={loading}
          className="ui inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          Delete my account
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={confirmWithText} className="flex flex-col gap-4">
      <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
        Type DELETE to confirm
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="DELETE"
          className="field"
        />
      </label>
      {error && <p className="ui text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading || confirmText.trim().toUpperCase() !== "DELETE"}
        className="ui inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        Delete my account
      </button>
    </form>
  );
}
