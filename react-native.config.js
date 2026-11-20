// ponytail: librerie arrivate come dipendenze di expo-router/expo ma non usate dall'app (nessun import a runtime).
// Escluse dalla build Android: meno C++ da compilare e APK più piccolo. Se servono animazioni, togliere da qui.
const noAndroid = { platforms: { android: null } };

module.exports = {
  dependencies: {
    'react-native-worklets': noAndroid,
    'react-native-reanimated': noAndroid,
    'react-native-gesture-handler': noAndroid,
  },
};
