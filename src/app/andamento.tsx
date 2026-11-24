import { Text, View } from 'react-native';
import { colori } from '../ui';

// ponytail: segnaposto, la schermata viene fatta nel Task 4 del piano.
export default function Andamento() {
  return (
    <View style={{ flex: 1, backgroundColor: colori.sfondo, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colori.tenue }}>Andamento in costruzione</Text>
    </View>
  );
}
