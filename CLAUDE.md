# App Fisioterapia

App Android personale di Samu (non FOR J): timer programmabile per gli esercizi di fisioterapia del dito (N ripetizioni × T secondi di tenuta), con suoni, notifica di fine ad app chiusa e storico. Leggi anche `AGENTS.md` (regole Expo del template: SDK cambia spesso, consultare i docs versionati).

## Contesto vivo (ultimo aggiornamento 2026-11-20)

**Repo:** git locale, nessun remote. Si lavora su `main`. Commit senza alcuna attribuzione a Claude (niente `Co-Authored-By`).

**Stack:** Expo SDK 58, React Native 0.88, React 19.3, TypeScript 6, expo-router (route in `src/app/`). Moduli: expo-notifications, expo-audio, expo-image-picker, expo-file-system, expo-keep-awake, AsyncStorage, @expo/vector-icons. Test con jest + jest-expo.

**Struttura:**
```
src/app/            schermate (expo-router): _layout, index (Home), esercizio/[id], timer/[id], storico
src/tipi.ts         tipi di dominio + validaEsercizio
src/timer.ts        macchina a stati del timer (pura, basata su timestamp)
src/storico.ts      aggregazione storico per giorno (pura)
src/archivio.ts     AsyncStorage: esercizi, sessioni, sessione attiva, seed, copia foto
src/notifiche.ts    permesso, canale, notifica programmata di fine esercizio
src/suoni.ts        suoni cambio/fine
src/icone.ts        icone predefinite (MaterialCommunityIcons)
scripts/genera-suoni.mjs  genera assets/suoni/*.wav
__tests__/          test jest della logica pura
docs/superpowers/   spec e piano (NON tracciati, in .gitignore)
```
`android/` è generata (CNG, in .gitignore): non modificarla a mano, si configura da `app.json`.

**Comandi:**
- `npm test` — test; `npx tsc --noEmit` — typecheck.
- **Anteprima veloce senza build (BlueStacks + Expo Go 58):** `adb connect 127.0.0.1:5555` (adb in `%LOCALAPPDATA%\Android\Sdk\platform-tools`), poi `npx expo start --android`. Screenshot: `adb -s 127.0.0.1:5555 exec-out screencap -p > shot.png`. In Expo Go il canale notifiche fallisce (limite di Expo Go, nell'APK funziona) e BlueStacks non ha barra gesti, quindi edge-to-edge e notifiche si verificano solo sul telefono.
- `npx expo start` — dev server. I moduli nativi (notifiche) richiedono una dev build: `npx expo run:android` con telefono collegato (Android SDK in `%LOCALAPPDATA%\Android\Sdk`).

**Build APK (locale, niente EAS):**
```bash
npx expo prebuild --platform android      # rigenera android/ da app.json (dopo modifiche a plugin/permessi)
echo "cmake.dir=C:/Users/samue/AppData/Local/Android/Sdk/cmake/3.31.6" >> android/local.properties   # da rifare dopo OGNI prebuild (lo cancella)
cd android && JAVA_HOME="/c/Program Files/Java/jdk-21" ./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk (firmata con la debug keystore: ok per sideload)
# copia di comodo: Fisioterapia-<versione>.apk nella root (*.apk è git-ignorato)
```
Gotcha:
- `JAVA_HOME` di sistema punta a jdk-20, usare jdk-21.
- **Percorsi > 260 caratteri:** le librerie native (C++) generano percorsi lunghissimi. Serve `LongPathsEnabled=1` nel registro (attivato da Samu il 2026-11-20) **e** CMake 3.31.6 (ninja 1.12, gestisce i percorsi lunghi) tramite `cmake.dir` in `android/local.properties`. La CMake 3.22.1 di default dell'SDK fallisce.
- `react-native.config.js` esclude da Android worklets/reanimated/gesture-handler (dipendenze transitive non usate).
- Prima build ~17 min. Se cambia solo JS (niente prebuild) la build incrementale dura 2-5 min; un prebuild fa ricompilare il C++ (~13 min), quindi farlo solo se cambiano plugin/permessi/icone in app.json. Nessun emulatore installato: si prova sul telefono (`adb install -r <apk>` o copiando l'APK).

**Scelte non ovvie:**
- Notifica di fine con `delivery: 'alarmClock'` + permessi `USE_EXACT_ALARM`/`SCHEDULE_EXACT_ALARM`: Android non la rimanda (tutore da 1 ora). Va tolto `USE_EXACT_ALARM` se mai si pubblica sul Play Store.
- Il timer si calcola da timestamp (`src/timer.ts`); la sessione attiva è salvata, e Home/Timer chiudono quella scaduta ad app chiusa (`src/sessione.ts`).

**Stato (2026-11-20):** v1 completa, 57 test, riposo configurabile tra le ripetizioni (fase `riposo` in `src/timer.ts`, campo `riposoSecondi`, assente = 0), revisione finale fatta e correzioni applicate, APK 1.1.1 generato (tema scuro, griglia, insets, icona, tastiera che non copre i campi, anteprima foto nel Timer). Da fare: collaudo sul telefono di Samu (prove a mano dei Task 7-8 del piano + notifica del tutore a schermo spento). Rimandati (minori): avviso "senza notifica" non ricompare rientrando nel timer; se la scrittura dello storico fallisce non si ritenta.
