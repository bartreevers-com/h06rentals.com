"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Location autocomplete for Lagos trips.
 *
 * Suggestions come from a curated list of Lagos landmarks (instant, always
 * relevant) merged with the free Photon geocoder biased to Lagos — no API key
 * required. Swapping in Google Places later only means replacing `fetchRemote`.
 */

const LAGOS_PLACES = [
  "Murtala Muhammed International Airport (MMIA), Ikeja",
  "MMIA Terminal 1, Ikeja",
  "MMIA Terminal 2, Ikeja",
  "Murtala Muhammed Domestic Airport (MMA2), Ikeja",
  "Eko Hotel & Suites, Victoria Island",
  "Lagos Oriental Hotel, Victoria Island",
  "The Wheatbaker, Ikoyi",
  "Radisson Blu Anchorage, Victoria Island",
  "Four Points by Sheraton, Oniru",
  "Lagos Marriott Hotel, Ikeja",
  "Lagos Continental Hotel, Victoria Island",
  "Victoria Island, Lagos",
  "Ikoyi, Lagos",
  "Lekki Phase 1, Lagos",
  "Lekki Phase 2, Lagos",
  "Ikate, Lekki",
  "Chevron Drive, Lekki",
  "Ajah, Lagos",
  "Sangotedo, Lagos",
  "Victoria Garden City (VGC), Lekki",
  "Banana Island, Ikoyi",
  "Oniru, Victoria Island",
  "Ikeja GRA, Lagos",
  "Maryland, Lagos",
  "Yaba, Lagos",
  "Surulere, Lagos",
  "Gbagada, Lagos",
  "Magodo, Lagos",
  "Festac Town, Lagos",
  "Apapa, Lagos",
  "Lagos Island",
  "Landmark Centre, Oniru",
  "Eko Atlantic City, Victoria Island",
  "The Palms Shopping Mall, Lekki",
  "Ikeja City Mall, Alausa",
  "Tafawa Balewa Square, Lagos Island",
  "National Theatre, Iganmu",
  "Lekki-Ikoyi Link Bridge",
  "Nike Art Gallery, Lekki",
  "Lagos Business School, Ajah",
  "Civic Centre, Victoria Island",
  "Muri Okunola Park, Victoria Island",
  "1 Gbangbala Street, Ikate, Lekki (H06 Showroom)",
];

async function fetchRemote(query: string, signal: AbortSignal): Promise<string[]> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lat=6.4550&lon=3.4246&limit=4&lang=en`;
  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const data = await res.json();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const f of data.features ?? []) {
    const p = f.properties ?? {};
    const label = [p.name, p.district, p.city ?? p.county, p.state, p.country === "Nigeria" ? null : p.country]
      .filter(Boolean)
      .join(", ");
    if (label && !seen.has(label)) {
      seen.add(label);
      out.push(label);
    }
  }
  return out;
}

export function LocationAutocomplete({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [active, setActive] = useState(-1);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const search = (q: string) => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) {
      setOptions([]);
      setOpen(false);
      return;
    }
    const local = LAGOS_PLACES.filter((p) => p.toLowerCase().includes(needle)).slice(0, 5);
    setOptions(local);
    setOpen(true);
    setActive(-1);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const remote = await fetchRemote(q, controller.signal);
        const merged = [...local];
        for (const r of remote) {
          if (merged.length >= 7) break;
          if (!merged.some((m) => m.toLowerCase() === r.toLowerCase())) merged.push(r);
        }
        setOptions(merged);
      } catch {
        // network hiccup — local suggestions still shown
      }
    }, 320);
  };

  // close on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (opt: string) => {
    onChange(opt);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <input
        id={id}
        className="field"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          search(e.target.value);
        }}
        onFocus={() => value.trim().length >= 2 && options.length > 0 && setOpen(true)}
        onKeyDown={(e) => {
          if (!open || options.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => (a + 1) % options.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a <= 0 ? options.length - 1 : a - 1));
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            pick(options[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && options.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="glass-subtle absolute z-30 mt-2 w-full overflow-hidden !rounded-xl py-1 shadow-2xl"
        >
          {options.map((opt, i) => (
            <li
              key={opt}
              role="option"
              aria-selected={i === active}
              className={`cursor-pointer px-4 py-2.5 text-sm ${
                i === active ? "bg-emerald-deep/30 text-cream" : "text-cream-dim hover:bg-emerald-deep/20 hover:text-cream"
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(opt);
              }}
              onMouseEnter={() => setActive(i)}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
