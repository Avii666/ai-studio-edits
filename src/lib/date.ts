export function formatTimestamp(ts?: string | number | null): string {
  if (ts === undefined || ts === null) return '';
  const raw = String(ts).trim();
  if (!raw) return '';

  // Legacy friendly strings like "Just now", "Edited just now", "Mar 10, 2025"
  const isIsoOrNumeric =
    /^\d{4}-\d{2}-\d{2}T/.test(raw) ||
    /^\d{10,13}$/.test(raw);

  if (!isIsoOrNumeric) {
    return raw;
  }

  const date = /^\d{10,13}$/.test(raw)
    ? new Date(raw.length === 10 ? Number(raw) * 1000 : Number(raw))
    : new Date(raw);

  if (Number.isNaN(date.getTime())) {
    return raw;
  }

  const diffMs = Date.now() - date.getTime();
  if (diffMs >= 0 && diffMs < 60_000) {
    return 'Just now';
  }
  if (diffMs >= 60_000 && diffMs < 3_600_000) {
    return `${Math.floor(diffMs / 60_000)}m ago`;
  }
  if (diffMs >= 3_600_000 && diffMs < 86_400_000) {
    return `${Math.floor(diffMs / 3_600_000)}h ago`;
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
