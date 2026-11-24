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

// Timer e Home possono provare a chiudere la stessa sessione (all'ultimo secondo arriva anche la notifica):
// si registra una volta sola, ma entrambi ricevono l'id, così la domanda sul dolore compare sempre.
const giaRegistrate = new Map<string, string>(); // inizio → id

export async function concludiSessione(a: SessioneAttiva, es: Esercizio, esito: 'completato' | 'interrotto', ora: number): Promise<string> {
  const gia = giaRegistrate.get(a.inizio);
  if (gia) return gia;
  const id = nuovoId();
  giaRegistrate.set(a.inizio, id);
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

// All'apertura: chiude la sessione finita mentre l'app era chiusa (es. tutore).
// Restituisce quella ancora valida e, se ne ha chiusa una, quale (la Home chiede il dolore).
export async function sistemaAttiva(
  esercizi: Esercizio[],
  ora: number,
): Promise<{ attiva: SessioneAttiva | null; chiusa: { id: string; nome: string } | null }> {
  const a = await caricaAttiva();
  if (!a) return { attiva: null, chiusa: null };
  const es = esercizi.find((e) => e.id === a.esercizioId);
  if (!es) {
    await scartaSessione(a);
    return { attiva: null, chiusa: null };
  }
  if (avanza(a.stato, es.ripetizioni, es.tenutaSecondi * 1000, ora, (es.riposoSecondi ?? 0) * 1000).stato.fase === 'finito') {
    return { attiva: null, chiusa: { id: await concludiSessione(a, es, 'completato', ora), nome: es.nome } };
  }
  return { attiva: a, chiusa: null };
}
