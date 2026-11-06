"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Hash,
  Loader2,
  Pencil,
  Phone,
  Route as RouteIcon,
  Save,
  User,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadPilotPhoto } from "@/lib/storage";
import { updatePilot, ApiError, type OperatorPilotDetail } from "@/lib/api";
import { AvatarSlot } from "@/components/avatar-slot";
import { DeletePilotButton } from "../delete-pilot-button";

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

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon size={15} />
      </div>
      <div>
        <p className="ui text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function PilotIdentityCard({
  pilot,
  photoUrl,
}: {
  pilot: OperatorPilotDetail;
  photoUrl: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  const [name, setName] = useState(pilot.name);
  const [idNumber, setIdNumber] = useState(pilot.id_number);
  const [phoneNo, setPhoneNo] = useState(pilot.phone_no);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(photoUrl);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEditing() {
    setName(pilot.name);
    setIdNumber(pilot.id_number);
    setPhoneNo(pilot.phone_no);
    setPhoto(null);
    setPhotoPreview(photoUrl);
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setError(null);
  }

  function onPhotoChange(file: File | null) {
    setPhoto(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : photoUrl);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!/^\S+(\s+\S+)+$/.test(name.trim())) {
      setError("Enter the pilot's full name (first and last name).");
      return;
    }
    if (idNumber.trim().length < 3) {
      setError("Enter a valid ID number.");
      return;
    }
    if (phoneNo.trim().length < 9) {
      setError("Enter a valid phone number.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push(`/login?next=/operator/pilots/${pilot.id}`);
        return;
      }

      const profileImagePath = photo ? await uploadPilotPhoto(session.user.id, photo, pilot.id) : undefined;

      await updatePilot(session.access_token, pilot.id, {
        name: name.trim(),
        idNumber: idNumber.trim(),
        phoneNo: phoneNo.trim(),
        profileImagePath,
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
      <form onSubmit={save} className="card-lg p-6">
        <p className="ui text-xs font-semibold uppercase tracking-wide text-muted-foreground">Editing pilot</p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
          <AvatarSlot preview={photoPreview} onChange={onPhotoChange} />
          <label className="ui flex flex-1 flex-col gap-1.5 text-sm font-medium text-foreground">
            Pilot name
            <input value={name} onChange={(e) => setName(e.target.value)} required className="field text-sm" />
          </label>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 border-t border-border pt-5 sm:grid-cols-2">
          <label className="ui flex flex-col gap-1.5 text-sm font-medium text-foreground">
            ID number
            <input
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              required
              minLength={3}
              className="field text-sm"
            />
          </label>
          <label className="ui flex flex-col gap-1.5 text-sm font-medium text-foreground">
            Phone number
            <input
              value={phoneNo}
              onChange={(e) => setPhoneNo(e.target.value)}
              required
              minLength={9}
              className="field text-sm"
            />
          </label>
        </div>

        {error && <p className="ui mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-5 flex items-center gap-2 border-t border-border pt-5">
          <button type="submit" disabled={busy} className="btn-primary py-2">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={busy}
            className="ui inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
          >
            <X size={15} /> Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="card-lg p-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={`${pilot.name} photo`}
              className="h-18 w-18 shrink-0 rounded-full border border-border object-cover"
            />
          ) : (
            <div className="flex h-18 w-18 shrink-0 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground">
              <User size={22} />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-heading truncate text-2xl font-bold tracking-tight">{pilot.name}</h1>
            <span className={`ui mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[pilot.status]}`}>
              {STATUS_LABEL[pilot.status] ?? pilot.status}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-border pt-4">
          <button
            type="button"
            onClick={startEditing}
            className="ui inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <Pencil size={13} /> Edit details
          </button>
          <DeletePilotButton pilotId={pilot.id} pilotName={pilot.name} />
        </div>
      </div>

      <dl className="ui mt-5 grid grid-cols-1 gap-5 border-t border-border pt-5">
        <Field icon={Hash} label="ID number" value={pilot.id_number} />
        <Field icon={Phone} label="Phone number" value={pilot.phone_no} />
        <Field
          icon={CalendarDays}
          label="Registered on"
          value={new Date(pilot.created_at).toLocaleDateString("en-LK", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        />
        <Field
          icon={RouteIcon}
          label="Fleet assignment"
          value={
            pilot.bus ? (
              <span className="capitalize">
                {pilot.assigned_role} · {pilot.bus.reg_no}
                {pilot.bus.bus_type && ` (${pilot.bus.bus_type.name})`}
              </span>
            ) : (
              "Not assigned yet"
            )
          }
        />
      </dl>
    </div>
  );
}
