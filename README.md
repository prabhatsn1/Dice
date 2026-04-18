# 🎲 Dice Roller

A React Native dice roller app built with [Expo](https://expo.dev). Roll up to 6 dice at once with smooth 3D animations, haptic feedback, and shake-to-roll support.

## Features

- Roll 1–6 dice simultaneously
- Shake your device to roll
- 3D tumble animation with staggered landing per die
- Haptic feedback on roll and result
- Live total display when rolling 2+ dice
- Responsive die sizing for any screen

## Project Structure

```
app/
  (tabs)/index.tsx   # Main dice roller screen
components/
  dice.tsx           # Animated die component
  dice-face.tsx      # Pip (dot) layout renderer
hooks/
  use-shake.ts       # Accelerometer shake detection
constants/
  theme.ts           # Shared theme tokens
```

## Get Started

```bash
npm install
npx expo start
```

Run on:
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go)

## Tech Stack

- [Expo](https://expo.dev) ~54
- [React Native](https://reactnative.dev) 0.81
- [Expo Router](https://expo.github.io/router) ~6
- [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/) ~4 — UI-thread animations
- [expo-sensors](https://docs.expo.dev/versions/latest/sdk/sensors/) — shake detection
- [expo-haptics](https://docs.expo.dev/versions/latest/sdk/haptics/) — tactile feedback
