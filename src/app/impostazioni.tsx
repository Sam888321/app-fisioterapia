import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { caricaAnticipo, salvaAnticipo } from '../archivio';
import { colori } from '../ui';

export default function Impostazioni() {
  const [anticipo, setAnticipo] = useState('');

  useEffect(() => {
    caricaAnticipo().then((v) => setAnticipo(String(v)));
  }, []);

  const valido = /^\d+$/.test(anticipo) && Number(anticipo) <= 1000;

  return (
    <View style={s.schermo}>
      <Text style={s.etichetta}>Anticipo beep (millisecondi)</Text>
      <TextInput
        style={s.input}
        value={anticipo}
        keyboardType="number-pad"
        onChangeText={(v) => {
          setAnticipo(v);
          if (/^\d+$/.test(v) && Number(v) <= 1000) salvaAnticipo(Number(v));
        }}
      />
      {!valido && <Text style={s.errore}>Un numero da 0 a 1000</Text>}
      <Text style={s.aiuto}>
        Il beep parte questo tanto prima che cambi il numero, per compensare il ritardo dell&apos;audio. Se il beep arriva dopo il numero aumentalo, se arriva prima diminuiscilo. Vale dalla prossima volta che apri un esercizio.
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: colori.sfondo, padding: 16 },
  etichetta: { fontSize: 15, color: colori.tenue, marginTop: 18, marginBottom: 6 },
  input: { backgroundColor: colori.card, borderRadius: 12, borderWidth: 1, borderColor: colori.bordo, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, color: colori.testo },
  errore: { color: colori.rosso, marginTop: 8, fontSize: 15 },
  aiuto: { color: colori.tenue, marginTop: 12, fontSize: 15, lineHeight: 21 },
});
