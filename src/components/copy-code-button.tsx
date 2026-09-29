"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyCodeButton({
  code,
  label,
  copiedLabel,
  className = "btn-primary w-full rounded-full py-3.5 text-base sm:w-auto sm:px-10",
  iconSize = 18,
}: {
  code: string;
  label: string;
  copiedLabel: string;
  className?: string;
  iconSize?: number;
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
      {copied ? <Check size={iconSize} /> : <Copy size={iconSize} />}
      {copied ? copiedLabel : label}
    </button>
  );
}
