import { fasceOrarie, giornoLocale, riepilogoMese } from '../src/storico';
import { Esercizio, Sessione } from '../src/tipi';

const A: Esercizio = { id: 'A', nome: 'Flessione dito', immagine: { tipo: 'icona', nome: 'x' }, ripetizioni: 10, tenutaSecondi: 5, voltePerGiorno: 3, creatoIl: '2026-11-18' };
const B: Esercizio = { id: 'B', nome: 'Tutore', immagine: { tipo: 'icona', nome: 'x' }, ripetizioni: 1, tenutaSecondi: 3600, creatoIl: '2026-11-18' };
const oggi = new Date(2026, 10, 20, 16, 0);

let n = 0;
function ses(esercizioId: string, nome: string, d: Date, esito: Sessione['esito'] = 'completato', ripetizioniFatte = 10): Sessione {
  return { id: String(n++), esercizioId, nomeEsercizio: nome, inizio: d.toISOString(), esito, ripetizioniFatte };
}

const giorno = (g: ReturnType<typeof riepilogoMese>, data: string) => g.find((x) => x.data === data);
const riga = (g: ReturnType<typeof riepilogoMese>, data: string, nome: string) => giorno(g, data)?.righe.find((r) => r.nome === nome);

test('giornoLocale usa la data locale', () => {
  expect(giornoLocale(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
});

test('righe di oggi: conteggi, orari, stato oggi', () => {
  const s = [ses('A', A.nome, new Date(2026, 10, 20, 14, 40)), ses('A', A.nome, new Date(2026, 10, 20, 9, 12))];
  const r = riga(riepilogoMese([A, B], s, 2026, 10, oggi), '2026-11-20', 'Flessione dito');
  expect(r).toMatchObject({ esercizioId: 'A', completate: 2, target: 3, orari: ['09:12', '14:40'], stato: 'oggi' });
});

test('giorno passato sotto target è saltato', () => {
  const s = [ses('A', A.nome, new Date(2026, 10, 19, 8, 0)), ses('B', B.nome, new Date(2026, 10, 19, 10, 0))];
  const g = riepilogoMese([A, B], s, 2026, 10, oggi);
  expect(riga(g, '2026-11-19', 'Flessione dito')?.stato).toBe('saltato');
  expect(riga(g, '2026-11-19', 'Tutore')?.stato).toBe('ok');
});

test('raggiunto il target è ok', () => {
  const s = [8, 12, 20].map((h) => ses('A', A.nome, new Date(2026, 10, 19, h, 0)));
  expect(riga(riepilogoMese([A], s, 2026, 10, oggi), '2026-11-19', 'Flessione dito')?.stato).toBe('ok');
});

test('senza target è saltato solo con zero completate', () => {
  const r = riga(riepilogoMese([A, B], [], 2026, 10, oggi), '2026-11-18', 'Tutore');
  expect(r).toMatchObject({ completate: 0, stato: 'saltato' });
  expect(r?.target).toBeUndefined();
});

test('annullate non contano e sono elencate', () => {
  const s = [ses('A', A.nome, new Date(2026, 10, 20, 10, 0), 'annullato', 4)];
  const r = riga(riepilogoMese([A], s, 2026, 10, oggi), '2026-11-20', 'Flessione dito');
  expect(r).toMatchObject({ completate: 0, orari: [], annullate: [{ orario: '10:00', ripetizioniFatte: 4 }] });
});

test('esercizio non ancora creato non compare', () => {
  const g = riepilogoMese([A, B], [], 2026, 10, oggi);
  expect(giorno(g, '2026-11-17')).toBeUndefined();
  expect(g.map((x) => x.data)).toEqual(['2026-11-20', '2026-11-19', '2026-11-18']);
});

test('esercizio eliminato resta nello storico', () => {
  const s = [ses('X', 'Estensione', new Date(2026, 10, 5, 9, 0))];
  const r = riga(riepilogoMese([A], s, 2026, 10, oggi), '2026-11-05', 'Estensione');
  expect(r).toMatchObject({ esercizioId: 'X', completate: 1, stato: 'ok' });
});

test('esercizio rinominato usa il nome attuale', () => {
  const s = [ses('A', 'Vecchio nome', new Date(2026, 10, 19, 9, 0))];
  expect(riga(riepilogoMese([A], s, 2026, 10, oggi), '2026-11-19', 'Flessione dito')?.completate).toBe(1);
});

test('sessioni a cavallo di mezzanotte', () => {
  const s = [ses('B', B.nome, new Date(2026, 10, 19, 23, 30)), ses('B', B.nome, new Date(2026, 10, 20, 0, 10))];
  const g = riepilogoMese([B], s, 2026, 10, oggi);
  expect(riga(g, '2026-11-19', 'Tutore')?.orari).toEqual(['23:30']);
  expect(riga(g, '2026-11-20', 'Tutore')?.orari).toEqual(['00:10']);
});

test('giorni dal più recente, niente futuro, righe per nome', () => {
  const g = riepilogoMese([B, A], [], 2026, 10, oggi);
  expect(g[0].data).toBe('2026-11-20');
  expect(g[0].righe.map((r) => r.nome)).toEqual(['Flessione dito', 'Tutore']);
});

test('mese passato copre tutti i giorni fino a fine mese', () => {
  const C = { ...A, creatoIl: '2026-09-01' };
  const g = riepilogoMese([C], [], 2026, 9, oggi);
  expect(g[0].data).toBe('2026-10-31');
  expect(g[g.length - 1].data).toBe('2026-10-01');
  expect(g).toHaveLength(31);
});

test('fasce orarie', () => {
  const s = [5, 11.99, 12, 18, 2].map((h) => ses('A', A.nome, new Date(2026, 10, 19, Math.floor(h), h % 1 ? 59 : 0)));
  s.push(ses('A', A.nome, new Date(2026, 10, 19, 9, 0), 'annullato', 2));
  expect(fasceOrarie(s)).toEqual({ mattina: 40, pomeriggio: 20, sera: 40 });
  expect(fasceOrarie([])).toEqual({ mattina: 0, pomeriggio: 0, sera: 0 });
});
