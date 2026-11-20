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
