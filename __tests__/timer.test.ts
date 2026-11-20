import { avanza, avvia, fineEsercizio, pausa, restanteMs, riprendi, ripetizioniFatte } from '../src/timer';

const R = 10;
const T = 5000;
const t0 = 1_000_000;

test('avvia parte in preparazione per 3 s', () =>
  expect(avvia(t0)).toEqual({ fase: 'preparazione', ripetizione: 1, fineFase: t0 + 3000 }));

test('fine preparazione emette via e apre la ripetizione 1', () => {
  const r = avanza(avvia(t0), R, T, t0 + 3000);
  expect(r.stato).toEqual({ fase: 'tenuta', ripetizione: 1, fineFase: t0 + 8000 });
  expect(r.eventi).toEqual(['via']);
});

test('prima della fine fase nulla cambia', () => {
  const s = avvia(t0);
  expect(avanza(s, R, T, t0 + 2999)).toEqual({ stato: s, eventi: [] });
});

test('cambio ripetizione senza deriva', () => {
  const r = avanza({ fase: 'tenuta', ripetizione: 1, fineFase: t0 }, R, T, t0 + 40);
  expect(r.stato).toEqual({ fase: 'tenuta', ripetizione: 2, fineFase: t0 + 5000 });
  expect(r.eventi).toEqual(['cambio']);
});

test('ultima ripetizione emette fine', () => {
  const r = avanza({ fase: 'tenuta', ripetizione: 10, fineFase: t0 }, R, T, t0);
  expect(r.stato).toEqual({ fase: 'finito', ripetizione: 10 });
  expect(r.eventi).toEqual(['fine']);
});

test('avanza recupera un salto lungo con un solo evento fine', () => {
  const r = avanza(avvia(t0), 1, 3_600_000, t0 + 5 * 3_600_000);
  expect(r.stato.fase).toBe('finito');
  expect(r.eventi).toEqual(['fine']);
});

test('salto di più ripetizioni non finito emette un solo cambio', () => {
  const r = avanza({ fase: 'tenuta', ripetizione: 1, fineFase: t0 }, R, T, t0 + 12_000);
  expect(r.stato).toEqual({ fase: 'tenuta', ripetizione: 4, fineFase: t0 + 15_000 });
  expect(r.eventi).toEqual(['cambio']);
});

test('finito resta finito', () => {
  const f = { fase: 'finito' as const, ripetizione: 10 };
  expect(avanza(f, R, T, t0)).toEqual({ stato: f, eventi: [] });
});

test('pausa congela il tempo rimasto', () => {
  const p = pausa({ fase: 'tenuta', ripetizione: 3, fineFase: t0 + 2000 }, t0);
  expect(p).toEqual({ fase: 'pausa', ripetizione: 3, restanteMs: 2000, faseSospesa: 'tenuta' });
  expect(avanza(p, R, T, t0 + 999_999)).toEqual({ stato: p, eventi: [] });
  expect(restanteMs(p, t0 + 999_999)).toBe(2000);
});

test('restanteMs in corsa non va sotto zero', () => {
  expect(restanteMs({ fase: 'tenuta', ripetizione: 1, fineFase: t0 + 1500 }, t0)).toBe(1500);
  expect(restanteMs({ fase: 'tenuta', ripetizione: 1, fineFase: t0 }, t0 + 10)).toBe(0);
});

test('riprendi continua dal tempo rimasto', () =>
  expect(riprendi({ fase: 'pausa', ripetizione: 3, restanteMs: 2000, faseSospesa: 'tenuta' }, T, t0, false))
    .toEqual({ fase: 'tenuta', ripetizione: 3, fineFase: t0 + 2000 }));

test('riprendi con ricomincia riparte da T', () =>
  expect(riprendi({ fase: 'pausa', ripetizione: 3, restanteMs: 2000, faseSospesa: 'tenuta' }, T, t0, true))
    .toEqual({ fase: 'tenuta', ripetizione: 3, fineFase: t0 + 5000 }));

test('ricomincia durante la preparazione riparte da 3 s', () =>
  expect(riprendi({ fase: 'pausa', ripetizione: 1, restanteMs: 1000, faseSospesa: 'preparazione' }, T, t0, true))
    .toEqual({ fase: 'preparazione', ripetizione: 1, fineFase: t0 + 3000 }));

