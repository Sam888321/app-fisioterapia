import { PREPARAZIONE_MS } from './timer';
import { Dolore, Esercizio, Immagine, Sessione } from './tipi';

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

export type ColoreEsito = 'verde' | 'arancione' | 'rosso';
export type ColoreGiorno = ColoreEsito | 'in-corso' | null;

export interface Riquadro {
  esercizioId: string;
  nome: string;
  immagine?: Immagine; // assente per un esercizio eliminato
  misura: 'tempo' | 'volte';
  completate: number;
  interrotte: number;
  obiettivo: number;
  tenutaMs: number; // tenuta fatta nel giorno (le sconosciute contano 0)
  ultimaInterrotta?: { raggiunta: number; ripetizioni?: number; restanteMs: number };
  doloreMax?: Dolore;
  colore: ColoreEsito | 'da-fare'; // 'da-fare': oggi, niente ancora
}

// Verde = minimo raggiunto (le interruzioni in più non tolgono il verde). Oggi non è mai rosso.
function coloreEsito(completate: number, interrotte: number, obiettivo: number, eOggi: boolean): Riquadro['colore'] {
  if (completate >= obiettivo) return 'verde';
  if (completate + interrotte > 0) return 'arancione';
  return eOggi ? 'da-fare' : 'rosso';
}

export function riquadriGiorno(esercizi: Esercizio[], sessioni: Sessione[], data: string, oggi: string): Riquadro[] {
  const delGiorno = sessioni
    .filter((s) => giornoLocale(new Date(s.inizio)) === data)
    .map((s) => normalizza(s, esercizi))
    .sort((a, b) => a.inizio.localeCompare(b.inizio));
  const ids = new Set([...esercizi.filter((e) => e.creatoIl <= data).map((e) => e.id), ...delGiorno.map((s) => s.esercizioId)]);
  return [...ids]
    .map((id): Riquadro => {
      const es = esercizi.find((e) => e.id === id);
      const sue = delGiorno.filter((s) => s.esercizioId === id);
      const completate = sue.filter((s) => s.esito === 'completato').length;
      const interrotte = sue.length - completate;
      const obiettivo = es?.voltePerGiorno ?? 1;
      const ultima = sue.filter((s) => s.esito === 'interrotto').at(-1);
      const dolori = sue.flatMap((s) => (s.dolore === undefined ? [] : [s.dolore]));
      const rif = es ?? sue.find((s) => s.ripetizioni !== undefined && s.tenutaSecondi !== undefined);
      return {
        esercizioId: id,
        nome: es?.nome ?? sue[sue.length - 1].nomeEsercizio,
        immagine: es?.immagine,
        misura: rif ? misura({ ripetizioni: rif.ripetizioni!, tenutaSecondi: rif.tenutaSecondi! }) : 'volte',
        completate,
        interrotte,
        obiettivo,
        tenutaMs: sue.reduce((t, s) => t + (tenutaFattaMs(s) ?? 0), 0),
        ...(ultima && { ultimaInterrotta: { raggiunta: ripetizioneRaggiunta(ultima), ripetizioni: ultima.ripetizioni, restanteMs: ultima.restanteMs } }),
        ...(dolori.length && { doloreMax: Math.max(...dolori) as Dolore }),
        colore: coloreEsito(completate, interrotte, obiettivo, data === oggi),
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

// Il peggiore tra gli esercizi del giorno. Oggi: verde se è già tutto fatto, altrimenti "in corso".
export function coloreGiorno(riquadri: Riquadro[], data: string, oggi: string): ColoreGiorno {
  if (!riquadri.length) return null;
  const tutti = riquadri.map((r) => r.colore);
  if (tutti.every((c) => c === 'verde')) return 'verde';
  if (data === oggi) return 'in-corso';
  return tutti.includes('rosso') ? 'rosso' : 'arancione';
}

export function coloriMese(esercizi: Esercizio[], sessioni: Sessione[], anno: number, mese: number, oggi: string): Record<string, ColoreGiorno> {
  const colori: Record<string, ColoreGiorno> = {};
  const ultimo = new Date(anno, mese + 1, 0).getDate();
  for (let g = 1; g <= ultimo; g++) {
    const data = giornoLocale(new Date(anno, mese, g));
    if (data > oggi) break;
    const c = coloreGiorno(riquadriGiorno(esercizi, sessioni, data, oggi), data, oggi);
    if (c) colori[data] = c;
  }
  return colori;
}

export function spostaGiorno(data: string, delta: number): string {
  const [a, m, g] = data.split('-').map(Number);
  return giornoLocale(new Date(a, m - 1, g + delta));
}

// Giorni verdi di fila fino a ieri, più oggi se è già verde.
export function serie(esercizi: Esercizio[], sessioni: Sessione[], oggi: string): number {
  const colore = (d: string) => coloreGiorno(riquadriGiorno(esercizi, sessioni, d, oggi), d, oggi);
  let n = colore(oggi) === 'verde' ? 1 : 0;
  for (let d = spostaGiorno(oggi, -1); colore(d) === 'verde'; d = spostaGiorno(d, -1)) n++;
  return n;
}
