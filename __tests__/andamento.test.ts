import { barre, blocchiGiorno, periodo, sposta } from '../src/andamento';
import { Esercizio, Sessione } from '../src/tipi';

const tutore: Esercizio = { id: 'B', nome: 'Tutore', immagine: { tipo: 'icona', nome: 'x' }, ripetizioni: 1, tenutaSecondi: 3600, voltePerGiorno: 2, creatoIl: '2026-11-17' };
const fless: Esercizio = { id: 'A', nome: 'Flessione', immagine: { tipo: 'icona', nome: 'x' }, ripetizioni: 10, tenutaSecondi: 5, voltePerGiorno: 2, creatoIl: '2026-11-17' };
const OGGI = '2026-11-20';
let k = 0;
const ses = (es: Esercizio, inizio: Date, x: Partial<Sessione> = {}): Sessione => ({
  id: `s${k++}`, esercizioId: es.id, nomeEsercizio: es.nome, inizio: inizio.toISOString(), esito: 'completato',
  ripetizioniFatte: es.ripetizioni, ripetizioni: es.ripetizioni, tenutaSecondi: es.tenutaSecondi, ...x,
});
const d = (g: number, h: number, m = 0) => new Date(2026, 10, g, h, m);

test('periodo: settimana da lunedì a domenica, mese intero', () => {
  expect(periodo('settimana', '2026-11-20')).toMatchObject({ da: '2026-11-16', a: '2026-11-22' });
  expect(periodo('settimana', '2026-11-20').giorni).toHaveLength(7);
  const m = periodo('mese', '2026-11-20');
  expect(m).toMatchObject({ da: '2026-11-01', a: '2026-11-30' });
  expect(m.giorni).toHaveLength(30);
  expect(periodo('giorno', '2026-11-20').giorni).toEqual(['2026-11-20']);
});

test('sposta di settimane e mesi', () => {
  expect(sposta('settimana', '2026-11-20', -1)).toBe('2026-11-13');
  expect(sposta('mese', '2026-11-20', 1)).toBe('2026-12-20');
  expect(sposta('mese', '2026-01-31', 1)).toBe('2026-02-28');
  expect(sposta('giorno', '2026-11-30', 1)).toBe('2026-12-01');
});

test('barre del tutore in tempo, con il minimo', () => {
  const ss = [ses(tutore, d(19, 8)), ses(tutore, d(19, 12), { esito: 'interrotto', ripetizioniFatte: 0, restanteMs: 300_000, dolore: 2 })];
  const r = barre(tutore, ss, [tutore], 'settimana', OGGI, OGGI);
  expect(r.barre.find((b) => b.data === '2026-11-19')).toEqual({ data: '2026-11-19', completato: 3_600_000, interrotto: 3_300_000, doloreMax: 2 });
  expect(r.minimo).toBe(7_200_000);
});

test('barre a volte: conteggi e minimo = obiettivo', () => {
  const ss = [ses(fless, d(18, 9)), ses(fless, d(18, 10)), ses(fless, d(18, 11), { esito: 'interrotto', ripetizioniFatte: 3 })];
  const r = barre(fless, ss, [fless], 'settimana', OGGI, OGGI);
  expect(r.barre.find((b) => b.data === '2026-11-18')).toMatchObject({ completato: 2, interrotto: 1 });
  expect(r.minimo).toBe(2);
});

test('giorni validi: da creatoIl a oggi; sopra = totale ≥ minimo; media sui validi', () => {
  const ss = [ses(fless, d(17, 9)), ses(fless, d(17, 10)), ses(fless, d(18, 9)), ses(fless, d(23, 9))];
  const r = barre(fless, ss, [fless], 'settimana', OGGI, OGGI);
  expect(r.giorniValidi).toBe(4); // 17, 18, 19, 20 (16 prima della creazione, 21-22 futuri)
  expect(r.giorniSopra).toBe(1); // solo il 17
  expect(r.media).toBe(3 / 4);
});

test('blocchi tagliati a mezzanotte e contati nel giorno di inizio', () => {
  const s = ses(tutore, d(19, 23, 30), { fine: d(20, 0, 30).toISOString() });
  expect(blocchiGiorno(tutore, [s], [tutore], '2026-11-19').blocchi).toEqual([expect.objectContaining({ daMin: 1410, aMin: 1440, esito: 'completato' })]);
  expect(blocchiGiorno(tutore, [s], [tutore], '2026-11-20').blocchi).toEqual([]);
});

test('striscia allargata se ci sono sessioni prima delle 6', () => {
  const r = blocchiGiorno(tutore, [ses(tutore, d(19, 5, 20))], [tutore], '2026-11-19');
  expect(r).toMatchObject({ daOra: 5, aOra: 24 });
  expect(blocchiGiorno(tutore, [], [tutore], '2026-11-19')).toMatchObject({ daOra: 6, aOra: 24, blocchi: [] });
});

test('sopra il minimo contano solo le completate (come i colori dello Storico)', () => {
  const ss = [ses(fless, d(18, 9)), ses(fless, d(18, 10), { esito: 'interrotto', ripetizioniFatte: 2 })];
  expect(barre(fless, ss, [fless], 'settimana', OGGI, OGGI).giorniSopra).toBe(0);
});

test('sopra il minimo usa il minimo salvato quel giorno', () => {
  const ss = [ses(tutore, d(18, 9), { obiettivo: 2 }), ses(tutore, d(18, 12), { obiettivo: 2 })];
  expect(barre({ ...tutore, voltePerGiorno: 3 }, ss, [tutore], 'settimana', OGGI, OGGI).giorniSopra).toBe(1);
});

test('i giorni in pausa non contano tra i validi e sono segnati', () => {
  const p = { ...fless, pause: [{ da: '2026-11-18', a: '2026-11-19' }] };
  const r = barre(p, [], [p], 'settimana', OGGI, OGGI);
  expect(r.giorniValidi).toBe(2); // 17 e 20
  expect(r.barre.filter((b) => b.pausa).map((b) => b.data)).toEqual(['2026-11-18', '2026-11-19']);
});