test('fineEsercizio somma le ripetizioni restanti', () => {
  expect(fineEsercizio(avvia(t0), R, T)).toBe(t0 + 3000 + 10 * 5000);
  expect(fineEsercizio({ fase: 'tenuta', ripetizione: 9, fineFase: t0 }, R, T)).toBe(t0 + 5000);
  expect(fineEsercizio({ fase: 'pausa', ripetizione: 9, restanteMs: 1, faseSospesa: 'tenuta' }, R, T)).toBeNull();
});

test('ripetizioniFatte', () => {
  expect(ripetizioniFatte(avvia(t0), R)).toBe(0);
  expect(ripetizioniFatte({ fase: 'pausa', ripetizione: 4, restanteMs: 1, faseSospesa: 'tenuta' }, R)).toBe(3);
  expect(ripetizioniFatte({ fase: 'finito', ripetizione: 10 }, R)).toBe(10);
});

describe('riposo tra le ripetizioni', () => {
  const P = 2000; // riposo

  test('fine tenuta (non ultima) apre il riposo prima della ripetizione successiva', () => {
    const r = avanza({ fase: 'tenuta', ripetizione: 1, fineFase: t0 }, R, T, t0, P);
    expect(r.stato).toEqual({ fase: 'riposo', ripetizione: 2, fineFase: t0 + 2000 });
    expect(r.eventi).toEqual(['cambio']);
  });

  test('fine riposo riapre la tenuta con un via', () => {
    const r = avanza({ fase: 'riposo', ripetizione: 2, fineFase: t0 }, R, T, t0, P);
    expect(r.stato).toEqual({ fase: 'tenuta', ripetizione: 2, fineFase: t0 + 5000 });
    expect(r.eventi).toEqual(['via']);
  });

  test("dopo l'ultima ripetizione niente riposo", () => {
    const r = avanza({ fase: 'tenuta', ripetizione: 10, fineFase: t0 }, R, T, t0, P);
    expect(r.stato).toEqual({ fase: 'finito', ripetizione: 10 });
    expect(r.eventi).toEqual(['fine']);
  });

  test('un salto lungo conta anche i riposi', () => {
    // da fine tenuta 1: riposo fino a +2000, tenuta 2 fino a +7000, riposo fino a +9000, tenuta 3 fino a +14000
    const r = avanza({ fase: 'tenuta', ripetizione: 1, fineFase: t0 }, R, T, t0 + 10_000, P);
    expect(r.stato).toEqual({ fase: 'tenuta', ripetizione: 3, fineFase: t0 + 14_000 });
    expect(r.eventi).toEqual(['cambio']);
  });

  test('pausa e ripresa durante il riposo', () => {
    const p = pausa({ fase: 'riposo', ripetizione: 4, fineFase: t0 + 1500 }, t0);
    expect(p).toEqual({ fase: 'pausa', ripetizione: 4, restanteMs: 1500, faseSospesa: 'riposo' });
    expect(riprendi(p, T, t0, false, P)).toEqual({ fase: 'riposo', ripetizione: 4, fineFase: t0 + 1500 });
    expect(riprendi(p, T, t0, true, P)).toEqual({ fase: 'riposo', ripetizione: 4, fineFase: t0 + 2000 });
  });

  test('fineEsercizio include i riposi (non dopo l\'ultima)', () => {
    expect(fineEsercizio(avvia(t0), R, T, P)).toBe(t0 + 3000 + 10 * 5000 + 9 * 2000);
    expect(fineEsercizio({ fase: 'tenuta', ripetizione: 9, fineFase: t0 }, R, T, P)).toBe(t0 + 2000 + 5000);
    expect(fineEsercizio({ fase: 'riposo', ripetizione: 10, fineFase: t0 }, R, T, P)).toBe(t0 + 5000);
  });

  test('ripetizioniFatte durante il riposo conta quelle concluse', () =>
    expect(ripetizioniFatte({ fase: 'riposo', ripetizione: 4, fineFase: t0 }, R)).toBe(3));
});
