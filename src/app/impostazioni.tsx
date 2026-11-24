import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Directory, File } from 'expo-file-system';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { caricaAnticipo, caricaAttiva, caricaEsercizi, caricaSessioni, salvaAnticipo, salvaTuttiEsercizi, sostituisciDati } from '../archivio';
import { creaBackup, leggiBackup } from '../backup';
import { giornoLocale, inPausa, mettiInPausa, riprendi } from '../storico';
import { colori } from '../ui';

const annullato = (e: unknown) => /cancel/i.test(String(e));

export default function Impostazioni() {
  const [anticipo, setAnticipo] = useState('');
  const [tuttiInPausa, setTuttiInPausa] = useState(false);

  const leggiPausa = () =>
    caricaEsercizi().then((e) => setTuttiInPausa(e.length > 0 && e.every((x) => inPausa(x, giornoLocale(new Date())))));

  useEffect(() => {
    caricaAnticipo().then((v) => setAnticipo(String(v)));
    leggiPausa();
  }, []);

  async function cambiaPausaTutti() {
    const oggi = giornoLocale(new Date());
    const applica = async () => {
      const esercizi = await caricaEsercizi();
      await salvaTuttiEsercizi(esercizi.map((e) => (tuttiInPausa ? riprendi(e, oggi) : mettiInPausa(e, oggi))));
      await leggiPausa();
    };
    if (tuttiInPausa) return applica();
    Alert.alert('Mettere in pausa tutti gli esercizi?', 'Da oggi i giorni senza esercizi non conteranno come saltati, finché non riprendi.', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Metti in pausa', onPress: applica },
    ]);
  }

  const valido = /^\d+$/.test(anticipo) && Number(anticipo) <= 1000;

  async function esporta() {
    try {
      const cartella = await Directory.pickDirectoryAsync();
      const [esercizi, sessioni, anticipoBeep] = await Promise.all([caricaEsercizi(), caricaSessioni(), caricaAnticipo()]);
      const nome = `fisioterapia-backup-${giornoLocale(new Date())}.json`;
      await cartella.createFile(nome, 'application/json').write(JSON.stringify(creaBackup(esercizi, sessioni, anticipoBeep, new Date()), null, 2));
      Alert.alert('Backup salvato', `${nome}
${esercizi.length} esercizi, ${sessioni.length} sessioni.`);
    } catch (e) {
      if (!annullato(e)) Alert.alert('Esportazione non riuscita', String(e));
    }
  }

  async function importa() {
    if (await caricaAttiva()) {
      Alert.alert('Esercizio in corso', "Finisci o annulla l'esercizio in corso prima di importare i dati.");
      return;
    }
    try {
      const scelta = await File.pickFileAsync();
      if (scelta.canceled) return;
      const dati = leggiBackup(await scelta.result.text());
      if (typeof dati === 'string') {
        Alert.alert('Backup non valido', `${dati} Non è stato cambiato niente.`);
        return;
      }
      Alert.alert(
        'Sostituire i dati?',
        `Esercizi e storico attuali verranno sostituiti con quelli del file (${dati.esercizi.length} esercizi, ${dati.sessioni.length} sessioni).`,
        [
          { text: 'Annulla', style: 'cancel' },
          {
            text: 'Sostituisci',
            style: 'destructive',
            onPress: async () => {
              if (!(await sostituisciDati(dati))) {
                Alert.alert('Esercizio in corso', "Finisci o annulla l'esercizio in corso prima di importare i dati.");
                return;
              }
              setAnticipo(String(dati.anticipoBeep));
              Alert.alert('Dati ripristinati');
            },
          },
        ],
      );
    } catch (e) {
      if (!annullato(e)) Alert.alert('Importazione non riuscita', String(e));
    }
  }

  return (
    <ScrollView style={s.schermo} contentContainerStyle={{ padding: 16 }}>
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

      <Text style={[s.etichetta, { marginTop: 32 }]}>Backup dei dati</Text>
      <Pressable style={s.bottone} onPress={esporta}>
        <MaterialCommunityIcons name="export-variant" size={22} color={colori.accento} />
        <Text style={s.bottoneTesto}>Esporta dati</Text>
      </Pressable>
      <Pressable style={s.bottone} onPress={importa}>
        <MaterialCommunityIcons name="import" size={22} color={colori.accento} />
        <Text style={s.bottoneTesto}>Importa dati</Text>
      </Pressable>
      <Text style={s.aiuto}>
        Esporta salva esercizi, storico e impostazioni in un file (per esempio su Drive o nei Download). Importa li sostituisce con quelli del file. Le foto non sono incluse: dopo un ripristino su un altro telefono vanno rimesse.
      </Text>

      <Text style={[s.etichetta, { marginTop: 32 }]}>Terapia</Text>
      <Pressable style={s.bottone} onPress={cambiaPausaTutti}>
        <MaterialCommunityIcons name={tuttiInPausa ? 'play-circle-outline' : 'pause-circle-outline'} size={22} color={colori.accento} />
        <Text style={s.bottoneTesto}>{tuttiInPausa ? 'Riprendi tutto' : 'Metti in pausa tutto'}</Text>
      </Pressable>
      <Text style={s.aiuto}>
        Per quando la terapia finisce o il fisioterapista dice di fermarsi. I giorni in pausa restano grigi nello Storico e non interrompono la serie. Un singolo esercizio si mette in pausa dalla sua schermata Modifica.
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: colori.sfondo },
  etichetta: { fontSize: 15, color: colori.tenue, marginTop: 18, marginBottom: 6 },
  input: { backgroundColor: colori.card, borderRadius: 12, borderWidth: 1, borderColor: colori.bordo, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, color: colori.testo },
  errore: { color: colori.rosso, marginTop: 8, fontSize: 15 },
  aiuto: { color: colori.tenue, marginTop: 12, fontSize: 15, lineHeight: 21 },
  bottone: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colori.primarioChiaro, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, marginTop: 10 },
  bottoneTesto: { color: colori.accento, fontSize: 17, fontWeight: '600' },
});
