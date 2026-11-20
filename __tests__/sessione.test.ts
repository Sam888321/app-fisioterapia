jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-file-system', () => ({}));
jest.mock('../src/notifiche', () => ({ annullaNotifica: jest.fn(async () => {}) }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { caricaAttiva, caricaSessioni, salvaAttiva, SessioneAttiva } from '../src/archivio';
import { annullaNotifica } from '../src/notifiche';
import { concludiSessione, sistemaAttiva } from '../src/sessione';
import { Esercizio } from '../src/tipi';

const tutore: Esercizio = { id: 'B', nome: 'Tutore', immagine: { tipo: 'icona', nome: 'x' }, ripetizioni: 1, tenutaSecondi: 3600, creatoIl: '2026-11-20' };
const ora = 10_000_000;
const attiva = (fineFase: number, inizio = '2026-11-20T09:00:00.000Z'): SessioneAttiva => ({
  esercizioId: 'B', inizio, stato: { fase: 'tenuta', ripetizione: 1, fineFase }, notificaId: 'n1',
});

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

test('attiva scaduta viene registrata una volta e cancellata', async () => {
  const a = attiva(ora - 1, 'scaduta-1');
  await salvaAttiva(a);
  expect(await sistemaAttiva([tutore], ora)).toBeNull();
  expect(await caricaAttiva()).toBeNull();
  const s = await caricaSessioni();
  expect(s).toHaveLength(1);
  expect(s[0]).toMatchObject({ esercizioId: 'B', nomeEsercizio: 'Tutore', inizio: 'scaduta-1', esito: 'completato', ripetizioniFatte: 1 });
  expect(annullaNotifica).toHaveBeenCalledWith('n1');

  await concludiSessione(a, tutore, 'completato', 1); // secondo tentativo (timer + home)
  expect(await caricaSessioni()).toHaveLength(1);
});

test('attiva in corso resta', async () => {
  const a = attiva(ora + 60_000, 'in-corso');
  await salvaAttiva(a);
  expect(await sistemaAttiva([tutore], ora)).toEqual(a);
  expect(await caricaSessioni()).toEqual([]);
});

test('attiva in pausa resta anche se vecchia', async () => {
  const a: SessioneAttiva = { ...attiva(0, 'pausa'), stato: { fase: 'pausa', ripetizione: 1, restanteMs: 5000, faseSospesa: 'tenuta' } };
  await salvaAttiva(a);
  expect(await sistemaAttiva([tutore], ora)).toEqual(a);
});

test('attiva di un esercizio eliminato viene scartata', async () => {
  await salvaAttiva(attiva(ora + 60_000, 'orfana'));
  expect(await sistemaAttiva([], ora)).toBeNull();
  expect(await caricaAttiva()).toBeNull();
  expect(await caricaSessioni()).toEqual([]);
  expect(annullaNotifica).toHaveBeenCalledWith('n1');
});

test('nessuna attiva', async () => {
  expect(await sistemaAttiva([tutore], ora)).toBeNull();
});

test('i riposi allungano la sessione: non va chiusa prima del tempo', async () => {
  const es: Esercizio = { ...tutore, ripetizioni: 3, tenutaSecondi: 5, riposoSecondi: 10 };
  // tenuta 1 finita ora: restano riposo, tenuta 2, riposo, tenuta 3 = 30 s
  const a: SessioneAttiva = { esercizioId: 'B', inizio: 'con-riposo', stato: { fase: 'tenuta', ripetizione: 1, fineFase: ora }, notificaId: null };
  await salvaAttiva(a);
  expect(await sistemaAttiva([es], ora + 15_000)).toEqual(a);
});
