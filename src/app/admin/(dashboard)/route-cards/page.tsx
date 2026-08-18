"use client";

import { useEffect, useState, useCallback } from "react";
import { Images, Loader2, PlusCircle, Save, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadRouteImage } from "@/lib/storage";
import { ImageSlot } from "@/components/image-slot";
import {
  listAdminRouteCards,
  createAdminRouteCard,
  updateAdminRouteCard,
  deleteAdminRouteCard,
  ApiError,
  type AdminRouteCard,
} from "@/lib/api";

interface EditorState {
  id?: string;
  name: string;
  imageUrl?: string;
}

export default function AdminRouteCardsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [cards, setCards] = useState<AdminRouteCard[]>([]);
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
      setCards(await listAdminRouteCards(session.access_token));
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
        <Loader2 size={16} className="animate-spin" /> Loading route cards…
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
          <h1 className="font-heading text-2xl font-bold tracking-tight">Route Cards</h1>
          <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
            Shared corridor name + photo templates. Link several physically different routes
            (different operators, different stops) to the same card so they all display a
            consistent name — editing a card updates every route linked to it immediately.
          </p>
        </div>
        {!editor && (
          <button
            type="button"
            onClick={() => setEditor({ name: "" })}
            className="btn-primary shrink-0"
          >
            <PlusCircle size={16} /> New route card
          </button>
        )}
      </div>

      {editor && (
        <RouteCardEditor
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
        {cards.length === 0 ? (
          <div className="card p-10 text-center text-sm text-slate-500 dark:text-zinc-400">
            No route cards yet.
          </div>
        ) : (
          cards.map((c) => (
            <div key={c.id} className="card flex items-center gap-3 p-4">
              {c.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.image_url}
                  alt={`${c.name} photo`}
                  className="h-14 w-14 shrink-0 rounded-lg border border-slate-200 object-cover dark:border-zinc-800"
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-400 dark:border-zinc-700 dark:text-zinc-600">
                  <Images size={18} />
                </div>
              )}
              <div className="flex flex-1 items-center justify-between gap-3">
                <p className="font-medium">{c.name}</p>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditor({ id: c.id, name: c.name, imageUrl: c.image_url ?? undefined })}
                    className="ui rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Edit
                  </button>
                  <DeleteRouteCardButton token={token} cardId={c.id} cardName={c.name} onDeleted={loadAll} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function RouteCardEditor({
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
    if (!editor.name.trim()) {
      setError("Give the route card a name.");
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
        imageUrl = await uploadRouteImage(session.user.id, imageFile);
      }

      const body = { name: editor.name.trim(), imageUrl };
      if (editor.id) await updateAdminRouteCard(token, editor.id, body);
      else await createAdminRouteCard(token, body);
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save the route card.");
      setBusy(false);
    }
  }

  return (
    <div className="card-lg mt-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold">
          {editor.id ? "Edit route card" : "New route card"}
        </h2>
        <button
          type="button"
          onClick={() => setEditor(null)}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      <label className="ui mt-4 flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
        Corridor name
        <input
          value={editor.name}
          onChange={(e) => setEditor({ ...editor, name: e.target.value })}
          placeholder="e.g. Colombo – Jaffna"
          className="field text-sm"
        />
      </label>

      <div className="mt-4">
        <ImageSlot label="Card photo (optional)" preview={imagePreview} onChange={onImageChange} />
      </div>

      {error && <p className="ui mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-5 flex gap-2">
        <button type="button" onClick={() => setEditor(null)} disabled={busy} className="btn-secondary">
          Cancel
        </button>
        <button type="button" onClick={save} disabled={busy} className="btn-primary">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {busy ? "Saving…" : "Save route card"}
        </button>
      </div>
    </div>
  );
}

function DeleteRouteCardButton({
  token,
  cardId,
  cardName,
  onDeleted,
}: {
  token: string;
  cardId: string;
  cardName: string;
  onDeleted: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function del() {
    setError(null);
    setBusy(true);
    try {
      await deleteAdminRouteCard(token, cardId);
      onDeleted();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not delete route card.");
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
      <span className="ui whitespace-nowrap text-xs text-slate-600 dark:text-zinc-400">Delete {cardName}?</span>
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
