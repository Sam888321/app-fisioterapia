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
- `npx expo start` — dev server. I moduli nativi (notifiche) richiedono una dev build: `npx expo run:android` con telefono collegato (Android SDK in `%LOCALAPPDATA%\Android\Sdk`).
- APK: vedi sezione Build (in arrivo).

**Stato:** in sviluppo secondo il piano `docs/superpowers/plans/2026-11-20-app-fisioterapia.md`.
