export const PREPARAZIONE_MS = 3000;

export type StatoTimer =
  | { fase: 'preparazione'; ripetizione: 1; fineFase: number }
  | { fase: 'tenuta'; ripetizione: number; fineFase: number }
  | { fase: 'pausa'; ripetizione: number; restanteMs: number; faseSospesa: 'preparazione' | 'tenuta' }
  | { fase: 'finito'; ripetizione: number };

export type Evento = 'via' | 'cambio' | 'fine';

export function avvia(ora: number): StatoTimer {
  return { fase: 'preparazione', ripetizione: 1, fineFase: ora + PREPARAZIONE_MS };
}

// Le fasi scadute si recuperano tutte in un colpo (app riaperta dopo un'ora),
// ma si emette al massimo un evento: niente raffiche di suoni.
export function avanza(s: StatoTimer, ripetizioni: number, tenutaMs: number, ora: number): { stato: StatoTimer; eventi: Evento[] } {
  if (s.fase === 'pausa' || s.fase === 'finito' || ora < s.fineFase) return { stato: s, eventi: [] };
  let stato: StatoTimer = s;
  let evento: Evento = s.fase === 'preparazione' ? 'via' : 'cambio';
  while ((stato.fase === 'preparazione' || stato.fase === 'tenuta') && ora >= stato.fineFase) {
    if (stato.fase === 'preparazione') {
      stato = { fase: 'tenuta', ripetizione: 1, fineFase: stato.fineFase + tenutaMs };
    } else if (stato.ripetizione >= ripetizioni) {
      stato = { fase: 'finito', ripetizione: stato.ripetizione };
      evento = 'fine';
    } else {
      stato = { fase: 'tenuta', ripetizione: stato.ripetizione + 1, fineFase: stato.fineFase + tenutaMs };
    }
  }
  return { stato, eventi: [evento] };
}

export function pausa(s: StatoTimer, ora: number): StatoTimer {
  if (s.fase !== 'preparazione' && s.fase !== 'tenuta') return s;
  return { fase: 'pausa', ripetizione: s.ripetizione, restanteMs: Math.max(0, s.fineFase - ora), faseSospesa: s.fase };
}

export function riprendi(s: StatoTimer, tenutaMs: number, ora: number, ricomincia: boolean): StatoTimer {
  if (s.fase !== 'pausa') return s;
  if (s.faseSospesa === 'preparazione') {
    return { fase: 'preparazione', ripetizione: 1, fineFase: ora + (ricomincia ? PREPARAZIONE_MS : s.restanteMs) };
  }
  return { fase: 'tenuta', ripetizione: s.ripetizione, fineFase: ora + (ricomincia ? tenutaMs : s.restanteMs) };
}

export function restanteMs(s: StatoTimer, ora: number): number {
  if (s.fase === 'pausa') return s.restanteMs;
  if (s.fase === 'finito') return 0;
  return Math.max(0, s.fineFase - ora);
}

export function fineEsercizio(s: StatoTimer, ripetizioni: number, tenutaMs: number): number | null {
  if (s.fase === 'preparazione') return s.fineFase + ripetizioni * tenutaMs;
  if (s.fase === 'tenuta') return s.fineFase + (ripetizioni - s.ripetizione) * tenutaMs;
  return null;
}

export function ripetizioniFatte(s: StatoTimer, ripetizioni: number): number {
  if (s.fase === 'finito') return ripetizioni;
  if (s.fase === 'preparazione') return 0;
  return s.ripetizione - 1;
}
