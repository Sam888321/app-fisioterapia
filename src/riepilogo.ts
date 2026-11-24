import { formatDurata } from './formato';
import { coloreGiorno, riquadriGiorno, serie, spostaGiorno } from './storico';
import { Esercizio, Sessione } from './tipi';
import { DOLORI } from './ui';

const daData = (d: string) => new Date(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8)));
const breve = (d: string) => `${d.slice(8)}/${d.slice(5, 7)}`;
const plurale = (n: number, uno: string, tanti: string) => `${n} ${n === 1 ? uno : tanti}`;

// Testo semplice da mandare al fisioterapista: una riga per giorno, dal più recente.
export function testoRiepilogo(esercizi: Esercizio[], sessioni: Sessione[], giorni: number, oggi: string): string {
  const da = spostaGiorno(oggi, -(giorni - 1));
  const righe: string[] = [];
  let conDati = 0;
  let completi = 0;
  for (let i = 0; i < giorni; i++) {
    const data = spostaGiorno(oggi, -i);
    const tutti = riquadriGiorno(esercizi, sessioni, data, oggi);
    if (!tutti.length) continue;
    const colore = coloreGiorno(tutti, data, oggi);
    // In pausa senza sessioni: non compare.
    const riquadri = tutti.filter((r) => r.colore !== 'pausa' || r.completate + r.interrotte > 0);
    const settimana = daData(data).toLocaleDateString('it-IT', { weekday: 'short' });
    if (colore === 'pausa' && !riquadri.length) {
      righe.push(`${settimana} ${breve(data)} — in pausa`);
      continue;
    }
    if (colore !== 'pausa') conDati++;
    if (colore === 'verde') completi++;
    const parti = riquadri.map((r) => {
      const n = r.completate + r.interrotte;
      return `${r.nome}: ${plurale(n, 'volta', 'volte')}`
        + (r.misura === 'tempo' && n > 0 ? `, ${formatDurata(r.tenutaMs)}` : '')
        + (r.interrotte ? ` (${plurale(r.interrotte, 'interrotta', 'interrotte')})` : '');
    });
    const dolori = riquadri.flatMap((r) => (r.doloreMax === undefined ? [] : [r.doloreMax]));
    if (dolori.length) parti.push(`dolore max: ${DOLORI[Math.max(...dolori)].nome}`);
    righe.push(`${settimana} ${breve(data)} — ${parti.join(' · ')}`);
  }
  const testa = [
    `Fisioterapia — ultimi ${giorni} giorni (dal ${breve(da)} al ${breve(oggi)})`,
    `Serie: ${plurale(serie(esercizi, sessioni, oggi), 'giorno', 'giorni')} di fila · giorni completi: ${completi} su ${conDati}`,
  ];
  return [...testa, ...(righe.length ? ['', ...righe] : [])].join('\n');
}
