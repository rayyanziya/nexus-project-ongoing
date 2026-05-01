export function nullableTrim(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s.length === 0 ? null : s;
}

export function parseDateFromForm(v: FormDataEntryValue | null): Date | null {
  const raw = String(v ?? "").trim();
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}
