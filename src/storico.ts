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
export type ColoreGiorno = ColoreEsito | 'in-corso' | 'pausa' | null; // 'pausa': tutti gli esercizi in pausa

export function inPausa(e: Esercizio, data: string): boolean {
  return (e.pause ?? []).some((p) => p.da <= data && (p.a === undefined || data <= p.a));
}

// La pausa parte da oggi; riprendere la chiude a ieri (oggi torna a contare). Iniziata e finita oggi = nessuna pausa.
export function mettiInPausa(e: Esercizio, oggi: string): Esercizio {
  if (inPausa(e, oggi)) return e;
  return { ...e, pause: [...(e.pause ?? []), { da: oggi }] };
}

export function riprendi(e: Esercizio, oggi: string): Esercizio {
  if (!(e.pause ?? []).some((p) => p.a === undefined)) return e;
  const ieri = spostaGiorno(oggi, -1);
  return {
    ...e,
    pause: e.pause!.flatMap((p) => (p.a !== undefined ? [p] : ieri < p.da ? [] : [{ da: p.da, a: ieri }])),
  };
}

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
  colore: ColoreEsito | 'da-fare' | 'pausa'; // 'da-fare': oggi, niente ancora; 'pausa': non conta per il giorno
}

// Verde = minimo raggiunto (le interruzioni in più non tolgono il verde). Oggi non è mai rosso.
function coloreEsito(completate: number, interrotte: number, obiettivo: number, eOggi: boolean): Riquadro['colore'] {
  if (completate >= obiettivo) return 'verde';
  if (completate + interrotte > 0) return 'arancione';
  return eOggi ? 'da-fare' : 'rosso';
}

// Indice per giorno, uno per array: calendario, serie e grafici chiedono decine di giorni a ogni rendering.
// ponytail: chiave = identità dell'array (le sessioni si ricaricano, non si modificano sul posto).
const indice = new WeakMap<Sessione[], Map<string, Sessione[]>>();

export function sessioniDelGiorno(sessioni: Sessione[], data: string): Sessione[] {
  let m = indice.get(sessioni);
  if (!m) {
    m = new Map();
    for (const s of sessioni) {
      const g = giornoLocale(new Date(s.inizio));
      const lista = m.get(g);
      if (lista) lista.push(s);
      else m.set(g, [s]);
    }
    indice.set(sessioni, m);
  }
  return m.get(data) ?? [];
}

export function riquadriGiorno(esercizi: Esercizio[], sessioni: Sessione[], data: string, oggi: string): Riquadro[] {
  const delGiorno = sessioniDelGiorno(sessioni, data)
    .map((s) => normalizza(s, esercizi))
    .sort((a, b) => a.inizio.localeCompare(b.inizio));
  const ids = new Set([...esercizi.filter((e) => e.creatoIl <= data).map((e) => e.id), ...delGiorno.map((s) => s.esercizioId)]);
  return [...ids]
    .map((id): Riquadro => {
      const es = esercizi.find((e) => e.id === id);
      const sue = delGiorno.filter((s) => s.esercizioId === id);
      const completate = sue.filter((s) => s.esito === 'completato').length;
      const interrotte = sue.length - completate;
      // Il minimo di allora (copia nelle sessioni dalla 1.2.0), altrimenti quello attuale.
      const obiettivo = sue.findLast((s) => s.obiettivo !== undefined)?.obiettivo ?? es?.voltePerGiorno ?? 1;
      const ultima = sue.filter((s) => s.esito === 'interrotto').at(-1);
      const dolori = sue.flatMap((s) => (s.dolore === undefined ? [] : [s.dolore]));
      const pausa = !!es && inPausa(es, data);
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
        colore: pausa ? 'pausa' : coloreEsito(completate, interrotte, obiettivo, data === oggi),
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

// Il peggiore tra gli esercizi attivi del giorno. Oggi: verde se è già tutto fatto, altrimenti "in corso".
export function coloreGiorno(riquadri: Riquadro[], data: string, oggi: string): ColoreGiorno {
  if (!riquadri.length) return null;
  const tutti = riquadri.map((r) => r.colore).filter((c) => c !== 'pausa');
  if (!tutti.length) return 'pausa';
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

// Giorni verdi di fila fino a ieri, più oggi se è già verde. I giorni di pausa si saltano.
export function serie(esercizi: Esercizio[], sessioni: Sessione[], oggi: string): number {
  const colore = (d: string) => coloreGiorno(riquadriGiorno(esercizi, sessioni, d, oggi), d, oggi);
  let n = colore(oggi) === 'verde' ? 1 : 0;
  for (let d = spostaGiorno(oggi, -1); ; d = spostaGiorno(d, -1)) {
    const c = colore(d);
    if (c === 'pausa') continue;
    if (c !== 'verde') return n;
    n++;
  }
}
