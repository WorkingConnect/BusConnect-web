/**
 * Typed client for the BusConnect NestJS API. Public reads (search, trip
 * detail, seat map) need no token. Writes (holds, bookings) require the
 * caller to pass the Supabase access token — see lib/supabase/{client,server}.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const ADMIN_OPERATOR_COOKIE = 'admin_operator_id';

/**
 * Set (via the /operator/admin-enter route handler) when an admin opens
 * "Go to operator dashboard" from the admin operators section — every API
 * call then carries this as X-Admin-Operator-Id, which BusConnect-api's
 * OperatorService.getMembership() honors after verifying the caller really
 * is a platform admin. Read both server- and client-side since this same
 * request() function backs both Server Component page fetches and "use
 * client" component calls; next/headers is dynamically imported so it never
 * enters the client bundle graph (a static import there breaks the client
 * build — next/headers is server-only).
 */
async function getAdminOperatorId(): Promise<string | null> {
  if (typeof window !== 'undefined') {
    const match = document.cookie.match(new RegExp(`(?:^|; )${ADMIN_OPERATOR_COOKIE}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  }
  const { cookies } = await import('next/headers');
  const store = await cookies();
  return store.get(ADMIN_OPERATOR_COOKIE)?.value ?? null;
}

/** Synchronous, browser-only check for "use client" components that need to
 *  branch on admin-context mode (e.g. offering an admin-only override on an
 *  action a real operator would just see blocked) — the backend always
 *  re-verifies independently, this is UI branching only, not auth. */
export function isAdminOperatorContext(): boolean {
  if (typeof window === 'undefined') return false;
  return document.cookie.split('; ').some((c) => c.startsWith(`${ADMIN_OPERATOR_COOKIE}=`));
}

async function request<T>(
  path: string,
  init: RequestInit & { accessToken?: string } = {},
): Promise<T> {
  const { accessToken, headers, ...rest } = init;
  const adminOperatorId = await getAdminOperatorId();

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(adminOperatorId ? { 'X-Admin-Operator-Id': adminOperatorId } : {}),
        ...headers,
      },
      cache: 'no-store',
    });
  } catch {
    // fetch() itself throwing (not an HTTP error status) means the request
    // never reached the server — no connection, a CORS rejection, DNS
    // failure, etc. Status 0 distinguishes this from a real server-returned
    // error everywhere ApiError.status is checked.
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

// ── Types (mirror BusConnect-api response shapes) ───────────────────────────

/**
 * One row per bookable (trip, boarding stop, drop stop) match — `search_trips`
 * resolves the actual board/drop instants and fare for the requested stop
 * pair, which may be any two stops the bus passes (not just route endpoints).
 */
export interface TripSearchResult {
  trip_id: string;
  route_id: string;
  route_name: string;
  from_stop_id: string;
  to_stop_id: string;
  from_location_name: string;
  to_location_name: string;
  boarding_at: string;
  drop_at: string;
  fare: number;
  depart_at: string;
  arrive_est: string | null;
  status: string;
  bus_reg_no: string;
  bus_amenities: string[];
  bus_images: string[];
  bus_type_name: string;
  bus_type_class: string;
  bus_type_seat_count: number;
  operator_id: string;
  operator_name: string;
  operator_logo_url: string | null;
  operator_rating: number;
  operator_reliability_score: number;
}

export interface CrewMember {
  name: string;
  photoUrl: string | null;
}

export interface TripCrew {
  driver: CrewMember | null;
  conductor: CrewMember | null;
}

export function getTripCrew(tripId: string) {
  return request<TripCrew>(`/trips/${tripId}/crew`);
}

/**
 * Seat layout convention stored in bus_types.layout_json. Two formats:
 * - Legacy: `cols` is a row template shared by every row (a string is a seat
 *   column label, `null` an aisle gap); a seat's label is `${rowNumber}${colLabel}`
 *   (e.g. "1A") unless `labels` overrides it (row-major, one entry per non-aisle
 *   position).
 * - Freeform (`grid`, written by the admin seat-map editor): a 2D array, one
 *   row per bus row (rows can differ in length/shape — e.g. a wider back
 *   row), each cell either a seat's own label or null for an aisle/gap. Takes
 *   priority over rows/cols/labels when present — see lib/seat-layout.ts's
 *   layoutToGrid(), the single place every consumer expands either format.
 * Either way this is purely a display/identifier concern: hold_seats/
 * create_booking treat seat_no as opaque text regardless of which produced it.
 */
export interface SeatLayout {
  rows: number;
  cols: (string | null)[];
  labels?: string[];
  grid?: (string | null)[][];
}

/** Per-seat status for anything beyond plain taken/free — held (pending
 *  checkout), booked (with the gender picked at selection time), or blocked
 *  (conductor marked it out-of-service/reserved). */
export interface SeatState {
  seat_no: string;
  status: "held" | "booked" | "blocked";
  gender: "male" | "female" | null;
}

export interface SeatMap {
  trip_id: string;
  layout: SeatLayout | null;
  taken: string[];
  seats: SeatState[];
}

/** A trip's per-stop timetable row (real times — from the journey when it has one). */
export interface TripStopTime {
  route_stop_id: string;
  seq: number;
  location_id: string;
  location_name: string;
  scheduled_at: string | null;
  can_board: boolean;
  can_drop: boolean;
}

export interface TripFare {
  from_stop_id: string;
  to_stop_id: string;
  fare: number;
}

export interface TripDetail {
  id: string;
  depart_at: string;
  arrive_est: string | null;
  base_fare: number;
  status: string;
  route: {
    id: string;
    name: string;
    origin_id: string;
    dest_id: string;
  };
  bus: {
    reg_no: string;
    amenities: string[];
    operator: { id: string; name: string; logo_url: string | null; rating: number; reliability_score: number } | null;
    bus_type: { name: string; class: string; seat_count: number; layout_json: SeatLayout | null };
  };
  fares: TripFare[];
  stops: TripStopTime[];
}

export interface Booking {
  id: string;
  trip_id: string;
  seats: string[];
  amount: number;
  status: string;
  from_stop_id: string;
  to_stop_id: string;
  tickets?: { id: string; status: string; qr_signature: string | null }[];
  payments?: { id: string; status: string; amount: number }[];
  refunds?: { id: string; amount: number; reason: string; status: string }[];
  trip?: {
    depart_at: string;
    bus?: {
      reg_no?: string | null;
      operator?: { name: string; logo_url?: string | null; convenience_fee_pct?: number } | null;
    } | null;
  };
  from_stop?: { location?: { name_en: string } | null } | null;
  to_stop?: { location?: { name_en: string } | null } | null;
  /** All rows share the same expires_at — created together by one
   *  hold_seats() call and linked to this booking as a group. */
  holds?: { expires_at: string }[];
}

export interface CancelResult {
  ok: true;
  refundPct: number;
  refundAmount: number;
  refundStatus: "processed" | "pending_manual" | "not_eligible" | "none";
  message: string;
}

export interface HoldResult {
  ok: boolean;
  hold_group: string;
  trip_id: string;
  seats: string[];
  expires_at: string;
}

export interface BookingResult {
  ok: boolean;
  booking_id: string;
  trip_id: string;
  seats: string[];
  amount: number;
}

export interface MpgsCheckoutSession {
  sessionId: string;
  checkoutJsUrl: string;
}

// ── Public (no token) ────────────────────────────────────────────────────────

export function searchTrips(params: { from: string; to: string; date: string }) {
  const qs = new URLSearchParams(params).toString();
  return request<TripSearchResult[]>(`/search?${qs}`);
}

/** Journeys for every route sharing a route card, or a single card-less route — pass exactly one of routeCardId/routeId. */
export function searchTripsByRoute(params: { routeCardId?: string; routeId?: string; date: string }) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined)) as Record<string, string>,
  ).toString();
  return request<TripSearchResult[]>(`/search-by-route?${qs}`);
}

export function getTrip(id: string) {
  return request<TripDetail>(`/trips/${id}`);
}

export function getSeatmap(id: string) {
  return request<SeatMap>(`/trips/${id}/seatmap`);
}

// ── Authenticated (token required) ──────────────────────────────────────────

export function createHold(
  accessToken: string,
  body: { tripId: string; seats: { seatNo: string; gender?: "male" | "female" }[] },
) {
  return request<HoldResult>('/holds', {
    method: 'POST',
    body: JSON.stringify(body),
    accessToken,
  });
}

export function releaseHold(accessToken: string, holdGroup: string) {
  return request(`/holds/${holdGroup}`, { method: 'DELETE', accessToken });
}

export function createBooking(
  accessToken: string,
  body: { holdGroup: string; fromStopId: string; toStopId: string },
) {
  return request<BookingResult>('/bookings', {
    method: 'POST',
    body: JSON.stringify(body),
    accessToken,
  });
}

export function getBooking(accessToken: string, id: string) {
  return request<Booking>(`/bookings/${id}`, { accessToken });
}

export function cancelBooking(accessToken: string, id: string) {
  return request<CancelResult>(`/bookings/${id}/cancel`, {
    method: 'POST',
    accessToken,
  });
}

/** Removes a cancelled/refunded booking from the passenger's own ticket list — the record itself is kept. */
export function hideBooking(accessToken: string, id: string) {
  return request<{ ok: true }>(`/bookings/${id}/hide`, {
    method: 'POST',
    accessToken,
  });
}

export function checkoutBooking(accessToken: string, bookingId: string) {
  return request<MpgsCheckoutSession>(`/bookings/${bookingId}/pay`, {
    method: 'POST',
    accessToken,
  });
}

/** Dev-only shortcut that confirms a booking without the real MPGS round
 *  trip — the API refuses this outright once NODE_ENV=production, so it's
 *  safe to ship the client call unconditionally; the UI just hides the
 *  button outside local development. */
export function devConfirmPayment(accessToken: string, bookingId: string) {
  return request<{ ok: boolean }>(`/bookings/${bookingId}/dev-confirm-pay`, {
    method: 'POST',
    accessToken,
  });
}

// ── Operator dashboard (token required; caller must be linked via operator_users) ──

export interface OperatorInfo {
  id: string;
  name: string;
  rating: number;
  reliability_score: number;
  status: string;
  witness_name?: string | null;
  mobile_no?: string | null;
  address?: string | null;
  logo_url?: string | null;
  id_document_path?: string | null;
}

export interface OperatorTrip {
  id: string;
  depart_at: string;
  arrive_est: string | null;
  base_fare: number;
  status: string;
  journey_id: string | null;
  cancellation_requested_at: string | null;
  cancellation_reason: string | null;
  route: { id: string; name: string; origin_id: string; dest_id: string } | null;
  bus: { reg_no: string; bus_type: { name: string; class: string; seat_count: number } };
}

export interface OperatorManifestBooking {
  id: string;
  seats: string[];
  amount: number;
  status: string;
  created_at: string;
  passenger_name: string | null;
  passenger_phone: string | null;
  is_walkup: boolean;
  boarded: boolean;
  boarded_seats: string[];
  from_location: string | null;
  to_location: string | null;
}

export interface OperatorManifestStop {
  id: string;
  seq: number;
  route_stop_id: string;
  scheduled_time: string;
  day_offset: number;
  can_board: boolean;
  can_drop: boolean;
  location_name: string | null;
  boarding_seats: string[];
  dropping_seats: string[];
}

export interface OperatorManifest {
  trip_id: string;
  role: "owner" | "pilot";
  status: string;
  location_sharing: boolean;
  cancellation_requested_at: string | null;
  cancellation_reason: string | null;
  route_name: string | null;
  bus: { reg_no: string; bus_type: { name: string; class: string } | null } | null;
  depart_at: string;
  layout: SeatLayout | null;
  taken: string[];
  seats: SeatState[];
  bookings: OperatorManifestBooking[];
  boarded_count: number;
  confirmed_count: number;
  revenue: number;
  stops: OperatorManifestStop[];
  can_assign_walkup: boolean;
}

export interface AssignSeatResult {
  ok: true;
  booking_id: string;
  seat_no: string;
}

export interface MyAssignment {
  role: "owner" | "pilot";
  operator: { id: string; name: string; logo_url: string | null; status: string };
  pilot: { id: string; name: string; assigned_role: "driver" | "conductor" | null; status: string } | null;
  bus:
    | {
        id: string;
        reg_no: string;
        status: string;
        amenities: string[];
        front_image_url: string | null;
        side_image_urls: string[] | null;
        interior_image_url: string | null;
        seat_layout_image_url: string | null;
        bus_type: { name: string; class: string; seat_count: number } | null;
      }
    | null;
}

export function getMyAssignment(accessToken: string) {
  return request<MyAssignment>("/operator/my-assignment", { accessToken });
}

export interface OperatorAnalytics {
  operator: { id: string; name: string; rating: number; reliability_score: number };
  totalTrips: number;
  upcomingTrips: number;
  totalBookings: number;
  totalRevenue: number;
  totalNetRevenue: number;
  fillRatePct: number;
}

export interface OperatorBus {
  id: string;
  reg_no: string;
  status: 'pending' | 'active' | 'rejected';
  amenities: string[];
  notes: string | null;
  seat_layout_style: string | null;
  seat_numbering: 'auto' | 'custom';
  front_image_url: string | null;
  side_image_urls: string[] | null;
  interior_image_url: string | null;
  seat_layout_image_url: string | null;
  bus_type: { name: string; class: string; seat_count: number; layout_json: SeatLayout | null } | null;
  crew: {
    driver: { id: string; name: string } | null;
    conductor: { id: string; name: string } | null;
  };
}

export interface RouteStopEntry {
  id?: string; // route_stops.id — present via the operator catalog reader
  seq: number;
  location: { id: string; name_en: string } | null;
}

export interface RouteCatalogEntry {
  id: string;
  name: string;
  image_url: string | null;
  origin_id: string;
  dest_id: string;
  origin?: { name_en: string } | null;
  dest?: { name_en: string } | null;
  stops: RouteStopEntry[];
}

export interface OperatorFleet {
  routes: { id: string; name: string; origin_id: string; dest_id: string }[];
  buses: OperatorBus[];
}

// ── Journeys (operator recurring services) ──────────────────────────────────

export interface OperatorJourney {
  id: string;
  code: string | null;
  depart_time: string;
  arrive_time: string;
  arrive_day_offset: number;
  base_fare: number;
  status: 'active' | 'paused';
  created_at: string;
  route: { id: string; name: string } | null;
  bus: { reg_no: string; bus_type: { name: string; class: string } | null } | null;
  driver: { name: string } | null;
  conductor: { name: string } | null;
}

export interface JourneyStopDetail {
  id: string;
  route_stop_id: string;
  seq: number;
  scheduled_time: string;
  day_offset: number;
  can_board: boolean;
  can_drop: boolean;
  route_stop: { location: { id: string; name_en: string } | null } | null;
}

export interface OperatorJourneyDetail extends Omit<OperatorJourney, 'route' | 'bus'> {
  depart_location: string | null;
  depart_location_url: string | null;
  arrive_location: string | null;
  arrive_location_url: string | null;
  route: { id: string; name: string; origin_id: string; dest_id: string } | null;
  bus: { id: string; reg_no: string; bus_type: { name: string; class: string; seat_count: number } | null } | null;
  driver: { id: string; name: string } | null;
  conductor: { id: string; name: string } | null;
  stops: JourneyStopDetail[];
  /** True once any trip on this journey has a real booking — the route,
   *  times, fare, and boarding/drop-off points then lock for a real
   *  operator (not admin-context); only the bus stays changeable. */
  has_booked_trips: boolean;
}

export interface JourneyStopInput {
  routeStopId: string;
  time: string;
  dayOffset?: number;
  canBoard?: boolean;
  canDrop?: boolean;
}

export interface UpsertJourneyInput {
  routeId: string;
  busId: string;
  departTime: string;
  arriveTime: string;
  arriveDayOffset?: number;
  departLocation?: string;
  departLocationUrl?: string;
  arriveLocation?: string;
  arriveLocationUrl?: string;
  baseFare: number;
  stops: JourneyStopInput[];
}

export function listJourneys(accessToken: string) {
  return request<OperatorJourney[]>('/operator/journeys', { accessToken });
}

export function getJourney(accessToken: string, id: string) {
  return request<OperatorJourneyDetail>(`/operator/journeys/${id}`, { accessToken });
}

export function createJourney(accessToken: string, input: UpsertJourneyInput) {
  return request<OperatorJourneyDetail>('/operator/journeys', {
    method: 'POST',
    body: JSON.stringify(input),
    accessToken,
  });
}

export function updateJourney(accessToken: string, id: string, input: UpsertJourneyInput) {
  return request<OperatorJourneyDetail>(`/operator/journeys/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
    accessToken,
  });
}

export function setJourneyStatus(accessToken: string, id: string, status: 'active' | 'paused') {
  return request<OperatorJourney>(`/operator/journeys/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
    accessToken,
  });
}

/** `force` only ever does anything for a platform admin in admin-context
 *  mode — the backend re-checks that independently, this is not a client-
 *  side permission. Forcing cancels the journey's upcoming trips (each
 *  booking is cancelled and a full refund queued for the admin Refunds
 *  page) before the journey itself is deleted. */
export function deleteJourney(accessToken: string, id: string, force = false) {
  const qs = force ? '?force=true' : '';
  return request<{ ok: true }>(`/operator/journeys/${id}${qs}`, { method: 'DELETE', accessToken });
}

// ── Timetable — schedule dated trips from journeys ──────────────────────────

export interface ScheduleTripsResult {
  created: number;
  skipped: number;
  tripIds: string[];
}

export function scheduleTrips(accessToken: string, input: { journeyId: string; dates: string[] }) {
  return request<ScheduleTripsResult>('/operator/trips', {
    method: 'POST',
    body: JSON.stringify(input),
    accessToken,
  });
}

/** `force` only ever does anything for a platform admin in admin-context
 *  mode — the backend re-checks that independently, this is not a client-
 *  side permission. Forcing a trip with bookings cancels each one and
 *  queues a full refund (see the admin Refunds page) rather than deleting
 *  them outright. */
export function cancelOperatorTrip(accessToken: string, tripId: string, force = false) {
  const qs = force ? '?force=true' : '';
  return request<{ ok: true; refundsQueued: number }>(`/operator/trips/${tripId}${qs}`, {
    method: 'DELETE',
    accessToken,
  });
}

/** Owner-only: flags a trip (that has bookings, so a plain cancelOperatorTrip
 *  would 409) for admin review instead of cancelling it outright. */
export function requestTripCancellation(accessToken: string, tripId: string, reason?: string) {
  return request<{ ok: true }>(`/operator/trips/${tripId}/cancellation-request`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
    accessToken,
  });
}

/** Queues a refund for a passenger who never checked in on an arrived trip —
 *  conductor, owner, or admin-context, picks the refund %. Only queues (goes
 *  to the admin Refunds page); never moves money itself. */
export function requestNoShowRefund(accessToken: string, tripId: string, bookingId: string, refundPct: number) {
  return request<{ ok: true; refundAmount: number; refundStatus: string }>(
    `/operator/trips/${tripId}/bookings/${bookingId}/no-show-refund`,
    {
      method: 'POST',
      body: JSON.stringify({ refund_pct: refundPct }),
      accessToken,
    },
  );
}

/** Withdraws (owner) or rejects (admin-context) a pending cancellation request. */
export function clearCancellationRequest(accessToken: string, tripId: string) {
  return request<{ ok: true }>(`/operator/trips/${tripId}/cancellation-request`, {
    method: 'DELETE',
    accessToken,
  });
}

export function getOperatorRouteCatalog(accessToken: string) {
  return request<RouteCatalogEntry[]>('/operator/routes', { accessToken });
}

export interface RegisterBusInput {
  regNo: string;
  busClass: 'normal' | 'semi_luxury' | 'luxury' | 'super_luxury' | 'expressway';
  totalSeats: number;
  seatLayoutStyle: '2x2' | '3x2' | '2x1';
  seatNumbering: 'auto' | 'custom';
  customSeatNumbers?: string[];
  amenities: string[];
  frontImageUrl?: string;
  sideImageUrls?: string[];
  interiorImageUrl?: string;
  seatLayoutImageUrl?: string;
  notes?: string;
}

export function registerBus(accessToken: string, input: RegisterBusInput) {
  return request<OperatorBus>('/operator/buses', {
    method: 'POST',
    body: JSON.stringify(input),
    accessToken,
  });
}

export interface OperatorBusDetail extends OperatorBus {
  created_at: string;
}

export function getBus(accessToken: string, busId: string) {
  return request<OperatorBusDetail>(`/operator/buses/${busId}`, { accessToken });
}

export interface UpdateBusInput {
  regNo?: string;
  busClass?: 'normal' | 'semi_luxury' | 'luxury' | 'super_luxury' | 'expressway';
  amenities?: string[];
  notes?: string;
  frontImageUrl?: string;
  sideImageUrls?: string[];
  interiorImageUrl?: string;
  seatLayoutImageUrl?: string;
}

export function updateBus(accessToken: string, busId: string, input: UpdateBusInput) {
  return request<OperatorBusDetail>(`/operator/buses/${busId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
    accessToken,
  });
}

export type OperatorRole = 'owner' | 'pilot';

export interface OperatorMembership {
  operator: OperatorInfo;
  role: OperatorRole;
}

export interface OperatorPilot {
  id: string;
  name: string;
  id_number: string;
  phone_no: string;
  profile_image_url: string | null;
  status: 'pending' | 'active' | 'rejected';
  assigned_bus_id: string | null;
  assigned_role: 'driver' | 'conductor' | null;
  user_id: string | null;
  created_at: string;
  bus: { reg_no: string } | null;
}

export interface OperatorPilotDetail extends OperatorPilot {
  operator_id: string;
  bus: { reg_no: string; bus_type: { name: string; class: string } | null } | null;
  linked_phone: string | null;
}

export interface MyRoles {
  isOperator: boolean;
  operatorRole: OperatorRole | null;
  operatorName: string | null;
  operatorStatus: string | null;
  isAdmin: boolean;
}

export function getMyOperator(accessToken: string) {
  return request<OperatorMembership>('/operator/me', { accessToken });
}

export interface ApplyOperatorInput {
  name: string;
  witnessName: string;
  mobileNo: string;
  address: string;
  logoUrl: string;
  idDocumentPath: string;
}

export function applyAsOperator(accessToken: string, input: ApplyOperatorInput) {
  return request<OperatorInfo>('/operator/apply', {
    method: 'POST',
    body: JSON.stringify(input),
    accessToken,
  });
}

export function listPilots(accessToken: string) {
  return request<OperatorPilot[]>('/operator/pilots', { accessToken });
}

export function getPilot(accessToken: string, pilotId: string) {
  return request<OperatorPilotDetail>(`/operator/pilots/${pilotId}`, { accessToken });
}

export interface UpdatePilotInput {
  name?: string;
  idNumber?: string;
  phoneNo?: string;
  profileImagePath?: string;
}

export function updatePilot(accessToken: string, pilotId: string, input: UpdatePilotInput) {
  return request<OperatorPilotDetail>(`/operator/pilots/${pilotId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
    accessToken,
  });
}

export interface RegisterPilotInput {
  name: string;
  idNumber: string;
  phoneNo: string;
  profileImagePath: string;
}

export function registerPilot(accessToken: string, input: RegisterPilotInput) {
  return request<OperatorPilot>('/operator/pilots', {
    method: 'POST',
    body: JSON.stringify(input),
    accessToken,
  });
}

export function getPilotPhotoUrl(accessToken: string, pilotId: string) {
  return request<{ url: string }>(`/operator/pilots/${pilotId}/photo-url`, { accessToken });
}

export function assignPilot(
  accessToken: string,
  pilotId: string,
  input: { busId: string; role: 'driver' | 'conductor' },
) {
  return request<OperatorPilot>(`/operator/pilots/${pilotId}/assign`, {
    method: 'PATCH',
    body: JSON.stringify(input),
    accessToken,
  });
}

export function linkPilotAccount(accessToken: string, pilotId: string, phone: string) {
  return request<OperatorPilot>(`/operator/pilots/${pilotId}/link-account`, {
    method: 'POST',
    body: JSON.stringify({ phone }),
    accessToken,
  });
}

export function deletePilot(accessToken: string, pilotId: string) {
  return request(`/operator/pilots/${pilotId}`, { method: 'DELETE', accessToken });
}

export function getMyRoles(accessToken: string) {
  return request<MyRoles>('/me/roles', { accessToken });
}

export interface MyProfile {
  id: string;
  name: string | null;
  phone: string | null;
  nic: string | null;
  email: string | null;
  avatar_url: string | null;
  lang: string;
  created_at: string | null;
}

export function getMyProfile(accessToken: string) {
  return request<MyProfile>('/me/profile', { accessToken });
}

export interface UpdateMyProfileInput {
  name?: string;
  phone?: string;
  email?: string;
  nic?: string;
  avatarUrl?: string;
}

export function updateMyProfile(accessToken: string, input: UpdateMyProfileInput) {
  return request<MyProfile>('/me/profile', {
    method: 'PATCH',
    body: JSON.stringify(input),
    accessToken,
  });
}

export function deleteMyAccount(accessToken: string) {
  return request<{ ok: boolean }>('/me/account', { method: 'DELETE', accessToken });
}

export function validateTicket(accessToken: string, token: string) {
  return request<
    | { ok: true; status: 'accepted'; ticketId: string }
    | { ok: false; reason: 'already_used' | 'void' | 'not_found' }
  >('/tickets/validate', {
    method: 'POST',
    body: JSON.stringify({ token }),
    accessToken,
  });
}

export function listOperatorTrips(accessToken: string) {
  return request<OperatorTrip[]>('/operator/trips', { accessToken });
}

export function getOperatorManifest(accessToken: string, tripId: string) {
  return request<OperatorManifest>(`/operator/trips/${tripId}/manifest`, { accessToken });
}

export function blockSeat(accessToken: string, tripId: string, seatNo: string) {
  return request<{ ok: true; seat_no: string }>(
    `/operator/trips/${tripId}/seats/${encodeURIComponent(seatNo)}/block`,
    { method: "POST", accessToken },
  );
}

export function unblockSeat(accessToken: string, tripId: string, seatNo: string) {
  return request<{ ok: true }>(
    `/operator/trips/${tripId}/seats/${encodeURIComponent(seatNo)}/block`,
    { method: "DELETE", accessToken },
  );
}

export function assignSeat(
  accessToken: string,
  tripId: string,
  seatNo: string,
  body: { gender: "male" | "female"; passengerName: string; fromStopId?: string; toStopId?: string },
) {
  return request<AssignSeatResult>(
    `/operator/trips/${tripId}/seats/${encodeURIComponent(seatNo)}/assign`,
    { method: "POST", body: JSON.stringify(body), accessToken },
  );
}

export function getOperatorAnalytics(accessToken: string) {
  return request<OperatorAnalytics>('/operator/analytics', { accessToken });
}


export function getOperatorFleet(accessToken: string) {
  return request<OperatorFleet>('/operator/fleet', { accessToken });
}

export interface OperatorPayoutAccount {
  bankName?: string | null;
  branchName?: string | null;
  accountNumber?: string | null;
  bankCode?: string | null;
}

export interface OperatorProfile {
  id: string;
  name: string;
  rating: number;
  reliability_score: number;
  status: string;
  logo_url: string | null;
  witness_name: string | null;
  mobile_no: string | null;
  address: string | null;
  payout_account: OperatorPayoutAccount | null;
  created_at: string;
  role: OperatorRole;
}

export function getOperatorProfile(accessToken: string) {
  return request<OperatorProfile>('/operator/profile', { accessToken });
}

export interface UpdateOperatorProfileInput {
  mobileNo?: string;
  address?: string;
  logoUrl?: string;
  bankName?: string;
  branchName?: string;
  accountNumber?: string;
  bankCode?: string;
}

export function updateOperatorProfile(accessToken: string, input: UpdateOperatorProfileInput) {
  return request<OperatorProfile>('/operator/profile', {
    method: 'PATCH',
    body: JSON.stringify(input),
    accessToken,
  });
}

// ── Admin dashboard (token required; caller must be linked via admin_users) ────

export interface AdminOperator {
  id: string;
  name: string;
  logo_url: string | null;
  rating: number;
  reliability_score: number;
  status: 'pending' | 'active' | 'suspended';
  created_at: string;
  witness_name: string | null;
  mobile_no: string | null;
  address: string | null;
  id_document_path: string | null;
  payout_account: OperatorPayoutAccount | null;
  commission_pct: number;
  convenience_fee_pct: number;
  walkup_enabled: boolean;
  walkup_limit: number | null;
  owner_email?: string | null;
}

export function setOperatorCommission(accessToken: string, operatorId: string, commissionPct: number) {
  return request<{ id: string; commission_pct: number }>(`/admin/operators/${operatorId}/commission`, {
    method: 'PATCH',
    body: JSON.stringify({ commissionPct }),
    accessToken,
  });
}

export function setOperatorConvenienceFee(accessToken: string, operatorId: string, convenienceFeePct: number) {
  return request<{ id: string; convenience_fee_pct: number }>(
    `/admin/operators/${operatorId}/convenience-fee`,
    {
      method: 'PATCH',
      body: JSON.stringify({ convenienceFeePct }),
      accessToken,
    },
  );
}

export function setOperatorWalkupPolicy(
  accessToken: string,
  operatorId: string,
  body: { walkupEnabled: boolean; walkupLimit: number | null },
) {
  return request<{ id: string; walkup_enabled: boolean; walkup_limit: number | null }>(
    `/admin/operators/${operatorId}/walkup-policy`,
    { method: 'PATCH', body: JSON.stringify(body), accessToken },
  );
}

export interface AdminRefund {
  id: string;
  amount: number;
  reason: string;
  status: string;
  processed_at: string | null;
  booking: {
    id: string;
    amount: number;
    seats: string[];
    trip: { bus: { operator: { name: string } | null } | null } | null;
  };
  /** How "Process" will actually move money: 'mpgs' (real gateway refund),
   *  'wallet' (credited back to the passenger's balance), or null (no paid
   *  payment on record — falls back to marking it processed manually). */
  refund_method: 'mpgs' | 'wallet' | string | null;
}

export interface AdminAnalytics {
  totalOperators: number;
  pendingOperators: number;
  activeOperators: number;
  totalTrips: number;
  totalBookings: number;
  totalRevenue: number;
  pendingRefundsCount: number;
  pendingRefundsAmount: number;
  perOperator: { operatorId: string; name: string; status: string; bookings: number; revenue: number }[];
}

export interface AdminBooking {
  id: string;
  passenger_id: string | null;
  seats: string[];
  amount: number;
  status: string;
  created_at: string;
  hidden_by_passenger: boolean;
  trip: { depart_at: string; bus: { operator: { id: string; name: string } | null } | null } | null;
  tickets?: { id: string; status: string }[];
  payments?: { id: string; status: string; amount: number }[];
  refunds?: { id: string; amount: number; status: string }[];
}

export interface AdminLocation {
  id: string;
  name_en: string;
  name_si: string | null;
  name_ta: string | null;
  lat: number | null;
  lng: number | null;
}

export interface AdminBusType {
  id: string;
  name: string;
  class: string;
  seat_count: number;
  layout_json: SeatLayout;
}

export interface AdminBus {
  id: string;
  reg_no: string;
  amenities: string[];
  status: 'pending' | 'active' | 'rejected';
  notes: string | null;
  seat_layout_style: string | null;
  seat_numbering: 'auto' | 'custom';
  front_image_url: string | null;
  side_image_urls: string[] | null;
  interior_image_url: string | null;
  seat_layout_image_url: string | null;
  operator: { name: string } | null;
  bus_type: { name: string; class: string; seat_count: number } | null;
}

export interface AdminJourney {
  id: string;
  code: string | null;
  depart_time: string;
  arrive_time: string;
  arrive_day_offset: number;
  base_fare: number;
  status: 'active' | 'paused';
  review_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  operator: { name: string } | null;
  route: { name: string } | null;
  bus: { reg_no: string; bus_type: { name: string; class: string; seat_count: number } | null } | null;
  driver: { name: string } | null;
  conductor: { name: string } | null;
}

export function listAdminJourneys(accessToken: string) {
  return request<AdminJourney[]>('/admin/journeys', { accessToken });
}

export function setAdminJourneyReviewStatus(
  accessToken: string,
  journeyId: string,
  reviewStatus: 'pending' | 'approved' | 'rejected',
) {
  return request<AdminJourney>(`/admin/journeys/${journeyId}/review-status`, {
    method: 'PATCH',
    body: JSON.stringify({ reviewStatus }),
    accessToken,
  });
}

export interface AdminJourneyDetail extends AdminJourney {
  route: { name: string; origin_id: string; dest_id: string } | null;
  driver: { id: string; name: string } | null;
  conductor: { id: string; name: string } | null;
  depart_location: string | null;
  depart_location_url: string | null;
  arrive_location: string | null;
  arrive_location_url: string | null;
  stops: {
    id: string;
    seq: number;
    scheduled_time: string;
    day_offset: number;
    can_board: boolean;
    can_drop: boolean;
    route_stop: { location: { id: string; name_en: string } | null } | null;
  }[];
}

export function getAdminJourney(accessToken: string, journeyId: string) {
  return request<AdminJourneyDetail>(`/admin/journeys/${journeyId}`, { accessToken });
}

/** A stop as the admin editor sees it — its own pin + waypoint flag. A hidden
 *  waypoint has no named location (location_id/name null). */
export interface AdminRouteStop {
  route_stop_id: string;
  location_id: string | null;
  name: string | null;
  seq: number;
  lat: number | null;
  lng: number | null;
  is_waypoint: boolean;
}

/** GeoJSON LineString the route's saved road path comes back as. */
export interface GeoJsonLineString {
  type: 'LineString';
  coordinates: [number, number][]; // [lng, lat]
}

export interface AdminRoute {
  id: string;
  name: string;
  image_url: string | null;
  origin_id: string;
  dest_id: string;
  origin_name: string | null;
  dest_name: string | null;
  path: GeoJsonLineString | null;
  stops: AdminRouteStop[];
  created_at: string;
  route_card_id: string | null;
  /** Operators this route is restricted to — empty means unrestricted (every operator can use it). */
  operator_ids: string[];
}

/** A shared name+image template a route can link to, so physically different
 *  routes (different stops/operators) can still display the same corridor
 *  branding. Editing a card live-updates every route linked to it. */
export interface AdminRouteCard {
  id: string;
  name: string;
  image_url: string | null;
  created_at: string;
}

/** One road-path option from Google Directions (via the preview endpoint). */
export interface RoutePathOption {
  coordinates: [number, number][]; // [lng, lat]
  summary: string;
  distanceM: number;
  durationS: number;
}

// ── Users (admin) — every account, any role ─────────────────────────────────

export interface AdminUserSummary {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  created_at: string;
  deleted: boolean;
  roles: {
    passenger: boolean;
    operator: { name: string; role: string }[];
    pilot: { status: string; assignedRole: string | null } | null;
    admin: string | null;
  };
}

export interface AdminUserBooking {
  id: string;
  seats: string[];
  amount: number;
  status: string;
  created_at: string;
  trip: {
    id: string;
    depart_at: string;
    route: { name: string } | null;
    bus: { reg_no: string; operator: { name: string } | null } | null;
  } | null;
  tickets: { id: string; status: string; boarded_seats: string[] }[];
  payments: { id: string; status: string; amount: number; method: string }[];
  refunds: { id: string; status: string; amount: number; reason: string }[];
}

export interface AdminUserDetail {
  id: string;
  email: string | null;
  created_at: string;
  passenger: {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
    nic: string | null;
    avatar_url: string | null;
    created_at: string;
    deleted_at: string | null;
  } | null;
  operator_memberships: { role: string; operator: { id: string; name: string; status: string } | null }[];
  pilot_roster: {
    id: string;
    name: string;
    phone_no: string;
    status: string;
    assigned_role: string | null;
    operator: { id: string; name: string } | null;
    bus: { reg_no: string } | null;
  }[];
  admin_role: string | null;
  bookings: AdminUserBooking[];
  wallet_balance: number;
  wallet_currency: string;
}

export function listAdminUsers(accessToken: string) {
  return request<AdminUserSummary[]>('/admin/users', { accessToken });
}

export function getAdminUser(accessToken: string, userId: string) {
  return request<AdminUserDetail>(`/admin/users/${userId}`, { accessToken });
}

/** Admin-side equivalent of the passenger's own "remove ticket" — same
 *  hidden_by_passenger flag, just not restricted to cancelled/refunded. */
export function hideAdminBooking(accessToken: string, bookingId: string) {
  return request<{ ok: true }>(`/admin/bookings/${bookingId}/hide`, {
    method: 'POST',
    accessToken,
  });
}

export function listAdminOperators(accessToken: string) {
  return request<AdminOperator[]>('/admin/operators', { accessToken });
}

export function getAdminOperator(accessToken: string, operatorId: string) {
  return request<AdminOperator>(`/admin/operators/${operatorId}`, { accessToken });
}

export function setAdminOperatorStatus(
  accessToken: string,
  operatorId: string,
  status: 'pending' | 'active' | 'suspended',
) {
  return request<AdminOperator>(`/admin/operators/${operatorId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
    accessToken,
  });
}

export function deleteAdminOperator(accessToken: string, operatorId: string) {
  return request<{ ok: true }>(`/admin/operators/${operatorId}`, {
    method: 'DELETE',
    accessToken,
  });
}

export function getAdminIdDocumentUrl(accessToken: string, operatorId: string) {
  return request<{ url: string }>(`/admin/operators/${operatorId}/id-document-url`, {
    accessToken,
  });
}

export function listAdminRefunds(accessToken: string, status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return request<AdminRefund[]>(`/admin/refunds${qs}`, { accessToken });
}

export function processAdminRefund(accessToken: string, refundId: string) {
  return request(`/admin/refunds/${refundId}/process`, { method: 'POST', accessToken });
}

export function getAdminAnalytics(accessToken: string) {
  return request<AdminAnalytics>('/admin/analytics', { accessToken });
}

export interface AdminWalletHolder {
  passengerId: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  balance: number;
  currency: string;
  updatedAt: string;
}

export interface AdminWalletOverview {
  totalBalance: number;
  currency: string;
  holderCount: number;
  wallets: AdminWalletHolder[];
}

export function getAdminWalletOverview(accessToken: string) {
  return request<AdminWalletOverview>('/admin/wallets', { accessToken });
}

export function listAllAdminBookings(accessToken: string) {
  return request<AdminBooking[]>('/admin/bookings/all', { accessToken });
}

export function findAdminBookingById(accessToken: string, bookingId: string) {
  return request<AdminBooking>(`/admin/bookings/${bookingId}`, { accessToken });
}

export function findAdminBookingsByEmail(accessToken: string, email: string) {
  return request<AdminBooking[]>(`/admin/bookings?email=${encodeURIComponent(email)}`, {
    accessToken,
  });
}

export function listAdminLocations(accessToken: string) {
  return request<AdminLocation[]>('/admin/locations', { accessToken });
}

export function createAdminLocation(
  accessToken: string,
  body: { nameEn: string; nameSi?: string; nameTa?: string; lat?: number; lng?: number },
) {
  return request<AdminLocation>('/admin/locations', {
    method: 'POST',
    body: JSON.stringify(body),
    accessToken,
  });
}

export function listAdminBusTypes(accessToken: string) {
  return request<AdminBusType[]>('/admin/bus-types', { accessToken });
}

export function createAdminBusType(
  accessToken: string,
  body: { name: string; busClass: string; seatCount: number },
) {
  return request<AdminBusType>('/admin/bus-types', {
    method: 'POST',
    body: JSON.stringify(body),
    accessToken,
  });
}

export function listAdminBuses(accessToken: string) {
  return request<AdminBus[]>('/admin/buses', { accessToken });
}

export function createAdminBus(
  accessToken: string,
  body: { operatorId: string; busTypeId: string; regNo: string; amenities?: string[] },
) {
  return request<AdminBus>('/admin/buses', {
    method: 'POST',
    body: JSON.stringify(body),
    accessToken,
  });
}

export function setAdminBusStatus(
  accessToken: string,
  busId: string,
  status: 'pending' | 'active' | 'rejected',
) {
  return request<AdminBus>(`/admin/buses/${busId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
    accessToken,
  });
}

export interface AdminBusDetail extends AdminBus {
  bus_type_id: string;
  created_at: string;
}

export function getAdminBus(accessToken: string, busId: string) {
  return request<AdminBusDetail>(`/admin/buses/${busId}`, { accessToken });
}

export interface UpdateAdminBusInput {
  regNo?: string;
  busTypeId?: string;
  amenities?: string[];
  notes?: string;
  frontImageUrl?: string;
  sideImageUrls?: string[];
  interiorImageUrl?: string;
  seatLayoutImageUrl?: string;
}

export function updateAdminBus(accessToken: string, busId: string, input: UpdateAdminBusInput) {
  return request<AdminBusDetail>(`/admin/buses/${busId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
    accessToken,
  });
}

export interface AdminBusLayoutContext {
  id: string;
  reg_no: string;
  status: 'pending' | 'active' | 'rejected';
  bus_type_id: string;
  operator: { name: string } | null;
  bus_type: { id: string; name: string; class: string; seat_count: number; layout_json: SeatLayout | null } | null;
}

export function getAdminBusLayout(accessToken: string, busId: string) {
  return request<AdminBusLayoutContext>(`/admin/buses/${busId}/layout`, { accessToken });
}

export function updateAdminBusLayout(accessToken: string, busId: string, layout: SeatLayout) {
  return request<AdminBusType>(`/admin/buses/${busId}/layout`, {
    method: 'PATCH',
    body: JSON.stringify({ layout }),
    accessToken,
  });
}

export interface AdminPilot {
  id: string;
  name: string;
  id_number: string;
  phone_no: string;
  profile_image_url: string | null;
  status: 'pending' | 'active' | 'rejected';
  assigned_bus_id: string | null;
  assigned_role: 'driver' | 'conductor' | null;
  user_id: string | null;
  created_at: string;
  operator: { name: string } | null;
  bus: { reg_no: string } | null;
}

export function listAdminPilots(accessToken: string) {
  return request<AdminPilot[]>('/admin/pilots', { accessToken });
}

export function setAdminPilotStatus(
  accessToken: string,
  pilotId: string,
  status: 'pending' | 'active' | 'rejected',
) {
  return request<AdminPilot>(`/admin/pilots/${pilotId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
    accessToken,
  });
}

export function getAdminPilotPhotoUrl(accessToken: string, pilotId: string) {
  return request<{ url: string }>(`/admin/pilots/${pilotId}/photo-url`, { accessToken });
}

export function listAdminRoutes(accessToken: string) {
  return request<AdminRoute[]>('/admin/routes', { accessToken });
}

export interface RouteStopInput {
  /** Named place for a real stop; omit/null for a hidden waypoint. */
  locationId?: string | null;
  lat: number;
  lng: number;
  isWaypoint?: boolean;
}

export interface UpsertRouteInput {
  name: string;
  stops: RouteStopInput[];
  /** Admin-chosen road path from the preview ([lng, lat] pairs); falls back to
   *  the Directions best route when omitted. */
  pathCoordinates?: [number, number][];
  imageUrl?: string;
  /** Route card to link this route to — name/image are then live-synced from
   *  the card. Omit/null to leave this route on its own name/image. */
  routeCardId?: string | null;
  /** Operators to restrict this route to. Omit/empty to leave it unrestricted (every operator can use it). */
  operatorIds?: string[];
}

export function createAdminRoute(accessToken: string, body: UpsertRouteInput) {
  return request<AdminRoute>('/admin/routes', {
    method: 'POST',
    body: JSON.stringify(body),
    accessToken,
  });
}

export function updateAdminRoute(accessToken: string, routeId: string, body: UpsertRouteInput) {
  return request<AdminRoute>(`/admin/routes/${routeId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    accessToken,
  });
}

export function deleteAdminRoute(accessToken: string, routeId: string) {
  return request(`/admin/routes/${routeId}`, { method: 'DELETE', accessToken });
}

/** Regenerates a route's real road path (Google Directions) from its current stops. */
export function regenerateAdminRoutePath(accessToken: string, routeId: string) {
  return request<{ ok: true }>(`/admin/routes/${routeId}/path`, { method: 'POST', accessToken });
}

// ── Route cards (shared name+image templates a route can link to) ──────────

export function listAdminRouteCards(accessToken: string) {
  return request<AdminRouteCard[]>('/admin/route-cards', { accessToken });
}

export interface UpsertRouteCardInput {
  name: string;
  imageUrl?: string;
}

export function createAdminRouteCard(accessToken: string, body: UpsertRouteCardInput) {
  return request<AdminRouteCard>('/admin/route-cards', {
    method: 'POST',
    body: JSON.stringify(body),
    accessToken,
  });
}

export function updateAdminRouteCard(accessToken: string, cardId: string, body: UpsertRouteCardInput) {
  return request<AdminRouteCard>(`/admin/route-cards/${cardId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    accessToken,
  });
}

export function deleteAdminRouteCard(accessToken: string, cardId: string) {
  return request(`/admin/route-cards/${cardId}`, { method: 'DELETE', accessToken });
}

/** Pure geometry, no location identity needed — lets the map preview a path
 *  for points that haven't been matched to a saved Location yet (e.g. right
 *  after parsing a pasted route link). */
export interface PreviewStopInput {
  lat: number;
  lng: number;
  isWaypoint?: boolean;
}

/** Previews the Google Directions road path(s) for a set of stops without
 *  saving — powers the editor's "Preview path" button and alternatives picker. */
export function previewAdminRoutePath(accessToken: string, stops: PreviewStopInput[]) {
  return request<{ options: RoutePathOption[] }>('/admin/routes/preview-path', {
    method: 'POST',
    body: JSON.stringify({ stops }),
    accessToken,
  });
}

/** A point parsed out of a pasted Google Maps directions link. */
export interface RouteLinkPoint {
  lat: number;
  lng: number;
  /** Resolved place name/address — null when the link segment was already a raw coordinate. */
  label: string | null;
}

/** Parses a pasted Google Maps directions link (a route planned in Google
 *  Maps — origin, waypoints, destination) into an ordered list of points. */
export function resolveAdminRouteLink(accessToken: string, url: string) {
  return request<RouteLinkPoint[]>('/admin/routes/resolve-route-link', {
    method: 'POST',
    body: JSON.stringify({ url }),
    accessToken,
  });
}

export interface RouteTripCandidate {
  trip_id: string;
  depart_at: string;
  status: string;
  bus_reg_no: string;
  operator_name: string;
  gps_points: number;
  distance_m: number;
}

/** Trips run on this route with a recorded GPS trace — pick one to use its
 *  real driven path instead of a Directions guess (optional). */
export function listCandidateTripsForPath(accessToken: string, routeId: string) {
  return request<RouteTripCandidate[]>(`/admin/routes/${routeId}/candidate-trips`, { accessToken });
}

/** Optional: previews the route's path from a real trip's recorded GPS trace,
 *  snapped to roads — "record once, snap to roads", without saving. */
export function previewPathFromTrip(accessToken: string, routeId: string, tripId: string) {
  return request<{ coordinates: [number, number][] }>(`/admin/routes/${routeId}/path-from-trip`, {
    method: 'POST',
    body: JSON.stringify({ tripId }),
    accessToken,
  });
}

/** Parses a pasted Google Maps link (long-form or maps.app.goo.gl short link) into coordinates. */
export function resolveMapsLink(accessToken: string, url: string) {
  return request<{ lat: number; lng: number }>('/admin/locations/resolve-maps-link', {
    method: 'POST',
    body: JSON.stringify({ url }),
    accessToken,
  });
}

// ── Timetable — every scheduled trip across every operator ─────────────────

export interface AdminTrip {
  id: string;
  depart_at: string;
  arrive_est: string | null;
  base_fare: number;
  status: string;
  cancellation_requested_at: string | null;
  cancellation_reason: string | null;
  route: { id: string; name: string } | null;
  bus: {
    reg_no: string;
    bus_type: { name: string; class: string; seat_count: number } | null;
    operator: { id: string; name: string } | null;
  } | null;
}

export function listAdminTrips(accessToken: string, upcomingOnly = false) {
  const qs = upcomingOnly ? '?upcomingOnly=true' : '';
  return request<AdminTrip[]>(`/admin/trips${qs}`, { accessToken });
}

export interface AdminCancellationRequest {
  id: string;
  depart_at: string;
  cancellation_requested_at: string;
  cancellation_reason: string | null;
  route: { id: string; name: string } | null;
  bus: { reg_no: string; operator: { id: string; name: string } | null } | null;
}

export function listCancellationRequests(accessToken: string) {
  return request<AdminCancellationRequest[]>('/admin/trips/cancellation-requests', { accessToken });
}

// ── Payouts (admin) ─────────────────────────────────────────────────────────

export interface AdminPayoutRow {
  id: string; // trip id
  depart_at: string;
  status: string;
  route: { id: string; name: string } | null;
  bus: {
    reg_no: string;
    bus_type: { name: string; class: string } | null;
    operator: { id: string; name: string; commission_pct: number } | null;
  } | null;
  seats_sold: number;
  booking_count: number;
  gross: number;
  commission_pct: number;
  commission_amount: number;
  net_amount: number;
  payout_status: 'paid' | 'pending';
  paid_at: string | null;
  reference: string | null;
  settleable: boolean;
  /** Cash walk-up revenue — collected directly by the operator, never paid out by BusConnect. */
  walkup_gross: number;
  walkup_seats: number;
  walkup_count: number;
}

export interface AdminPayoutDetail {
  id: string;
  depart_at: string;
  status: string;
  base_fare: number;
  route: { id: string; name: string } | null;
  bus: {
    reg_no: string;
    bus_type: { name: string; class: string; seat_count: number } | null;
    operator: {
      id: string;
      name: string;
      commission_pct: number;
      payout_account: OperatorPayoutAccount | null;
    } | null;
  } | null;
  bookings: { id: string; seats: string[]; amount: number; status: string; created_at: string; walkup_name: string | null }[];
  seats_sold: number;
  gross: number;
  commission_pct: number;
  commission_amount: number;
  net_amount: number;
  walkup_gross: number;
  walkup_seats: number;
  walkup_count: number;
  payout: {
    reference: string | null;
    paid_at: string;
    gross_amount: number;
    commission_amount: number;
    net_amount: number;
  } | null;
  settleable: boolean;
}

export function listAdminPayouts(accessToken: string) {
  return request<AdminPayoutRow[]>('/admin/payouts', { accessToken });
}

export function getAdminPayout(accessToken: string, tripId: string) {
  return request<AdminPayoutDetail>(`/admin/payouts/${tripId}`, { accessToken });
}

export function settlePayout(
  accessToken: string,
  tripId: string,
  body: { slipPath: string; reference?: string },
) {
  return request(`/admin/payouts/${tripId}`, {
    method: 'POST',
    body: JSON.stringify(body),
    accessToken,
  });
}

export function reopenPayout(accessToken: string, tripId: string) {
  return request(`/admin/payouts/${tripId}`, { method: 'DELETE', accessToken });
}

/** Permanently erase a fully paid-out trip (admin cleanup) — blocked unless already settled. */
export function deleteSettledTrip(accessToken: string, tripId: string) {
  return request(`/admin/trips/${tripId}`, { method: 'DELETE', accessToken });
}

export function getAdminPayoutSlipUrl(accessToken: string, tripId: string) {
  return request<{ url: string }>(`/admin/payouts/${tripId}/slip-url`, { accessToken });
}

// ── Revenue (operator) ──────────────────────────────────────────────────────

export interface OperatorRevenueRow {
  trip_id: string;
  depart_at: string;
  status: string;
  route: { id: string; name: string } | null;
  bus: { reg_no: string; bus_type: { name: string; class: string } | null } | null;
  seats_sold: number;
  gross: number;
  commission_pct: number;
  commission_amount: number;
  net_amount: number;
  payout_status: 'paid' | 'pending';
  paid_at: string | null;
  reference: string | null;
  has_slip: boolean;
  walkup_gross: number;
  walkup_seats: number;
}

export interface OperatorRevenue {
  rows: OperatorRevenueRow[];
  totals: { grossEarned: number; netEarned: number; paidOut: number; pending: number; walkupEarned: number };
}

export function getOperatorRevenue(accessToken: string) {
  return request<OperatorRevenue>('/operator/revenue', { accessToken });
}

export function getOperatorPayoutSlipUrl(accessToken: string, tripId: string) {
  return request<{ url: string }>(`/operator/revenue/${tripId}/slip-url`, { accessToken });
}

/** Dismisses a Paid Out row from the operator's own Revenue page — display
 *  only; the payout/trip records are untouched and admin's view is unaffected. */
export function hideOperatorRevenueRow(accessToken: string, tripId: string) {
  return request<{ ok: true }>(`/operator/revenue/${tripId}/hide`, {
    method: 'POST',
    accessToken,
  });
}
