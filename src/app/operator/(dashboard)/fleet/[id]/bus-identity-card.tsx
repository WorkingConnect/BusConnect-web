"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bus as BusIcon, ChevronDown, Loader2, Pencil, Save, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadBusImage } from "@/lib/storage";
import { updateBus, ApiError, type OperatorBusDetail } from "@/lib/api";
import { BUS_CLASSES } from "@/lib/bus-constants";
import { ImageSlot } from "@/components/image-slot";
import { AmenitiesPicker } from "@/components/amenities-picker";

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

export function BusIdentityCard({ bus }: { bus: OperatorBusDetail }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  const [regNo, setRegNo] = useState(bus.reg_no);
  const [busClass, setBusClass] = useState<(typeof BUS_CLASSES)[number]["value"]>(
    (bus.bus_type?.class as (typeof BUS_CLASSES)[number]["value"]) ?? "normal",
  );
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
    setBusClass((bus.bus_type?.class as (typeof BUS_CLASSES)[number]["value"]) ?? "normal");
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
        router.push(`/login?next=/operator/fleet/${bus.id}`);
        return;
      }

      const frontImageUrl = front.file ? await uploadBusImage(session.user.id, front.file, "front") : undefined;
      const side1Url = side1.file ? await uploadBusImage(session.user.id, side1.file, "side-1") : undefined;
      const side2Url = side2.file ? await uploadBusImage(session.user.id, side2.file, "side-2") : undefined;
      const interiorImageUrl = interior.file
        ? await uploadBusImage(session.user.id, interior.file, "interior")
        : undefined;
      const seatLayoutImageUrl = seatLayoutImg.file
        ? await uploadBusImage(session.user.id, seatLayoutImg.file, "seat-layout")
        : undefined;

      const existingSides = bus.side_image_urls ?? [null, null];
      const nextSides = [side1Url ?? existingSides[0], side2Url ?? existingSides[1]].filter(
        (u): u is string => !!u,
      );

      await updateBus(session.access_token, bus.id, {
        regNo: regNo.trim(),
        busClass,
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
          <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
            Basic information
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
              Vehicle registration number
              <input
                value={regNo}
                onChange={(e) => setRegNo(e.target.value)}
                required
                minLength={2}
                className="field text-sm"
              />
            </label>
            <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
              Bus type
              <div className="relative">
                <select
                  value={busClass}
                  onChange={(e) => setBusClass(e.target.value as typeof busClass)}
                  className="field appearance-none pr-9 text-sm"
                >
                  {BUS_CLASSES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500"
                />
              </div>
            </label>
          </div>
          <p className="ui mt-3 text-xs text-slate-500 dark:text-zinc-500">
            Seat capacity and layout can&apos;t be changed here — they&apos;re fixed once trips are running on
            this bus. Contact BusConnect support if that needs to change.
          </p>
        </section>

        <section className="card-lg p-6">
          <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
            Bus features / amenities
          </h2>
          <div className="mt-4">
            <AmenitiesPicker selected={amenities} onChange={setAmenities} />
          </div>
        </section>

        <section className="card-lg p-6">
          <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
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
          <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
            Notes
          </h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything else BusConnect should know about this bus (optional)"
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
            className="ui inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <X size={16} /> Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="card-lg p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {bus.front_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bus.front_image_url}
              alt={`${bus.reg_no} photo`}
              className="h-16 w-20 shrink-0 rounded-xl border border-slate-200 object-cover dark:border-zinc-800"
            />
          ) : (
            <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-400 dark:border-zinc-700 dark:text-zinc-600">
              <BusIcon size={20} />
            </div>
          )}
          <div>
            <h1 className="font-heading text-xl font-bold tracking-tight">{bus.reg_no}</h1>
            <span className={`ui mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[bus.status]}`}>
              {STATUS_LABEL[bus.status] ?? bus.status}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={startEditing}
          className="ui inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <Pencil size={13} /> Edit details
        </button>
      </div>

      <dl className="ui mt-6 grid grid-cols-1 gap-5 border-t border-slate-200 pt-6 sm:grid-cols-2 dark:border-zinc-800">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-zinc-500">Bus type</p>
          <p className="mt-0.5 text-sm font-medium capitalize">
            {bus.bus_type?.name ?? "—"} ({bus.bus_type?.class.replace("_", " ") ?? "—"})
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-zinc-500">Seat capacity</p>
          <p className="mt-0.5 text-sm font-medium">
            {bus.bus_type?.seat_count ?? "—"} seats · {bus.seat_layout_style ?? "—"} layout
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-zinc-500">Registered on</p>
          <p className="mt-0.5 text-sm font-medium">
            {new Date(bus.created_at).toLocaleDateString("en-LK", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-zinc-500">Amenities</p>
          <p className="mt-0.5 text-sm font-medium">
            {bus.amenities.length > 0 ? bus.amenities.join(", ") : "None listed"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-zinc-500">Crew</p>
          <p className="mt-0.5 text-sm font-medium">
            {bus.crew.driver || bus.crew.conductor
              ? [
                  bus.crew.driver && `Driver: ${bus.crew.driver.name}`,
                  bus.crew.conductor && `Conductor: ${bus.crew.conductor.name}`,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "No pilot assigned"}
          </p>
        </div>
        {bus.notes && (
          <div className="sm:col-span-2">
            <p className="text-xs font-medium text-slate-500 dark:text-zinc-500">Notes</p>
            <p className="mt-0.5 text-sm font-medium">{bus.notes}</p>
          </div>
        )}
      </dl>
    </div>
  );
}
