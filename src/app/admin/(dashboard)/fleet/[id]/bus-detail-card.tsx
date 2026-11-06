"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bus as BusIcon, ChevronDown, Loader2, Pencil, Save, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadBusImage } from "@/lib/storage";
import { updateAdminBus, ApiError, type AdminBusDetail, type AdminBusType } from "@/lib/api";
import { ImageSlot } from "@/components/image-slot";
import { AmenitiesPicker } from "@/components/amenities-picker";
import { StatusActions } from "../status-actions";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  pending: "Pending approval",
  rejected: "Rejected",
};

interface ImageSlotState {
  file: File | null;
  preview: string | null;
}

function initSlot(url: string | null): ImageSlotState {
  return { file: null, preview: url };
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="break-words text-right font-medium">{value || "—"}</dd>
    </div>
  );
}

export function BusDetailCard({ bus, busTypes }: { bus: AdminBusDetail; busTypes: AdminBusType[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  const [regNo, setRegNo] = useState(bus.reg_no);
  const [busTypeId, setBusTypeId] = useState(bus.bus_type_id);
  const [amenities, setAmenities] = useState<Set<string>>(new Set(bus.amenities));
  const [notes, setNotes] = useState(bus.notes ?? "");

  const [front, setFront] = useState<ImageSlotState>(initSlot(bus.front_image_url));
  const [side1, setSide1] = useState<ImageSlotState>(initSlot(bus.side_image_urls?.[0] ?? null));
  const [side2, setSide2] = useState<ImageSlotState>(initSlot(bus.side_image_urls?.[1] ?? null));
  const [interior, setInterior] = useState<ImageSlotState>(initSlot(bus.interior_image_url));
  const [seatLayoutImg, setSeatLayoutImg] = useState<ImageSlotState>(initSlot(bus.seat_layout_image_url));

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEditing() {
    setRegNo(bus.reg_no);
    setBusTypeId(bus.bus_type_id);
    setAmenities(new Set(bus.amenities));
    setNotes(bus.notes ?? "");
    setFront(initSlot(bus.front_image_url));
    setSide1(initSlot(bus.side_image_urls?.[0] ?? null));
    setSide2(initSlot(bus.side_image_urls?.[1] ?? null));
    setInterior(initSlot(bus.interior_image_url));
    setSeatLayoutImg(initSlot(bus.seat_layout_image_url));
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setError(null);
  }

  function pick(
    setSlot: React.Dispatch<React.SetStateAction<ImageSlotState>>,
    originalUrl: string | null,
  ) {
    return (file: File | null) => {
      setSlot({ file, preview: file ? URL.createObjectURL(file) : originalUrl });
    };
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (regNo.trim().length < 2) {
      setError("Enter a valid registration number.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push(`/login?next=/admin/fleet/${bus.id}`);
        return;
      }

      const frontImageUrl = front.file ? await uploadBusImage(session.user.id, front.file, "front", bus.id) : undefined;
      const side1Url = side1.file ? await uploadBusImage(session.user.id, side1.file, "side-1", bus.id) : undefined;
      const side2Url = side2.file ? await uploadBusImage(session.user.id, side2.file, "side-2", bus.id) : undefined;
      const interiorImageUrl = interior.file
        ? await uploadBusImage(session.user.id, interior.file, "interior", bus.id)
        : undefined;
      const seatLayoutImageUrl = seatLayoutImg.file
        ? await uploadBusImage(session.user.id, seatLayoutImg.file, "seat-layout", bus.id)
        : undefined;

      const existingSides = bus.side_image_urls ?? [null, null];
      const nextSides = [side1Url ?? existingSides[0], side2Url ?? existingSides[1]].filter(
        (u): u is string => !!u,
      );

      await updateAdminBus(session.access_token, bus.id, {
        regNo: regNo.trim(),
        busTypeId,
        amenities: [...amenities],
        notes: notes || undefined,
        frontImageUrl,
        sideImageUrls: nextSides.length > 0 ? nextSides : undefined,
        interiorImageUrl,
        seatLayoutImageUrl,
      });

      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save changes. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <form onSubmit={save} className="flex flex-col gap-6">
        <section className="card-lg p-6">
          <p className="ui text-xs font-semibold uppercase tracking-wide text-muted-foreground">Editing bus</p>
          <h2 className="ui mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Basic information
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="ui flex flex-col gap-1.5 text-sm font-medium text-foreground">
              Vehicle registration number
              <input
                value={regNo}
                onChange={(e) => setRegNo(e.target.value)}
                required
                minLength={2}
                className="field text-sm"
              />
            </label>
            <label className="ui flex flex-col gap-1.5 text-sm font-medium text-foreground">
              Bus type
              <div className="relative">
                <select
                  value={busTypeId}
                  onChange={(e) => setBusTypeId(e.target.value)}
                  className="field appearance-none pr-9 text-sm"
                >
                  {busTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.class.replace("_", " ")}, {t.seat_count} seats)
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
              </div>
            </label>
          </div>
          <p className="ui mt-3 text-xs text-muted-foreground">
            Operator: <span className="font-medium text-foreground">{bus.operator?.name ?? "—"}</span>
          </p>
        </section>

        <section className="card-lg p-6">
          <h2 className="ui text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Bus features / amenities
          </h2>
          <div className="mt-4">
            <AmenitiesPicker selected={amenities} onChange={setAmenities} />
          </div>
        </section>

        <section className="card-lg p-6">
          <h2 className="ui text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Bus images
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ImageSlot label="Front view" preview={front.preview} onChange={pick(setFront, bus.front_image_url)} />
            <ImageSlot
              label="Interior"
              preview={interior.preview}
              onChange={pick(setInterior, bus.interior_image_url)}
            />
            <ImageSlot
              label="Side view (1 of 2)"
              preview={side1.preview}
              onChange={pick(setSide1, bus.side_image_urls?.[0] ?? null)}
            />
            <ImageSlot
              label="Side view (2 of 2)"
              preview={side2.preview}
              onChange={pick(setSide2, bus.side_image_urls?.[1] ?? null)}
            />
            <ImageSlot
              label="Seat layout image"
              preview={seatLayoutImg.preview}
              onChange={pick(setSeatLayoutImg, bus.seat_layout_image_url)}
            />
          </div>
        </section>

        <section className="card-lg p-6">
          <h2 className="ui text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Notes
          </h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything else worth noting about this bus (optional)"
            rows={3}
            className="field mt-3 resize-none text-sm"
          />
        </section>

        {error && <p className="ui text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex items-center gap-2">
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={busy}
            className="ui inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
          >
            <X size={16} /> Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="card-lg p-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          {bus.front_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bus.front_image_url}
              alt={`${bus.reg_no} photo`}
              className="h-18 w-24 shrink-0 rounded-xl border border-border object-cover"
            />
          ) : (
            <div className="flex h-18 w-24 shrink-0 items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground">
              <BusIcon size={22} />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-heading truncate text-xl font-bold tracking-tight">{bus.reg_no}</h1>
            <span className={`ui mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[bus.status]}`}>
              {STATUS_LABEL[bus.status] ?? bus.status}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <StatusActions busId={bus.id} status={bus.status} />
          <button
            type="button"
            onClick={startEditing}
            className="ui inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <Pencil size={13} /> Edit details
          </button>
        </div>
      </div>

      <dl className="mt-5 divide-y divide-border border-t border-border">
        <Row label="Operator" value={bus.operator?.name} />
        <Row
          label="Bus type"
          value={
            <span className="capitalize">
              {bus.bus_type?.name ?? "—"} ({bus.bus_type?.class.replace("_", " ") ?? "—"})
            </span>
          }
        />
        <Row label="Seat capacity" value={`${bus.bus_type?.seat_count ?? "—"} seats · ${bus.seat_layout_style ?? "—"} layout`} />
        <Row label="Amenities" value={bus.amenities.length > 0 ? bus.amenities.join(", ") : "None listed"} />
        {bus.notes && <Row label="Notes" value={bus.notes} />}
      </dl>
    </div>
  );
}
