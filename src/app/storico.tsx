import { Text, View } from 'react-native';
import { colori } from '../ui';

// ponytail: segnaposto, la schermata viene rifatta nel Task 3 del piano.
export default function Storico() {
  return (
    <View style={{ flex: 1, backgroundColor: colori.sfondo, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colori.tenue }}>Storico in costruzione</Text>
    </View>
  );
}
