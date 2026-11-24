import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Barra } from '../andamento';
import { formatDurata } from '../formato';
import { colori, DOLORI } from '../ui';

const ALTEZZA = 180;
const LETTERE = ['D', 'L', 'M', 'M', 'G', 'V', 'S'];
const giornoSett = (d: string) => new Date(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8))).getDay();

interface Props {
  barre: Barra[];
  minimo: number;
  aTempo: boolean;
  vista: 'settimana' | 'mese';
  oggi: string;
  creatoIl: string;
  onScegli: (data: string) => void;
}

// Una barra per giorno: verde le completate, arancione sopra le interrotte; tratteggio = il minimo.
export function Barre({ barre, minimo, aTempo, vista, oggi, creatoIl, onScegli }: Props) {
  const massimo = Math.max(minimo, ...barre.map((b) => b.completato + b.interrotto)) * 1.1 || 1;
  const h = (v: number) => (v / massimo) * ALTEZZA;
  const fmt = (v: number) => (aTempo ? formatDurata(v) : String(Math.round(v)));
  const mese = vista === 'mese';

  return (
    <View>
      <Text style={s.asse}>{fmt(massimo / 1.1)}</Text>
      <View style={[s.area, { gap: mese ? 2 : 10 }]}>
        <View style={[s.minimo, { bottom: h(minimo) }]} />
        <Text style={[s.etichettaMinimo, { bottom: h(minimo) + 3 }]}>min {fmt(minimo)}</Text>
        {barre.map((b) => {
          const attivo = b.data <= oggi && b.data >= creatoIl;
          return (
            <Pressable key={b.data} style={s.colonna} disabled={b.data > oggi} onPress={() => onScegli(b.data)} accessibilityLabel={`Giorno ${b.data}`}>
              {attivo && b.interrotto > 0 && <View style={[s.pezzo, { height: h(b.interrotto), backgroundColor: colori.arancione }]} />}
              {attivo && b.completato > 0 && <View style={[s.pezzo, { height: h(b.completato), backgroundColor: colori.accento }]} />}
              {attivo && b.completato + b.interrotto === 0 && <View style={[s.pezzo, s.vuota]} />}
            </Pressable>
          );
        })}
      </View>
      <View style={[s.riga, { gap: mese ? 2 : 10 }]}>
        {barre.map((b) => (
          <View key={b.data} style={s.colonnaTesto}>
            <View style={[s.pallino, b.doloreMax !== undefined && { backgroundColor: DOLORI[b.doloreMax].colore }]} />
            <Text style={[s.giorno, b.data === oggi && { color: colori.accento, fontWeight: '700' }]}>
              {mese ? (Number(b.data.slice(8)) % 5 === 0 || b.data.endsWith('-01') ? Number(b.data.slice(8)) : '') : LETTERE[giornoSett(b.data)]}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  asse: { fontSize: 12, color: colori.tenue, marginBottom: 4 },
  area: { height: ALTEZZA, flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 1, borderColor: colori.bordo },
  colonna: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  pezzo: { width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  vuota: { height: 2, backgroundColor: colori.bordo },
  // Su Android il tratteggio funziona solo con il bordo su tutti i lati: una View alta 0 con bordo pieno.
  minimo: { position: 'absolute', left: 0, right: 0, height: 0, borderWidth: 1, borderStyle: 'dashed', borderColor: colori.tenue },
  etichettaMinimo: { position: 'absolute', right: 0, fontSize: 11, color: colori.tenue },
  riga: { flexDirection: 'row', marginTop: 4 },
  colonnaTesto: { flex: 1, alignItems: 'center' },
  pallino: { width: 8, height: 8, borderRadius: 4, marginBottom: 2 },
  giorno: { fontSize: 12, color: colori.tenue },
});
