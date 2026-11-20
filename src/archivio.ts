import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { giornoLocale } from './storico';
import { StatoTimer } from './timer';
import { Esercizio, Sessione } from './tipi';

export interface SessioneAttiva {
  esercizioId: string;
  inizio: string;
  stato: StatoTimer;
  notificaId: string | null;
}

async function leggi<T>(chiave: string): Promise<T | null> {
  const v = await AsyncStorage.getItem(chiave);
  return v === null ? null : (JSON.parse(v) as T);
}
const scrivi = (chiave: string, v: unknown) => AsyncStorage.setItem(chiave, JSON.stringify(v));

export function nuovoId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export async function caricaEsercizi(): Promise<Esercizio[]> {
  const salvati = await leggi<Esercizio[]>('esercizi');
  if (salvati) return salvati;
  const oggi = giornoLocale(new Date());
  const seed: Esercizio[] = [
    { id: nuovoId(), nome: 'Flessione dito', immagine: { tipo: 'icona', nome: 'hand-back-right' }, ripetizioni: 10, tenutaSecondi: 5, creatoIl: oggi },
    { id: nuovoId(), nome: 'Tutore', immagine: { tipo: 'icona', nome: 'timer-outline' }, ripetizioni: 1, tenutaSecondi: 3600, creatoIl: oggi },
  ];
  await scrivi('esercizi', seed);
  return seed;
}

export async function salvaEsercizio(e: Esercizio): Promise<void> {
  const tutti = await caricaEsercizi();
  const i = tutti.findIndex((x) => x.id === e.id);
  if (i >= 0) tutti[i] = e;
  else tutti.push(e);
  await scrivi('esercizi', tutti);
}

export async function eliminaEsercizio(id: string): Promise<void> {
  await scrivi('esercizi', (await caricaEsercizi()).filter((x) => x.id !== id));
}

export async function caricaSessioni(): Promise<Sessione[]> {
  return (await leggi<Sessione[]>('sessioni')) ?? [];
}

// ponytail: tutto lo storico in un'unica chiave JSON; poche sessioni al giorno, regge per anni.
export async function aggiungiSessione(s: Sessione): Promise<void> {
  await scrivi('sessioni', [...(await caricaSessioni()), s]);
}

export async function caricaAttiva(): Promise<SessioneAttiva | null> {
  return leggi<SessioneAttiva>('attiva');
}

export async function salvaAttiva(a: SessioneAttiva | null): Promise<void> {
  if (a === null) await AsyncStorage.removeItem('attiva');
  else await scrivi('attiva', a);
}

// Di quanti ms il beep precede lo scatto: compensa il ritardo audio, si regola dalle Impostazioni.
export async function caricaAnticipo(): Promise<number> {
  return (await leggi<number>('anticipoBeep')) ?? 110;
}

export async function salvaAnticipo(ms: number): Promise<void> {
  await scrivi('anticipoBeep', ms);
}

// Copia la foto nella cartella dell'app: resta anche se viene cancellata dalla galleria.
export async function copiaFoto(uriTemporaneo: string): Promise<string> {
  const dir = new Directory(Paths.document, 'foto');
  if (!dir.exists) dir.create();
  const dest = new File(dir, `${Date.now()}.jpg`);
  await new File(uriTemporaneo).copy(dest);
  return dest.uri;
}
