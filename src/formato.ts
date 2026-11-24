const due = (n: number) => String(n).padStart(2, '0');

// Tempo rimasto: secondi arrotondati per eccesso, così "1" resta a schermo fino allo scatto.
export function formatTempo(ms: number): string {
  const tot = Math.ceil(ms / 1000);
  if (tot < 60) return String(tot);
  const h = Math.floor(tot / 3600);
  const m = Math.floor((tot % 3600) / 60);
  const s = tot % 60;
  return h ? `${h}:${due(m)}:${due(s)}` : `${due(m)}:${due(s)}`;
}

export function sottotitolo(ripetizioni: number, tenutaSecondi: number, riposoSecondi = 0): string {
  const tenuta = tenutaSecondi >= 60 && tenutaSecondi % 60 === 0 ? `${tenutaSecondi / 60} min` : `${tenutaSecondi} s`;
  return `${ripetizioni} × ${tenuta}` + (riposoSecondi > 0 ? ` · riposo ${riposoSecondi} s` : '');
}

// Durata leggibile con unità: "2 s", "5 min", "2h 55m".
export function formatDurata(ms: number): string {
  if (ms < 60_000) return `${Math.ceil(ms / 1000)} s`;
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return min % 60 ? `${h}h ${min % 60}m` : `${h}h`;
}
