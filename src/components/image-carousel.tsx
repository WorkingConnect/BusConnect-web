"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * A minimal image carousel for card posters — arrows + dot indicators, no
 * external deps. Clicks on the arrows/dots stop propagation so it works
 * inside a clickable card (e.g. a <Link>) without triggering navigation.
 */
export function ImageCarousel({
  images,
  alt,
  className,
}: {
  images: string[];
  alt: string;
  className?: string;
}) {
  const [index, setIndex] = useState(0);

  if (images.length === 0) return null;

  function go(e: React.MouseEvent, delta: number) {
    e.preventDefault();
    e.stopPropagation();
    setIndex((prev) => (prev + delta + images.length) % images.length);
  }

  function goTo(e: React.MouseEvent, i: number) {
    e.preventDefault();
    e.stopPropagation();
    setIndex(i);
  }

  return (
    <div className={`relative h-full w-full overflow-hidden ${className ?? ""}`}>
      <Image
        src={images[index]}
        alt={alt}
        fill
        sizes="(min-width: 640px) 14rem, 100vw"
        className="object-cover"
      />

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => go(e, -1)}
            aria-label="Previous photo"
            className="absolute left-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] transition-opacity hover:opacity-70"
          >
            <ChevronLeft size={17} />
          </button>
          <button
            type="button"
            onClick={(e) => go(e, 1)}
            aria-label="Next photo"
            className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] transition-opacity hover:opacity-70"
          >
            <ChevronRight size={17} />
          </button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => goTo(e, i)}
                aria-label={`Photo ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-4 bg-white" : "w-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
