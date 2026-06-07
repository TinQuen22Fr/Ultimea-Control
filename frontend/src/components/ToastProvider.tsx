import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, Info, TriangleAlert, X } from "lucide-react-native";

import { colors, fonts, radius, spacing } from "@/src/theme/colors";

type Variant = "info" | "success" | "warn" | "error";
type ToastState = { msg: string; variant: Variant } | null;

const ToastCtx = createContext<{ show: (msg: string, variant?: Variant) => void }>(
  { show: () => {} },
);

const VARIANT_COLOR: Record<Variant, string> = {
  info: colors.white,
  success: colors.connected,
  warn: colors.warning,
  error: colors.disconnected,
};

function VariantIcon({ variant }: { variant: Variant }) {
  const c = VARIANT_COLOR[variant];
  if (variant === "success") return <Check size={16} color={c} strokeWidth={2.4} />;
  if (variant === "error") return <X size={16} color={c} strokeWidth={2.4} />;
  if (variant === "warn") return <TriangleAlert size={16} color={c} strokeWidth={2.2} />;
  return <Info size={16} color={c} strokeWidth={2.2} />;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const insets = useSafeAreaInsets();
  const ty = useSharedValue(-160);
  const opacity = useSharedValue(0);
  const timerRef = useRef<any>(null);

  const show = useCallback(
    (msg: string, variant: Variant = "info") => {
      setToast({ msg, variant });
      ty.value = withTiming(0, { duration: 260 });
      opacity.value = withTiming(1, { duration: 200 });
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        ty.value = withTiming(-160, { duration: 240 });
        opacity.value = withTiming(0, { duration: 220 });
      }, 2200);
    },
    [opacity, ty],
  );

  const aStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }],
    opacity: opacity.value,
  }));

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={[styles.wrap, { top: insets.top + 10 }, aStyle]}
      >
        {toast && (
          <View
            testID="app-toast"
            style={[
              styles.toast,
              { borderColor: VARIANT_COLOR[toast.variant] + "55" },
            ]}
          >
            <VariantIcon variant={toast.variant} />
            <Text style={styles.text} numberOfLines={2}>
              {toast.msg}
            </Text>
          </View>
        )}
      </Animated.View>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    alignItems: "center",
    zIndex: 1000,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    maxWidth: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  text: {
    color: colors.textPrimary,
    fontFamily: fonts.medium,
    fontSize: 13,
    flexShrink: 1,
  },
});
