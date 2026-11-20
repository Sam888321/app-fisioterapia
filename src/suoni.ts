import { AudioPlayer, createAudioPlayer } from 'expo-audio';

const sorgenti = {
  cambio: require('../assets/suoni/cambio.wav'),
  fine: require('../assets/suoni/fine.wav'),
};
type Tipo = keyof typeof sorgenti;
const player: Partial<Record<Tipo, AudioPlayer>> = {};

function prendi(tipo: Tipo): AudioPlayer {
  let p = player[tipo];
  if (!p) {
    const nuovo = createAudioPlayer(sorgenti[tipo]);
    // Riavvolge a fine suono, così il prossimo play() parte subito (seekTo prima di play aggiunge ritardo).
    nuovo.addListener('playbackStatusUpdate', (s) => s.didJustFinish && nuovo.seekTo(0));
    p = player[tipo] = nuovo;
  }
  return p;
}

// Da chiamare all'apertura del timer: caricare il file al primo beep lo fa arrivare in ritardo.
export function precaricaSuoni(): void {
  prendi('cambio');
  prendi('fine');
}

export function suona(tipo: Tipo): void {
  const p = prendi(tipo);
  if (p.playing || p.currentTime > 0) p.seekTo(0); // beep precedente non ancora finito
  p.play();
}
