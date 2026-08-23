import Link from "next/link";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { TicketsList, type TicketBooking } from "./tickets-list";

interface BookingRow {
  id: string;
  seats: string[];
  amount: number;
  status: string;
  created_at: string;
  trip: {
    id: string;
    depart_at: string;
    status: string;
    route: { name: string } | null;
    bus: {
      reg_no: string;
      bus_type: { name: string; class: string } | null;
      operator: { name: string; logo_url: string | null } | null;
    } | null;
  } | null;
  tickets: { qr_signature: string | null; status: string }[];
}

export default async function TicketsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Link href="/login?next=/tickets" className="font-medium text-brand underline dark:text-blue-400">
          Sign in to see your tickets
        </Link>
      </div>
    );
  }

  // RLS restricts bookings + tickets to the signed-in user's own rows.
  // Unpaid bookings (pending/reserved_unpaid) never surface here — a booking
  // only belongs in "my tickets" once it's confirmed or explicitly cancelled.
  // hidden_by_passenger excludes cancelled/refunded bookings the passenger
  // has removed from their list (see TicketsList's delete action) — mirrors
  // BusConnect-mobile's listMyBookings() query. Arrived+boarded bookings are
  // no longer auto-hidden (see reviews feature) — they stay visible as trip
  // history with a "Rate this trip" prompt.
  const { data } = await supabase
    .from("bookings")
    .select(
      `id, seats, amount, status, created_at,
       trip:trips ( id, depart_at, status,
         route:routes ( name ),
         bus:buses ( reg_no, bus_type:bus_types ( name, class ),
           operator:operators ( name, logo_url ) ) ),
       tickets ( qr_signature, status )`,
    )
    .in("status", ["confirmed", "cancelled", "refunded"])
    .eq("hidden_by_passenger", false)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as unknown as BookingRow[];

  // Pre-render the QR (the signed Ed25519 token itself, so a conductor's
  // scanner verifies authenticity fully offline) for confirmed bookings.
  const bookings: TicketBooking[] = await Promise.all(
    rows.map(async (b) => {
      const ticket = b.tickets?.[0];
      const qrDataUrl =
        b.status === "confirmed" && ticket?.qr_signature
          ? await QRCode.toDataURL(ticket.qr_signature, {
              width: 320,
              margin: 1,
              color: { dark: "#0b1b3f", light: "#ffffff" },
            })
          : null;
      return {
        id: b.id,
        code: b.id.slice(0, 6).toUpperCase(),
        seats: b.seats,
        amount: Number(b.amount),
        status: b.status,
        createdAt: b.created_at,
        departAt: b.trip?.depart_at ?? null,
        routeName: b.trip?.route?.name ?? null,
        operatorName: b.trip?.bus?.operator?.name ?? "Trip",
        operatorLogo: b.trip?.bus?.operator?.logo_url ?? null,
        busType: b.trip?.bus?.bus_type?.name ?? null,
        busClass: b.trip?.bus?.bus_type?.class ?? null,
        regNo: b.trip?.bus?.reg_no ?? null,
        qrDataUrl,
        ticketStatus: ticket?.status ?? null,
        tripId: b.trip?.id ?? null,
        tripStatus: b.trip?.status ?? null,
      };
    }),
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">My tickets</h1>
        <p className="ui mt-1 text-sm text-slate-500 dark:text-zinc-400">Your bookings &amp; QR codes for boarding</p>
      </div>

      {bookings.length === 0 ? (
        <div className="card mt-8 p-12 text-center">
          <p className="text-slate-600 dark:text-zinc-400">You haven&apos;t booked any trips yet.</p>
          <Link href="/" className="btn-primary mt-4">
            Search buses
          </Link>
        </div>
      ) : (
        <TicketsList bookings={bookings} />
      )}
    </div>
  );
}
