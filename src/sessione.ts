import { aggiungiSessione, caricaAttiva, nuovoId, salvaAttiva, SessioneAttiva } from './archivio';
import { annullaNotifica } from './notifiche';
import { avanza } from './timer';
import { Esercizio, Sessione } from './tipi';

// Timer e Home possono provare a chiudere la stessa sessione: si registra una volta sola.
const giaRegistrate = new Set<string>();

export async function concludiSessione(a: SessioneAttiva, es: Esercizio, esito: Sessione['esito'], ripetizioniFatte: number): Promise<void> {
  if (giaRegistrate.has(a.inizio)) return;
  giaRegistrate.add(a.inizio);
  await annullaNotifica(a.notificaId);
  await aggiungiSessione({ id: nuovoId(), esercizioId: es.id, nomeEsercizio: es.nome, inizio: a.inizio, esito, ripetizioniFatte });
  await salvaAttiva(null);
}

// All'apertura: chiude la sessione finita mentre l'app era chiusa (es. tutore). Restituisce quella ancora valida.
export async function sistemaAttiva(esercizi: Esercizio[], ora: number): Promise<SessioneAttiva | null> {
  const a = await caricaAttiva();
  if (!a) return null;
  const es = esercizi.find((e) => e.id === a.esercizioId);
  if (!es) {
    await annullaNotifica(a.notificaId);
    await salvaAttiva(null);
    return null;
  }
  if (avanza(a.stato, es.ripetizioni, es.tenutaSecondi * 1000, ora).stato.fase === 'finito') {
    await concludiSessione(a, es, 'completato', es.ripetizioni);
    return null;
  }
  return a;
}
