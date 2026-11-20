import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { caricaEsercizi, salvaAttiva, SessioneAttiva } from '../../archivio';
import { formatTempo, sottotitolo } from '../../formato';
import { chiediPermesso, annullaNotifica, programmaFine } from '../../notifiche';
import { concludiSessione, sistemaAttiva } from '../../sessione';
import { suona } from '../../suoni';
import { avanza, avvia, fineEsercizio, pausa, restanteMs, riprendi, ripetizioniFatte, StatoTimer } from '../../timer';
import { Esercizio } from '../../tipi';
import { colori, ImmagineEsercizio } from '../../ui';

function TieniAcceso() {
  useKeepAwake();
  return null;
}

export default function Timer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [es, setEs] = useState<Esercizio | null | undefined>(undefined); // undefined = caricamento
  const [att, setAtt] = useState<SessioneAttiva | null>(null); // null = pronto a partire
  const [altra, setAltra] = useState<string | null>(null); // nome di un altro esercizio già in corso
  const [senzaNotifica, setSenzaNotifica] = useState(false);
  const [ora, setOra] = useState(() => Date.now());
  const attRef = useRef<SessioneAttiva | null>(null);

  const aggiorna = (a: SessioneAttiva | null) => {
    attRef.current = a;
    setAtt(a);
    setOra(Date.now());
  };

  useEffect(() => {
    caricaEsercizi().then(async (tutti) => {
      const e = tutti.find((x) => x.id === id) ?? null;
      const a = await sistemaAttiva(tutti, Date.now());
      if (a && a.esercizioId === id) aggiorna(a);
      else if (a) setAltra(tutti.find((x) => x.id === a.esercizioId)?.nome ?? null);
      setEs(e);
    });
  }, [id]);

  // Il tempo si ricalcola dai timestamp: il tick serve solo a ridisegnare e a emettere i suoni.
  useEffect(() => {
    if (!es) return;
    const passo = () => {
      const a = attRef.current;
      if (!a) return;
      const { stato, eventi } = avanza(a.stato, es.ripetizioni, es.tenutaSecondi * 1000, Date.now());
      if (stato !== a.stato) {
        const n = { ...a, stato };
        aggiorna(n);
        if (stato.fase === 'finito') concludiSessione(a, es, 'completato', es.ripetizioni);
        else salvaAttiva(n);
      }
      for (const ev of eventi) suona(ev === 'fine' ? 'fine' : 'cambio');
      setOra(Date.now());
    };
    const t = setInterval(passo, 200);
    const sub = AppState.addEventListener('change', (st) => st === 'active' && passo());
    return () => {
      clearInterval(t);
      sub.remove();
    };
  }, [es]);

  if (es === undefined) return <View style={s.schermo} />;
  if (es === null) {
    return (
      <View style={[s.schermo, s.centro]}>
        <Text style={s.titolo}>Esercizio non trovato</Text>
      </View>
    );
  }

  const tenutaMs = es.tenutaSecondi * 1000;
  const stato: StatoTimer | null = att?.stato ?? null;

  async function inizia() {
    if (!es) return;
    setSenzaNotifica(!(await chiediPermesso()));
    const st = avvia(Date.now());
    const notificaId = await programmaFine(fineEsercizio(st, es.ripetizioni, tenutaMs)!, es.nome);
    const n: SessioneAttiva = { esercizioId: es.id, inizio: new Date().toISOString(), stato: st, notificaId };
    aggiorna(n);
    await salvaAttiva(n);
  }

  async function metteInPausa() {
    const a = attRef.current;
    if (!a) return;
    const n = { ...a, stato: pausa(a.stato, Date.now()), notificaId: null };
    aggiorna(n);
    await annullaNotifica(a.notificaId);
    await salvaAttiva(n);
  }

  async function riparte(ricomincia: boolean) {
    const a = attRef.current;
    if (!a || !es) return;
    const st = riprendi(a.stato, tenutaMs, Date.now(), ricomincia);
    const notificaId = await programmaFine(fineEsercizio(st, es.ripetizioni, tenutaMs)!, es.nome);
    const n = { ...a, stato: st, notificaId };
    aggiorna(n);
    await salvaAttiva(n);
  }

  function annulla() {
    Alert.alert("Annullare l'esercizio?", undefined, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Annulla esercizio',
        style: 'destructive',
        onPress: async () => {
          const a = attRef.current;
          if (!a || !es) return;
          aggiorna(null);
          await concludiSessione(a, es, 'annullato', ripetizioniFatte(a.stato, es.ripetizioni));
          router.back();
        },
      },
    ]);
  }

  const contatore = (k: number) => `Ripetizione ${k} / ${es.ripetizioni}`;

  return (
    <View style={s.schermo}>
      <Stack.Screen options={{ title: es.nome }} />
      {(stato?.fase === 'preparazione' || stato?.fase === 'tenuta') && <TieniAcceso />}

      <View style={[s.centro, { flex: 1 }]}>
        <ImmagineEsercizio immagine={es.immagine} size={stato ? 96 : 140} />

        {!stato && (
          <>
            <Text style={s.titolo}>{es.nome}</Text>
            <Text style={s.sotto}>{sottotitolo(es.ripetizioni, es.tenutaSecondi)}</Text>
            <Text style={s.contatore}>{contatore(0)}</Text>
            <Text style={s.tempo}>{formatTempo(tenutaMs)}</Text>
          </>
        )}
        {stato?.fase === 'preparazione' && (
          <>
            <Text style={s.contatore}>Preparati</Text>
            <Text style={s.tempo}>{formatTempo(restanteMs(stato, ora))}</Text>
          </>
        )}
        {stato?.fase === 'tenuta' && (
          <>
            <Text style={s.contatore}>{contatore(stato.ripetizione)}</Text>
            <Text style={s.tempo}>{formatTempo(restanteMs(stato, ora))}</Text>
          </>
        )}
        {stato?.fase === 'pausa' && (
          <>
            <Text style={s.contatore}>Pausa — {contatore(stato.ripetizione).toLowerCase()}</Text>
            <Text style={s.tempo}>{formatTempo(stato.restanteMs)}</Text>
            <Text style={s.sotto}>rimasti</Text>
          </>
        )}
        {stato?.fase === 'finito' && (
          <>
            <Text style={s.fatto}>Fatto!</Text>
            <Text style={s.sotto}>{sottotitolo(es.ripetizioni, es.tenutaSecondi)} completato</Text>
          </>
        )}
        {senzaNotifica && stato && stato.fase !== 'finito' && (
          <Text style={s.avviso}>Senza permesso niente notifica ad app chiusa</Text>
        )}
      </View>

      <View style={s.comandi}>
        {!stato &&
          (altra ? (
            <Text style={s.avviso}>{`C'è già un esercizio in corso: ${altra}. Finiscilo o annullalo prima.`}</Text>
          ) : (
            <Grande testo="Avvia" onPress={inizia} />
          ))}
        {(stato?.fase === 'preparazione' || stato?.fase === 'tenuta') && (
          <>
            <Grande testo="Pausa" onPress={metteInPausa} />
            <Grande testo="Annulla" tenue onPress={annulla} />
          </>
        )}
        {stato?.fase === 'pausa' && (
          <>
            <Grande testo="Continua" onPress={() => riparte(false)} />
            <Grande testo="Ricomincia ripetizione" secondario onPress={() => riparte(true)} />
            <Grande testo="Annulla" tenue onPress={annulla} />
          </>
        )}
        {stato?.fase === 'finito' && <Grande testo="Torna alla home" onPress={() => router.back()} />}
      </View>
    </View>
  );
}

