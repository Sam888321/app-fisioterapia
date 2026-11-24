import { PREPARAZIONE_MS } from './timer';
import { Esercizio, Sessione } from './tipi';

const due = (n: number) => String(n).padStart(2, '0');

export function giornoLocale(d: Date): string {
  return `${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}`;
}

// Un esercizio lungo da una ripetizione (il tutore) si misura in tempo, il resto in volte.
export function misura(e: { ripetizioni: number; tenutaSecondi: number }): 'tempo' | 'volte' {
  return e.ripetizioni === 1 && e.tenutaSecondi >= 60 ? 'tempo' : 'volte';
}

export type SessioneNorm = Sessione & { esito: 'completato' | 'interrotto'; fine: string; restanteMs: number };

// Le sessioni fino alla 1.1.2 non hanno copia dei parametri né fine: si prendono dall'esercizio attuale
// e la fine si stima. Le vecchie "annullate" erano lavoro fatto: diventano interrotte.
export function normalizza(s: Sessione, esercizi: Esercizio[]): SessioneNorm {
  const es = esercizi.find((e) => e.id === s.esercizioId);
  const ripetizioni = s.ripetizioni ?? es?.ripetizioni;
  const tenutaSecondi = s.tenutaSecondi ?? es?.tenutaSecondi;
  const riposoSecondi = s.riposoSecondi ?? es?.riposoSecondi;
  const esito = s.esito === 'completato' ? 'completato' : 'interrotto';
  let fine = s.fine;
  if (!fine) {
    const n = esito === 'completato' ? ripetizioni : s.ripetizioniFatte;
    const stimata = n !== undefined && tenutaSecondi !== undefined
      ? Date.parse(s.inizio) + PREPARAZIONE_MS + n * tenutaSecondi * 1000 + Math.max(0, n - 1) * (riposoSecondi ?? 0) * 1000
      : Date.parse(s.inizio);
    fine = Number.isNaN(stimata) ? s.inizio : new Date(stimata).toISOString();
  }
  return { ...s, esito, fine, restanteMs: s.restanteMs ?? 0, ripetizioni, tenutaSecondi, riposoSecondi };
}

export function ripetizioneRaggiunta(s: SessioneNorm): number {
  return s.ripetizioniFatte + (s.restanteMs > 0 ? 1 : 0);
}

// Tempo di tenuta fatto (le pause non contano); null se la tenuta non è nota (esercizio eliminato).
export function tenutaFattaMs(s: SessioneNorm): number | null {
  if (s.tenutaSecondi === undefined) return null;
  const T = s.tenutaSecondi * 1000;
  return s.ripetizioniFatte * T + (s.restanteMs > 0 ? T - s.restanteMs : 0);
}
