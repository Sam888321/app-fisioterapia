import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Dolore } from '../tipi';
import { colori, DOLORI } from '../ui';

export function SceltaDolore({ valore, onScegli }: { valore?: Dolore; onScegli: (d: Dolore) => void }) {
  return (
    <View style={s.riga}>
      {DOLORI.map((d) => {
        const scelto = valore === d.valore;
        return (
          <Pressable key={d.valore} onPress={() => onScegli(d.valore)} accessibilityLabel={`Dolore ${d.nome}`}
            style={[s.opzione, scelto && { borderColor: d.colore, backgroundColor: colori.card }]}>
            <MaterialCommunityIcons name={d.icona} size={36} color={d.colore} />
            <Text style={[s.nome, scelto && { color: d.colore }]}>{d.nome}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  riga: { flexDirection: 'row', gap: 8, marginTop: 12 },
  opzione: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
  nome: { fontSize: 13, color: colori.tenue, marginTop: 2 },
});
