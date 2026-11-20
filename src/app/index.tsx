import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { caricaEsercizi, SessioneAttiva } from '../archivio';
import { sottotitolo } from '../formato';
import { sistemaAttiva } from '../sessione';
import { Esercizio } from '../tipi';
import { colori, ImmagineEsercizio } from '../ui';

export default function Home() {
  const [esercizi, setEsercizi] = useState<Esercizio[]>([]);
  const [attiva, setAttiva] = useState<SessioneAttiva | null>(null);

  useFocusEffect(
    useCallback(() => {
      caricaEsercizi().then(async (e) => {
        setEsercizi(e);
        setAttiva(await sistemaAttiva(e, Date.now()));
      });
    }, []),
  );

  const inCorso = attiva && esercizi.find((e) => e.id === attiva.esercizioId);
  const apriTimer = (id: string) => router.push({ pathname: '/timer/[id]', params: { id } });

  return (
    <View style={s.schermo}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => router.push('/storico')} hitSlop={12} accessibilityLabel="Storico">
              <MaterialCommunityIcons name="history" size={28} color={colori.primario} />
            </Pressable>
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
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
        ListEmptyComponent={<Text style={s.vuoto}>Nessun esercizio. Aggiungine uno con +</Text>}
        renderItem={({ item }) => (
          <Pressable style={s.card} onPress={() => apriTimer(item.id)}>
            <ImmagineEsercizio immagine={item.immagine} size={64} />
            <View style={{ flex: 1 }}>
              <Text style={s.nome}>{item.nome}</Text>
              <Text style={s.sotto}>{sottotitolo(item.ripetizioni, item.tenutaSecondi)}</Text>
            </View>
            <Pressable
              onPress={() => router.push({ pathname: '/esercizio/[id]', params: { id: item.id } })}
              hitSlop={12}
              accessibilityLabel={`Modifica ${item.nome}`}
            >
              <MaterialCommunityIcons name="pencil" size={26} color={colori.tenue} />
            </Pressable>
          </Pressable>
        )}
      />
      <Pressable
        style={s.fab}
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
  card: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: colori.card, borderRadius: 16, padding: 14 },
  nome: { fontSize: 20, fontWeight: '600', color: colori.testo },
  sotto: { fontSize: 16, color: colori.tenue, marginTop: 2 },
  vuoto: { textAlign: 'center', color: colori.tenue, fontSize: 16, marginTop: 40 },
  fab: { position: 'absolute', right: 20, bottom: 28, width: 64, height: 64, borderRadius: 32, backgroundColor: colori.primario, alignItems: 'center', justifyContent: 'center', elevation: 4 },
});
