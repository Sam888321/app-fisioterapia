import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Blocco } from '../andamento';
import { formatDurata } from '../formato';
import { ripetizioneRaggiunta, SessioneNorm, tenutaFattaMs } from '../storico';
import { colori, DOLORI } from '../ui';

const due = (n: number) => String(n).padStart(2, '0');
const orario = (iso: string) => {
  const d = new Date(iso);
  return `${d.getHours()}:${due(d.getMinutes())}`;
};

function dettaglio(s: SessioneNorm, aTempo: boolean): string {
  if (s.esito === 'completato') {
    const t = tenutaFattaMs(s);
    return aTempo && t !== null ? formatDurata(t) : `${s.ripetizioni ?? s.ripetizioniFatte} rip.`;
  }
  return `${ripetizioneRaggiunta(s)}/${s.ripetizioni ?? '?'}${s.restanteMs > 0 ? ` · −${formatDurata(s.restanteMs)}` : ''}`;
}

interface Props {
  blocchi: Blocco[];
  daOra: number;
  aOra: number;
  aTempo: boolean;
  onDolore: (s: SessioneNorm) => void;
}

// Vista Giorno: le sessioni come blocchi sulle ore, poi l'elenco con il dolore modificabile.
export function Striscia({ blocchi, daOra, aOra, aTempo, onDolore }: Props) {
  const ampiezza = (aOra - daOra) * 60;
  const pct = (min: number) => `${((min - daOra * 60) / ampiezza) * 100}%` as const;
  const ore = Array.from({ length: Math.floor((aOra - daOra) / 2) + 1 }, (_, i) => daOra + i * 2);

  return (
    <View>
      <View style={s.barra}>
        {blocchi.map((b) => (
          <View
            key={b.sessione.id}
            style={[s.blocco, {
              left: pct(b.daMin),
              width: `${Math.max(0.8, ((b.aMin - b.daMin) / ampiezza) * 100)}%`,
              backgroundColor: b.esito === 'completato' ? colori.accento : colori.arancione,
            }]}
          />
        ))}
      </View>
      <View style={s.ore}>
        {ore.map((h) => (
          <Text key={h} style={[s.ora, { left: pct(h * 60) }]}>{h}</Text>
        ))}
      </View>

      {blocchi.length === 0 && <Text style={s.vuoto}>Niente in questo giorno</Text>}
      {blocchi.map(({ sessione: x }) => {
        const dolore = x.dolore !== undefined ? DOLORI[x.dolore] : null;
        const fatta = x.esito === 'completato';
        return (
          <View key={x.id} style={s.riga}>
            <MaterialCommunityIcons name={fatta ? 'check-circle' : 'circle-half-full'} size={22} color={fatta ? colori.accento : colori.arancione} />
            <View style={{ flex: 1 }}>
              <Text style={s.orari}>{`${orario(x.inizio)} → ${orario(x.fine)}`}</Text>
              <Text style={s.dettaglio}>{dettaglio(x, aTempo)}</Text>
            </View>
            <Pressable onPress={() => onDolore(x)} hitSlop={10} style={s.dolore} accessibilityLabel="Dolore">
              {dolore ? (
                <>
                  <MaterialCommunityIcons name={dolore.icona} size={24} color={dolore.colore} />
                  <Text style={[s.doloreTesto, { color: dolore.colore }]}>{dolore.nome}</Text>
                </>
              ) : (
                <Text style={s.doloreTesto}>+ dolore</Text>
              )}
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  barra: { height: 36, backgroundColor: colori.card, borderRadius: 8, overflow: 'hidden' },
  blocco: { position: 'absolute', top: 0, bottom: 0, borderRadius: 4 },
  ore: { height: 18, marginTop: 4 },
  ora: { position: 'absolute', fontSize: 11, color: colori.tenue, transform: [{ translateX: -4 }] },
  vuoto: { textAlign: 'center', color: colori.tenue, fontSize: 16, marginTop: 24 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colori.card, borderRadius: 14, padding: 12, marginTop: 10 },
  orari: { fontSize: 17, fontWeight: '600', color: colori.testo },
  dettaglio: { fontSize: 14, color: colori.tenue, marginTop: 2 },
  dolore: { alignItems: 'center', minWidth: 64 },
  doloreTesto: { fontSize: 12, color: colori.tenue, marginTop: 2 },
});
