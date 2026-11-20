import { Esercizio, Sessione } from './tipi';

export interface RigaStorico {
  esercizioId: string;
  nome: string;
  completate: number;
  target?: number;
  orari: string[]; // HH:MM delle completate, crescenti
  annullate: { orario: string; ripetizioniFatte: number }[];
  stato: 'ok' | 'saltato' | 'oggi';
}

export interface GiornoStorico {
  data: string;
  righe: RigaStorico[];
}

const due = (n: number) => String(n).padStart(2, '0');

export function giornoLocale(d: Date): string {
  return `${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}`;
}

const orario = (d: Date) => `${due(d.getHours())}:${due(d.getMinutes())}`;

export function riepilogoMese(esercizi: Esercizio[], sessioni: Sessione[], anno: number, mese: number, oggi: Date): GiornoStorico[] {
  const perGiorno = new Map<string, Sessione[]>();
  for (const s of [...sessioni].sort((a, b) => a.inizio.localeCompare(b.inizio))) {
    const g = giornoLocale(new Date(s.inizio));
    perGiorno.set(g, [...(perGiorno.get(g) ?? []), s]);
  }
  const dataOggi = giornoLocale(oggi);
  const ultimo = new Date(anno, mese + 1, 0).getDate();
  const giorni: GiornoStorico[] = [];

  for (let g = ultimo; g >= 1; g--) {
    const data = giornoLocale(new Date(anno, mese, g));
    if (data > dataOggi) continue;
    const delGiorno = perGiorno.get(data) ?? [];
    const ids = new Set([...esercizi.filter((e) => e.creatoIl <= data).map((e) => e.id), ...delGiorno.map((s) => s.esercizioId)]);

    const righe = [...ids].map((id): RigaStorico => {
      const es = esercizi.find((e) => e.id === id);
      const sue = delGiorno.filter((s) => s.esercizioId === id);
      const fatte = sue.filter((s) => s.esito === 'completato');
      const target = es?.voltePerGiorno;
      const completate = fatte.length;
      const saltato = target !== undefined ? completate < target : completate === 0;
      return {
        esercizioId: id,
        nome: es?.nome ?? sue[sue.length - 1].nomeEsercizio,
        completate,
        ...(target !== undefined && { target }),
        orari: fatte.map((s) => orario(new Date(s.inizio))),
        annullate: sue.filter((s) => s.esito === 'annullato').map((s) => ({ orario: orario(new Date(s.inizio)), ripetizioniFatte: s.ripetizioniFatte })),
        stato: data === dataOggi ? 'oggi' : saltato ? 'saltato' : 'ok',
      };
    });
    if (righe.length) giorni.push({ data, righe: righe.sort((a, b) => a.nome.localeCompare(b.nome)) });
  }
  return giorni;
}

export function fasceOrarie(sessioni: Sessione[]): { mattina: number; pomeriggio: number; sera: number } {
  const c = { mattina: 0, pomeriggio: 0, sera: 0 };
  const fatte = sessioni.filter((s) => s.esito === 'completato');
  for (const s of fatte) {
    const h = new Date(s.inizio).getHours();
    c[h >= 5 && h < 12 ? 'mattina' : h >= 12 && h < 18 ? 'pomeriggio' : 'sera']++;
  }
  const pct = (x: number) => (fatte.length ? Math.round((x / fatte.length) * 100) : 0);
  return { mattina: pct(c.mattina), pomeriggio: pct(c.pomeriggio), sera: pct(c.sera) };
}
