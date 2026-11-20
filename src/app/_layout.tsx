import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { inizializzaNotifiche } from '../notifiche';
import { colori } from '../ui';

export default function RootLayout() {
  useEffect(() => {
    // In Expo Go la creazione del canale fallisce (limite di Expo Go); nell'APK funziona.
    inizializzaNotifiche().catch((e) => console.warn('Canale notifiche non creato', e));
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colori.barra },
          headerTintColor: colori.testo,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colori.sfondo },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Esercizi' }} />
        <Stack.Screen name="esercizio/[id]" options={{ title: 'Esercizio' }} />
        <Stack.Screen name="timer/[id]" options={{ title: 'Timer' }} />
        <Stack.Screen name="storico" options={{ title: 'Storico' }} />
      </Stack>
    </>
  );
}
