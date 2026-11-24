import { aggiungiSessione, caricaAttiva, nuovoId, salvaAttiva, SessioneAttiva } from './archivio';
import { annullaNotifica } from './notifiche';
import { avanza, fineEsercizio, ripetizioniFatte } from './timer';
import { Esercizio, Sessione } from './tipi';

// La sessione da registrare. Completata: fine = scatto reale dell'ultima fase (anche se chiusa più tardi dalla Home).
// Interrotta (sempre dalla pausa): fine = ora, e restanteMs solo se era sospesa una tenuta.
export function nuovaSessione(a: SessioneAttiva, es: Esercizio, esito: 'completato' | 'interrotto', ora: number, id: string): Sessione {
  const st = a.stato;
  const completata = esito === 'completato';
  const fine = completata ? (fineEsercizio(st, es.ripetizioni, es.tenutaSecondi * 1000, (es.riposoSecondi ?? 0) * 1000) ?? ora) : ora;
  return {
    id,
    esercizioId: es.id,
    nomeEsercizio: es.nome,
    inizio: a.inizio,
    esito,
    ripetizioniFatte: completata ? es.ripetizioni : ripetizioniFatte(st, es.ripetizioni),
    restanteMs: !completata && st.fase === 'pausa' && st.faseSospesa === 'tenuta' ? st.restanteMs : 0,
    fine: new Date(fine).toISOString(),
    ripetizioni: es.ripetizioni,
    tenutaSecondi: es.tenutaSecondi,
    riposoSecondi: es.riposoSecondi,
    obiettivo: es.voltePerGiorno ?? 1,
  };
}

// Timer e Home possono provare a chiudere la stessa sessione: si registra una volta sola (null la seconda).
const giaRegistrate = new Set<string>();

export async function concludiSessione(a: SessioneAttiva, es: Esercizio, esito: 'completato' | 'interrotto', ora: number): Promise<string | null> {
  if (giaRegistrate.has(a.inizio)) return null;
  giaRegistrate.add(a.inizio);
  const id = nuovoId();
  await annullaNotifica(a.notificaId);
  await aggiungiSessione(nuovaSessione(a, es, esito, ora, id));
  await salvaAttiva(null);
  return id;
}

// Annulla: niente storico.
export async function scartaSessione(a: SessioneAttiva): Promise<void> {
  await annullaNotifica(a.notificaId);
  await salvaAttiva(null);
}

// All'apertura: chiude la sessione finita mentre l'app era chiusa (es. tutore). Restituisce quella ancora valida.
export async function sistemaAttiva(esercizi: Esercizio[], ora: number): Promise<SessioneAttiva | null> {
  const a = await caricaAttiva();
  if (!a) return null;
  const es = esercizi.find((e) => e.id === a.esercizioId);
  if (!es) {
    await scartaSessione(a);
    return null;
  }
  if (avanza(a.stato, es.ripetizioni, es.tenutaSecondi * 1000, ora, (es.riposoSecondi ?? 0) * 1000).stato.fase === 'finito') {
    await concludiSessione(a, es, 'completato', ora);
    return null;
  }
  return a;
}