function Grande({ testo, onPress, secondario, tenue }: { testo: string; onPress: () => void; secondario?: boolean; tenue?: boolean }) {
  const sfondo = tenue ? 'transparent' : secondario ? colori.primarioChiaro : colori.primario;
  const colore = tenue ? colori.rosso : secondario ? colori.primario : '#fff';
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.grande, { backgroundColor: sfondo, opacity: pressed ? 0.7 : 1 }]}>
      <Text style={[s.grandeTesto, { color: colore }]}>{testo}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: colori.sfondo },
  centro: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  titolo: { fontSize: 26, fontWeight: '700', color: colori.testo, marginTop: 16, textAlign: 'center' },
  sotto: { fontSize: 18, color: colori.tenue, marginTop: 4 },
  contatore: { fontSize: 24, fontWeight: '600', color: colori.testo, marginTop: 24 },
  tempo: { fontSize: 120, fontWeight: '700', color: colori.primario, fontVariant: ['tabular-nums'] },
  fatto: { fontSize: 56, fontWeight: '800', color: colori.primario, marginTop: 24 },
  avviso: { fontSize: 15, color: colori.tenue, textAlign: 'center', marginTop: 12 },
  comandi: { padding: 20, gap: 12, paddingBottom: 36 },
  grande: { borderRadius: 16, paddingVertical: 20, alignItems: 'center' },
  grandeTesto: { fontSize: 22, fontWeight: '700' },
});
