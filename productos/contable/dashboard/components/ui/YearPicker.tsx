"use client";

interface YearPickerProps {
  year: number;
  onChange: (year: number) => void;
  min?: number;
  max?: number;
}

export default function YearPicker({ year, onChange, min = 2020, max = new Date().getFullYear() }: YearPickerProps) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-1 py-1">
      <button
        onClick={() => onChange(year - 1)}
        disabled={year <= min}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="Año anterior"
      >
        ‹
      </button>
      <span className="min-w-[3.5rem] text-center text-sm font-display font-bold text-slate-800">
        {year}
      </span>
      <button
        onClick={() => onChange(year + 1)}
        disabled={year >= max}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="Año siguiente"
      >
        ›
      </button>
    </div>
  );
}
