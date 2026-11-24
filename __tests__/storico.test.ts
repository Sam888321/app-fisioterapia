import { coloreGiorno, coloriMese, giornoLocale, inPausa, mettiInPausa, misura, normalizza, riprendi, riquadriGiorno, ripetizioneRaggiunta, serie, tenutaFattaMs } from '../src/storico';
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

describe('riquadri, colori e serie', () => {
  const OGGI = '2026-11-20';
  const A = { ...fless, voltePerGiorno: 2 }; // Flessione, minimo 2
  const B = tutore; // nessun obiettivo: minimo 1
  let k = 0;
  const alle = (g: number, h: number, x: Partial<Sessione> = {}): Sessione =>
    ses({ id: `k${k++}`, inizio: new Date(2026, 10, g, h, 0).toISOString(), ...x });
  const fl = (g: number, h: number, x: Partial<Sessione> = {}) => alle(g, h, x);
  const tu = (g: number, h: number, x: Partial<Sessione> = {}) => alle(g, h, { esercizioId: 'B', nomeEsercizio: 'Tutore', ripetizioniFatte: 1, ...x });
  const riq = (ss: Sessione[], data: string, nome: string) => riquadriGiorno([A, B], ss, data, OGGI).find((r) => r.nome === nome)!;

  test('verde con il minimo raggiunto, anche con una interrotta in più', () => {
    const ss = [fl(19, 9), fl(19, 12), fl(19, 15, { esito: 'interrotto', ripetizioniFatte: 3 })];
    expect(riq(ss, '2026-11-19', 'Flessione dito')).toMatchObject({ colore: 'verde', completate: 2, interrotte: 1, obiettivo: 2, misura: 'volte' });
  });

  test('arancione sotto il minimo o solo interrotte; rosso se niente', () => {
    expect(riq([fl(19, 9)], '2026-11-19', 'Flessione dito').colore).toBe('arancione');
    expect(riq([tu(19, 9, { esito: 'interrotto', ripetizioniFatte: 0, restanteMs: 300_000 })], '2026-11-19', 'Tutore').colore).toBe('arancione');
    expect(riq([], '2026-11-19', 'Tutore').colore).toBe('rosso');
  });

  test('oggi non è mai rosso', () => {
    expect(riq([], OGGI, 'Tutore').colore).toBe('da-fare');
    expect(coloreGiorno(riquadriGiorno([A, B], [], OGGI, OGGI), OGGI, OGGI)).toBe('in-corso');
    const tutto = [fl(20, 9), fl(20, 10), tu(20, 11)];
    expect(coloreGiorno(riquadriGiorno([A, B], tutto, OGGI, OGGI), OGGI, OGGI)).toBe('verde');
  });

  test('prima della creazione niente', () => {
    const nuovo = { ...B, id: 'C', nome: 'Nuovo', creatoIl: '2026-11-21' };
    expect(riquadriGiorno([A, nuovo], [], '2026-11-19', OGGI).map((r) => r.nome)).toEqual(['Flessione dito']);
    expect(riquadriGiorno([A], [], '2026-11-17', OGGI)).toEqual([]);
    expect(coloreGiorno([], '2026-11-17', OGGI)).toBeNull();
  });

  test('riquadri con sessioni vecchie: annullato conta come interrotto', () =>
    expect(riq([fl(19, 9, { esito: 'annullato', ripetizioniFatte: 4 })], '2026-11-19', 'Flessione dito')).toMatchObject({ interrotte: 1, completate: 0, colore: 'arancione' }));

  test('esercizio eliminato con sessioni resta, col nome salvato e senza immagine', () => {
    const r = riquadriGiorno([A], [alle(19, 9, { esercizioId: 'X', nomeEsercizio: 'Vecchio' })], '2026-11-19', OGGI).find((x) => x.esercizioId === 'X');
    expect(r).toMatchObject({ nome: 'Vecchio', completate: 1 });
    expect(r!.immagine).toBeUndefined();
  });

  test('riquadro del tutore: tempo, ultima interrotta, dolore massimo', () => {
    const ss = [
      tu(19, 8, { tenutaSecondi: 3600, ripetizioni: 1, dolore: 1 }),
      tu(19, 11, { tenutaSecondi: 3600, ripetizioni: 1 }),
      tu(19, 15, { esito: 'interrotto', ripetizioniFatte: 0, restanteMs: 300_000, tenutaSecondi: 3600, ripetizioni: 1, dolore: 2 }),
    ];
    expect(riq(ss, '2026-11-19', 'Tutore')).toMatchObject({
      misura: 'tempo', completate: 2, interrotte: 1, tenutaMs: 2 * 3_600_000 + 3_300_000,
      ultimaInterrotta: { raggiunta: 1, ripetizioni: 1, restanteMs: 300_000 }, doloreMax: 2, colore: 'verde',
    });
    expect(riq([tu(19, 8)], '2026-11-19', 'Tutore').doloreMax).toBeUndefined();
  });

  test('colore del giorno = il peggiore', () => {
    const ss = [fl(19, 9), fl(19, 10), tu(19, 11)];
    expect(coloreGiorno(riquadriGiorno([A, B], ss, '2026-11-19', OGGI), '2026-11-19', OGGI)).toBe('verde');
    expect(coloreGiorno(riquadriGiorno([A, B], ss.slice(1), '2026-11-19', OGGI), '2026-11-19', OGGI)).toBe('arancione');
    expect(coloreGiorno(riquadriGiorno([A, B], ss.slice(2), '2026-11-19', OGGI), '2026-11-19', OGGI)).toBe('rosso');
  });

  const pieno = (g: number) => [fl(g, 9), fl(g, 10), tu(g, 11)];
  test('serie di giorni verdi', () => {
    // creati il 18: 18, 19 verdi; oggi (20) in corso → 2
    expect(serie([A, B], [...pieno(18), ...pieno(19)], OGGI)).toBe(2);
    expect(serie([A, B], [...pieno(18), ...pieno(19), ...pieno(20)], OGGI)).toBe(3);
    expect(serie([A, B], [...pieno(18), fl(19, 9), ...pieno(20)], OGGI)).toBe(1); // il 19 arancione interrompe
    expect(serie([A, B], [], OGGI)).toBe(0);
  });

  test('coloriMese: solo fino a oggi, niente prima della creazione', () => {
    const c = coloriMese([A, B], pieno(19), 2026, 10, OGGI);
    expect(c['2026-11-17']).toBeUndefined();
    expect(c['2026-11-18']).toBe('rosso');
    expect(c['2026-11-19']).toBe('verde');
    expect(c['2026-11-20']).toBe('in-corso');
    expect(c['2026-11-21']).toBeUndefined();
  });
});

