"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ImagePlus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadOperatorLogo } from "@/lib/storage";
import { applyAsOperator, ApiError } from "@/lib/api";
import { PhoneField } from "@/components/phone-field";
import { toE164, isValidLocalMobile } from "@/lib/phone";
import { Logo } from "@/components/logo";

const STEPS = [
  { title: "Business & Contact Details", subtitle: "Tell us about your fleet and how to reach you." },
  { title: "Company Logo", subtitle: "Shown to passengers on your trips and profile page." },
] as const;

function StepIndicator({ current }: { current: number }) {
  return (
    <div>
      <p className="ui text-xs font-semibold uppercase tracking-wide text-brand dark:text-blue-400">
        Step {current + 1} of {STEPS.length}
      </p>
      <div className="mt-2 flex items-center">
        {STEPS.map((_, i) => (
          <div key={i} className="flex items-center">
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-full border-2 font-heading text-base font-bold transition-colors ${
                i < current
                  ? "border-brand bg-brand text-brand-fg"
                  : i === current
                    ? "border-brand bg-brand text-brand-fg"
                    : "border-slate-300 bg-transparent text-slate-500 dark:border-zinc-600 dark:text-zinc-400"
              }`}
            >
              {i < current ? <Check size={18} /> : i + 1}
            </span>
            {i < STEPS.length - 1 && (
              <span
                className={`mx-2 h-1 w-10 rounded-full sm:w-20 ${
                  i < current ? "bg-brand" : "bg-slate-300 dark:bg-zinc-600"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ApplyOperatorPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [witnessName, setWitnessName] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [address, setAddress] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setLogoFile(file);
    setLogoPreview(file ? URL.createObjectURL(file) : null);
  }

  function next(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isValidLocalMobile(mobileNo)) {
      setError("Enter a valid Sri Lankan mobile number (9 digits, starting with 7).");
      return;
    }
    setStep(1);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!logoFile) {
      setError("Please upload your company logo.");
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

      setStatus("Submitting application…");
      await applyAsOperator(session.access_token, {
        name,
        witnessName,
        mobileNo: toE164(mobileNo),
        address,
        logoUrl,
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
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Decorative bubble backdrop — a large blob bleeding off the left edge
       *  rather than a hard 50/50 panel, so the form gets most of the width
       *  instead of being squeezed into a column. Hidden below lg, where
       *  there isn't room for it without crowding the form. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-64 top-[58%] hidden h-[46rem] w-[46rem] -translate-y-1/2 rounded-full bg-gradient-to-br from-brand to-blue-900 lg:block"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-16 top-[58%] hidden h-40 w-40 translate-y-24 rounded-full bg-brand/15 lg:block dark:bg-blue-400/10"
      />

      {/* Logo in the white area's top-right corner (desktop only) — the
       *  onDark (always-white) variant read poorly against the blob's
       *  gradient, and this placement sidesteps the contrast problem
       *  entirely by not sitting on it. Same theme-aware wordmark as the nav
       *  bar, just larger. Mobile gets its own in-flow logo further down,
       *  below the mobile band, for the same reason. */}
      <div className="absolute right-6 top-6 hidden sm:right-10 sm:top-8 lg:block">
        <Logo height={44} />
      </div>

      {/* Big heading, positioned at the blob's vertical center — its widest
       *  visible chord — so a 2-line heading has the most room to breathe. */}
      <div className="absolute left-20 top-[58%] hidden w-64 -translate-y-1/2 lg:block">
        <p className="font-heading text-4xl font-bold leading-[1.15] text-white">
          Become an operator
        </p>
        <p className="ui mt-4 text-sm leading-relaxed text-white/80">
          Join BusConnect and reach passengers across Sri Lanka.
        </p>
      </div>

      {/* Mobile-only bubble treatment — the desktop side-blob doesn't fit a
       *  narrow viewport, so this is a rounded-bottom band across the top
       *  instead, same brand gradient. No logo inside it — keeps the same
       *  white-background placement that fixed the desktop contrast issue. */}
      <div className="relative overflow-hidden rounded-b-[2.5rem] bg-gradient-to-br from-brand to-blue-900 px-6 pb-10 pt-8 lg:hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-14 left-8 h-28 w-28 rounded-full bg-white/10"
        />
        <p className="relative font-heading text-3xl font-bold leading-tight text-white">
          Become an operator
        </p>
        <p className="ui relative mt-2 max-w-xs text-sm leading-relaxed text-white/80">
          Join BusConnect and reach passengers across Sri Lanka.
        </p>
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-4 pb-10 pt-0 sm:px-8 lg:pl-[22rem] lg:pr-16 lg:pt-24 xl:pl-[26rem]">
        <div className="w-full max-w-xl">
          <div className="flex justify-center lg:hidden">
            <Logo height={48} />
          </div>

          <div className="mt-6 lg:mt-0">
            <StepIndicator current={step} />
          </div>

          <h1 className="mt-6 font-heading text-3xl font-bold tracking-tight">{STEPS[step].title}</h1>
          <p className="ui mt-1.5 text-sm text-slate-600 dark:text-zinc-400">{STEPS[step].subtitle}</p>

          <form onSubmit={step === 0 ? next : submit} className="card mt-6 p-6 sm:p-7">
            {step === 0 ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
                  <span>Fleet / company name <span className="text-red-500">*</span></span>
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
                  <span>Mobile number <span className="text-red-500">*</span></span>
                  <PhoneField value={mobileNo} onChange={setMobileNo} required />
                </label>

                <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300 sm:col-span-2">
                  <span>Company address <span className="text-red-500">*</span></span>
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

                <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300 sm:col-span-2">
                  <span>Witness name <span className="text-red-500">*</span></span>
                  <input
                    value={witnessName}
                    onChange={(e) => setWitnessName(e.target.value)}
                    placeholder="Full name of a witness to this application"
                    required
                    minLength={2}
                    className="field"
                  />
                </label>
              </div>
            ) : (
              <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
                <span>Company logo <span className="text-red-500">*</span></span>
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
            )}

            {error && <p className="ui mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

            <div className={`mt-6 flex items-center gap-4 border-t border-slate-200 pt-5 dark:border-zinc-800 ${step === 0 ? "justify-end" : "justify-between"}`}>
              {step === 1 && (
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="ui inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300"
                >
                  <ArrowLeft size={14} /> Back
                </button>
              )}

              <button type="submit" disabled={busy} className="btn-primary">
                {step === 0 ? (
                  "Next"
                ) : busy ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> {status ?? "Submitting…"}
                  </>
                ) : (
                  "Submit application"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
