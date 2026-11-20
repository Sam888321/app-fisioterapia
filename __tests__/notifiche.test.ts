jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
  AndroidImportance: { MAX: 7 },
}));

import * as Notifications from 'expo-notifications';
import { impostaTimerAperto, inizializzaNotifiche } from '../src/notifiche';

async function decisione() {
  await inizializzaNotifiche();
  const handler = (Notifications.setNotificationHandler as jest.Mock).mock.calls.at(-1)[0];
  return handler.handleNotification({});
}

test('il canale usa il suono di sistema (nessun file "sound" personalizzato)', async () => {
  await inizializzaNotifiche();
  const [id, opzioni] = (Notifications.setNotificationChannelAsync as jest.Mock).mock.calls.at(-1);
  expect(id).toBe('fine-esercizio');
  expect(opzioni).not.toHaveProperty('sound');
});

test('in primo piano fuori dal timer la notifica si vede e suona', async () => {
  impostaTimerAperto(false);
  expect(await decisione()).toMatchObject({ shouldShowBanner: true, shouldPlaySound: true });
});

test('con il timer aperto la notifica resta silenziosa (suona già l\'app)', async () => {
  impostaTimerAperto(true);
  expect(await decisione()).toMatchObject({ shouldShowBanner: false, shouldPlaySound: false });
});
