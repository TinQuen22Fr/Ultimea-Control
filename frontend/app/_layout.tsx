import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import {
  Manrope_300Light,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from "@expo-google-fonts/manrope";
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from "@expo-google-fonts/jetbrains-mono";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { BleProvider } from "@/src/ble/BleContext";
import { ToastProvider } from "@/src/components/ToastProvider";
import { ErrorBoundary } from "@/src/components/ErrorBoundary";
import { colors } from "@/src/theme/colors";

// Keep the native splash visible from cold start until fonts register.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [iconsLoaded, iconsError] = useIconFonts();
  const [appFontsLoaded, appFontsError] = useFonts({
    Manrope_300Light,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  // Safety net: never block the UI for more than 2.5s waiting on fonts.
  // Without this, a font that fails to resolve would freeze the app on a
  // black screen forever. Text simply falls back to the system font.
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 2500);
    return () => clearTimeout(t);
  }, []);

  const iconsReady = iconsLoaded || !!iconsError;
  const fontsReady = appFontsLoaded || !!appFontsError;
  const ready = (iconsReady && fontsReady) || timedOut;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <KeyboardProvider>
            <BleProvider>
              <ToastProvider>
                <StatusBar style="light" />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.bg },
                  }}
                />
              </ToastProvider>
            </BleProvider>
          </KeyboardProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
