import { giornoLocale, misura, normalizza, ripetizioneRaggiunta, tenutaFattaMs } from '../src/storico';
import { Esercizio, Sessione } from '../src/tipi';

const fless: Esercizio = { id: 'A', nome: 'Flessione dito', immagine: { tipo: 'icona', nome: 'x' }, ripetizioni: 10, tenutaSecondi: 5, riposoSecondi: 2, creatoIl: '2026-11-18' };
const tutore: Esercizio = { id: 'B', nome: 'Tutore', immagine: { tipo: 'icona', nome: 'x' }, ripetizioni: 1, tenutaSecondi: 3600, creatoIl: '2026-11-18' };
const inizio = '2026-11-20T09:00:00.000Z';
const t0 = Date.parse(inizio);
const ses = (x: Partial<Sessione>): Sessione => ({ id: 's', esercizioId: 'A', nomeEsercizio: 'Flessione dito', inizio, esito: 'completato', ripetizioniFatte: 10, ...x });

test('giornoLocale usa la data locale', () => {
  expect(giornoLocale(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
});

test('misura: tempo solo per una ripetizione lunga', () => {
  expect(misura({ ripetizioni: 1, tenutaSecondi: 3600 })).toBe('tempo');
  expect(misura({ ripetizioni: 10, tenutaSecondi: 5 })).toBe('volte');
  expect(misura({ ripetizioni: 1, tenutaSecondi: 30 })).toBe('volte');
});

describe('normalizza', () => {
  test('sessione vecchia annullata diventa interrotta con parametri e fine stimati', () => {
    const n = normalizza(ses({ esito: 'annullato', ripetizioniFatte: 3 }), [fless]);
    expect(n).toMatchObject({ esito: 'interrotto', restanteMs: 0, ripetizioni: 10, tenutaSecondi: 5, riposoSecondi: 2 });
    expect(n.fine).toBe(new Date(t0 + 3000 + 3 * 5000 + 2 * 2000).toISOString());
  });

  test('completata vecchia: fine = preparazione + tenute + riposi', () =>
    expect(normalizza(ses({}), [fless]).fine).toBe(new Date(t0 + 3000 + 10 * 5000 + 9 * 2000).toISOString()));

  test('i campi già salvati restano', () => {
    const s = ses({ esito: 'interrotto', fine: '2026-11-20T09:30:00.000Z', restanteMs: 1000, ripetizioni: 8, tenutaSecondi: 4, riposoSecondi: 0 });
    expect(normalizza(s, [fless])).toEqual(s);
  });

  test("la copia dei parametri vince sull'esercizio attuale", () => {
    const n = normalizza(ses({ tenutaSecondi: 5, ripetizioni: 10 }), [{ ...fless, tenutaSecondi: 10 }]);
    expect(tenutaFattaMs(n)).toBe(50_000);
  });

  test('esercizio eliminato senza copie: tempo sconosciuto, conta solo il numero', () => {
    const n = normalizza(ses({ esito: 'annullato', ripetizioniFatte: 4 }), []);
    expect(tenutaFattaMs(n)).toBeNull();
    expect(ripetizioneRaggiunta(n)).toBe(4);
    expect(n.fine).toBe(inizio);
  });
});

test('ripetizioneRaggiunta e tenutaFattaMs con tenuta interrotta', () => {
  const t = normalizza(ses({ esercizioId: 'B', esito: 'interrotto', ripetizioniFatte: 0, restanteMs: 300_000 }), [tutore]);
  expect(ripetizioneRaggiunta(t)).toBe(1);
  expect(tenutaFattaMs(t)).toBe(3_300_000);
  const f = normalizza(ses({ esito: 'interrotto', ripetizioniFatte: 6, restanteMs: 2000 }), [fless]);
  expect(ripetizioneRaggiunta(f)).toBe(7);
  expect(tenutaFattaMs(f)).toBe(33_000);
});
