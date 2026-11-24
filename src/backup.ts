import { Esercizio, Sessione } from './tipi';

export interface DatiBackup {
  app: 'fisioterapia';
  versione: 1;
  esportatoIl: string;
  esercizi: Esercizio[];
  sessioni: Sessione[];
  anticipoBeep: number;
}

// ponytail: le foto non entrano nel backup (sono file a parte); se servirà, includerle in base64.
export function creaBackup(esercizi: Esercizio[], sessioni: Sessione[], anticipoBeep: number, ora: Date): DatiBackup {
  return { app: 'fisioterapia', versione: 1, esportatoIl: ora.toISOString(), esercizi, sessioni, anticipoBeep };
}

const testo = (v: unknown) => typeof v === 'string' && v.length > 0;
const numero = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
const oggetto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

// Il file arriva da fuori: si controlla la forma minima prima di sostituire i dati. Stringa = errore da mostrare.
export function leggiBackup(contenuto: string): DatiBackup | string {
  let d: unknown;
  try {
    d = JSON.parse(contenuto);
  } catch {
    return 'Il file non è leggibile.';
  }
  if (!oggetto(d) || d.app !== 'fisioterapia') return 'Il file non è un backup di Fisioterapia.';
  if (d.versione !== 1) return 'Versione del backup non supportata.';
  const esercizioOk = (e: unknown) => oggetto(e) && testo(e.id) && testo(e.nome) && numero(e.ripetizioni) && numero(e.tenutaSecondi) && oggetto(e.immagine) && testo(e.creatoIl);
  if (!Array.isArray(d.esercizi) || !d.esercizi.every(esercizioOk)) return 'Gli esercizi nel backup non sono validi.';
  const sessioneOk = (s: unknown) => oggetto(s) && testo(s.id) && testo(s.esercizioId) && testo(s.inizio) && testo(s.esito) && numero(s.ripetizioniFatte);
  if (!Array.isArray(d.sessioni) || !d.sessioni.every(sessioneOk)) return 'Le sessioni nel backup non sono valide.';
  return {
    app: 'fisioterapia',
    versione: 1,
    esportatoIl: testo(d.esportatoIl) ? (d.esportatoIl as string) : '',
    esercizi: d.esercizi as Esercizio[],
    sessioni: d.sessioni as Sessione[],
    anticipoBeep: numero(d.anticipoBeep) ? (d.anticipoBeep as number) : 110,
  };
}
