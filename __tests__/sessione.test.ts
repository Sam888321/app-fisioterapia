jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-file-system', () => ({}));
jest.mock('../src/notifiche', () => ({ annullaNotifica: jest.fn(async () => {}) }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { caricaAttiva, caricaSessioni, salvaAttiva, SessioneAttiva } from '../src/archivio';
import { annullaNotifica } from '../src/notifiche';
import { concludiSessione, nuovaSessione, scartaSessione, sistemaAttiva } from '../src/sessione';
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
  const r = await sistemaAttiva([tutore], ora);
  expect(await caricaAttiva()).toBeNull();
  const s = await caricaSessioni();
  expect(r).toEqual({ attiva: null, chiusa: { id: s[0].id, nome: 'Tutore' } }); // la Home chiede il dolore
  expect(s).toHaveLength(1);
  expect(s[0]).toMatchObject({ esercizioId: 'B', nomeEsercizio: 'Tutore', inizio: 'scaduta-1', esito: 'completato', ripetizioniFatte: 1, restanteMs: 0, ripetizioni: 1, tenutaSecondi: 3600 });
  expect(s[0].fine).toBe(new Date(ora - 1).toISOString()); // l'ora reale di fine, non quella di apertura
  expect(annullaNotifica).toHaveBeenCalledWith('n1');

  // Secondo tentativo (timer + home): non duplica, ma restituisce lo stesso id (serve per il dolore).
  expect(await concludiSessione(a, tutore, 'completato', ora)).toBe(s[0].id);
  expect(await caricaSessioni()).toHaveLength(1);
});

test('attiva in corso resta', async () => {
  const a = attiva(ora + 60_000, 'in-corso');
  await salvaAttiva(a);
  expect(await sistemaAttiva([tutore], ora)).toEqual({ attiva: a, chiusa: null });
  expect(await caricaSessioni()).toEqual([]);
});

test('attiva in pausa resta anche se vecchia', async () => {
  const a: SessioneAttiva = { ...attiva(0, 'pausa'), stato: { fase: 'pausa', ripetizione: 1, restanteMs: 5000, faseSospesa: 'tenuta' } };
  await salvaAttiva(a);
  expect(await sistemaAttiva([tutore], ora)).toEqual({ attiva: a, chiusa: null });
});

test('attiva di un esercizio eliminato viene scartata', async () => {
  await salvaAttiva(attiva(ora + 60_000, 'orfana'));
  expect(await sistemaAttiva([], ora)).toEqual({ attiva: null, chiusa: null });
  expect(await caricaAttiva()).toBeNull();
  expect(await caricaSessioni()).toEqual([]);
  expect(annullaNotifica).toHaveBeenCalledWith('n1');
});

test('nessuna attiva', async () => {
  expect(await sistemaAttiva([tutore], ora)).toEqual({ attiva: null, chiusa: null });
});

test('i riposi allungano la sessione: non va chiusa prima del tempo', async () => {
  const es: Esercizio = { ...tutore, ripetizioni: 3, tenutaSecondi: 5, riposoSecondi: 10 };
  // tenuta 1 finita ora: restano riposo, tenuta 2, riposo, tenuta 3 = 30 s
  const a: SessioneAttiva = { esercizioId: 'B', inizio: 'con-riposo', stato: { fase: 'tenuta', ripetizione: 1, fineFase: ora }, notificaId: null };
  await salvaAttiva(a);
  expect(await sistemaAttiva([es], ora + 15_000)).toEqual({ attiva: a, chiusa: null });
});

describe('nuovaSessione', () => {
  const fless: Esercizio = { id: 'A', nome: 'Flessione', immagine: { tipo: 'icona', nome: 'x' }, ripetizioni: 10, tenutaSecondi: 5, riposoSecondi: 2, creatoIl: '2026-11-20' };
  const base = (stato: SessioneAttiva['stato']): SessioneAttiva => ({ esercizioId: 'A', inizio: '2026-11-20T09:00:00.000Z', stato, notificaId: null });

  test('completata: fine esatta e copia dei parametri', () => {
    const s = nuovaSessione(base({ fase: 'tenuta', ripetizione: 10, fineFase: ora - 500 }), fless, 'completato', ora, 'x1');
    expect(s).toEqual({
      id: 'x1', esercizioId: 'A', nomeEsercizio: 'Flessione', inizio: '2026-11-20T09:00:00.000Z', esito: 'completato',
      ripetizioniFatte: 10, restanteMs: 0, fine: new Date(ora - 500).toISOString(), ripetizioni: 10, tenutaSecondi: 5, riposoSecondi: 2, obiettivo: 1,
    });
  });

  test('interrotta in tenuta: ripetizioni concluse e tempo mancante', () => {
    const s = nuovaSessione(base({ fase: 'pausa', ripetizione: 7, restanteMs: 2000, faseSospesa: 'tenuta' }), fless, 'interrotto', ora, 'x2');
    expect(s).toMatchObject({ esito: 'interrotto', ripetizioniFatte: 6, restanteMs: 2000, fine: new Date(ora).toISOString() });
  });

  test('interrotta nel riposo: niente tempo mancante', () =>
    expect(nuovaSessione(base({ fase: 'pausa', ripetizione: 7, restanteMs: 1000, faseSospesa: 'riposo' }), fless, 'interrotto', ora, 'x3'))
      .toMatchObject({ ripetizioniFatte: 6, restanteMs: 0 }));

  test('interrotta nella preparazione', () =>
    expect(nuovaSessione(base({ fase: 'pausa', ripetizione: 1, restanteMs: 1000, faseSospesa: 'preparazione' }), fless, 'interrotto', ora, 'x4'))
      .toMatchObject({ ripetizioniFatte: 0, restanteMs: 0 }));
});

test("concludiSessione restituisce l'id salvato", async () => {
  const a: SessioneAttiva = { ...attiva(0, 'con-id'), stato: { fase: 'pausa', ripetizione: 1, restanteMs: 300_000, faseSospesa: 'tenuta' } };
  const id = await concludiSessione(a, tutore, 'interrotto', ora);
  expect(id).toEqual(expect.any(String));
  expect(await caricaSessioni()).toEqual([expect.objectContaining({ id, esito: 'interrotto', restanteMs: 300_000 })]);
});

test('scartaSessione non registra niente', async () => {
  const a = attiva(ora + 60_000, 'da-scartare');
  await salvaAttiva(a);
  await scartaSessione(a);
  expect(await caricaAttiva()).toBeNull();
  expect(await caricaSessioni()).toEqual([]);
  expect(annullaNotifica).toHaveBeenCalledWith('n1');
});
