import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { caricaEsercizi, copiaFoto, eliminaEsercizio, nuovoId, salvaEsercizio } from '../../archivio';
import { ICONE } from '../../icone';
import { giornoLocale } from '../../storico';
import { Esercizio, Immagine, validaEsercizio } from '../../tipi';
import { colori, ImmagineEsercizio } from '../../ui';

export default function ModificaEsercizio() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const nuovo = id === 'nuovo';
  const [originale, setOriginale] = useState<Esercizio | null>(null);
  const [nome, setNome] = useState('');
  const [immagine, setImmagine] = useState<Immagine>({ tipo: 'icona', nome: ICONE[0] });
  const [ripetizioni, setRipetizioni] = useState('10');
  const [tenuta, setTenuta] = useState('5');
  const [unita, setUnita] = useState<'s' | 'min'>('s');
  const [volte, setVolte] = useState('');

  useEffect(() => {
    if (nuovo) return;
    caricaEsercizi().then((tutti) => {
      const e = tutti.find((x) => x.id === id);
      if (!e) return;
      const inMinuti = e.tenutaSecondi >= 60 && e.tenutaSecondi % 60 === 0;
      setOriginale(e);
      setNome(e.nome);
      setImmagine(e.immagine);
      setRipetizioni(String(e.ripetizioni));
      setTenuta(String(inMinuti ? e.tenutaSecondi / 60 : e.tenutaSecondi));
      setUnita(inMinuti ? 'min' : 's');
      setVolte(e.voltePerGiorno ? String(e.voltePerGiorno) : '');
    });
  }, [id, nuovo]);

  const errore = validaEsercizio({ nome, ripetizioni, tenuta, voltePerGiorno: volte });

  async function prendiFoto(daCamera: boolean) {
    if (daCamera && !(await ImagePicker.requestCameraPermissionsAsync()).granted) {
      Alert.alert('Permesso negato', 'Serve il permesso della fotocamera per scattare la foto.');
      return;
    }
    const opzioni: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 };
    const r = daCamera ? await ImagePicker.launchCameraAsync(opzioni) : await ImagePicker.launchImageLibraryAsync(opzioni);
    if (!r.canceled) setImmagine({ tipo: 'foto', uri: await copiaFoto(r.assets[0].uri) });
  }

  async function salva() {
    if (errore) return;
    await salvaEsercizio({
      id: originale?.id ?? nuovoId(),
      nome: nome.trim(),
      immagine,
      ripetizioni: Number(ripetizioni),
      tenutaSecondi: Number(tenuta) * (unita === 'min' ? 60 : 1),
      ...(volte.trim() && { voltePerGiorno: Number(volte) }),
      creatoIl: originale?.creatoIl ?? giornoLocale(new Date()),
    });
    router.back();
  }

  function elimina() {
    if (!originale) return;
    Alert.alert(`Eliminare ${originale.nome}?`, 'Lo storico resta.', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: async () => { await eliminaEsercizio(originale.id); router.back(); } },
    ]);
  }

  return (
    <ScrollView style={{ backgroundColor: colori.sfondo }} contentContainerStyle={s.contenuto} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: nuovo ? 'Nuovo esercizio' : 'Modifica esercizio' }} />

      <Text style={s.etichetta}>Nome</Text>
      <TextInput style={s.input} value={nome} onChangeText={setNome} placeholder="Es. Flessione dito" />

      <Text style={s.etichetta}>Immagine</Text>
      <View style={s.riga}>
        <ImmagineEsercizio immagine={immagine} size={88} />
        <View style={{ gap: 8, flex: 1 }}>
          <Bottone testo="Scatta foto" icona="camera" onPress={() => prendiFoto(true)} />
          <Bottone testo="Galleria" icona="image" onPress={() => prendiFoto(false)} />
        </View>
      </View>
      <View style={s.icone}>
        {ICONE.map((n) => (
          <Pressable key={n} onPress={() => setImmagine({ tipo: 'icona', nome: n })} accessibilityLabel={`Icona ${n}`}
            style={[s.icona, immagine.tipo === 'icona' && immagine.nome === n && s.iconaScelta]}>
            <MaterialCommunityIcons name={n as keyof typeof MaterialCommunityIcons.glyphMap} size={30} color={colori.primario} />
          </Pressable>
        ))}
      </View>

      <Text style={s.etichetta}>Ripetizioni</Text>
      <TextInput style={s.input} value={ripetizioni} onChangeText={setRipetizioni} keyboardType="number-pad" />

      <Text style={s.etichetta}>Tenuta</Text>
      <View style={s.riga}>
        <TextInput style={[s.input, { flex: 1 }]} value={tenuta} onChangeText={setTenuta} keyboardType="number-pad" />
        {(['s', 'min'] as const).map((u) => (
          <Pressable key={u} onPress={() => setUnita(u)} style={[s.unita, unita === u && s.unitaScelta]}>
            <Text style={[s.unitaTesto, unita === u && { color: '#fff' }]}>{u === 's' ? 'sec' : 'min'}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={s.etichetta}>Volte al giorno (facoltativo)</Text>
      <TextInput style={s.input} value={volte} onChangeText={setVolte} keyboardType="number-pad" placeholder="—" />

      {errore && <Text style={s.errore}>{errore}</Text>}
      <Pressable style={[s.salva, errore && { opacity: 0.4 }]} disabled={!!errore} onPress={salva}>
        <Text style={s.salvaTesto}>Salva</Text>
      </Pressable>
      {originale && (
        <Pressable style={s.elimina} onPress={elimina}>
          <Text style={{ color: colori.rosso, fontSize: 16, fontWeight: '600' }}>Elimina esercizio</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function Bottone({ testo, icona, onPress }: { testo: string; icona: 'camera' | 'image'; onPress: () => void }) {
  return (
    <Pressable style={s.bottone} onPress={onPress}>
      <MaterialCommunityIcons name={icona} size={20} color={colori.primario} />
      <Text style={{ color: colori.primario, fontSize: 16, fontWeight: '600' }}>{testo}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  contenuto: { padding: 16, paddingBottom: 48 },
  etichetta: { fontSize: 15, color: colori.tenue, marginTop: 18, marginBottom: 6 },
  input: { backgroundColor: colori.card, borderRadius: 12, borderWidth: 1, borderColor: colori.bordo, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, color: colori.testo },
  riga: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bottone: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colori.primarioChiaro, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  icone: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  icona: { width: 52, height: 52, borderRadius: 12, backgroundColor: colori.card, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  iconaScelta: { borderColor: colori.primario },
  unita: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colori.card, borderWidth: 1, borderColor: colori.bordo },
  unitaScelta: { backgroundColor: colori.primario, borderColor: colori.primario },
  unitaTesto: { fontSize: 16, color: colori.testo, fontWeight: '600' },
  errore: { color: colori.rosso, marginTop: 16, fontSize: 15 },
  salva: { backgroundColor: colori.primario, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  salvaTesto: { color: '#fff', fontSize: 18, fontWeight: '700' },
  elimina: { alignItems: 'center', paddingVertical: 16, marginTop: 8 },
});
