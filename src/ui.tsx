import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image, View } from 'react-native';
import { Immagine } from './tipi';

export const colori = {
  sfondo: '#F4F6F5',
  card: '#FFFFFF',
  primario: '#0E7C66',
  primarioChiaro: '#DDF1EC',
  testo: '#1B1F24',
  tenue: '#6B7280',
  rosso: '#C62828',
  bordo: '#E3E7E5',
};

export function ImmagineEsercizio({ immagine, size }: { immagine: Immagine; size: number }) {
  if (immagine.tipo === 'foto') {
    return <Image source={{ uri: immagine.uri }} style={{ width: size, height: size, borderRadius: size / 6 }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 6, backgroundColor: colori.primarioChiaro, alignItems: 'center', justifyContent: 'center' }}>
      <MaterialCommunityIcons name={immagine.nome as keyof typeof MaterialCommunityIcons.glyphMap} size={size * 0.6} color={colori.primario} />
    </View>
  );
}
