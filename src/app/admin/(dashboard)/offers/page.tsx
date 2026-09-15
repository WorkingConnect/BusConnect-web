"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, PlusCircle, Save, Tag, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadOfferImage } from "@/lib/storage";
import { ImageSlot } from "@/components/image-slot";
import {
  listAdminOffers,
  createAdminOffer,
  updateAdminOffer,
  deleteAdminOffer,
  ApiError,
  type AdminOffer,
  type OfferTheme,
} from "@/lib/api";

const THEMES: OfferTheme[] = ["amber", "yellow", "pink", "blue", "green"];

const THEME_SWATCH: Record<OfferTheme, string> = {
  amber: "bg-amber-200",
  yellow: "bg-yellow-200",
  pink: "bg-pink-200",
  blue: "bg-blue-200",
  green: "bg-green-200",
};

interface EditorState {
  id?: string;
  title: string;
  code: string;
  validTill: string;
  terms: string;
  theme: OfferTheme;
  imageUrl?: string;
  isActive: boolean;
  sortOrder: number;
}

function emptyEditor(): EditorState {
  return { title: "", code: "", validTill: "", terms: "", theme: "amber", isActive: true, sortOrder: 0 };
}

export default function AdminOffersPage() {
  const [token, setToken] = useState<string | null>(null);
  const [offers, setOffers] = useState<AdminOffer[]>([]);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new ApiError(401, "Please sign in.");
      setToken(session.access_token);
      setOffers(await listAdminOffers(session.access_token));
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.status === 403
            ? "Your account does not have admin access."
            : e.message
          : "Could not reach BusConnect-api. Is it running?",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400">
        <Loader2 size={16} className="animate-spin" /> Loading offers…
      </div>
    );
  }
  if (error || !token) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
        {error}
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Offers</h1>
          <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
            Promo cards shown in &quot;Offers for you&quot; on the homepage. Display-only — copying a code
            doesn&apos;t currently change a booking&apos;s price; there is no checkout validation yet.
          </p>
        </div>
        {!editor && (
          <button type="button" onClick={() => setEditor(emptyEditor())} className="btn-primary shrink-0">
            <PlusCircle size={16} /> New offer
          </button>
        )}
      </div>

      {editor && (
        <OfferEditor
          token={token}
          editor={editor}
          setEditor={setEditor}
          onSaved={() => {
            setEditor(null);
            void loadAll();
          }}
        />
      )}

      <div className="mt-6 flex flex-col gap-2">
        {offers.length === 0 ? (
          <div className="card p-10 text-center text-sm text-slate-500 dark:text-zinc-400">No offers yet.</div>
        ) : (
          offers.map((o) => (
            <div key={o.id} className="card flex items-center gap-3 p-4">
              <div className={`h-10 w-10 shrink-0 rounded-lg ${THEME_SWATCH[o.theme]}`} />
              <div className="flex flex-1 items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{o.title}</p>
                    {!o.is_active && (
                      <span className="ui shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-zinc-800 dark:text-zinc-400">
                        Hidden
                      </span>
                    )}
                  </div>
                  <p className="ui mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-zinc-500">
                    <Tag size={11} /> {o.code} · Valid till {o.valid_till}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setEditor({
                        id: o.id,
                        title: o.title,
                        code: o.code,
                        validTill: o.valid_till,
                        terms: o.terms.join("\n"),
                        theme: o.theme,
                        imageUrl: o.image_url ?? undefined,
                        isActive: o.is_active,
                        sortOrder: o.sort_order,
                      })
                    }
                    className="ui rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Edit
                  </button>
                  <DeleteOfferButton token={token} offerId={o.id} offerTitle={o.title} onDeleted={loadAll} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function OfferEditor({
  token,
  editor,
  setEditor,
  onSaved,
}: {
  token: string;
  editor: EditorState;
  setEditor: (e: EditorState | null) => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(editor.imageUrl ?? null);

  function onImageChange(file: File | null) {
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : editor.imageUrl ?? null);
  }

  async function save() {
    setError(null);
    if (!editor.title.trim() || !editor.code.trim() || !editor.validTill) {
      setError("Title, code, and a valid-till date are required.");
      return;
    }

    setBusy(true);
    try {
      let imageUrl = editor.imageUrl;
      if (imageFile) {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new ApiError(401, "Please sign in.");
        imageUrl = await uploadOfferImage(session.user.id, imageFile);
      }

      const body = {
        title: editor.title.trim(),
        code: editor.code.trim().toUpperCase(),
        validTill: editor.validTill,
        terms: editor.terms
          .split("\n")
          .map((t) => t.trim())
          .filter(Boolean),
        theme: editor.theme,
        imageUrl,
        isActive: editor.isActive,
        sortOrder: editor.sortOrder,
      };
      if (editor.id) await updateAdminOffer(token, editor.id, body);
      else await createAdminOffer(token, body);
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save the offer.");
      setBusy(false);
    }
  }

  return (
    <div className="card-lg mt-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold">{editor.id ? "Edit offer" : "New offer"}</h2>
        <button
          type="button"
          onClick={() => setEditor(null)}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
          Title
          <input
            value={editor.title}
            onChange={(e) => setEditor({ ...editor, title: e.target.value })}
            placeholder="e.g. Save up to Rs 300 on bus tickets"
            className="field text-sm"
          />
        </label>

        <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
          Code
          <input
            value={editor.code}
            onChange={(e) => setEditor({ ...editor, code: e.target.value })}
            placeholder="e.g. FESTIVE300"
            className="field text-sm uppercase"
          />
        </label>

        <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
          Valid till
          <input
            type="date"
            value={editor.validTill}
            onChange={(e) => setEditor({ ...editor, validTill: e.target.value })}
            className="field text-sm"
          />
        </label>

        <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
          Card theme
          <select
            value={editor.theme}
            onChange={(e) => setEditor({ ...editor, theme: e.target.value as OfferTheme })}
            className="field text-sm"
          >
            {THEMES.map((t) => (
              <option key={t} value={t}>
                {t[0].toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </label>

        <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300 sm:col-span-2">
          Terms &amp; conditions
          <textarea
            value={editor.terms}
            onChange={(e) => setEditor({ ...editor, terms: e.target.value })}
            placeholder={"One condition per line, e.g.\nUse code FESTIVE300 to get 5% off.\nValid for a minimum ticket value of Rs 300."}
            rows={4}
            className="field text-sm"
          />
        </label>
      </div>

      <div className="mt-4">
        <ImageSlot label="Card artwork (optional)" preview={imagePreview} onChange={onImageChange} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-6">
        <label className="ui flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={editor.isActive}
            onChange={(e) => setEditor({ ...editor, isActive: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand dark:border-zinc-700"
          />
          Visible on homepage
        </label>

        <label className="ui flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-zinc-300">
          Sort order
          <input
            type="number"
            value={editor.sortOrder}
            onChange={(e) => setEditor({ ...editor, sortOrder: Number(e.target.value) || 0 })}
            className="field w-20 text-sm"
          />
        </label>
      </div>

      {error && <p className="ui mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-5 flex gap-2">
        <button type="button" onClick={() => setEditor(null)} disabled={busy} className="btn-secondary">
          Cancel
        </button>
        <button type="button" onClick={save} disabled={busy} className="btn-primary">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {busy ? "Saving…" : "Save offer"}
        </button>
      </div>
    </div>
  );
}

function DeleteOfferButton({
  token,
  offerId,
  offerTitle,
  onDeleted,
}: {
  token: string;
  offerId: string;
  offerTitle: string;
  onDeleted: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function del() {
    setError(null);
    setBusy(true);
    try {
      await deleteAdminOffer(token, offerId);
      onDeleted();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not delete offer.");
      setBusy(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="ui inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700"
      >
        <Trash2 size={13} /> Delete
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {error && <span className="ui whitespace-nowrap text-xs text-red-600 dark:text-red-400">{error}</span>}
      <span className="ui whitespace-nowrap text-xs text-slate-600 dark:text-zinc-400">Delete {offerTitle}?</span>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={busy}
        className="ui rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={del}
        disabled={busy}
        className="ui inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Confirm
      </button>
    </div>
  );
}
