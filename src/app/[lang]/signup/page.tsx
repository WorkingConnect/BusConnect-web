"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updateMyProfile } from "@/lib/api";
import { Logo } from "@/components/logo";
import { PhoneField } from "@/components/phone-field";
import { goTo } from "@/lib/safe-redirect";
import { toE164 } from "@/lib/phone";

// Matches the backend's UpdateMyProfileDto.nic validation exactly — 9 digits
// + V/X (old format) or 12 digits (new format).
const NIC_RE = /^([0-9]{9}[vVxX]|[0-9]{12})$/;

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  );
}

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [nic, setNic] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"details" | "otp">("details");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!NIC_RE.test(nic.trim())) {
      setError("Enter a valid NIC: 9 digits + V/X, or 12 digits.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    const { error } = await createClient().auth.signUp({
      phone: toE164(phone),
      password,
      options: { data: { full_name: name } },
    });
    setLoading(false);
    if (error) return setError(error.message);
    setStage("otp");
  }

  async function verifyAndFinish(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { data, error } = await createClient().auth.verifyOtp({ phone: toE164(phone), token: otp, type: "sms" });
    if (error) {
      setLoading(false);
      return setError(error.message);
    }
    const accessToken = data.session?.access_token;
    try {
      if (accessToken) {
        await updateMyProfile(accessToken, { name, email: email || undefined, nic: nic.trim() });
      }
    } catch {
      // Profile fields can still be filled in later from Profile — don't
      // block account creation on this best-effort backfill.
    } finally {
      setLoading(false);
    }
    goTo(router, next);
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <div className="card p-8">
        <div className="mb-8 flex justify-center">
          <Logo height={44} />
        </div>
        <h1 className="font-heading text-center text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="ui mt-2 text-center text-sm text-slate-600 dark:text-zinc-400">
          {stage === "details"
            ? "Just a few details, then we'll verify your number with a one-time code."
            : `Enter the code sent to ${toE164(phone)}.`}
        </p>

        <div className="mt-7">
          {stage === "details" ? (
            <form onSubmit={createAccount} className="flex flex-col gap-4">
              <Label text="Your Name">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  className="field"
                />
              </Label>
              <Label text="Phone Number">
                <PhoneField value={phone} onChange={setPhone} required />
              </Label>
              <Label text="Email (optional)">
                <input
                  type="email"
                  inputMode="email"
                  placeholder="you@email.lk"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field"
                />
              </Label>
              <Label text="NIC">
                <input
                  value={nic}
                  onChange={(e) => setNic(e.target.value)}
                  placeholder="200012345678 or 991234567V"
                  required
                  className="field"
                />
              </Label>
              <Label text="Password">
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="field"
                />
              </Label>
              {error && <ErrorText>{error}</ErrorText>}
              <SubmitButton loading={loading} idle="Send verification code" busy="Sending…" />
            </form>
          ) : (
            <form onSubmit={verifyAndFinish} className="flex flex-col gap-4">
              <Label text="One-time code">
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  className="field tracking-[0.4em]"
                />
              </Label>
              {error && <ErrorText>{error}</ErrorText>}
              <SubmitButton loading={loading} idle="Verify & create account" busy="Verifying…" />
              <button
                type="button"
                onClick={() => setStage("details")}
                className="ui text-sm text-slate-500 underline dark:text-zinc-400"
              >
                Edit details
              </button>
            </form>
          )}

          <p className="ui mt-6 text-center text-sm text-slate-600 dark:text-zinc-400">
            Already have an account?{" "}
            <Link
              href={`/login${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}
              className="font-semibold text-brand underline dark:text-blue-400"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
      {text}
      {children}
    </label>
  );
}
function ErrorText({ children }: { children: React.ReactNode }) {
  return <p className="ui text-sm text-red-600 dark:text-red-400">{children}</p>;
}
function SubmitButton({ loading, idle, busy }: { loading: boolean; idle: string; busy: string }) {
  return (
    <button type="submit" disabled={loading} className="btn-primary mt-1">
      {loading && <Loader2 size={18} className="animate-spin" />}
      {loading ? busy : idle}
    </button>
  );
}
