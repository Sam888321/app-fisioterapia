import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { aggiornaSessione, caricaEsercizi, SessioneAttiva } from '../archivio';
import { SceltaDolore } from '../componenti/Dolore';
import { sottotitolo } from '../formato';
import { sistemaAttiva } from '../sessione';
import { giornoLocale, inPausa } from '../storico';
import { Dolore, Esercizio } from '../tipi';
import { colori, ImmagineEsercizio } from '../ui';

export default function Home() {
  const [esercizi, setEsercizi] = useState<Esercizio[]>([]);
  const [attiva, setAttiva] = useState<SessioneAttiva | null>(null);
  const insets = useSafeAreaInsets();
  // Esercizio finito mentre eri fuori (es. tutore ad app chiusa): la Home chiede il dolore.
  // Solo se è in primo piano: con il Timer aperto sopra, la domanda la fa il Timer.
  const [chiedi, setChiedi] = useState<{ id: string; nome: string } | null>(null);
  const [dolore, setDolore] = useState<Dolore | undefined>(undefined);
  const inPrimoPiano = useRef(false);

  const ricarica = useCallback(() => {
    caricaEsercizi().then(async (e) => {
      setEsercizi(e);
      const { attiva: a, chiusa } = await sistemaAttiva(e, Date.now());
      setAttiva(a);
      if (chiusa && inPrimoPiano.current) {
        setDolore(undefined);
        setChiedi(chiusa);
      }
    });
  }, []);
  useFocusEffect(
    useCallback(() => {
      inPrimoPiano.current = true;
      ricarica();
      return () => {
        inPrimoPiano.current = false;
      };
    }, [ricarica]),
  );

  async function scegliDolore(d: Dolore) {
    setDolore(d);
    if (chiedi) await aggiornaSessione(chiedi.id, { dolore: d });
    setChiedi(null);
  }

  // Esercizio finito mentre l'app è aperta su un'altra schermata: chiude la sessione e toglie il banner.
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(ricarica);
    return () => sub.remove();
  }, [ricarica]);

  const inCorso = attiva && esercizi.find((e) => e.id === attiva.esercizioId);
  const apriTimer = (id: string) => router.push({ pathname: '/timer/[id]', params: { id } });
  const oggi = giornoLocale(new Date());
  const attivi = esercizi.filter((e) => !inPausa(e, oggi));
  const inPausaOggi = esercizi.filter((e) => inPausa(e, oggi));

  const card = (item: Esercizio, pausa = false) => (
    <Pressable key={item.id} style={({ pressed }) => [s.card, pausa && s.cardPausa, pressed && { opacity: 0.7 }]} onPress={() => apriTimer(item.id)}>
      <ImmagineEsercizio immagine={item.immagine} size={96} />
      <Text style={s.nome} numberOfLines={2}>{item.nome}</Text>
      <Text style={s.sotto}>{pausa ? 'In pausa' : sottotitolo(item.ripetizioni, item.tenutaSecondi, item.riposoSecondi)}</Text>
      <Pressable
        style={s.modifica}
        onPress={() => router.push({ pathname: '/esercizio/[id]', params: { id: item.id } })}
        hitSlop={10}
        accessibilityLabel={`Modifica ${item.nome}`}
      >
        <MaterialCommunityIcons name="pencil" size={22} color={colori.tenue} />
      </Pressable>
    </Pressable>
  );

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
        data={attivi}
        keyExtractor={(e) => e.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 110 }}
        ListEmptyComponent={
          <Text style={s.vuoto}>{inPausaOggi.length ? 'Tutti gli esercizi sono in pausa' : 'Nessun esercizio. Aggiungine uno con +'}</Text>
        }
        renderItem={({ item }) => card(item)}
        ListFooterComponent={
          inPausaOggi.length ? (
            <View>
              <Text style={s.sezione}>In pausa</Text>
              {/* a coppie, come le righe della lista sopra */}
              {Array.from({ length: Math.ceil(inPausaOggi.length / 2) }, (_, i) => (
                <View key={i} style={s.riga}>{inPausaOggi.slice(i * 2, i * 2 + 2).map((e) => card(e, true))}</View>
              ))}
            </View>
          ) : undefined
        }
      />
      <Modal visible={!!chiedi} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setChiedi(null)}>
        <View style={s.velo}>
          <View style={s.finestra}>
            <Text style={s.domanda}>{chiedi?.nome} finito</Text>
            <Text style={s.domandaSotto}>Come va il dito?</Text>
            <SceltaDolore valore={dolore} onScegli={scegliDolore} />
            <Pressable onPress={() => setChiedi(null)} hitSlop={10} style={{ marginTop: 16 }}>
              <Text style={s.salta}>Salta</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  velo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  finestra: { backgroundColor: colori.barra, borderRadius: 18, padding: 20, alignItems: 'center' },
  domanda: { fontSize: 20, fontWeight: '700', color: colori.accento },
  domandaSotto: { fontSize: 17, color: colori.testo, marginTop: 6 },
  salta: { fontSize: 16, color: colori.tenue },
  sezione: { fontSize: 17, fontWeight: '700', color: colori.tenue, marginTop: 12, marginBottom: 12 },
  riga: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  cardPausa: { opacity: 0.5 },
  fab: { position: 'absolute', right: 20, width: 64, height: 64, borderRadius: 32, backgroundColor: colori.primario, alignItems: 'center', justifyContent: 'center', elevation: 4 },
});
