import { formatDurata, formatTempo, sottotitolo } from '../src/formato';

test('formatTempo: secondi per eccesso sotto il minuto', () => {
  expect(formatTempo(4001)).toBe('5');
  expect(formatTempo(5000)).toBe('5');
  expect(formatTempo(0)).toBe('0');
});

test('formatTempo: mm:ss e h:mm:ss', () => {
  expect(formatTempo(60_000)).toBe('01:00');
  expect(formatTempo(65_000)).toBe('01:05');
  expect(formatTempo(3_599_001)).toBe('1:00:00');
  expect(formatTempo(3_725_000)).toBe('1:02:05');
});

test('sottotitolo esercizio', () => {
  expect(sottotitolo(10, 5)).toBe('10 × 5 s');
  expect(sottotitolo(1, 3600)).toBe('1 × 60 min');
  expect(sottotitolo(3, 90)).toBe('3 × 90 s');
});

test('sottotitolo con riposo', () => {
  expect(sottotitolo(10, 5, 3)).toBe('10 × 5 s · riposo 3 s');
  expect(sottotitolo(10, 5, 0)).toBe('10 × 5 s');
});

test('formatDurata: durate con unità', () => {
  expect(formatDurata(2000)).toBe('2 s');
  expect(formatDurata(1500)).toBe('2 s');
  expect(formatDurata(300_000)).toBe('5 min');
  expect(formatDurata(330_000)).toBe('6 min');
  expect(formatDurata(3_600_000)).toBe('1h');
  expect(formatDurata(10_500_000)).toBe('2h 55m');
});
