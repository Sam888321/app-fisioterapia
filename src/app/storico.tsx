import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { caricaEsercizi, caricaSessioni } from '../archivio';
import { fasceOrarie, giornoLocale, RigaStorico, riepilogoMese } from '../storico';
import { Esercizio, Sessione } from '../tipi';
import { colori } from '../ui';

const maiuscola = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function titoloGiorno(data: string, oggi: string): string {
  const [a, m, g] = data.split('-').map(Number);
  const breve = new Date(a, m - 1, g).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' });
  return data === oggi ? `Oggi, ${breve}` : maiuscola(breve);
}

export default function Storico() {
  const [esercizi, setEsercizi] = useState<Esercizio[]>([]);
  const [sessioni, setSessioni] = useState<Sessione[]>([]);
  const [oggi, setOggi] = useState(() => new Date());
  const [mese, setMese] = useState(() => ({ anno: oggi.getFullYear(), mese: oggi.getMonth() }));

  useFocusEffect(
    useCallback(() => {
      setOggi(new Date());
      caricaEsercizi().then(setEsercizi);
      caricaSessioni().then(setSessioni);
    }, []),
  );

  const giorni = riepilogoMese(esercizi, sessioni, mese.anno, mese.mese, oggi);
  const delMese = sessioni.filter((s) => {
    const d = new Date(s.inizio);
    return d.getFullYear() === mese.anno && d.getMonth() === mese.mese;
  });
  const fasce = fasceOrarie(delMese);
  const nessuna = !delMese.some((s) => s.esito === 'completato');
  const meseCorrente = mese.anno === oggi.getFullYear() && mese.mese === oggi.getMonth();
  const sposta = (d: number) => {
    const x = new Date(mese.anno, mese.mese + d, 1);
    setMese({ anno: x.getFullYear(), mese: x.getMonth() });
  };
  const dataOggi = giornoLocale(oggi);

  return (
    <View style={s.schermo}>
      <View style={s.mese}>
        <Pressable onPress={() => sposta(-1)} hitSlop={12} accessibilityLabel="Mese precedente">
          <MaterialCommunityIcons name="chevron-left" size={32} color={colori.primario} />
        </Pressable>
        <Text style={s.meseTesto}>{new Date(mese.anno, mese.mese, 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</Text>
        <Pressable onPress={() => sposta(1)} disabled={meseCorrente} hitSlop={12} accessibilityLabel="Mese successivo">
          <MaterialCommunityIcons name="chevron-right" size={32} color={meseCorrente ? colori.bordo : colori.primario} />
        </Pressable>
      </View>

      <SectionList
        sections={giorni.map((g) => ({ title: titoloGiorno(g.data, dataOggi), data: g.righe }))}
        keyExtractor={(r, i) => r.esercizioId + i}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        renderSectionHeader={({ section }) => <Text style={s.giorno}>{section.title}</Text>}
        renderItem={({ item }) => <Riga r={item} />}
        ListEmptyComponent={<Text style={s.vuoto}>Nessun dato per questo mese</Text>}
        stickySectionHeadersEnabled={false}
      />

      <View style={s.piede}>
        <Text style={s.piedeTesto}>
          {nessuna
            ? 'Nessun esercizio completato questo mese'
            : `Orari abituali: mattina ${fasce.mattina}% · pomeriggio ${fasce.pomeriggio}% · sera ${fasce.sera}%`}
        </Text>
      </View>
    </View>
  );
}

function Riga({ r }: { r: RigaStorico }) {
  const conteggio = r.target !== undefined ? `${r.completate} / ${r.target}` : `${r.completate}`;
  return (
    <View style={s.riga}>
      <View style={s.rigaTop}>
        <Text style={s.nome}>{r.nome}</Text>
        {r.stato === 'saltato' ? (
          <Text style={[s.conteggio, { color: colori.rosso }]}>✗ {conteggio} saltato</Text>
        ) : (
          <Text style={[s.conteggio, { color: r.stato === 'ok' ? colori.primario : colori.testo }]}>✓ {conteggio}</Text>
        )}
      </View>
      {r.orari.length > 0 && <Text style={s.orari}>{r.orari.join(' · ')}</Text>}
      {r.annullate.map((a, i) => (
        <Text key={i} style={s.annullata}>
          annullato {a.orario} ({a.ripetizioniFatte} rip.)
        </Text>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: colori.sfondo },
  mese: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colori.card, borderBottomWidth: 1, borderColor: colori.bordo },
  meseTesto: { fontSize: 20, fontWeight: '700', color: colori.testo, textTransform: 'capitalize' },
  giorno: { fontSize: 17, fontWeight: '700', color: colori.testo, marginTop: 16, marginBottom: 8 },
  riga: { backgroundColor: colori.card, borderRadius: 12, padding: 12, marginBottom: 8 },
  rigaTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  nome: { fontSize: 17, fontWeight: '600', color: colori.testo, flexShrink: 1 },
  conteggio: { fontSize: 17, fontWeight: '700' },
  orari: { fontSize: 15, color: colori.tenue, marginTop: 4 },
  annullata: { fontSize: 14, color: '#9CA3AF', marginTop: 2 },
  vuoto: { textAlign: 'center', color: colori.tenue, fontSize: 16, marginTop: 40 },
  piede: { padding: 16, backgroundColor: colori.card, borderTopWidth: 1, borderColor: colori.bordo },
  piedeTesto: { fontSize: 15, color: colori.testo, textAlign: 'center' },
});
