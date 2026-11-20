import * as Notifications from 'expo-notifications';

const CANALE = 'fine-esercizio';

export async function inizializzaNotifiche(): Promise<void> {
  // In primo piano il suono lo fa già l'app: niente banner né suono di sistema.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false }),
  });
  await Notifications.setNotificationChannelAsync(CANALE, {
    name: 'Fine esercizio',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 400, 200, 400],
  });
}

export async function chiediPermesso(): Promise<boolean> {
  const attuale = await Notifications.getPermissionsAsync();
  if (attuale.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

export async function programmaFine(quando: number, nomeEsercizio: string): Promise<string | null> {
  if (!(await Notifications.getPermissionsAsync()).granted) return null;
  return Notifications.scheduleNotificationAsync({
    content: { title: 'Esercizio finito', body: `${nomeEsercizio} completato` },
    // alarmClock: Android non rimanda queste sveglie per risparmiare batteria (es. tutore da 1 ora).
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: quando, channelId: CANALE, delivery: 'alarmClock' },
  });
}

export async function annullaNotifica(id: string | null): Promise<void> {
  if (id) await Notifications.cancelScheduledNotificationAsync(id);
}
