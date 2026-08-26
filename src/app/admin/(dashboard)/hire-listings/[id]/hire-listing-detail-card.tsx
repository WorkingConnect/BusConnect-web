"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bus as BusIcon,
  ChevronDown,
  Loader2,
  Pencil,
  Save,
  X,
  Check,
  Ban,
  RotateCcw,
  Trash2,
  MapPin,
  ImagePlus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadHireListingPhoto } from "@/lib/storage";
import {
  updateAdminHireListing,
  setAdminHireListingReviewStatus,
  deleteAdminHireListing,
  ApiError,
  type AdminHireListing,
  type AdminHireListingInput,
} from "@/lib/api";
import {
  HIRE_BUS_TYPES,
  HIRE_CONDITIONS,
  HIRE_PRICE_TYPES,
  HIRE_DRIVER_OPTIONS,
  HIRE_FEATURES,
  HIRE_SUITABLE_FOR,
  formatBusType,
  formatCondition,
  formatDriverIncluded,
  formatFeature,
  formatSuitableFor,
  formatPrice,
} from "@/lib/hire-listings";
import { HIRE_PROVINCES, districtsFor } from "../province-districts";

const MAX_PHOTOS = 4;

type BusType = AdminHireListingInput["busType"];
type PriceType = AdminHireListingInput["priceType"];
type Condition = NonNullable<AdminHireListingInput["condition"]>;
type DriverIncluded = NonNullable<AdminHireListingInput["driverIncluded"]>;
type PreferredContact = NonNullable<AdminHireListingInput["preferredContactMethod"]>;

const MODERATION_STYLE: Record<AdminHireListing["moderation_status"], string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

const MODERATION_LABEL: Record<AdminHireListing["moderation_status"], string> = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
};

