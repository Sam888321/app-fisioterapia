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

test('in primo piano fuori dal timer la notifica si vede e suona', async () => {
  impostaTimerAperto(false);
  expect(await decisione()).toMatchObject({ shouldShowBanner: true, shouldPlaySound: true });
});

test('con il timer aperto la notifica resta silenziosa (suona già l\'app)', async () => {
  impostaTimerAperto(true);
  expect(await decisione()).toMatchObject({ shouldShowBanner: false, shouldPlaySound: false });
});
