export const PREPARAZIONE_MS = 3000;

export type StatoTimer =
  | { fase: 'preparazione'; ripetizione: 1; fineFase: number }
  | { fase: 'tenuta'; ripetizione: number; fineFase: number }
  | { fase: 'riposo'; ripetizione: number; fineFase: number } // `ripetizione` = la prossima da fare
  | { fase: 'pausa'; ripetizione: number; restanteMs: number; faseSospesa: 'preparazione' | 'tenuta' | 'riposo' }
  | { fase: 'finito'; ripetizione: number };

export type Evento = 'via' | 'cambio' | 'fine';

export function avvia(ora: number): StatoTimer {
  return { fase: 'preparazione', ripetizione: 1, fineFase: ora + PREPARAZIONE_MS };
}

// Le fasi scadute si recuperano tutte in un colpo (app riaperta dopo un'ora),
// ma si emette al massimo un evento: niente raffiche di suoni.
// riposoMs = 0: le ripetizioni si susseguono senza riposo (esercizi creati prima del riposo).
export function avanza(s: StatoTimer, ripetizioni: number, tenutaMs: number, ora: number, riposoMs = 0): { stato: StatoTimer; eventi: Evento[] } {
  if (s.fase === 'pausa' || s.fase === 'finito' || ora < s.fineFase) return { stato: s, eventi: [] };
  let stato: StatoTimer = s;
  let evento: Evento = s.fase === 'tenuta' ? 'cambio' : 'via';
  while (stato.fase !== 'finito' && ora >= stato.fineFase) {
    if (stato.fase === 'preparazione' || stato.fase === 'riposo') {
      stato = { fase: 'tenuta', ripetizione: stato.ripetizione, fineFase: stato.fineFase + tenutaMs };
    } else if (stato.ripetizione >= ripetizioni) {
      stato = { fase: 'finito', ripetizione: stato.ripetizione };
      evento = 'fine';
    } else if (riposoMs > 0) {
      stato = { fase: 'riposo', ripetizione: stato.ripetizione + 1, fineFase: stato.fineFase + riposoMs };
    } else {
      stato = { fase: 'tenuta', ripetizione: stato.ripetizione + 1, fineFase: stato.fineFase + tenutaMs };
    }
  }
  return { stato, eventi: [evento] };
}

export function pausa(s: StatoTimer, ora: number): StatoTimer {
  if (s.fase === 'pausa' || s.fase === 'finito') return s;
  return { fase: 'pausa', ripetizione: s.ripetizione, restanteMs: Math.max(0, s.fineFase - ora), faseSospesa: s.fase };
}

export function riprendi(s: StatoTimer, tenutaMs: number, ora: number, ricomincia: boolean, riposoMs = 0): StatoTimer {
  if (s.fase !== 'pausa') return s;
  if (s.faseSospesa === 'preparazione') {
    return { fase: 'preparazione', ripetizione: 1, fineFase: ora + (ricomincia ? PREPARAZIONE_MS : s.restanteMs) };
  }
  const intera = s.faseSospesa === 'riposo' ? riposoMs : tenutaMs;
  return { fase: s.faseSospesa, ripetizione: s.ripetizione, fineFase: ora + (ricomincia ? intera : s.restanteMs) };
}

export function restanteMs(s: StatoTimer, ora: number): number {
  if (s.fase === 'pausa') return s.restanteMs;
  if (s.fase === 'finito') return 0;
  return Math.max(0, s.fineFase - ora);
}

// Niente riposo dopo l'ultima ripetizione.
export function fineEsercizio(s: StatoTimer, ripetizioni: number, tenutaMs: number, riposoMs = 0): number | null {
  const dopo = (k: number) => (ripetizioni - k) * (tenutaMs + riposoMs); // ripetizioni oltre la k-esima, ognuna col suo riposo
  if (s.fase === 'preparazione' || s.fase === 'riposo') return s.fineFase + tenutaMs + dopo(s.ripetizione);
  if (s.fase === 'tenuta') return s.fineFase + dopo(s.ripetizione);
  return null;
}

export function ripetizioniFatte(s: StatoTimer, ripetizioni: number): number {
  if (s.fase === 'finito') return ripetizioni;
  if (s.fase === 'preparazione') return 0;
  return s.ripetizione - 1;
}