function ChipMultiSelect({
  options,
  selected,
  onChange,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(v: string) {
    onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]);
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = selected.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            className={`ui rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              active
                ? "border-brand bg-brand-soft text-brand dark:border-blue-400 dark:bg-brand-soft-dark dark:text-blue-300"
                : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
      {children}
    </label>
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field appearance-none pr-9 text-sm"
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500"
      />
    </div>
  );
}

export function HireListingDetailCard({ listing }: { listing: AdminHireListing }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  const [title, setTitle] = useState(listing.title);
  const [description, setDescription] = useState(listing.description ?? "");
  const [busType, setBusType] = useState<BusType>(listing.bus_type as BusType);
  const [condition, setCondition] = useState<Condition | "">((listing.condition as Condition) ?? "");
  const [seatCount, setSeatCount] = useState(String(listing.seat_count));
  const [isAc, setIsAc] = useState(listing.is_ac);
  const [busModel, setBusModel] = useState(listing.bus_model ?? "");
  const [manufacturingYear, setManufacturingYear] = useState(
    listing.manufacturing_year ? String(listing.manufacturing_year) : "",
  );
  const [features, setFeatures] = useState<string[]>(listing.features);
  const [priceAmount, setPriceAmount] = useState(String(listing.price_amount));
  const [priceType, setPriceType] = useState<PriceType>(listing.price_type as PriceType);
  const [minHireDuration, setMinHireDuration] = useState(listing.min_hire_duration ?? "");
  const [area, setArea] = useState(listing.area ?? "");
  const [suitableFor, setSuitableFor] = useState<string[]>(listing.suitable_for);
  const [province, setProvince] = useState(listing.province);
  const [district, setDistrict] = useState(listing.district);
  const [city, setCity] = useState(listing.city);
  const [contactName, setContactName] = useState(listing.contact_name);
  const [contactPhone, setContactPhone] = useState(listing.contact_phone);
  const [contactWhatsapp, setContactWhatsapp] = useState(listing.contact_whatsapp ?? "");
  const [preferredContactMethod, setPreferredContactMethod] = useState<PreferredContact | "">(
    (listing.preferred_contact_method as PreferredContact) ?? "",
  );
  const [driverIncluded, setDriverIncluded] = useState<DriverIncluded | "">(
    (listing.driver_included as DriverIncluded) ?? "",
  );
  const [images, setImages] = useState<string[]>(listing.images);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function startEditing() {
    setTitle(listing.title);
    setDescription(listing.description ?? "");
    setBusType(listing.bus_type as BusType);
    setCondition((listing.condition as Condition) ?? "");
    setSeatCount(String(listing.seat_count));
    setIsAc(listing.is_ac);
    setBusModel(listing.bus_model ?? "");
    setManufacturingYear(listing.manufacturing_year ? String(listing.manufacturing_year) : "");
    setFeatures(listing.features);
    setPriceAmount(String(listing.price_amount));
    setPriceType(listing.price_type as PriceType);
    setMinHireDuration(listing.min_hire_duration ?? "");
    setArea(listing.area ?? "");
    setSuitableFor(listing.suitable_for);
    setProvince(listing.province);
    setDistrict(listing.district);
    setCity(listing.city);
    setContactName(listing.contact_name);
    setContactPhone(listing.contact_phone);
    setContactWhatsapp(listing.contact_whatsapp ?? "");
    setPreferredContactMethod((listing.preferred_contact_method as PreferredContact) ?? "");
    setDriverIncluded((listing.driver_included as DriverIncluded) ?? "");
    setImages(listing.images);
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setError(null);
  }

  function onProvinceChange(next: string) {
    setProvince(next);
    setDistrict(districtsFor(next)[0] ?? "");
  }

  function removeImageAt(i: number) {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function addPhoto(file: File | undefined) {
    if (!file || images.length >= MAX_PHOTOS || uploadingPhoto) return;
    setUploadingPhoto(true);
    setPhotoError(null);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const url = await uploadHireListingPhoto(session.user.id, file);
      setImages((prev) => [...prev, url]);
    } catch {
      setPhotoError("Photo upload failed. Try again.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const titleTrimmed = title.trim();
    if (!titleTrimmed) {
      setError("Title is required.");
      return;
    }
    const seats = Number(seatCount);
    if (!Number.isInteger(seats) || seats < 1) {
      setError("Enter a valid seat count.");
      return;
    }
    const price = Number(priceAmount);
    if (!Number.isFinite(price) || price < 0) {
      setError("Enter a valid price.");
      return;
    }
    if (!contactName.trim() || !contactPhone.trim()) {
      setError("Contact name and phone are required.");
      return;
    }
    if (!province || !district || !city.trim()) {
      setError("Province, district, and city are required.");
      return;
    }
    let year: number | undefined;
    if (manufacturingYear.trim()) {
      year = Number(manufacturingYear);
      if (!Number.isInteger(year) || year < 1900) {
        setError("Enter a valid manufacturing year.");
        return;
      }
    }

    const input: AdminHireListingInput = {
      title: titleTrimmed,
      description: description.trim() || undefined,
      busType,
      condition: condition || undefined,
      seatCount: seats,
      isAc,
      busModel: busModel.trim() || undefined,
      manufacturingYear: year,
      features,
      priceAmount: price,
      priceType,
      minHireDuration: minHireDuration.trim() || undefined,
      area: area.trim() || undefined,
      suitableFor,
      province,
      district,
      city: city.trim(),
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim(),
      contactWhatsapp: contactWhatsapp.trim() || undefined,
      preferredContactMethod: preferredContactMethod || undefined,
      driverIncluded: driverIncluded || undefined,
      images: images.map((i) => i.trim()).filter(Boolean),
    };

    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push(`/login?next=/admin/hire-listings/${listing.id}`);
        return;
      }
      await updateAdminHireListing(session.access_token, listing.id, input);
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save changes. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function setReviewStatus(next: "approved" | "rejected" | "pending") {
    setActionError(null);
    setActionBusy(next);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      await setAdminHireListingReviewStatus(session.access_token, listing.id, next);
      router.refresh();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "Could not update review status.");
    } finally {
      setActionBusy(null);
    }
  }

  async function del() {
    setActionError(null);
    setActionBusy("delete");
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      await deleteAdminHireListing(session.access_token, listing.id);
      router.push("/admin/hire-listings");
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "Could not delete this listing.");
      setActionBusy(null);
    }
  }

  if (editing) {
    return (
      <form onSubmit={save} className="flex flex-col gap-6">
        <section className="card-lg p-6">
          <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
            Basic Details
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldLabel>
              Title
              <input value={title} onChange={(e) => setTitle(e.target.value)} required className="field text-sm" />
            </FieldLabel>
            <FieldLabel>
              Bus type
              <Select value={busType} onChange={(v) => setBusType(v as BusType)}>
                {HIRE_BUS_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </FieldLabel>
            <FieldLabel>
              Condition
              <Select value={condition} onChange={(v) => setCondition(v as Condition | "")}>
                <option value="">Not specified</option>
                {HIRE_CONDITIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </FieldLabel>
            <FieldLabel>
              Seat count
              <input
                value={seatCount}
                onChange={(e) => setSeatCount(e.target.value)}
                type="number"
                min={1}
                required
                className="field text-sm"
              />
            </FieldLabel>
            <FieldLabel>
              A/C
              <div className="inline-flex w-fit overflow-hidden rounded-lg border border-slate-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAc(true)}
                  className={`px-3.5 py-2 text-sm font-medium transition-colors ${
                    isAc ? "bg-brand text-brand-fg" : "bg-transparent text-slate-600 dark:text-zinc-400"
                  }`}
                >
                  A/C
                </button>
                <button
                  type="button"
                  onClick={() => setIsAc(false)}
                  className={`px-3.5 py-2 text-sm font-medium transition-colors ${
                    !isAc ? "bg-brand text-brand-fg" : "bg-transparent text-slate-600 dark:text-zinc-400"
                  }`}
                >
                  Non-A/C
                </button>
              </div>
            </FieldLabel>
            <FieldLabel>
              Bus model
              <input value={busModel} onChange={(e) => setBusModel(e.target.value)} className="field text-sm" />
            </FieldLabel>
            <FieldLabel>
              Manufacturing year
              <input
                value={manufacturingYear}
                onChange={(e) => setManufacturingYear(e.target.value)}
                type="number"
                className="field text-sm"
              />
            </FieldLabel>
          </div>
        </section>

        <section className="card-lg p-6">
          <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
            Features & Facilities
          </h2>
          <div className="mt-4">
            <ChipMultiSelect options={HIRE_FEATURES} selected={features} onChange={setFeatures} />
          </div>
        </section>

        <section className="card-lg p-6">
          <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
            Hire Details
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldLabel>
              Price amount (LKR)
              <input
                value={priceAmount}
                onChange={(e) => setPriceAmount(e.target.value)}
                type="number"
                min={0}
                required
                className="field text-sm"
              />
            </FieldLabel>
            <FieldLabel>
              Price type
              <Select value={priceType} onChange={(v) => setPriceType(v as PriceType)}>
                {HIRE_PRICE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </FieldLabel>
            <FieldLabel>
              Minimum hire duration
              <input
                value={minHireDuration}
                onChange={(e) => setMinHireDuration(e.target.value)}
                placeholder="e.g. 1 day"
                className="field text-sm"
              />
            </FieldLabel>
            <FieldLabel>
              Service area
              <input value={area} onChange={(e) => setArea(e.target.value)} className="field text-sm" />
            </FieldLabel>
            <FieldLabel>
              Driver
              <Select value={driverIncluded} onChange={(v) => setDriverIncluded(v as DriverIncluded | "")}>
                <option value="">Not specified</option>
                {HIRE_DRIVER_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </Select>
            </FieldLabel>
          </div>
        </section>

        <section className="card-lg p-6">
          <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
            Description & Suitable For
          </h2>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Listing description (optional)"
            className="field mt-3 resize-none text-sm"
          />
          <div className="mt-4">
            <ChipMultiSelect options={HIRE_SUITABLE_FOR} selected={suitableFor} onChange={setSuitableFor} />
          </div>
        </section>

        <section className="card-lg p-6">
          <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
            Location
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldLabel>
              Province
              <Select value={province} onChange={onProvinceChange}>
                {HIRE_PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </FieldLabel>
            <FieldLabel>
              District
              <Select value={district} onChange={setDistrict}>
                {districtsFor(province).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </FieldLabel>
            <FieldLabel>
              City
              <input value={city} onChange={(e) => setCity(e.target.value)} required className="field text-sm" />
            </FieldLabel>
          </div>
        </section>

        <section className="card-lg p-6">
          <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
            Contact Details
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldLabel>
              Contact name
              <input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                required
                className="field text-sm"
              />
            </FieldLabel>
            <FieldLabel>
              Contact phone
              <input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                required
                className="field text-sm"
              />
            </FieldLabel>
            <FieldLabel>
              WhatsApp number
              <input
                value={contactWhatsapp}
                onChange={(e) => setContactWhatsapp(e.target.value)}
                className="field text-sm"
              />
            </FieldLabel>
            <FieldLabel>
              Preferred contact method
              <Select
                value={preferredContactMethod}
                onChange={(v) => setPreferredContactMethod(v as PreferredContact | "")}
              >
                <option value="">Not specified</option>
                <option value="call">Call</option>
                <option value="whatsapp">WhatsApp</option>
              </Select>
            </FieldLabel>
          </div>
        </section>

        <section className="card-lg p-6">
          <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
            Photos
          </h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {images.map((url, i) => (
              <div key={url} className="relative h-20 w-20 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Listing photo ${i + 1}`}
                  className="h-20 w-20 rounded-lg border border-slate-200 object-cover dark:border-zinc-800"
                />
                <button
                  type="button"
                  onClick={() => removeImageAt(i)}
                  aria-label="Remove image"
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm transition-colors hover:bg-slate-700 dark:bg-zinc-700 dark:hover:bg-zinc-600"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
            {images.length < MAX_PHOTOS && (
              <label className="ui flex h-20 w-20 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 text-slate-400 transition-colors hover:border-brand hover:text-brand dark:border-zinc-700 dark:text-zinc-600">
                {uploadingPhoto ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <ImagePlus size={18} />
                    <span className="text-[11px] font-medium">Add photo</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingPhoto}
                  onChange={(e) => {
                    void addPhoto(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                  className="sr-only"
                />
              </label>
            )}
          </div>
          {photoError && <p className="ui mt-2 text-xs text-red-600 dark:text-red-400">{photoError}</p>}
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

  const badgeParts = [
    formatBusType(listing.bus_type),
    `${listing.seat_count} seats`,
    listing.is_ac ? "A/C" : "Non-A/C",
    listing.condition ? formatCondition(listing.condition) : null,
    listing.driver_included ? formatDriverIncluded(listing.driver_included) : null,
  ].filter((p): p is string => !!p);

  return (
    <div className="flex flex-col gap-6">
      <div className="card-lg p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-xl font-bold tracking-tight">{listing.title}</h1>
              <span className={`ui rounded-full px-2 py-0.5 text-xs font-semibold ${MODERATION_STYLE[listing.moderation_status]}`}>
                {MODERATION_LABEL[listing.moderation_status]}
              </span>
              {listing.is_archived && (
                <span className="ui rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-zinc-800 dark:text-zinc-400">
                  Archived
                </span>
              )}
            </div>
            <p className="font-heading mt-1 text-lg font-bold text-brand dark:text-blue-400">
              {formatPrice(listing.price_amount, listing.price_type)}
            </p>
            <p className="ui mt-1 flex items-center gap-1.5 text-sm text-slate-600 dark:text-zinc-400">
              <MapPin size={14} />
              {listing.city}, {listing.district}, {listing.province}
            </p>
            <p className="ui mt-1 text-xs text-slate-500 dark:text-zinc-500">
              Posted by {listing.poster?.name ?? "Unknown"} · {listing.poster?.phone ?? listing.contact_phone} ·{" "}
              {new Date(listing.created_at).toLocaleDateString("en-LK", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={startEditing}
            className="ui inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <Pencil size={13} /> Edit details
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {badgeParts.map((part) => (
            <span key={part} className="pill">
              {part}
            </span>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-5 dark:border-zinc-800">
          {listing.moderation_status !== "approved" && (
            <button
              type="button"
              onClick={() => setReviewStatus("approved")}
              disabled={!!actionBusy}
              className="ui inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
            >
              {actionBusy === "approved" ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Approve
            </button>
          )}
          <button
            type="button"
            onClick={() => setReviewStatus("rejected")}
            disabled={!!actionBusy}
            className="ui inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            {actionBusy === "rejected" ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />}
            Reject
          </button>
          <button
            type="button"
            onClick={() => setReviewStatus("pending")}
            disabled={!!actionBusy}
            className="ui inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {actionBusy === "pending" ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
            Re-queue
          </button>

          <div className="ml-auto">
            {!confirmingDelete ? (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                disabled={!!actionBusy}
                className="ui inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:hover:bg-red-950/30"
              >
                <Trash2 size={13} /> Delete
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="ui text-xs text-slate-600 dark:text-zinc-400">Delete permanently?</span>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={!!actionBusy}
                  className="ui rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={() => void del()}
                  disabled={!!actionBusy}
                  className="ui inline-flex items-center gap-1 rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {actionBusy === "delete" ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
        {actionError && <p className="ui mt-2 text-xs text-red-600 dark:text-red-400">{actionError}</p>}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border">
        {listing.images.length > 0 ? (
          <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-zinc-800 sm:grid-cols-3">
            {listing.images.slice(0, 4).map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={src}
                src={src}
                alt={`${listing.title} photo ${i + 1}`}
                className={`h-40 w-full object-cover ${i === 0 ? "col-span-2 h-64 sm:col-span-2" : ""}`}
              />
            ))}
          </div>
        ) : (
          <div
            className="flex h-56 w-full items-center justify-center"
            style={{ background: "linear-gradient(135deg, #004aad 0%, #062b63 100%)" }}
          >
            <BusIcon size={40} className="text-white/70" />
          </div>
        )}
      </div>

      {(listing.bus_model || listing.manufacturing_year || listing.min_hire_duration || listing.area) && (
        <div className="card divide-y divide-border overflow-hidden">
          {listing.bus_model && (
            <div className="ui flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-slate-500 dark:text-zinc-400">Bus Model</span>
              <span className="font-medium">{listing.bus_model}</span>
            </div>
          )}
          {listing.manufacturing_year && (
            <div className="ui flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-slate-500 dark:text-zinc-400">Manufacturing Year</span>
              <span className="font-medium">{listing.manufacturing_year}</span>
            </div>
          )}
          {listing.min_hire_duration && (
            <div className="ui flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-slate-500 dark:text-zinc-400">Minimum Hire Duration</span>
              <span className="font-medium">{listing.min_hire_duration}</span>
            </div>
          )}
          {listing.area && (
            <div className="ui flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-slate-500 dark:text-zinc-400">Service Area</span>
              <span className="font-medium">{listing.area}</span>
            </div>
          )}
        </div>
      )}

      {listing.features.length > 0 && (
        <div>
          <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">
            Features & Facilities
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {listing.features.map((f) => (
              <span key={f} className="pill">
                {formatFeature(f)}
              </span>
            ))}
          </div>
        </div>
      )}

      {listing.suitable_for.length > 0 && (
        <div>
          <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">
            Suitable For
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {listing.suitable_for.map((s) => (
              <span key={s} className="pill">
                {formatSuitableFor(s)}
              </span>
            ))}
          </div>
        </div>
      )}

      {listing.description && (
        <div>
          <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">
            Description
          </h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-zinc-300">
            {listing.description}
          </p>
        </div>
      )}

      <div className="card p-5">
        <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">
          Contact Details
        </h2>
        <dl className="ui mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-zinc-500">Contact name</p>
            <p className="mt-0.5 text-sm font-medium">{listing.contact_name}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-zinc-500">Contact phone</p>
            <p className="mt-0.5 text-sm font-medium">{listing.contact_phone}</p>
          </div>
          {listing.contact_whatsapp && (
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-zinc-500">WhatsApp</p>
              <p className="mt-0.5 text-sm font-medium">{listing.contact_whatsapp}</p>
            </div>
          )}
          {listing.preferred_contact_method && (
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-zinc-500">Preferred contact method</p>
              <p className="mt-0.5 text-sm font-medium capitalize">{listing.preferred_contact_method}</p>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
