import { esclusivo } from '../src/esclusivo';

test('un secondo tocco mentre il primo è in corso viene ignorato', async () => {
  const blocco = { current: false };
  let chiamate = 0;
  let sblocca = () => {};
  const lavoro = () => new Promise<void>((r) => { chiamate++; sblocca = r; });

  const primo = esclusivo(blocco, lavoro);
  await esclusivo(blocco, lavoro);
  expect(chiamate).toBe(1);

  sblocca();
  await primo;
  const terzo = esclusivo(blocco, lavoro);
  sblocca();
  await terzo;
  expect(chiamate).toBe(2);
});

test('il blocco si libera anche se il lavoro fallisce', async () => {
  const blocco = { current: false };
  await expect(esclusivo(blocco, async () => { throw new Error('x'); })).rejects.toThrow('x');
  expect(blocco.current).toBe(false);
});
