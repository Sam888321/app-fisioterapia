# Fisioterapia

App Android personale che fa da timer per gli esercizi di riabilitazione di un dito fratturato. Conta ripetizioni, tenute e riposi al posto tuo, suona a ogni cambio, avvisa con una notifica quando finisce un tempo lungo (per esempio un'ora di tutore) anche ad app chiusa, e tiene uno storico per vedere quanto si è costanti.

App in italiano, solo Android, distribuita come APK da installare a mano (niente Play Store, niente account, niente cloud: i dati restano sul telefono).

## Cosa fa

- **Esercizi** con immagine (foto o icona), ripetizioni × tenuta, riposo tra le ripetizioni e un minimo di volte al giorno.
- **Timer**:
  - 3 s per prepararsi, poi tenuta → riposo → tenuta, con un beep a ogni cambio e un suono finale. Il beep parte leggermente in anticipo, con un valore regolabile nelle Impostazioni, per compensare il ritardo dell'audio Android.
  - **Pausa** con *Continua*, *Ricomincia ripetizione*, *Termina e salva* (registra quanto fatto e quanto mancava) e *Annulla* (scarta).
  - Lo schermo resta acceso durante l'esercizio.
- **Notifica di fine ad app chiusa**: è una sveglia esatta di Android, quindi l'app non resta in esecuzione in background.
- **Dolore** su 4 livelli a faccine, chiesto a fine esercizio e modificabile dopo.
- **Storico**:
  - Calendario del mese con un pallino per giorno: verde se il minimo è raggiunto, arancione se fatto in parte, rosso se saltato, grigio se in pausa.
  - Serie di giorni consecutivi e riquadri del giorno scelto.
- **Andamento** per esercizio, in tre viste:
  - *Giorno*: le sessioni su una striscia oraria.
  - *Settimana* e *Mese*: barre per giorno con la linea del minimo.
- **Riepilogo** in testo da condividere (per esempio con il fisioterapista) sugli ultimi 7 o 30 giorni.
- **Pausa degli esercizi**, uno alla volta o tutti insieme: i giorni in pausa non contano come saltati.
- **Backup**: esporta e importa i dati in un file JSON. Le foto non sono incluse.
- Tema scuro, layout edge-to-edge.

## Stack

Expo SDK 58 · React Native 0.88 · React 19 · TypeScript · expo-router · expo-notifications · expo-audio · expo-file-system · AsyncStorage · jest.

Grafici e calendario sono fatti a mano con componenti React Native: nessuna libreria di grafici e nessun modulo nativo aggiuntivo.

## Sviluppo

```bash
npm install
npm test               # test della logica (jest)
npx tsc --noEmit       # typecheck
npm run lint
npx expo start         # dev server: apri il progetto con Expo Go sul telefono o su un emulatore
```

In Expo Go si può provare quasi tutto. Fanno eccezione le notifiche: Expo Go non riesce a creare il canale, quindi vanno verificate con l'APK.

## Build dell'APK (locale, senza EAS)

```bash
npx expo prebuild --platform android      # solo se cambiano plugin, permessi o icone in app.json
cd android && ./gradlew assembleRelease   # → android/app/build/outputs/apk/release/app-release.apk
```

Note per Windows:

- Serve JDK 21.
- Serve `LongPathsEnabled=1` nel registro: le librerie native generano percorsi oltre i 260 caratteri.
- Serve CMake 3.31.6 indicato in `android/local.properties` con `cmake.dir=...`. Il prebuild cancella `local.properties`, quindi va rimesso a ogni prebuild.
- L'APK è firmato con la keystore di debug, che va bene per installarlo a mano.

## Struttura

```
src/app/          schermate (expo-router): Home, Modifica, Timer, Storico, Andamento, Impostazioni
src/componenti/   Calendario, Barre, Striscia oraria, scelta del Dolore
src/timer.ts      macchina a stati del timer, basata su timestamp (non deriva e regge app chiuse e riaperte)
src/storico.ts    logica dello storico: normalizzazione delle sessioni, colori dei giorni, serie, pause
src/andamento.ts  dati dei grafici
src/riepilogo.ts  testo da condividere
src/backup.ts     creazione e validazione del file di backup
src/archivio.ts   persistenza (AsyncStorage)
__tests__/        test jest della logica pura
```

Le parti con logica (`timer`, `storico`, `andamento`, `riepilogo`, `backup`, `sessione`) sono funzioni pure coperte da test. Le schermate si limitano a collegarle.
