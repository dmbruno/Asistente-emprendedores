/**
 * Format an ISO date string as DD/MM/YY
 */
export function fmtDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

/**
 * Format an ISO date string as DD/MM/YY HH:MM
 */
export function fmtDatetime(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yy} ${hh}:${min}`;
}

/**
 * Format a number as Argentine pesos: $1.234.567
 */
export function fmtPesos(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Format a number with thousands separator: 1.234
 */
export function fmtNumber(n: number): string {
  return new Intl.NumberFormat('es-AR').format(n);
}

/**
 * Format a/b as a percentage string: "42%"
 */
export function fmtPct(a: number, b: number): string {
  if (b === 0) return '0%';
  return `${Math.round((a / b) * 100)}%`;
}

/**
 * Get the first letter of a string, uppercased
 */
export function initials(s: string): string {
  if (!s) return '?';
  return s.trim().charAt(0).toUpperCase();
}
