"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    setMounted(true);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
      // Also synced to a cookie so Server Components (e.g. the homepage
      // hero video) can render the correct theme's assets directly in the
      // initial HTML, instead of guessing and fixing it up with JS.
      document.cookie = `theme=${next ? "dark" : "light"}; path=/; max-age=31536000; samesite=lax`;
    } catch {}
    // Server Components (the hero video) read the theme cookie, so without
    // this they'd keep showing the old theme's video until the next full
    // page load even though the rest of the UI updates instantly.
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className={`ui inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition-colors duration-300 hover:bg-transparent sm:border sm:border-slate-200 sm:hover:bg-slate-50 dark:text-zinc-400 dark:sm:border-zinc-800 dark:sm:hover:bg-zinc-900 ${className}`}
    >
      {mounted && dark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
