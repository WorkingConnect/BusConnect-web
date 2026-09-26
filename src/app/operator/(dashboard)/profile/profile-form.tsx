"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadOperatorLogo } from "@/lib/storage";
import { updateOperatorProfile, ApiError, type OperatorProfile } from "@/lib/api";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  suspended: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  pending: "Pending approval",
  suspended: "On hold",
};

// Same dt/dd row style as the passenger profile page and the operator
// details page's "coverage in numbers" stats.
function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <dt className="shrink-0 text-slate-600 dark:text-zinc-400">{label}</dt>
      <dd className="break-words text-right font-heading font-bold">{value || "—"}</dd>
    </div>
  );
}

function Header({ profile, logoPreview }: { profile: OperatorProfile; logoPreview: string | null }) {
  return (
    <div className="flex items-center gap-4">
      {logoPreview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoPreview}
          alt={`${profile.name} logo`}
          className="h-16 w-16 shrink-0 rounded-xl border border-slate-200 object-cover dark:border-zinc-800"
        />
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-400 dark:border-zinc-700 dark:text-zinc-600">
          <ImagePlus size={20} />
        </div>
      )}
      <div>
        <p className="font-heading text-lg font-bold tracking-tight">{profile.name}</p>
        <span
          className={`ui mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[profile.status]}`}
        >
          {STATUS_LABEL[profile.status] ?? profile.status}
        </span>
      </div>
    </div>
  );
}

export function ProfileForm({
  profile,
  editable,
}: {
  profile: OperatorProfile;
  editable: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [mobileNo, setMobileNo] = useState(profile.mobile_no ?? "");
  const [address, setAddress] = useState(profile.address ?? "");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(profile.logo_url);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setLogoFile(file);
    if (file) setLogoPreview(URL.createObjectURL(file));
  }

  function cancel() {
    setMobileNo(profile.mobile_no ?? "");
    setAddress(profile.address ?? "");
    setLogoFile(null);
    setLogoPreview(profile.logo_url);
    setError(null);
    setEditing(false);
  }

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

      let logoUrl: string | undefined;
      if (logoFile) {
        setStatus("Uploading logo…");
        logoUrl = await uploadOperatorLogo(session.user.id, logoFile);
      }

      setStatus("Saving…");
      await updateOperatorProfile(session.access_token, {
        mobileNo: mobileNo || undefined,
        address: address || undefined,
        logoUrl,
      });
      setSaved(true);
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save changes.");
    } finally {
      setBusy(false);
      setStatus(null);
    }
  }

  if (!editable || !editing) {
    return (
      <div>
        <div className="flex items-start justify-between gap-3">
          <Header profile={profile} logoPreview={logoPreview} />
          {editable && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="ui shrink-0 text-sm font-medium text-brand underline dark:text-blue-400"
            >
              Edit
            </button>
          )}
        </div>
        <dl className="mt-4 divide-y divide-border">
          <Row label="Witness name" value={profile.witness_name} />
          <Row label="Mobile number" value={profile.mobile_no} />
          <Row label="Company address" value={profile.address} />
        </dl>
        {saved && !error && (
          <p className="ui mt-3 text-sm text-emerald-600 dark:text-emerald-400">Saved.</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <Header profile={profile} logoPreview={logoPreview} />
        <button
          type="button"
          onClick={cancel}
          className="ui shrink-0 text-sm font-medium text-slate-500 dark:text-zinc-500"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={submit} className="mt-4 flex flex-col gap-5">
        <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
          Update logo
          <input
            type="file"
            accept="image/*"
            onChange={onLogoChange}
            className="field cursor-pointer text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-fg"
          />
        </label>

        <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
          Witness name
          <input value={profile.witness_name ?? "—"} disabled className="field opacity-70" />
        </label>

        <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
          Mobile number
          <input value={mobileNo} onChange={(e) => setMobileNo(e.target.value)} className="field" />
        </label>

        <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
          Company address
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={3}
            className="field resize-none"
          />
        </label>

        {error && <p className="ui text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button type="submit" disabled={busy} className="btn-primary self-start">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {busy ? status ?? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
