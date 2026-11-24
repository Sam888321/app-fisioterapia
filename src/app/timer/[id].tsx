import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { aggiornaSessione, caricaAnticipo, caricaEsercizi, salvaAttiva, SessioneAttiva } from '../../archivio';
import { SceltaDolore } from '../../componenti/Dolore';
import { formatDurata, formatTempo, sottotitolo } from '../../formato';
import { esclusivo } from '../../esclusivo';
import { annullaNotifica, chiediPermesso, impostaTimerAperto, programmaFine } from '../../notifiche';
import { concludiSessione, nuovaSessione, scartaSessione, sistemaAttiva } from '../../sessione';
import { normalizza, ripetizioneRaggiunta } from '../../storico';
import { precaricaSuoni, suona } from '../../suoni';
import { avanza, avvia, Evento, fineEsercizio, pausa, restanteMs, riprendi, StatoTimer } from '../../timer';
import { Dolore, Esercizio, Sessione } from '../../tipi';
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
  const [anteprima, setAnteprima] = useState(false);
  const [idChiusa, setIdChiusa] = useState<string | null>(null); // sessione appena registrata: per il dolore
  const [terminata, setTerminata] = useState<Sessione | null>(null); // Termina e salva: riepilogo a schermo
  const [dolore, setDolore] = useState<Dolore | undefined>(undefined);
  const insets = useSafeAreaInsets();
  const [ora, setOra] = useState(() => Date.now());
  const attRef = useRef<SessioneAttiva | null>(null);
  const occupato = useRef(false);
  const anticipoMs = useRef(110);

  useEffect(() => {
    impostaTimerAperto(true);
    precaricaSuoni();
    caricaAnticipo().then((v) => (anticipoMs.current = v));
    return () => impostaTimerAperto(false);
  }, []);

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
    const tenuta = es.tenutaSecondi * 1000;
    const riposo = (es.riposoSecondi ?? 0) * 1000;
    // Il beep parte anticipoMs prima dello scatto (l'audio Android arriva in ritardo); suonatoPer evita il doppio beep.
    let suonatoPer = 0;
    const beep = (eventi: Evento[], fine: number) => {
      if (suonatoPer === fine) return;
      suonatoPer = fine;
      for (const ev of eventi) suona(ev === 'fine' ? 'fine' : 'cambio');
    };
    const passo = () => {
      const a = attRef.current;
      if (!a) return;
      const { stato, eventi } = avanza(a.stato, es.ripetizioni, tenuta, Date.now(), riposo);
      if (stato !== a.stato) {
        if ('fineFase' in a.stato) beep(eventi, a.stato.fineFase); // se l'anticipo non è partito (app in background)
        const n = { ...a, stato };
        aggiorna(n);
        if (stato.fase === 'finito') concludiSessione(a, es, 'completato', Date.now()).then(setIdChiusa);
        else salvaAttiva(n);
      }
      setOra(Date.now());
      // Timeout esatti: il tick da 200 ms sarebbe in ritardo fino a 0,2 s.
      clearTimeout(scatto);
      clearTimeout(anticipo);
      const st = attRef.current?.stato;
      if (st && 'fineFase' in st) {
        const fine = st.fineFase;
        scatto = setTimeout(passo, Math.max(0, fine - Date.now()));
        anticipo = setTimeout(() => {
          if (attRef.current?.stato === st) beep(avanza(st, es.ripetizioni, tenuta, fine, riposo).eventi, fine); // non se nel frattempo è in pausa
        }, Math.max(0, fine - anticipoMs.current - Date.now()));
      }
    };
    let scatto: ReturnType<typeof setTimeout> | undefined;
    let anticipo: ReturnType<typeof setTimeout> | undefined;
    const t = setInterval(passo, 200);
    const sub = AppState.addEventListener('change', (st) => st === 'active' && passo());
    return () => {
      clearInterval(t);
      clearTimeout(scatto);
      clearTimeout(anticipo);
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
  const riposoMs = (es.riposoSecondi ?? 0) * 1000;
  const stato: StatoTimer | null = att?.stato ?? null;

  const inizia = () =>
    esclusivo(occupato, async () => {
      if (!es || attRef.current) return;
      setSenzaNotifica(!(await chiediPermesso()));
      const st = avvia(Date.now());
      const notificaId = await programmaFine(fineEsercizio(st, es.ripetizioni, tenutaMs, riposoMs)!, es.nome);
      const n: SessioneAttiva = { esercizioId: es.id, inizio: new Date().toISOString(), stato: st, notificaId };
      aggiorna(n);
      await salvaAttiva(n);
    });

  async function metteInPausa() {
    const a = attRef.current;
    if (!a) return;
    const n = { ...a, stato: pausa(a.stato, Date.now()), notificaId: null };
    aggiorna(n);
    await annullaNotifica(a.notificaId);
    await salvaAttiva(n);
  }

  const riparte = (ricomincia: boolean) =>
    esclusivo(occupato, async () => {
      const a = attRef.current;
      if (!a || !es || a.stato.fase !== 'pausa') return;
      const st = riprendi(a.stato, tenutaMs, Date.now(), ricomincia, riposoMs);
      const notificaId = await programmaFine(fineEsercizio(st, es.ripetizioni, tenutaMs, riposoMs)!, es.nome);
      const n = { ...a, stato: st, notificaId };
      aggiorna(n);
      await salvaAttiva(n);
    });

  // Dalla pausa: registra quanto fatto come sessione interrotta.
  const termina = () =>
    esclusivo(occupato, async () => {
      const a = attRef.current;
      if (!a || !es || a.stato.fase !== 'pausa') return;
      const adesso = Date.now();
      const idS = await concludiSessione(a, es, 'interrotto', adesso);
      setTerminata(nuovaSessione(a, es, 'interrotto', adesso, idS ?? ''));
      setIdChiusa(idS);
      aggiorna(null);
    });

  function scegliDolore(d: Dolore) {
    setDolore(d);
    if (idChiusa) aggiornaSessione(idChiusa, { dolore: d });
  }

  function annulla() {
    Alert.alert("Scartare l'esercizio?", 'Non verrà salvato nello storico.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Scarta',
        style: 'destructive',
        onPress: async () => {
          const a = attRef.current;
          if (!a || !es) return;
          aggiorna(null);
          await scartaSessione(a);
          router.back();
        },
      },
    ]);
  }

  const contatore = (k: number) => `Ripetizione ${k} / ${es.ripetizioni}`;

  return (
    <View style={s.schermo}>
      <Stack.Screen options={{ title: es.nome }} />
      {(stato?.fase === 'preparazione' || stato?.fase === 'tenuta' || stato?.fase === 'riposo') && <TieniAcceso />}

      <View style={[s.centro, { flex: 1 }]}>
        <Pressable onPress={() => setAnteprima(true)} disabled={es.immagine.tipo !== 'foto'} accessibilityLabel="Ingrandisci foto">
          <ImmagineEsercizio immagine={es.immagine} size={stato ? 96 : 140} />
        </Pressable>

        {!stato && !terminata && (
          <>
            <Text style={s.titolo}>{es.nome}</Text>
            <Text style={s.sotto}>{sottotitolo(es.ripetizioni, es.tenutaSecondi, es.riposoSecondi)}</Text>
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
        {stato?.fase === 'riposo' && (
          <>
            <Text style={s.contatore}>Riposo</Text>
            <Text style={[s.tempo, { color: colori.tenue }]}>{formatTempo(restanteMs(stato, ora))}</Text>
            <Text style={s.sotto}>poi {contatore(stato.ripetizione).toLowerCase()}</Text>
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
            <Text style={s.sotto}>{sottotitolo(es.ripetizioni, es.tenutaSecondi, es.riposoSecondi)} completato</Text>
          </>
        )}
        {terminata && (
          <>
            <Text style={[s.fatto, { color: colori.arancione }]}>Terminato</Text>
            <Text style={s.sotto}>
              {`${ripetizioneRaggiunta(normalizza(terminata, [es]))}/${es.ripetizioni}`}
              {(terminata.restanteMs ?? 0) > 0 && ` · mancavano ${formatDurata(terminata.restanteMs!)}`}
            </Text>
          </>
        )}
        {(stato?.fase === 'finito' || terminata) && idChiusa && (
          <>
            <Text style={s.domanda}>Come va il dito?</Text>
            <SceltaDolore valore={dolore} onScegli={scegliDolore} />
          </>
        )}
        {senzaNotifica && stato && stato.fase !== 'finito' && (
          <Text style={s.avviso}>Senza permesso niente notifica ad app chiusa</Text>
        )}
      </View>

      {es.immagine.tipo === 'foto' && (
        <Modal visible={anteprima} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setAnteprima(false)}>
          <Pressable style={s.anteprima} onPress={() => setAnteprima(false)} accessibilityLabel="Chiudi foto">
            <Image source={{ uri: es.immagine.uri }} style={s.foto} resizeMode="contain" />
          </Pressable>
        </Modal>
      )}

      <View style={[s.comandi, { paddingBottom: insets.bottom + 20 }]}>
        {!stato &&
          !terminata &&
          (altra ? (
            <Text style={s.avviso}>{`C'è già un esercizio in corso: ${altra}. Finiscilo o annullalo prima.`}</Text>
          ) : (
            <Grande testo="Avvia" onPress={inizia} />
          ))}
        {(stato?.fase === 'preparazione' || stato?.fase === 'tenuta' || stato?.fase === 'riposo') && (
          <>
            <Grande testo="Pausa" onPress={metteInPausa} />
            <Grande testo="Annulla" tenue onPress={annulla} />
          </>
        )}
        {stato?.fase === 'pausa' && (
          <>
            <Grande testo="Continua" onPress={() => riparte(false)} />
            <Grande testo="Ricomincia ripetizione" secondario onPress={() => riparte(true)} />
            <View style={s.riga}>
              <Grande testo="Termina e salva" secondario onPress={termina} />
              <Grande testo="Annulla" tenue onPress={annulla} />
            </View>
          </>
        )}
        {(stato?.fase === 'finito' || terminata) && <Grande testo="Torna alla home" onPress={() => router.back()} />}
      </View>
    </View>
  );
}

function Grande({ testo, onPress, secondario, tenue }: { testo: string; onPress: () => void; secondario?: boolean; tenue?: boolean }) {
  const sfondo = tenue ? 'transparent' : secondario ? colori.primarioChiaro : colori.primario;
  const colore = tenue ? colori.rosso : secondario ? colori.accento : '#fff';
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.grande, { flexGrow: 1, backgroundColor: sfondo, opacity: pressed ? 0.7 : 1 }]}>
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
  tempo: { fontSize: 120, fontWeight: '700', color: colori.accento, fontVariant: ['tabular-nums'] },
  fatto: { fontSize: 56, fontWeight: '800', color: colori.accento, marginTop: 24 },
  avviso: { fontSize: 15, color: colori.tenue, textAlign: 'center', marginTop: 12 },
  comandi: { padding: 20, gap: 12, paddingBottom: 36 },
  grande: { borderRadius: 16, paddingVertical: 20, alignItems: 'center' },
  grandeTesto: { fontSize: 22, fontWeight: '700' },
  riga: { flexDirection: 'row', gap: 12 },
  domanda: { fontSize: 20, fontWeight: '600', color: colori.testo, marginTop: 28 },
  anteprima: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', padding: 16 },
  foto: { width: '100%', height: '100%' },
});