test("il minimo di un giorno passato è quello salvato nella sessione, non quello attuale", () => {
  const ora3 = { ...fless, voltePerGiorno: 3 }; // obiettivo alzato dopo
  const s = (h: number) => ses({ id: `o${h}`, inizio: new Date(2026, 10, 19, h).toISOString(), obiettivo: 2 });
  const r = riquadriGiorno([ora3], [s(9), s(12)], '2026-11-19', '2026-11-20')[0];
  expect(r).toMatchObject({ obiettivo: 2, colore: 'verde' });
});

test('storico veloce anche con un anno di dati', () => {
  const ss: Sessione[] = [];
  for (let g = 0; g < 365; g++) for (let h = 8; h < 17; h++)
    ss.push(ses({ id: `y${g}-${h}`, inizio: new Date(2025, 10, 20 + g, h).toISOString() }));
  const A2 = { ...fless, voltePerGiorno: 2, creatoIl: '2025-11-20' };
  const t0 = Date.now();
  expect(serie([A2], ss, '2026-11-19')).toBeGreaterThan(300);
  coloriMese([A2], ss, 2026, 10, '2026-11-19');
  expect(Date.now() - t0).toBeLessThan(250); // senza indice per giorno: ~1 s
});

describe('pausa', () => {
  const OGGI = '2026-11-20';
  const A = { ...fless, voltePerGiorno: 1, creatoIl: '2026-11-10' };
  const B = { ...tutore, creatoIl: '2026-11-10' };
  let k = 0;
  const fatta = (es: Esercizio, g: number) => ses({ id: `p${k++}`, esercizioId: es.id, nomeEsercizio: es.nome, inizio: new Date(2026, 10, g, 9).toISOString() });

  test('inPausa: periodi chiusi e aperti, estremi inclusi', () => {
    const e = { ...A, pause: [{ da: '2026-11-12', a: '2026-11-14' }, { da: '2026-11-18' }] };
    expect(['2026-11-11', '2026-11-12', '2026-11-14', '2026-11-15', '2026-11-18', '2026-11-30'].map((d) => inPausa(e, d)))
      .toEqual([false, true, true, false, true, true]);
    expect(inPausa(A, OGGI)).toBe(false);
  });

  test('mettiInPausa da oggi; riprendi chiude a ieri; stesso giorno = niente pausa', () => {
    const p = mettiInPausa(A, '2026-11-15');
    expect(p.pause).toEqual([{ da: '2026-11-15' }]);
    expect(mettiInPausa(p, '2026-11-16')).toBe(p); // già in pausa
    expect(riprendi(p, '2026-11-18').pause).toEqual([{ da: '2026-11-15', a: '2026-11-17' }]);
    expect(riprendi(p, '2026-11-15').pause).toEqual([]);
    expect(riprendi(A, OGGI)).toBe(A); // non era in pausa
  });

  test('esercizio in pausa senza sessioni non rende rosso il giorno; tutti in pausa = grigio', () => {
    const Bp = { ...B, pause: [{ da: '2026-11-15' }] };
    expect(coloreGiorno(riquadriGiorno([A, Bp], [fatta(A, 16)], '2026-11-16', OGGI), '2026-11-16', OGGI)).toBe('verde');
    const Ap = { ...A, pause: [{ da: '2026-11-15' }] };
    expect(coloreGiorno(riquadriGiorno([Ap, Bp], [], '2026-11-16', OGGI), '2026-11-16', OGGI)).toBe('pausa');
    expect(coloreGiorno(riquadriGiorno([Ap, Bp], [], OGGI, OGGI), OGGI, OGGI)).toBe('pausa');
  });

  test('esercizio in pausa con sessioni: riquadro "pausa" che non pesa sul giorno', () => {
    const Bp = { ...B, pause: [{ da: '2026-11-15' }] };
    const rr = riquadriGiorno([A, Bp], [fatta(A, 16), fatta(B, 16)], '2026-11-16', OGGI);
    expect(rr.find((r) => r.esercizioId === 'B')).toMatchObject({ colore: 'pausa', completate: 1 });
    expect(coloreGiorno(rr, '2026-11-16', OGGI)).toBe('verde');
  });

  test('la serie salta i giorni di pausa', () => {
    // 12-13 verdi, 14-17 tutto in pausa, 18-19 verdi, oggi in corso → 4
    const per = (e: Esercizio) => ({ ...e, pause: [{ da: '2026-11-14', a: '2026-11-17' }] });
    const ss = [12, 13, 18, 19].flatMap((g) => [fatta(A, g), fatta(B, g)]);
    const e2 = [per(A), per(B)];
    expect(serie(e2, ss, OGGI)).toBe(4);
    expect(coloriMese(e2, ss, 2026, 10, OGGI)['2026-11-15']).toBe('pausa');
  });
});
