import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, View } from 'react-native';
import { Dolore, Immagine } from './tipi';

// Tema scuro: fondo blu notte, verde scuro per i pulsanti pieni, verde chiaro per testi/icone in evidenza.
export const colori = {
  sfondo: '#0E1621',
  barra: '#121D2B',
  card: '#172231',
  primario: '#1B7A5E',
  primarioChiaro: '#14342E',
  accento: '#5BD1A9',
  testo: '#E6EDF3',
  tenue: '#8B9BAE',
  rosso: '#F06A6A',
  arancione: '#F0A04B',
  giallo: '#E3C35A',
  bordo: '#253246',
};

export const DOLORI: { valore: Dolore; nome: string; icona: keyof typeof MaterialCommunityIcons.glyphMap; colore: string }[] = [
  { valore: 0, nome: 'nessuno', icona: 'emoticon-happy-outline', colore: colori.accento },
  { valore: 1, nome: 'lieve', icona: 'emoticon-neutral-outline', colore: colori.giallo },
  { valore: 2, nome: 'medio', icona: 'emoticon-sad-outline', colore: colori.arancione },
  { valore: 3, nome: 'forte', icona: 'emoticon-cry-outline', colore: colori.rosso },
];

export function ImmagineEsercizio({ immagine, size }: { immagine: Immagine; size: number }) {
  // Foto non più sul telefono (es. dati ripristinati da backup, che non include le foto): icona al suo posto.
  const [mancante, setMancante] = useState<string | null>(null);
  if (immagine.tipo === 'foto' && mancante !== immagine.uri) {
    return <Image source={{ uri: immagine.uri }} onError={() => setMancante(immagine.uri)} style={{ width: size, height: size, borderRadius: size / 6 }} />;
  }
  const icona = immagine.tipo === 'foto' ? 'image-off-outline' : immagine.nome;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 6, backgroundColor: colori.primarioChiaro, alignItems: 'center', justifyContent: 'center' }}>
      <MaterialCommunityIcons name={icona as keyof typeof MaterialCommunityIcons.glyphMap} size={size * 0.6} color={colori.accento} />
    </View>
  );
}
