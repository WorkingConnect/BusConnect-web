"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updateMyProfile, ApiError, type MyProfile } from "@/lib/api";
import { PhoneField } from "@/components/phone-field";
import { stripCountryCode, toE164, formatPhoneDisplay } from "@/lib/phone";

// Same dt/dd row style as the operator page's "coverage in numbers" stats.
function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <dt className="shrink-0 text-slate-600 dark:text-zinc-400">{label}</dt>
      <dd className="break-words text-right font-heading font-bold">{value || "—"}</dd>
    </div>
  );
}

export function ProfileForm({ profile }: { profile: MyProfile }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.name ?? "");
  const [phone, setPhone] = useState(stripCountryCode(profile.phone));
  const [email, setEmail] = useState(profile.email ?? "");
  const [nic, setNic] = useState(profile.nic ?? "");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // Signed in via Google -> Google owns the email; signed in via phone OTP ->
  // that phone number is the login credential itself. Either way, the field
  // that identifies the account isn't safe to edit here.
  const [provider, setProvider] = useState<string | null>(null);

  useEffect(() => {
    void createClient()
      .auth.getSession()
      .then(({ data: { session } }) => {
        setProvider(session?.user.app_metadata?.provider ?? null);
      });
  }, []);

  const emailLocked = provider === "google";
  const phoneLocked = provider === "phone";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      setStatus("Saving…");
      await updateMyProfile(session.access_token, {
        name: name || undefined,
        phone: phoneLocked ? undefined : phone ? toE164(phone) : undefined,
        email: emailLocked ? undefined : email || undefined,
        nic: nic || undefined,
      });
      setSaved(true);
      setEditing(false);
      window.dispatchEvent(new Event("passenger-profile-updated"));
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save changes.");
    } finally {
      setBusy(false);
      setStatus(null);
    }
  }

  if (!editing) {
    return (
      <div>
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-base font-bold sm:text-lg">Personal information</h2>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="ui text-sm font-medium text-brand underline dark:text-blue-400"
          >
            Edit
          </button>
        </div>
        <dl className="mt-2 divide-y divide-border">
          <Row label="Full name" value={profile.name} />
          <Row label="Phone number" value={formatPhoneDisplay(profile.phone)} />
          <Row label="NIC" value={profile.nic} />
          {!emailLocked && <Row label="Email address" value={profile.email} />}
        </dl>
        {saved && (
          <p className="ui mt-3 text-sm text-emerald-600 dark:text-emerald-400">Saved.</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-base font-bold sm:text-lg">Personal information</h2>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="ui text-sm font-medium text-slate-500 dark:text-zinc-500"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={submit} className="mt-4 flex flex-col gap-5">
        <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
          Full name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            className="field"
          />
        </label>

        <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
          Phone number
          {phoneLocked ? (
            <input
              value={formatPhoneDisplay(profile.phone)}
              disabled
              className="field cursor-not-allowed text-slate-500 dark:text-zinc-500"
            />
          ) : (
            <PhoneField value={phone} onChange={setPhone} />
          )}
        </label>

        <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
          NIC
          <input
            value={nic}
            onChange={(e) => setNic(e.target.value)}
            placeholder="200012345678 or 991234567V"
            className="field"
          />
        </label>

        {!emailLocked && (
          <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
            Email address
            <input
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.lk"
              className="field"
            />
          </label>
        )}

        {error && <p className="ui text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button type="submit" disabled={busy} className="btn-primary self-start">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {busy ? status ?? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
