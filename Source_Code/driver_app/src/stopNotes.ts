const KEY = "cmp600-driver-stop-notes";

export function loadStopNotes(): Record<string, string> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function saveStopNote(shipmentId: string, note: string): void {
  const all = loadStopNotes();
  if (note.trim()) all[shipmentId] = note.trim();
  else delete all[shipmentId];
  localStorage.setItem(KEY, JSON.stringify(all));
}
