export type Immagine = { tipo: 'foto'; uri: string } | { tipo: 'icona'; nome: string };

export interface Esercizio {
  id: string;
  nome: string;
  immagine: Immagine;
  ripetizioni: number;
  tenutaSecondi: number;
  voltePerGiorno?: number;
  creatoIl: string; // YYYY-MM-DD locale
}

export interface Sessione {
  id: string;
  esercizioId: string;
  nomeEsercizio: string;
  inizio: string; // ISO
  esito: 'completato' | 'annullato';
  ripetizioniFatte: number;
}
