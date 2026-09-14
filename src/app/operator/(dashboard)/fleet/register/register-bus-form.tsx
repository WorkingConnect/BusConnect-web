"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadBusImage } from "@/lib/storage";
import { registerBus, ApiError } from "@/lib/api";
import { BUS_CLASSES, SEAT_LAYOUTS } from "@/lib/bus-constants";
import { ImageSlot } from "@/components/image-slot";
import { AmenitiesPicker } from "@/components/amenities-picker";

export function RegisterBusForm() {
  const router = useRouter();

  const [regNo, setRegNo] = useState("");
  const [busClass, setBusClass] = useState<(typeof BUS_CLASSES)[number]["value"]>("normal");
  const [totalSeats, setTotalSeats] = useState("45");
  const [seatLayoutStyle, setSeatLayoutStyle] = useState<(typeof SEAT_LAYOUTS)[number]["value"]>("2x2");

  const [amenities, setAmenities] = useState<Set<string>>(new Set());

  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [sideImage1, setSideImage1] = useState<File | null>(null);
  const [sidePreview1, setSidePreview1] = useState<string | null>(null);
  const [sideImage2, setSideImage2] = useState<File | null>(null);
  const [sidePreview2, setSidePreview2] = useState<string | null>(null);
  const [interiorImage, setInteriorImage] = useState<File | null>(null);
  const [interiorPreview, setInteriorPreview] = useState<string | null>(null);
  const [seatLayoutImage, setSeatLayoutImage] = useState<File | null>(null);
  const [seatLayoutPreview, setSeatLayoutPreview] = useState<string | null>(null);

  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function pick(setFile: (f: File | null) => void, setPreview: (p: string | null) => void) {
    return (file: File | null) => {
      setFile(file);
      setPreview(file ? URL.createObjectURL(file) : null);
    };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const seats = Number(totalSeats);
    if (!Number.isInteger(seats) || seats < 1) {
      setError("Enter a valid total seat capacity.");
      return;
    }

    if (!frontImage && !sideImage1 && !sideImage2 && !interiorImage && !seatLayoutImage) {
      setError("Please upload at least one photo of the bus.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login?next=/operator/fleet/register");
        return;
      }

      setStatus("Uploading photos…");
      const frontImageUrl = frontImage
        ? await uploadBusImage(session.user.id, frontImage, "front")
        : undefined;
      const side1Url = sideImage1 ? await uploadBusImage(session.user.id, sideImage1, "side-1") : undefined;
      const side2Url = sideImage2 ? await uploadBusImage(session.user.id, sideImage2, "side-2") : undefined;
      const interiorImageUrl = interiorImage
        ? await uploadBusImage(session.user.id, interiorImage, "interior")
        : undefined;
      const seatLayoutImageUrl = seatLayoutImage
        ? await uploadBusImage(session.user.id, seatLayoutImage, "seat-layout")
        : undefined;
      const sideImageUrls = [side1Url, side2Url].filter((u): u is string => !!u);

      setStatus("Submitting registration…");
      await registerBus(session.access_token, {
        regNo,
        busClass,
        totalSeats: seats,
        seatLayoutStyle,
        seatNumbering: "auto",
        amenities: [...amenities],
        frontImageUrl,
        sideImageUrls: sideImageUrls.length > 0 ? sideImageUrls : undefined,
        interiorImageUrl,
        seatLayoutImageUrl,
        notes: notes || undefined,
      });

      router.push("/operator/fleet");
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not submit the registration. Try again.");
      setBusy(false);
      setStatus(null);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-8">
      {/* ── 1. Basic information ─────────────────────────────────────────── */}
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
              placeholder="e.g. NC-1234"
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
      </section>

      {/* ── 2. Seating information ───────────────────────────────────────── */}
      <section className="card-lg p-6">
        <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
          Seating information
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
            Total seat capacity
            <input
              value={totalSeats}
              onChange={(e) => setTotalSeats(e.target.value)}
              type="number"
              min={1}
              required
              className="field text-sm"
            />
          </label>
          <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
            Seat layout
            <div className="relative">
              <select
                value={seatLayoutStyle}
                onChange={(e) => setSeatLayoutStyle(e.target.value as typeof seatLayoutStyle)}
                className="field appearance-none pr-9 text-sm"
              >
                {SEAT_LAYOUTS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
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
      </section>

      {/* ── 3. Amenities ──────────────────────────────────────────────────── */}
      <section className="card-lg p-6">
        <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
          Bus features / amenities
        </h2>
        <div className="mt-4">
          <AmenitiesPicker selected={amenities} onChange={setAmenities} />
        </div>
      </section>

      {/* ── 4. Bus images ─────────────────────────────────────────────────── */}
      <section className="card-lg p-6">
        <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
          Bus images
        </h2>
        <p className="ui mt-1 text-xs text-slate-500 dark:text-zinc-500">
          All optional individually. At least one photo is required.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ImageSlot
            label="Front view"
            preview={frontPreview}
            onChange={pick(setFrontImage, setFrontPreview)}
          />
          <ImageSlot
            label="Interior"
            preview={interiorPreview}
            onChange={pick(setInteriorImage, setInteriorPreview)}
          />
          <ImageSlot
            label="Side view (1 of 2)"
            preview={sidePreview1}
            onChange={pick(setSideImage1, setSidePreview1)}
          />
          <ImageSlot
            label="Side view (2 of 2)"
            preview={sidePreview2}
            onChange={pick(setSideImage2, setSidePreview2)}
          />
          <ImageSlot
            label="Seat layout image"
            preview={seatLayoutPreview}
            onChange={pick(setSeatLayoutImage, setSeatLayoutPreview)}
          />
        </div>
      </section>

      {/* ── 5. Notes ──────────────────────────────────────────────────────── */}
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

      {error && (
        <p className="ui text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <button type="submit" disabled={busy} className="btn-primary self-start">
        {busy ? status ?? "Submitting…" : "Submit for approval"}
      </button>
    </form>
  );
}
