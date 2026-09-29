"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getMyRoles } from "@/lib/api";
import { useT } from "@/lib/i18n/provider";

/**
 * "Become an operator" — shown only to visitors who aren't already linked to
 * one (covers signed-out visitors, the actual target audience for this CTA,
 * and signed-in riders who haven't applied). Hidden once already an owner or
 * pilot of any status — they use the account menu's dashboard link instead.
 */
export function OperatorFooterLink() {
  const [isOperator, setIsOperator] = useState<boolean | null>(null);
  const t = useT("footer");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        if (!cancelled) setIsOperator(false);
        return;
      }
      try {
        const roles = await getMyRoles(session.access_token);
        if (!cancelled) setIsOperator(roles.isOperator);
      } catch {
        if (!cancelled) setIsOperator(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isOperator !== false) return null;

  return (
    <li>
      {/* Opens in a new tab — this is a context switch away from whatever the
       *  visitor was browsing (a search, route results), so it shouldn't
       *  cost them that page. */}
      <Link
        href="/operator/apply"
        target="_blank"
        rel="noopener noreferrer"
        className="transition-colors hover:text-foreground"
      >
        {t("becomeOperator")}
      </Link>
    </li>
  );
}
