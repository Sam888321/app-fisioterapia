import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ColoreGiorno, giornoLocale } from '../storico';
import { colori } from '../ui';

const SETTIMANA = ['lu', 'ma', 'me', 'gi', 've', 'sa', 'do'];
const TINTA: Record<Exclude<ColoreGiorno, null>, string> = {
  verde: colori.accento,
  arancione: colori.arancione,
  rosso: colori.rosso,
  'in-corso': colori.tenue,
};

interface Props {
  anno: number;
  mese: number; // 0-11
  colori: Record<string, ColoreGiorno>;
  selezionato: string;
  oggi: string;
  onScegli: (data: string) => void;
  onMese: (delta: number) => void;
}

// Mese a griglia (da lunedì) con un pallino per giorno: verde, arancione, rosso, anello = oggi in corso.
export function Calendario({ anno, mese, colori: perGiorno, selezionato, oggi, onScegli, onMese }: Props) {
  const primo = new Date(anno, mese, 1);
  const vuoti = (primo.getDay() + 6) % 7;
  const giorni = new Date(anno, mese + 1, 0).getDate();
  const meseCorrente = giornoLocale(primo).slice(0, 7) === oggi.slice(0, 7);
  const celle: (string | null)[] = [...Array(vuoti).fill(null), ...Array.from({ length: giorni }, (_, i) => giornoLocale(new Date(anno, mese, i + 1)))];

  return (
    <View style={s.box}>
      <View style={s.testa}>
        <Pressable onPress={() => onMese(-1)} hitSlop={12} accessibilityLabel="Mese precedente">
          <MaterialCommunityIcons name="chevron-left" size={30} color={colori.accento} />
        </Pressable>
        <Text style={s.mese}>{primo.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</Text>
        <Pressable onPress={() => onMese(1)} disabled={meseCorrente} hitSlop={12} accessibilityLabel="Mese successivo">
          <MaterialCommunityIcons name="chevron-right" size={30} color={meseCorrente ? colori.bordo : colori.accento} />
        </Pressable>
      </View>
      <View style={s.griglia}>
        {SETTIMANA.map((g) => (
          <Text key={g} style={[s.cella, s.intestazione]}>{g}</Text>
        ))}
        {celle.map((data, i) => {
          if (!data) return <View key={`v${i}`} style={s.cella} />;
          const futuro = data > oggi;
          const c = perGiorno[data];
          const scelto = data === selezionato;
          return (
            <Pressable key={data} style={s.cella} disabled={futuro} onPress={() => onScegli(data)} accessibilityLabel={`Giorno ${Number(data.slice(8))}`}>
              <View style={[s.giorno, scelto && s.scelto]}>
                <Text style={[s.numero, futuro && { color: colori.bordo }, data === oggi && { color: colori.accento, fontWeight: '800' }]}>
                  {Number(data.slice(8))}
                </Text>
                <View style={[s.pallino, c && (c === 'in-corso' ? { borderWidth: 1.5, borderColor: TINTA[c] } : { backgroundColor: TINTA[c] })]} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  box: { backgroundColor: colori.card, borderRadius: 18, padding: 12 },
  testa: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  mese: { fontSize: 19, fontWeight: '700', color: colori.testo, textTransform: 'capitalize' },
  griglia: { flexDirection: 'row', flexWrap: 'wrap' },
  cella: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 },
  intestazione: { fontSize: 13, color: colori.tenue, textAlign: 'center' },
  giorno: { alignItems: 'center', justifyContent: 'center', width: 42, height: 46, borderRadius: 12 },
  scelto: { backgroundColor: colori.primarioChiaro },
  numero: { fontSize: 16, color: colori.testo },
  pallino: { width: 10, height: 10, borderRadius: 5, marginTop: 3 }, // raggio = metà lato: 999 su Android resta quadrato
});
