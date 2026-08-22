"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, XCircle, Camera, QrCode, X, User, Bus, LogIn, LogOut, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { previewTicket, boardTicket, ApiError, type PreviewTicketResult } from "@/lib/api";

type Preview = Extract<PreviewTicketResult, { ok: true }>;

const REASON_MESSAGE: Record<string, string> = {
  void: "This ticket has been voided.",
  not_found: "Ticket not found.",
  invalid_signature: "Invalid or tampered ticket.",
  invalid_seats: "Could not board those seats. Try again.",
};

// Native browser API (Chrome/Edge/Android) — no extra dependency. Absent on
// Safari/iOS, where the manual-paste fallback below still works fully.
declare global {
  interface Window {
    BarcodeDetector?: new (options: { formats: string[] }) => {
      detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
    };
  }
}

export function TicketScanner() {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [boarding, setBoarding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cameraSupported, setCameraSupported] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    setCameraSupported(typeof window !== "undefined" && !!window.BarcodeDetector);
  }, []);

  async function submit(scannedToken: string) {
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new ApiError(401, "Please sign in.");
      tokenRef.current = scannedToken;
      const res = await previewTicket(session.access_token, scannedToken);
      if (res.ok) {
        setPreview(res);
        // Start unselected — the conductor picks which seat(s) are actually
        // present and boarding, rather than assuming every unboarded seat on
        // the ticket boards by default (a group booking may only have some
        // of its passengers actually on the bus right now).
        setSelected(new Set());
      } else {
        setError(REASON_MESSAGE[res.reason] ?? "Could not read this ticket.");
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not reach BusConnect-api.");
    } finally {
      setBusy(false);
    }
  }

  function toggleSeat(seat: string) {
    if (!preview || preview.boardedSeats.includes(seat)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(seat)) next.delete(seat);
      else next.add(seat);
      return next;
    });
  }

  async function confirmBoard() {
    if (!preview || !tokenRef.current || selected.size === 0) return;
    setBoarding(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const res = await boardTicket(session.access_token, tokenRef.current, [...selected]);
      if (res.ok) {
        setPreview({ ...preview, status: res.status, boardedSeats: res.boardedSeats });
        setSelected(new Set());
      } else {
        setError(REASON_MESSAGE[res.reason] ?? "Could not board those seats.");
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not reach BusConnect-api.");
    } finally {
      setBoarding(false);
    }
  }

  function dismiss() {
    setPreview(null);
    setSelected(new Set());
    setError(null);
    setToken("");
    tokenRef.current = null;
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
      scanLoop();
    } catch {
      setError("Could not access the camera.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  function scanLoop() {
    if (!window.BarcodeDetector || !videoRef.current) return;
    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    const tick = async () => {
      if (!streamRef.current || !videoRef.current) return;
      try {
        const codes = await detector.detect(videoRef.current);
        if (codes.length > 0) {
          stopCamera();
          setToken(codes[0].rawValue);
          void submit(codes[0].rawValue);
          return;
        }
      } catch {
        /* keep trying */
      }
      if (streamRef.current) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  useEffect(() => stopCamera, []);

  const allBoarded = preview ? preview.boardedSeats.length >= preview.seats.length : false;

  return (
    <div>
      {cameraSupported && (
        <div className="card mb-4 overflow-hidden p-0">
          {cameraOn ? (
            <video ref={videoRef} className="aspect-video w-full bg-black object-cover" muted playsInline />
          ) : (
            <button
              type="button"
              onClick={startCamera}
              className="ui flex w-full items-center justify-center gap-2 p-8 text-sm font-medium text-slate-600 dark:text-zinc-400"
            >
              <Camera size={18} /> Scan with camera
            </button>
          )}
          {cameraOn && (
            <button
              type="button"
              onClick={stopCamera}
              className="ui w-full border-t border-slate-200 p-2.5 text-sm font-medium text-slate-500 dark:border-zinc-800 dark:text-zinc-400"
            >
              Stop camera
            </button>
          )}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (token.trim()) void submit(token.trim());
        }}
        className="card flex flex-col gap-3 p-5"
      >
        <label className="ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
          Ticket token (paste or scan)
          <textarea
            value={token}
            onChange={(e) => setToken(e.target.value)}
            rows={3}
            placeholder="Paste the scanned QR token here"
            required
            className="field font-mono text-xs"
          />
        </label>
        <button type="submit" disabled={busy || !token.trim()} className="btn-primary">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}
          {busy ? "Checking…" : "Preview ticket"}
        </button>
      </form>

      {error && !preview && (
        <div className="card mt-4 flex items-center gap-3 border-red-200 bg-red-50 p-5 dark:border-red-900/50 dark:bg-red-950/40">
          <XCircle size={22} className="shrink-0 text-red-600 dark:text-red-400" />
          <p className="font-heading font-semibold">{error}</p>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={dismiss} />
          <div className="card-lg relative w-full max-w-sm p-6">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate font-heading text-base font-bold">
                  <User size={15} className="shrink-0 text-slate-400" />
                  {preview.passengerName ?? "Passenger"}
                </p>
                <p className="ui mt-0.5 truncate text-xs text-slate-500 dark:text-zinc-500">
                  {preview.routeName ?? "Trip"} · #{preview.bookingCode}
                </p>
              </div>
              <button type="button" onClick={dismiss} className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200">
                <X size={20} />
              </button>
            </div>

            <dl className="mt-4 flex flex-col">
              <DetailRow
                icon={Bus}
                value={preview.busRegNo ? `${preview.busRegNo}${preview.busType ? ` · ${preview.busType}` : ""}` : "Bus — unknown"}
              />
              <DetailRow icon={LogIn} value={preview.boardingStopName ? `Board at ${preview.boardingStopName}` : "Boarding stop — unknown"} />
              <DetailRow icon={LogOut} value={preview.dropStopName ? `Drop at ${preview.dropStopName}` : "Drop stop — unknown"} />
            </dl>

            {allBoarded ? (
              <div className="ui mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <Check size={16} /> Scanned — every seat on this ticket has boarded.
              </div>
            ) : preview.boardedSeats.length > 0 ? (
              <div className="ui mt-4 rounded-xl bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                Partially scanned — {preview.boardedSeats.length} of {preview.seats.length} seats already boarded.
              </div>
            ) : (
              <div className="ui mt-4 rounded-xl bg-indigo-50 px-3 py-2.5 text-sm font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                Not scanned yet
              </div>
            )}

            <p className="ui mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
              {preview.seats.length === 1 ? "Seat" : `Seats (${preview.seats.length})`}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {preview.seats.map((seat) => {
                const isBoarded = preview.boardedSeats.includes(seat);
                const isSelected = selected.has(seat);
                return (
                  <button
                    key={seat}
                    type="button"
                    onClick={() => toggleSeat(seat)}
                    disabled={isBoarded}
                    className={`ui flex items-center gap-1 rounded-lg border-[1.5px] px-3 py-1.5 text-sm font-bold transition-colors ${
                      isBoarded
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : isSelected
                          ? "border-brand bg-brand-soft text-brand dark:bg-brand-soft-dark dark:text-blue-300"
                          : "border-slate-200 text-slate-700 dark:border-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    {isBoarded && <Check size={13} />}
                    {seat}
                  </button>
                );
              })}
            </div>

            {error && <p className="ui mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>}

            {!allBoarded && (
              <button
                type="button"
                onClick={() => void confirmBoard()}
                disabled={selected.size === 0 || boarding}
                className="btn-primary mt-4 w-full disabled:opacity-50"
              >
                {boarding ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  `Board ${selected.size} seat${selected.size === 1 ? "" : "s"}`
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ icon: Icon, value }: { icon: typeof Bus; value: string }) {
  return (
    <div className="flex items-center gap-2 border-t border-slate-100 py-2.5 text-sm first:border-t-0 dark:border-zinc-800/60">
      <Icon size={14} className="shrink-0 text-slate-400" />
      <span className="font-medium">{value}</span>
    </div>
  );
}
