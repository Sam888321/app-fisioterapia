import { testoRiepilogo } from '../src/riepilogo';
import { Esercizio, Sessione } from '../src/tipi';

const A: Esercizio = { id: 'A', nome: 'Flessione dito', immagine: { tipo: 'icona', nome: 'x' }, ripetizioni: 10, tenutaSecondi: 5, voltePerGiorno: 2, creatoIl: '2026-11-19' };
const B: Esercizio = { id: 'B', nome: 'Tutore', immagine: { tipo: 'icona', nome: 'x' }, ripetizioni: 1, tenutaSecondi: 3600, creatoIl: '2026-11-19' };
let k = 0;
const ses = (es: Esercizio, g: number, h: number, x: Partial<Sessione> = {}): Sessione => ({
  id: `s${k++}`, esercizioId: es.id, nomeEsercizio: es.nome, inizio: new Date(2026, 10, g, h).toISOString(), esito: 'completato',
  ripetizioniFatte: es.ripetizioni, ripetizioni: es.ripetizioni, tenutaSecondi: es.tenutaSecondi, ...x,
});

test('riepilogo di 7 giorni: intestazione, sintesi, un giorno per riga dal più recente', () => {
  const ss = [
    ses(A, 20, 9, { dolore: 1 }), ses(A, 20, 13),
    ses(B, 20, 8), ses(B, 20, 11), ses(B, 20, 15, { esito: 'interrotto', ripetizioniFatte: 0, restanteMs: 300_000 }),
    ses(A, 19, 10),
  ];
  expect(testoRiepilogo([A, B], ss, 7, '2026-11-20').split('\n')).toEqual([
    'Fisioterapia — ultimi 7 giorni (dal 14/11 al 20/11)',
    'Serie: 1 giorno di fila · giorni completi: 1 su 2',
    '',
    'ven 20/11 — Flessione dito: 2 volte · Tutore: 3 volte, 2h 55m (1 interrotta) · dolore max: lieve',
    'gio 19/11 — Flessione dito: 1 volta · Tutore: 0 volte',
  ]);
});

test('senza dati: solo intestazione e sintesi', () =>
  expect(testoRiepilogo([], [], 30, '2026-11-20').split('\n')).toEqual([
    'Fisioterapia — ultimi 30 giorni (dal 22/10 al 20/11)',
    'Serie: 0 giorni di fila · giorni completi: 0 su 0',
  ]));

test('riepilogo: giorni tutti in pausa e esercizi in pausa senza sessioni', () => {
  const Bp = { ...B, pause: [{ da: '2026-11-19' }] };
  const Ap = { ...A, pause: [{ da: '2026-11-19', a: '2026-11-19' }] };
  const righe = testoRiepilogo([Ap, Bp], [ses(A, 20, 9)], 7, '2026-11-20').split('\n');
  expect(righe).toContain('ven 20/11 — Flessione dito: 1 volta'); // il tutore in pausa senza sessioni non compare
  expect(righe).toContain('gio 19/11 — in pausa');
  expect(righe[1]).toBe('Serie: 0 giorni di fila · giorni completi: 0 su 1');
});
