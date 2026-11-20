import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { caricaEsercizi, SessioneAttiva } from '../archivio';
import { sottotitolo } from '../formato';
import { sistemaAttiva } from '../sessione';
import { Esercizio } from '../tipi';
import { colori, ImmagineEsercizio } from '../ui';

export default function Home() {
  const [esercizi, setEsercizi] = useState<Esercizio[]>([]);
  const [attiva, setAttiva] = useState<SessioneAttiva | null>(null);
  const insets = useSafeAreaInsets();

  const ricarica = useCallback(() => {
    caricaEsercizi().then(async (e) => {
      setEsercizi(e);
      setAttiva(await sistemaAttiva(e, Date.now()));
    });
  }, []);
  useFocusEffect(ricarica);

  // Esercizio finito mentre l'app è aperta su un'altra schermata: chiude la sessione e toglie il banner.
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(ricarica);
    return () => sub.remove();
  }, [ricarica]);

  const inCorso = attiva && esercizi.find((e) => e.id === attiva.esercizioId);
  const apriTimer = (id: string) => router.push({ pathname: '/timer/[id]', params: { id } });

  return (
    <View style={s.schermo}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 20 }}>
              <Pressable onPress={() => router.push('/storico')} hitSlop={12} accessibilityLabel="Storico">
                <MaterialCommunityIcons name="history" size={28} color={colori.accento} />
              </Pressable>
              <Pressable onPress={() => router.push('/impostazioni')} hitSlop={12} accessibilityLabel="Impostazioni">
                <MaterialCommunityIcons name="cog-outline" size={28} color={colori.accento} />
              </Pressable>
            </View>
          ),
        }}
      />
      {inCorso && (
        <Pressable style={s.banner} onPress={() => apriTimer(inCorso.id)}>
          <Text style={s.bannerTesto}>Esercizio in corso: {inCorso.nome} — tocca per tornare</Text>
        </Pressable>
      )}
      <FlatList
        data={esercizi}
        keyExtractor={(e) => e.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 110 }}
        ListEmptyComponent={<Text style={s.vuoto}>Nessun esercizio. Aggiungine uno con +</Text>}
        renderItem={({ item }) => (
          <Pressable style={({ pressed }) => [s.card, pressed && { opacity: 0.7 }]} onPress={() => apriTimer(item.id)}>
            <ImmagineEsercizio immagine={item.immagine} size={96} />
            <Text style={s.nome} numberOfLines={2}>{item.nome}</Text>
            <Text style={s.sotto}>{sottotitolo(item.ripetizioni, item.tenutaSecondi, item.riposoSecondi)}</Text>
            <Pressable
              style={s.modifica}
              onPress={() => router.push({ pathname: '/esercizio/[id]', params: { id: item.id } })}
              hitSlop={10}
              accessibilityLabel={`Modifica ${item.nome}`}
            >
              <MaterialCommunityIcons name="pencil" size={22} color={colori.tenue} />
            </Pressable>
          </Pressable>
        )}
      />
      <Pressable
        style={[s.fab, { bottom: insets.bottom + 20 }]}
        onPress={() => router.push({ pathname: '/esercizio/[id]', params: { id: 'nuovo' } })}
        accessibilityLabel="Nuovo esercizio"
      >
        <MaterialCommunityIcons name="plus" size={32} color="#fff" />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: colori.sfondo },
  banner: { backgroundColor: colori.primario, padding: 14 },
  bannerTesto: { color: '#fff', fontSize: 16, fontWeight: '600' },
  // flex: 0.5 tiene la card a metà larghezza anche quando è sola nell'ultima riga
  card: { flex: 0.5, alignItems: 'center', backgroundColor: colori.card, borderRadius: 18, paddingVertical: 20, paddingHorizontal: 12 },
  nome: { fontSize: 18, fontWeight: '600', color: colori.testo, marginTop: 12, textAlign: 'center' },
  sotto: { fontSize: 15, color: colori.tenue, marginTop: 4 },
  modifica: { position: 'absolute', top: 10, right: 10, padding: 4 },
  vuoto: { textAlign: 'center', color: colori.tenue, fontSize: 16, marginTop: 40 },
  fab: { position: 'absolute', right: 20, width: 64, height: 64, borderRadius: 32, backgroundColor: colori.primario, alignItems: 'center', justifyContent: 'center', elevation: 4 },
});
