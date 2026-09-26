"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updateOperatorProfile, ApiError, type OperatorPayoutAccount } from "@/lib/api";

// Same dt/dd row style as the operator profile page and passenger profile page.
function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <dt className="shrink-0 text-slate-600 dark:text-zinc-400">{label}</dt>
      <dd className="break-words text-right font-heading font-bold">{value || "—"}</dd>
    </div>
  );
}

// Only the last 4 digits are shown in display mode — this account number is
// used for payouts, so it stays masked until the owner opens the edit form.
function maskAccountNumber(accountNumber: string | null | undefined) {
  if (!accountNumber) return null;
  const last4 = accountNumber.slice(-4);
  return accountNumber.length <= 4 ? accountNumber : `${"•".repeat(accountNumber.length - 4)}${last4}`;
}

export function BankDetailsForm({ payoutAccount }: { payoutAccount: OperatorPayoutAccount | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [bankName, setBankName] = useState(payoutAccount?.bankName ?? "");
  const [branchName, setBranchName] = useState(payoutAccount?.branchName ?? "");
  const [accountNumber, setAccountNumber] = useState(payoutAccount?.accountNumber ?? "");
  const [bankCode, setBankCode] = useState(payoutAccount?.bankCode ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function cancel() {
    setBankName(payoutAccount?.bankName ?? "");
    setBranchName(payoutAccount?.branchName ?? "");
    setAccountNumber(payoutAccount?.accountNumber ?? "");
    setBankCode(payoutAccount?.bankCode ?? "");
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

      await updateOperatorProfile(session.access_token, {
        bankName: bankName || undefined,
        branchName: branchName || undefined,
        accountNumber: accountNumber || undefined,
        bankCode: bankCode || undefined,
      });
      setSaved(true);
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save bank details.");
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-heading text-lg font-bold tracking-tight">Bank details</p>
            <p className="ui mt-0.5 text-xs text-slate-500 dark:text-zinc-500">
              Used by BusConnect to pay out your revenue. Only you (the owner) can see this.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="ui shrink-0 text-sm font-medium text-brand underline dark:text-blue-400"
          >
            Edit
          </button>
        </div>
        <dl className="mt-4 divide-y divide-border">
          <Row label="Bank name" value={payoutAccount?.bankName} />
          <Row label="Branch name" value={payoutAccount?.branchName} />
          <Row label="Account number" value={maskAccountNumber(payoutAccount?.accountNumber)} />
          <Row label="Bank code" value={payoutAccount?.bankCode} />
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
        <div>
          <p className="font-heading text-lg font-bold tracking-tight">Bank details</p>
          <p className="ui mt-0.5 text-xs text-slate-500 dark:text-zinc-500">
            Used by BusConnect to pay out your revenue. Only you (the owner) can see this.
          </p>
        </div>
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
          Bank name
          <input
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="e.g. Bank of Ceylon"
            minLength={2}
            className="field"
          />
        </label>

        <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
          Branch name
          <input
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            placeholder="e.g. Nittambuwa"
            minLength={2}
            className="field"
          />
        </label>

        <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
          Account number
          <input
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder="e.g. 0123456789"
            minLength={4}
            inputMode="numeric"
            className="field"
          />
        </label>

        <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
          Bank code <span className="text-slate-400 dark:text-zinc-500">(optional)</span>
          <input
            value={bankCode}
            onChange={(e) => setBankCode(e.target.value)}
            placeholder="e.g. 7010"
            className="field"
          />
        </label>

        {error && <p className="ui text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button type="submit" disabled={busy} className="btn-primary self-start">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {busy ? "Saving…" : "Save bank details"}
        </button>
      </form>
    </div>
  );
}
