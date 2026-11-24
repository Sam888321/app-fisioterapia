export type Immagine = { tipo: 'foto'; uri: string } | { tipo: 'icona'; nome: string };

export interface Esercizio {
  id: string;
  nome: string;
  immagine: Immagine;
  ripetizioni: number;
  tenutaSecondi: number;
  riposoSecondi?: number; // tra una ripetizione e l'altra; assente = 0
  voltePerGiorno?: number;
  creatoIl: string; // YYYY-MM-DD locale
}

const intero = (s: string, min: number) => /^\d+$/.test(s.trim()) && Number(s) >= min;

// I valori arrivano come stringhe dal form; null = valido.
export function validaEsercizio(b: { nome: string; ripetizioni: string; tenuta: string; riposo: string; voltePerGiorno: string }): string | null {
  if (!b.nome.trim()) return 'Inserisci un nome';
  if (!intero(b.ripetizioni, 1)) return 'Ripetizioni: almeno 1';
  if (!intero(b.tenuta, 1)) return 'Tenuta: almeno 1';
  if (b.riposo.trim() && !intero(b.riposo, 0)) return 'Riposo: 0 o più secondi, o vuoto';
  if (b.voltePerGiorno.trim() && !intero(b.voltePerGiorno, 1)) return 'Volte al giorno: almeno 1 o vuoto';
  return null;
}

export type Dolore = 0 | 1 | 2 | 3; // nessuno, lieve, medio, forte

export interface Sessione {
  id: string;
  esercizioId: string;
  nomeEsercizio: string;
  inizio: string; // ISO
  esito: 'completato' | 'interrotto' | 'annullato'; // 'annullato': solo sessioni registrate fino alla 1.1.2
  ripetizioniFatte: number; // ripetizioni concluse
  // Dalla 1.2.0 (assenti nelle sessioni vecchie, vedi normalizza in storico.ts):
  fine?: string; // ISO
  ripetizioni?: number; // copia dei parametri dell'esercizio al momento della sessione
  tenutaSecondi?: number;
  riposoSecondi?: number;
  restanteMs?: number; // quanto mancava alla tenuta in corso quando è stata interrotta
  dolore?: Dolore;
}
