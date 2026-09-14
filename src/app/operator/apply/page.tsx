"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileCheck2, ImagePlus, Loader2, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadOperatorLogo, uploadOperatorIdDocument } from "@/lib/storage";
import { applyAsOperator, ApiError } from "@/lib/api";

export default function ApplyOperatorPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [witnessName, setWitnessName] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [address, setAddress] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setLogoFile(file);
    setLogoPreview(file ? URL.createObjectURL(file) : null);
  }

  function onIdFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setIdFile(e.target.files?.[0] ?? null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!logoFile) {
      setError("Please upload your company logo.");
      return;
    }
    if (!idFile) {
      setError("Please upload a company registration or ID document.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login?next=/operator/apply");
        return;
      }

      setStatus("Uploading logo…");
      const logoUrl = await uploadOperatorLogo(session.user.id, logoFile);

      setStatus("Uploading ID document…");
      const idDocumentPath = await uploadOperatorIdDocument(session.user.id, idFile);

      setStatus("Submitting application…");
      await applyAsOperator(session.access_token, {
        name,
        witnessName,
        mobileNo,
        address,
        logoUrl,
        idDocumentPath,
      });

      router.push("/operator");
      router.refresh();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Could not submit your application. Try again.",
      );
      setBusy(false);
      setStatus(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/operator"
        className="ui inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft size={15} /> Back
      </Link>

      <h1 className="mt-4 font-heading text-2xl font-bold tracking-tight">Apply as an operator</h1>
      <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
        Tell us about your fleet. BusConnect will review your application before you can
        schedule trips.
      </p>

      <form onSubmit={submit} className="card mt-6 flex flex-col gap-4 p-6">
        <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
          Fleet / company name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Southern Express (Pvt) Ltd"
            required
            minLength={2}
            className="field"
          />
        </label>

        <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
          Witness name
          <input
            value={witnessName}
            onChange={(e) => setWitnessName(e.target.value)}
            placeholder="Full name of a witness to this application"
            required
            minLength={2}
            className="field"
          />
        </label>

        <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
          Mobile number
          <input
            value={mobileNo}
            onChange={(e) => setMobileNo(e.target.value)}
            placeholder="e.g. +94 77 123 4567"
            required
            minLength={9}
            className="field"
          />
        </label>

        <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
          Company address
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Registered business address"
            required
            minLength={5}
            rows={3}
            className="field resize-none"
          />
        </label>

        <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
          Company logo
          <div className="flex items-center gap-3">
            {logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoPreview}
                alt="Logo preview"
                className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 object-cover dark:border-zinc-800"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-400 dark:border-zinc-700 dark:text-zinc-600">
                <ImagePlus size={18} />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={onLogoChange}
              required
              className="field cursor-pointer text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-fg"
            />
          </div>
        </label>

        <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
          Company registration / ID document
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-400 dark:border-zinc-700 dark:text-zinc-600">
              <FileCheck2 size={18} className={idFile ? "text-brand dark:text-blue-400" : undefined} />
            </div>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={onIdFileChange}
              required
              className="field cursor-pointer text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-fg"
            />
          </div>
          <span className="ui text-xs text-slate-500 dark:text-zinc-500">
            Kept private. Only visible to BusConnect admins for verification.
          </span>
        </label>

        {error && <p className="ui text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button type="submit" disabled={busy} className="btn-primary mt-1">
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={16} />}
          {busy ? status ?? "Submitting…" : "Submit application"}
        </button>
      </form>
    </div>
  );
}
