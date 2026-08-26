"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Bus } from "lucide-react";

const AUTO_ADVANCE_MS = 5000;

export function ImageGallery({ images, title }: { images: string[]; title: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [images.length]);

  if (images.length === 0) {
    return (
      <div
        className="flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-2xl"
        style={{ background: "linear-gradient(135deg, #004aad 0%, #062b63 100%)" }}
      >
        <Bus size={40} className="text-white/70" />
      </div>
    );
  }

  function prev() {
    setIndex((i) => (i - 1 + images.length) % images.length);
  }
  function next() {
    setIndex((i) => (i + 1) % images.length);
  }

  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-slate-100 dark:bg-zinc-800">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={images[index]} alt={`${title} photo ${index + 1}`} className="h-full w-full object-cover" />

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Previous photo"
            className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next photo"
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
          >
            <ChevronRight size={20} />
          </button>

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Go to photo ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-5 bg-white" : "w-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>

          <div className="ui absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white">
            {index + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  );
}
