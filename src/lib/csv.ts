/**
 * Minimal RFC 4180 CSV helpers for client-side exports. Every field is wrapped
 * in double quotes and embedded quotes are doubled up, so commas, quotes, and
 * newlines inside values all round-trip safely.
 */

function escapeCsvCell(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Converts an array of flat objects into an RFC 4180 CSV string. The header
 * row is derived from the keys of the first row; every row is expected to
 * share the same shape. Returns an empty string for an empty input array.
 */
export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]!);
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => headers.map((h) => escapeCsvCell(row[h])).join(",")),
  ];
  return lines.join("\r\n");
}

/**
 * Triggers a client-side download of `csv` as `filename` via a Blob + a
 * temporary <a download> element, revoked/removed right after the click.
 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
