import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { inizializzaNotifiche } from '../notifiche';

export default function RootLayout() {
  useEffect(() => {
    inizializzaNotifiche();
  }, []);

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Esercizi' }} />
      <Stack.Screen name="esercizio/[id]" options={{ title: 'Esercizio' }} />
      <Stack.Screen name="timer/[id]" options={{ title: 'Timer' }} />
      <Stack.Screen name="storico" options={{ title: 'Storico' }} />
    </Stack>
  );
}
