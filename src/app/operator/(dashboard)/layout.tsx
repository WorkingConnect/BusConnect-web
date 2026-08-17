import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getMyRoles, getOperatorFleet, listPilots, ApiError } from "@/lib/api";
import { OperatorNav } from "./operator-nav";
import { AdminModeBanner } from "./admin-mode-banner";

export default async function OperatorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const cookieStore = await cookies();
  const adminOperatorId = cookieStore.get("admin_operator_id")?.value ?? null;

  let role: "owner" | "pilot" | null = null;
  let operatorStatus: string | null = null;
  let operatorName: string | null = null;
  if (session) {
    try {
      const roles = await getMyRoles(session.access_token);
      role = roles.operatorRole;
      operatorStatus = roles.operatorStatus;
      operatorName = roles.operatorName;
    } catch (e) {
      // Not linked to an operator, or the API is unreachable — the page
      // itself renders the right messaging; just skip the sidebar chrome.
      void e;
    }
  }

  // Not linked to an operator, or the application isn't approved yet —
  // the page itself renders the right messaging (e.g. "application under
  // review"); the workspace nav only makes sense once there's an active
  // operator to actually work in.
  if (!role || operatorStatus !== "active") {
    return <div className="w-full flex-1 px-4 py-10 sm:px-6 lg:px-8">{children}</div>;
  }

  // Nav badges — how many of the operator's own buses/pilots are still
  // awaiting admin approval. Best-effort: a failed fetch just means no
  // badge, not a broken sidebar.
  let fleetPending = 0;
  let pilotsPending = 0;
  try {
    const [fleet, pilots] = await Promise.all([
      getOperatorFleet(session!.access_token),
      listPilots(session!.access_token),
    ]);
    fleetPending = fleet.buses.filter((b) => b.status === "pending").length;
    pilotsPending = pilots.filter((p) => p.status === "pending").length;
  } catch (e) {
    if (!(e instanceof ApiError)) throw e;
  }

  return (
    <div className="flex w-full flex-1 flex-col">
      {adminOperatorId && <AdminModeBanner operatorName={operatorName} />}
      <div className="flex flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:gap-8 lg:px-8">
        <aside className="w-full shrink-0 lg:w-52">
          <p className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
            Operator
          </p>
          <p className="font-heading mb-4 text-base font-bold tracking-tight">Workspace</p>
          <OperatorNav role={role} counts={{ fleet: fleetPending, pilots: pilotsPending }} />
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
