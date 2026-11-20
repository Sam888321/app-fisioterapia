import { AudioPlayer, createAudioPlayer } from 'expo-audio';

const sorgenti = {
  cambio: require('../assets/suoni/cambio.wav'),
  fine: require('../assets/suoni/fine.wav'),
};
const player: Partial<Record<keyof typeof sorgenti, AudioPlayer>> = {};

export function suona(tipo: 'cambio' | 'fine'): void {
  const p = (player[tipo] ??= createAudioPlayer(sorgenti[tipo]));
  p.seekTo(0);
  p.play();
}
