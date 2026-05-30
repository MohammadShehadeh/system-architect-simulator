/** Small, pure formatters for the topology inspector. Shared + unit-tested. */

const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB", "PB"];

export function formatBytes(bytes: number | undefined | null): string {
  if (bytes == null || !Number.isFinite(bytes)) return "—";
  if (bytes <= 0) return "0 B";
  const i = Math.min(
    BYTE_UNITS.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024))
  );
  const value = bytes / 1024 ** i;
  const decimals = i === 0 || Number.isInteger(value) || value >= 100 ? 0 : 1;
  return `${value.toFixed(decimals)} ${BYTE_UNITS[i]}`;
}

export function formatUptime(seconds: number | undefined | null): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Format a 0..1 fraction as a percentage. */
export function formatFraction(value: number | undefined | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const pct = value * 100;
  return `${pct.toFixed(pct < 10 ? 1 : 0)}%`;
}

/** Clamp a 0..1 fraction to a 0..100 percentage for bar widths. */
export function toBarPercent(value: number | undefined | null): number {
  if (value == null || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value * 100));
}
