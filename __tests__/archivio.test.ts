jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-file-system', () => ({}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { aggiornaSessione, aggiungiSessione, caricaAnticipo, caricaAttiva, caricaEsercizi, caricaSessioni, eliminaEsercizio, nuovoId, salvaAnticipo, salvaAttiva, salvaEsercizio, sostituisciDati } from '../src/archivio';
import { validaEsercizio } from '../src/tipi';

beforeEach(() => AsyncStorage.clear());

test('primo avvio crea i seed', async () => {
  const e = await caricaEsercizi();
  expect(e.map((x) => [x.nome, x.ripetizioni, x.tenutaSecondi])).toEqual([['Flessione dito', 10, 5], ['Tutore', 1, 3600]]);
  expect(e.map((x) => x.immagine)).toEqual([{ tipo: 'icona', nome: 'hand-back-right' }, { tipo: 'icona', nome: 'timer-outline' }]);
  expect(e[0].creatoIl).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

test('salva sostituisce per id ed elimina', async () => {
  const [primo] = await caricaEsercizi();
  await salvaEsercizio({ ...primo, nome: 'Nuovo nome' });
  expect((await caricaEsercizi()).map((x) => x.nome)).toEqual(['Nuovo nome', 'Tutore']);
  await eliminaEsercizio(primo.id);
  await eliminaEsercizio((await caricaEsercizi())[0].id);
  expect(await caricaEsercizi()).toEqual([]); // lista vuota non ricrea i seed
});

test('salva aggiunge un esercizio nuovo in fondo', async () => {
  const prima = await caricaEsercizi();
  await salvaEsercizio({ ...prima[0], id: nuovoId(), nome: 'Estensione' });
  expect((await caricaEsercizi()).map((x) => x.nome)).toEqual(['Flessione dito', 'Tutore', 'Estensione']);
});

test('nuovoId è unico', () => {
  const ids = new Set(Array.from({ length: 100 }, nuovoId));
  expect(ids.size).toBe(100);
});

test('sessioni e attiva fanno andata e ritorno', async () => {
  expect(await caricaSessioni()).toEqual([]);
  const s = { id: '1', esercizioId: 'A', nomeEsercizio: 'A', inizio: '2026-11-20T09:00:00.000Z', esito: 'completato' as const, ripetizioniFatte: 10 };
  await aggiungiSessione(s);
  await aggiungiSessione({ ...s, id: '2' });
  expect((await caricaSessioni()).map((x) => x.id)).toEqual(['1', '2']);

  expect(await caricaAttiva()).toBeNull();
  const a = { esercizioId: 'A', inizio: s.inizio, stato: { fase: 'tenuta' as const, ripetizione: 2, fineFase: 5 }, notificaId: 'n1' };
  await salvaAttiva(a);
  expect(await caricaAttiva()).toEqual(a);
  await salvaAttiva(null);
  expect(await caricaAttiva()).toBeNull();
});

test('validaEsercizio', () => {
  const ok = { nome: 'A', ripetizioni: '10', tenuta: '5', voltePerGiorno: '', riposo: '' };
  expect(validaEsercizio(ok)).toBeNull();
  expect(validaEsercizio({ ...ok, riposo: '0' })).toBeNull();
  expect(validaEsercizio({ ...ok, riposo: '3' })).toBeNull();
  expect(validaEsercizio({ ...ok, riposo: 'x' })).toBe('Riposo: 0 o più secondi, o vuoto');
  expect(validaEsercizio({ ...ok, voltePerGiorno: '3' })).toBeNull();
  expect(validaEsercizio({ ...ok, nome: '  ' })).toBe('Inserisci un nome');
  expect(validaEsercizio({ ...ok, ripetizioni: '0' })).toBe('Ripetizioni: almeno 1');
  expect(validaEsercizio({ ...ok, ripetizioni: '' })).toBe('Ripetizioni: almeno 1');
  expect(validaEsercizio({ ...ok, tenuta: 'abc' })).toBe('Tenuta: almeno 1');
  expect(validaEsercizio({ ...ok, tenuta: '2.5' })).toBe('Tenuta: almeno 1');
  expect(validaEsercizio({ ...ok, voltePerGiorno: '0' })).toBe('Volte al giorno: almeno 1 o vuoto');
});

test('anticipo beep: 110 ms se mai impostato, poi quello salvato', async () => {
  expect(await caricaAnticipo()).toBe(110);
  await salvaAnticipo(80);
  expect(await caricaAnticipo()).toBe(80);
});

test('aggiornaSessione modifica solo quella sessione', async () => {
  const s = { esercizioId: 'A', nomeEsercizio: 'A', inizio: '2026-11-20T09:00:00.000Z', esito: 'completato' as const, ripetizioniFatte: 1 };
  await aggiungiSessione({ ...s, id: 's1' });
  await aggiungiSessione({ ...s, id: 's2' });
  await aggiornaSessione('s2', { dolore: 2 });
  expect(await caricaSessioni()).toEqual([{ ...s, id: 's1' }, { ...s, id: 's2', dolore: 2 }]);
});

const nuovo = { id: 'N', nome: 'Nuovo', immagine: { tipo: 'icona' as const, nome: 'x' }, ripetizioni: 1, tenutaSecondi: 5, creatoIl: '2026-11-24' };

test('sostituisciDati sovrascrive esercizi, sessioni e anticipo', async () => {
  await caricaEsercizi(); // crea i seed
  expect(await sostituisciDati({ esercizi: [nuovo], sessioni: [], anticipoBeep: 90 })).toBe(true);
  expect(await caricaEsercizi()).toEqual([nuovo]);
  expect(await caricaSessioni()).toEqual([]);
  expect(await caricaAnticipo()).toBe(90);
});

test('sostituisciDati rifiuta con un esercizio in corso (la sua sveglia andrebbe persa)', async () => {
  const attiva = { esercizioId: 'A', inizio: 'x', stato: { fase: 'tenuta' as const, ripetizione: 1, fineFase: 1 }, notificaId: 'n' };
  await salvaAttiva(attiva);
  const prima = await caricaEsercizi();
  expect(await sostituisciDati({ esercizi: [nuovo], sessioni: [], anticipoBeep: 90 })).toBe(false);
  expect(await caricaEsercizi()).toEqual(prima);
  expect(await caricaAttiva()).toEqual(attiva);
});
