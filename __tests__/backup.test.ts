import { creaBackup, leggiBackup } from '../src/backup';
import { Esercizio, Sessione } from '../src/tipi';

const es: Esercizio = { id: 'A', nome: 'Flessione', immagine: { tipo: 'icona', nome: 'x' }, ripetizioni: 10, tenutaSecondi: 5, creatoIl: '2026-11-20' };
const se: Sessione = { id: 's1', esercizioId: 'A', nomeEsercizio: 'Flessione', inizio: '2026-11-20T09:00:00.000Z', esito: 'completato', ripetizioniFatte: 10, dolore: 1 };
const ora = new Date('2026-11-24T10:00:00.000Z');

test('creaBackup → leggiBackup restituisce gli stessi dati', () => {
  const b = creaBackup([es], [se], 120, ora);
  expect(b).toEqual({ app: 'fisioterapia', versione: 1, esportatoIl: '2026-11-24T10:00:00.000Z', esercizi: [es], sessioni: [se], anticipoBeep: 120 });
  expect(leggiBackup(JSON.stringify(b))).toEqual(b);
});

test('backup non valido rifiutato con un messaggio', () => {
  const buono = creaBackup([es], [se], 110, ora);
  const casi: unknown[] = [
    { ...buono, app: 'altra' },
    { ...buono, versione: 2 },
    { ...buono, esercizi: 'no' },
    { ...buono, esercizi: [{ ...es, id: undefined }] },
    { ...buono, esercizi: [{ ...es, nome: 3 }] },
    { ...buono, sessioni: [{ ...se, inizio: undefined }] },
    null,
  ];
  for (const c of casi) expect(typeof leggiBackup(JSON.stringify(c))).toBe('string');
  expect(typeof leggiBackup('{ rotto')).toBe('string');
});

test('anticipo mancante: 110 ms', () => {
  const { anticipoBeep, ...senza } = creaBackup([es], [se], 120, ora);
  expect(anticipoBeep).toBe(120);
  expect(leggiBackup(JSON.stringify(senza))).toMatchObject({ anticipoBeep: 110 });
});
