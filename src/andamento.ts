import { giornoLocale, inPausa, misura, normalizza, sessioniDelGiorno, SessioneNorm, spostaGiorno, tenutaFattaMs } from './storico';
import { Dolore, Esercizio, Sessione } from './tipi';

export type Vista = 'giorno' | 'settimana' | 'mese';

const daData = (d: string) => new Date(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8)));

// Giorni del periodo che contiene `riferimento`: settimana da lunedì a domenica, mese intero.
export function periodo(vista: Vista, riferimento: string): { da: string; a: string; giorni: string[] } {
  const r = daData(riferimento);
  let da = riferimento;
  let n = 1;
  if (vista === 'settimana') {
    da = spostaGiorno(riferimento, -((r.getDay() + 6) % 7));
    n = 7;
  } else if (vista === 'mese') {
    da = giornoLocale(new Date(r.getFullYear(), r.getMonth(), 1));
    n = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
  }
  const giorni = Array.from({ length: n }, (_, i) => spostaGiorno(da, i));
  return { da, a: giorni[n - 1], giorni };
}

export function sposta(vista: Vista, riferimento: string, delta: number): string {
  if (vista === 'giorno') return spostaGiorno(riferimento, delta);
  if (vista === 'settimana') return spostaGiorno(riferimento, 7 * delta);
  const r = daData(riferimento);
  const ultimo = new Date(r.getFullYear(), r.getMonth() + delta + 1, 0).getDate();
  return giornoLocale(new Date(r.getFullYear(), r.getMonth() + delta, Math.min(r.getDate(), ultimo)));
}

const sueDelGiorno = (es: Esercizio, sessioni: Sessione[], esercizi: Esercizio[], data: string): SessioneNorm[] =>
  sessioniDelGiorno(sessioni, data)
    .filter((s) => s.esercizioId === es.id)
    .map((s) => normalizza(s, esercizi))
    .sort((a, b) => a.inizio.localeCompare(b.inizio));

export interface Barra {
  data: string;
  completato: number; // ms di tenuta (misura a tempo) o numero di volte
  interrotto: number;
  doloreMax?: Dolore;
  obiettivo?: number; // minimo salvato nelle sessioni di quel giorno
  pausa?: boolean; // l'esercizio era in pausa: il giorno non conta
}

export function barre(es: Esercizio, sessioni: Sessione[], esercizi: Esercizio[], vista: 'settimana' | 'mese', riferimento: string, oggi: string) {
  const aTempo = misura(es) === 'tempo';
  const valore = (s: SessioneNorm) => (aTempo ? (tenutaFattaMs(s) ?? 0) : 1);
  const { giorni } = periodo(vista, riferimento);
  const lista: Barra[] = giorni.map((data) => {
    const sue = sueDelGiorno(es, sessioni, esercizi, data);
    const somma = (esito: SessioneNorm['esito']) => sue.filter((s) => s.esito === esito).reduce((t, s) => t + valore(s), 0);
    const dolori = sue.flatMap((s) => (s.dolore === undefined ? [] : [s.dolore]));
    const obiettivo = sue.findLast((s) => s.obiettivo !== undefined)?.obiettivo;
    return {
      data,
      completato: somma('completato'),
      interrotto: somma('interrotto'),
      ...(dolori.length && { doloreMax: Math.max(...dolori) as Dolore }),
      ...(obiettivo !== undefined && { obiettivo }),
      ...(inPausa(es, data) && { pausa: true }),
    };
  });
  const obiettivo = es.voltePerGiorno ?? 1;
  const minimoDi = (ob: number) => (aTempo ? ob * es.tenutaSecondi * 1000 : ob);
  const minimo = minimoDi(obiettivo); // la linea tratteggiata: il minimo attuale
  const validi = lista.filter((b) => b.data >= es.creatoIl && b.data <= oggi && !b.pausa);
  const tot = (b: Barra) => b.completato + b.interrotto;
  return {
    barre: lista,
    minimo,
    media: validi.length ? validi.reduce((t, b) => t + tot(b), 0) / validi.length : 0,
    // Come i colori dello Storico: solo le completate, e col minimo di quel giorno.
    giorniSopra: validi.filter((b) => b.completato >= minimoDi(b.obiettivo ?? obiettivo)).length,
    giorniValidi: validi.length,
  };
}

export interface Blocco {
  daMin: number; // minuti dalle 00:00 del giorno
  aMin: number; // tagliato a mezzanotte (1440)
  esito: 'completato' | 'interrotto';
  sessione: SessioneNorm;
}

// Striscia oraria: dalle 6 alle 24, allargata all'ora intera della prima sessione se è prima.
export function blocchiGiorno(es: Esercizio, sessioni: Sessione[], esercizi: Esercizio[], data: string): { blocchi: Blocco[]; daOra: number; aOra: number } {
  const base = daData(data).getTime();
  const blocchi = sueDelGiorno(es, sessioni, esercizi, data).map((s) => ({
    daMin: (Date.parse(s.inizio) - base) / 60_000,
    aMin: Math.min(1440, (Date.parse(s.fine) - base) / 60_000),
    esito: s.esito,
    sessione: s,
  }));
  const daOra = Math.min(6, ...blocchi.map((b) => Math.floor(b.daMin / 60)));
  return { blocchi, daOra, aOra: 24 };
}
