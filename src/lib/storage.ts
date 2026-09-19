import { createClient } from '@/lib/supabase/client';

/**
 * Uploads go browser -> Supabase Storage directly (not through BusConnect-api)
 * relying on Storage RLS to enforce "you can only write into your own
 * folder" (see BusConnect-api/supabase/migrations/0015_*.sql). The path
 * prefix (`${userId}/...`) is what the RLS policy checks.
 *
 * Paths for single-image entities (logo, avatar, id document, pilot photo,
 * route/offer/bus photos) are stable rather than timestamped, so a re-upload
 * overwrites the previous object in place instead of leaving it behind —
 * Supabase Storage never garbage-collects on its own, and re-uploads (someone
 * changing their photo) happen far more often than deletes. Public-URL
 * callers get a `?v=` cache-buster appended so browsers/CDNs don't keep
 * serving the pre-overwrite bytes under the now-unchanged URL.
 */

function withCacheBuster(url: string): string {
  return `${url}?v=${Date.now()}`;
}

export async function uploadOperatorLogo(userId: string, file: File): Promise<string> {
  const supabase = createClient();
  const path = `${userId}/logo`;
  const { error } = await supabase.storage
    .from('operator-logos')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return withCacheBuster(supabase.storage.from('operator-logos').getPublicUrl(path).data.publicUrl);
}

/** Private bucket — returns a storage PATH (not a public URL); viewed later via a signed URL. */
export async function uploadOperatorIdDocument(userId: string, file: File): Promise<string> {
  const supabase = createClient();
  const path = `${userId}/id-document`;
  const { error } = await supabase.storage
    .from('operator-documents')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return path;
}

/**
 * Public bucket — bus registration photos (front/side/interior/seat-layout).
 * `busId` is only known once the bus exists, so registration (no id yet)
 * still gets a one-off path; every later edit passes it so a re-upload
 * overwrites that bus's own slot instead of piling up a new object each time.
 */
export async function uploadBusImage(
  userId: string,
  file: File,
  kind: string,
  busId?: string,
): Promise<string> {
  const supabase = createClient();
  const path = busId
    ? `${userId}/bus/${busId}/${kind}`
    : `${userId}/${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const { error } = await supabase.storage
    .from('bus-images')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return withCacheBuster(supabase.storage.from('bus-images').getPublicUrl(path).data.publicUrl);
}

/**
 * Private bucket — pilot profile photo; returns a storage PATH, viewed later
 * via a signed URL. `pilotId` is unknown at registration (no id yet); pass
 * it on later edits so a re-upload overwrites in place.
 */
export async function uploadPilotPhoto(userId: string, file: File, pilotId?: string): Promise<string> {
  const supabase = createClient();
  const path = pilotId ? `${userId}/pilot/${pilotId}/photo` : `${userId}/photo-${Date.now()}`;
  const { error } = await supabase.storage
    .from('pilot-photos')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return path;
}

/**
 * Private bucket — payout transfer slip (admin uploads; Storage RLS restricts
 * writes to admins). Keyed by trip so each trip's slip is easy to find.
 * Returns a storage PATH; viewed later via a signed URL from BusConnect-api.
 * Deliberately left timestamped, unlike the helpers above — a payout can be
 * reopened and re-slipped (admin.service.ts reopenPayout()), and each slip
 * is a financial record worth keeping distinct rather than overwritten.
 */
export async function uploadPayoutSlip(tripId: string, file: File): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${tripId}/slip-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('payout-slips')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return path;
}

/** Public bucket — a passenger's own profile photo. */
export async function uploadPassengerPhoto(userId: string, file: File): Promise<string> {
  const supabase = createClient();
  const path = `${userId}/avatar`;
  const { error } = await supabase.storage
    .from('passenger-photos')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return withCacheBuster(supabase.storage.from('passenger-photos').getPublicUrl(path).data.publicUrl);
}

/**
 * Public bucket — admin-uploaded route photo, shown on passenger-facing
 * route cards. `routeCardId` is unknown until the route card exists — same
 * create-vs-edit split as uploadBusImage.
 */
export async function uploadRouteImage(userId: string, file: File, routeCardId?: string): Promise<string> {
  const supabase = createClient();
  const path = routeCardId
    ? `${userId}/route/${routeCardId}`
    : `${userId}/route-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const { error } = await supabase.storage
    .from('route-images')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return withCacheBuster(supabase.storage.from('route-images').getPublicUrl(path).data.publicUrl);
}

/**
 * Public bucket, folder-per-uploader (see 0088_bus_hire_listings.sql) — the
 * uploader's own uid, not the listing's poster, so this works whether a
 * passenger or an admin (editing the listing) is the one uploading. Unlike
 * every other helper here, each photo is one of several in a listing's
 * gallery rather than a single slot being replaced, so it deliberately keeps
 * a unique path per upload — removing one from the gallery must go through
 * deleteHireListingPhoto below instead of relying on overwrite.
 */
export async function uploadHireListingPhoto(userId: string, file: File): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
  const { error } = await supabase.storage
    .from('bus-hire-photos')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return supabase.storage.from('bus-hire-photos').getPublicUrl(path).data.publicUrl;
}

/**
 * Removes one hire-listing photo from storage given its public URL (as
 * returned by uploadHireListingPhoto / stored in listing.images) — recovers
 * the object path from the URL itself, since that's all callers have on
 * hand. Best-effort: swallow failures so a storage hiccup never blocks
 * removing the photo from the listing's own `images` array.
 */
export async function deleteHireListingPhoto(url: string): Promise<void> {
  const marker = '/bus-hire-photos/';
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const path = decodeURIComponent(url.slice(idx + marker.length).split('?')[0]);
  const supabase = createClient();
  await supabase.storage.from('bus-hire-photos').remove([path]);
}

/**
 * Public bucket — admin-uploaded offer artwork (e.g. a bank/operator logo),
 * shown on the promo card. `offerId` is unknown until the offer exists —
 * same create-vs-edit split as uploadBusImage.
 */
export async function uploadOfferImage(userId: string, file: File, offerId?: string): Promise<string> {
  const supabase = createClient();
  const path = offerId
    ? `${userId}/offer/${offerId}`
    : `${userId}/offer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const { error } = await supabase.storage
    .from('offer-images')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return withCacheBuster(supabase.storage.from('offer-images').getPublicUrl(path).data.publicUrl);
}
