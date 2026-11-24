import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { barre, blocchiGiorno, periodo, sposta, Vista } from '../andamento';
import { aggiornaSessione, caricaEsercizi, caricaSessioni } from '../archivio';
import { Barre } from '../componenti/Barre';
import { SceltaDolore } from '../componenti/Dolore';
import { Striscia } from '../componenti/Striscia';
import { formatDurata } from '../formato';
import { giornoLocale, misura, SessioneNorm } from '../storico';
import { Esercizio, Sessione } from '../tipi';
import { colori, ImmagineEsercizio } from '../ui';

const VISTE: { v: Vista; nome: string }[] = [
  { v: 'giorno', nome: 'Giorno' },
  { v: 'settimana', nome: 'Settimana' },
  { v: 'mese', nome: 'Mese' },
];
const daData = (d: string) => new Date(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8)));
const maiuscola = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function titolo(vista: Vista, rif: string): string {
  if (vista === 'giorno') return maiuscola(daData(rif).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long' }));
  if (vista === 'mese') return maiuscola(daData(rif).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }));
  const { da, a } = periodo('settimana', rif);
  return `${Number(da.slice(8))} – ${daData(a).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}`;
}

export default function Andamento() {
  const insets = useSafeAreaInsets();
  const parametri = useLocalSearchParams<{ esercizio?: string; data?: string; vista?: Vista }>();
  const [esercizi, setEsercizi] = useState<Esercizio[]>([]);
  const [sessioni, setSessioni] = useState<Sessione[]>([]);
  const [oggi, setOggi] = useState(() => giornoLocale(new Date()));
  const [scelto, setScelto] = useState(parametri.esercizio);
  const [vista, setVista] = useState<Vista>(parametri.vista ?? 'settimana');
  const [rif, setRif] = useState(parametri.data ?? oggi);
  const [doloreDi, setDoloreDi] = useState<SessioneNorm | null>(null);

  const ricarica = useCallback(() => {
    setOggi(giornoLocale(new Date()));
    caricaEsercizi().then(setEsercizi);
    caricaSessioni().then(setSessioni);
  }, []);
  useFocusEffect(ricarica);

  const es = esercizi.find((e) => e.id === scelto) ?? esercizi[0];
  if (!es) {
    return (
      <View style={[s.schermo, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={s.vuoto}>Nessun esercizio</Text>
      </View>
    );
  }
  const aTempo = misura(es) === 'tempo';
  const ultimoGiorno = periodo(vista, rif).a;
  const fmt = (v: number) => (aTempo ? formatDurata(v) : `${v.toLocaleString('it-IT', { maximumFractionDigits: 1 })} ${v === 1 ? 'volta' : 'volte'}`);

  async function scegliDolore(d: 0 | 1 | 2 | 3) {
    if (!doloreDi) return;
    await aggiornaSessione(doloreDi.id, { dolore: d });
    setDoloreDi(null);
    ricarica();
  }

  const giorno = vista === 'giorno' ? blocchiGiorno(es, sessioni, esercizi, rif) : null;
  const dati = vista !== 'giorno' ? barre(es, sessioni, esercizi, vista, rif, oggi) : null;

  return (
    <ScrollView style={s.schermo} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {esercizi.map((e) => (
          <Pressable key={e.id} onPress={() => setScelto(e.id)} style={[s.chip, e.id === es.id && s.chipScelto]}>
            <ImmagineEsercizio immagine={e.immagine} size={28} />
            <Text style={[s.chipTesto, e.id === es.id && { color: colori.accento }]}>{e.nome}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={s.viste}>
        {VISTE.map(({ v, nome }) => (
          <Pressable key={v} onPress={() => setVista(v)} style={[s.vista, v === vista && s.vistaScelta]}>
            <Text style={[s.vistaTesto, v === vista && { color: '#fff' }]}>{nome}</Text>
          </Pressable>
        ))}
      </View>

      <View style={s.navigazione}>
        <Pressable onPress={() => setRif(sposta(vista, rif, -1))} hitSlop={12} accessibilityLabel="Periodo precedente">
          <MaterialCommunityIcons name="chevron-left" size={30} color={colori.accento} />
        </Pressable>
        <Text style={s.titolo}>{titolo(vista, rif)}</Text>
        <Pressable onPress={() => setRif(sposta(vista, rif, 1))} disabled={ultimoGiorno >= oggi} hitSlop={12} accessibilityLabel="Periodo successivo">
          <MaterialCommunityIcons name="chevron-right" size={30} color={ultimoGiorno >= oggi ? colori.bordo : colori.accento} />
        </Pressable>
      </View>

      <View style={s.box}>
        {giorno && <Striscia {...giorno} aTempo={aTempo} onDolore={setDoloreDi} />}
        {dati && (
          <>
            <Text style={s.misura}>{aTempo ? 'Tempo di tenuta al giorno' : 'Volte al giorno'}</Text>
            <Barre
              barre={dati.barre}
              minimo={dati.minimo}
              aTempo={aTempo}
              vista={vista as 'settimana' | 'mese'}
              oggi={oggi}
              creatoIl={es.creatoIl}
              onScegli={(d) => {
                setRif(d);
                setVista('giorno');
              }}
            />
            <Text style={s.sintesi}>
              {`Media ${fmt(dati.media)} al giorno · ${dati.giorniSopra} ${dati.giorniSopra === 1 ? 'giorno' : 'giorni'} su ${dati.giorniValidi} sopra il minimo`}
            </Text>
          </>
        )}
      </View>

      <Modal visible={!!doloreDi} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setDoloreDi(null)}>
        <Pressable style={s.velo} onPress={() => setDoloreDi(null)}>
          <Pressable style={s.finestra}>
            <Text style={s.titolo}>Come andava il dito?</Text>
            <SceltaDolore valore={doloreDi?.dolore} onScegli={scegliDolore} />
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: colori.sfondo },
  vuoto: { color: colori.tenue, fontSize: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 14, backgroundColor: colori.card, borderWidth: 2, borderColor: 'transparent' },
  chipScelto: { borderColor: colori.accento },
  chipTesto: { fontSize: 15, fontWeight: '600', color: colori.testo },
  viste: { flexDirection: 'row', backgroundColor: colori.card, borderRadius: 12, padding: 4, marginTop: 14 },
  vista: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 9 },
  vistaScelta: { backgroundColor: colori.primario },
  vistaTesto: { fontSize: 15, fontWeight: '600', color: colori.tenue },
  navigazione: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  titolo: { fontSize: 18, fontWeight: '700', color: colori.testo },
  box: { backgroundColor: colori.card, borderRadius: 18, padding: 14, marginTop: 10 },
  misura: { fontSize: 14, color: colori.tenue, marginBottom: 8 },
  sintesi: { fontSize: 14, color: colori.testo, marginTop: 14, textAlign: 'center' },
  velo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  finestra: { backgroundColor: colori.barra, borderRadius: 18, padding: 20, alignItems: 'center' },
});
