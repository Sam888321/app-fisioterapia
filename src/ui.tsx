import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image, View } from 'react-native';
import { Immagine } from './tipi';

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
  bordo: '#253246',
};

export function ImmagineEsercizio({ immagine, size }: { immagine: Immagine; size: number }) {
  if (immagine.tipo === 'foto') {
    return <Image source={{ uri: immagine.uri }} style={{ width: size, height: size, borderRadius: size / 6 }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 6, backgroundColor: colori.primarioChiaro, alignItems: 'center', justifyContent: 'center' }}>
      <MaterialCommunityIcons name={immagine.nome as keyof typeof MaterialCommunityIcons.glyphMap} size={size * 0.6} color={colori.accento} />
    </View>
  );
}
