import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { caricaEsercizi, caricaSessioni } from '../archivio';
import { Calendario } from '../componenti/Calendario';
import { formatDurata } from '../formato';
import { coloriMese, giornoLocale, Riquadro, riquadriGiorno, serie } from '../storico';
import { Esercizio, Sessione } from '../tipi';
import { colori, DOLORI, ImmagineEsercizio } from '../ui';

const maiuscola = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const daData = (d: string) => new Date(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8)));

function titoloGiorno(data: string, oggi: string): string {
  if (data === oggi) return `Oggi, ${daData(data).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' })}`;
  return maiuscola(daData(data).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }));
}

export default function Storico() {
  const insets = useSafeAreaInsets();
  const [esercizi, setEsercizi] = useState<Esercizio[]>([]);
  const [sessioni, setSessioni] = useState<Sessione[]>([]);
  const [oggi, setOggi] = useState(() => giornoLocale(new Date()));
  const [scelto, setScelto] = useState(oggi);
  const [mese, setMese] = useState(() => ({ anno: daData(oggi).getFullYear(), mese: daData(oggi).getMonth() }));

  useFocusEffect(
    useCallback(() => {
      setOggi(giornoLocale(new Date()));
      caricaEsercizi().then(setEsercizi);
      caricaSessioni().then(setSessioni);
    }, []),
  );

  function cambiaMese(delta: number) {
    const x = new Date(mese.anno, mese.mese + delta, 1);
    setMese({ anno: x.getFullYear(), mese: x.getMonth() });
    // Mese corrente: oggi; mese passato: il suo ultimo giorno.
    const ultimo = giornoLocale(new Date(x.getFullYear(), x.getMonth() + 1, 0));
    setScelto(ultimo < oggi ? ultimo : oggi);
  }

  const riquadri = riquadriGiorno(esercizi, sessioni, scelto, oggi);
  const giorniDiFila = serie(esercizi, sessioni, oggi);

  return (
    <ScrollView style={s.schermo} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => router.push('/andamento')} hitSlop={12} accessibilityLabel="Andamento">
              <MaterialCommunityIcons name="chart-bar" size={28} color={colori.accento} />
            </Pressable>
          ),
        }}
      />
      <Calendario
        anno={mese.anno}
        mese={mese.mese}
        colori={coloriMese(esercizi, sessioni, mese.anno, mese.mese, oggi)}
        selezionato={scelto}
        oggi={oggi}
        onScegli={setScelto}
        onMese={cambiaMese}
      />
      {giorniDiFila > 0 && <Text style={s.serie}>🔥 Serie: {giorniDiFila} {giorniDiFila === 1 ? 'giorno' : 'giorni di fila'}</Text>}

      <Text style={s.giorno}>{titoloGiorno(scelto, oggi)}</Text>
      {riquadri.length === 0 ? (
        <Text style={s.vuoto}>Nessun esercizio in questo giorno</Text>
      ) : (
        <View style={s.griglia}>
          {riquadri.map((r) => (
            <Card
              key={r.esercizioId}
              r={r}
              eOggi={scelto === oggi}
              onPress={() => router.push({ pathname: '/andamento', params: { esercizio: r.esercizioId, data: scelto, vista: 'giorno' } })}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const STATO = {
  verde: { icona: 'check-circle', colore: colori.accento },
  arancione: { icona: 'circle-half-full', colore: colori.arancione },
  rosso: { icona: 'close-circle', colore: colori.rosso },
  'da-fare': { icona: 'circle-outline', colore: colori.tenue },
} as const;

function Card({ r, eOggi, onPress }: { r: Riquadro; eOggi: boolean; onPress: () => void }) {
  const n = r.completate + r.interrotte;
  const volte = `${n} ${n === 1 ? 'volta' : 'volte'}`;
  const principale = n === 0
    ? `${eOggi ? 'Da fare' : 'Non fatto'} · min ${r.obiettivo}`
    : r.misura === 'tempo'
      ? `${formatDurata(r.tenutaMs)} · ${volte}`
      : `${volte} · min ${r.obiettivo}`;
  const u = r.ultimaInterrotta;
  const stato = STATO[r.colore];
  const dolore = r.doloreMax !== undefined ? DOLORI[r.doloreMax] : null;
  return (
    <Pressable style={({ pressed }) => [s.card, pressed && { opacity: 0.7 }]} onPress={onPress}>
      <ImmagineEsercizio immagine={r.immagine ?? { tipo: 'icona', nome: 'help-circle-outline' }} size={72} />
      <MaterialCommunityIcons name={stato.icona} size={26} color={stato.colore} style={s.stato} />
      <Text style={s.nome} numberOfLines={2}>{r.nome}</Text>
      <Text style={s.riga}>{principale}</Text>
      {u && (
        <Text style={[s.riga, { color: colori.arancione }]}>
          {`${r.interrotte} interrott${r.interrotte === 1 ? 'a' : 'e'}: ${u.raggiunta}/${u.ripetizioni ?? '?'}`}
          {u.restanteMs > 0 && ` · −${formatDurata(u.restanteMs)}`}
        </Text>
      )}
      {dolore && (
        <View style={s.dolore}>
          <MaterialCommunityIcons name={dolore.icona} size={18} color={dolore.colore} />
          <Text style={[s.riga, { color: dolore.colore, marginTop: 0 }]}>{dolore.nome}</Text>
        </View>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: colori.sfondo },
  serie: { fontSize: 16, fontWeight: '600', color: colori.testo, marginTop: 14, textAlign: 'center' },
  giorno: { fontSize: 19, fontWeight: '700', color: colori.testo, marginTop: 20, marginBottom: 10 },
  vuoto: { textAlign: 'center', color: colori.tenue, fontSize: 16, marginTop: 24 },
  griglia: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  card: { width: '48.5%', alignItems: 'center', backgroundColor: colori.card, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 10 },
  stato: { position: 'absolute', top: 10, right: 10 },
  nome: { fontSize: 17, fontWeight: '600', color: colori.testo, marginTop: 10, textAlign: 'center' },
  riga: { fontSize: 14, color: colori.tenue, marginTop: 4, textAlign: 'center' },
  dolore: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
});
