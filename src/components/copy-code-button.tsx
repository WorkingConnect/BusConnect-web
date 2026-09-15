"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyCodeButton({
  code,
  label,
  copiedLabel,
  className = "btn-primary w-full rounded-full py-3.5 text-base sm:w-auto sm:px-10",
}: {
  code: string;
  label: string;
  copiedLabel: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — nothing more we can do here.
    }
  }

  return (
    <button type="button" onClick={copy} className={className}>
      {copied ? <Check size={18} /> : <Copy size={18} />}
      {copied ? copiedLabel : label}
    </button>
  );
}
