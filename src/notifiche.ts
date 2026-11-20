import * as Notifications from 'expo-notifications';

const CANALE = 'fine-esercizio';

let timerAperto = false;
export function impostaTimerAperto(aperto: boolean): void {
  timerAperto = aperto;
}

export async function inizializzaNotifiche(): Promise<void> {
  // Con il timer a schermo il suono lo fa già l'app; su Home/Storico/Modifica la notifica deve farsi sentire.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: !timerAperto, shouldShowList: !timerAperto, shouldPlaySound: !timerAperto, shouldSetBadge: false }),
  });
  await Notifications.setNotificationChannelAsync(CANALE, {
    name: 'Fine esercizio',
    // eslint-disable-next-line import/namespace -- esportato via `export *`, il plugin non lo vede
    importance: Notifications.AndroidImportance.MAX,
    // niente `sound`: omesso = suono di sistema. 'default' verrebbe cercato come file personalizzato e il canale fallisce.
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
