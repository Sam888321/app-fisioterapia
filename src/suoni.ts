import { AudioPlayer, createAudioPlayer } from 'expo-audio';

const sorgenti = {
  cambio: require('../assets/suoni/cambio.wav'),
  fine: require('../assets/suoni/fine.wav'),
};
type Tipo = keyof typeof sorgenti;
const player: Partial<Record<Tipo, AudioPlayer>> = {};

function prendi(tipo: Tipo): AudioPlayer {
  return (player[tipo] ??= createAudioPlayer(sorgenti[tipo]));
}

// Da chiamare all'apertura del timer: caricare il file al primo beep lo fa arrivare in ritardo.
export function precaricaSuoni(): void {
  prendi('cambio');
  prendi('fine');
}

export function suona(tipo: Tipo): void {
  const p = prendi(tipo);
  // ponytail: niente riavvolgimento automatico a fine suono: il player Android resta in "play" e ripartirebbe in loop.
  p.seekTo(0);
  p.play();
}
