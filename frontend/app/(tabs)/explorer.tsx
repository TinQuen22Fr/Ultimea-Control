import { useCallback, useEffect, useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Bluetooth,
  BluetoothConnected,
  ChevronDown,
  ChevronRight,
  Eye,
  Radio,
  Settings,
  Trash2,
  Zap,
} from "lucide-react-native";

import { api } from "@/src/api/client";
import { CharInfo, useBle } from "@/src/ble/BleContext";
import { shortUuid } from "@/src/ble/hex";
import { CharActionModal } from "@/src/components/CharActionModal";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useToast } from "@/src/components/ToastProvider";
import { colors, fonts, radius, spacing } from "@/src/theme/colors";

const LOG_COLORS: Record<string, string> = {
  write: colors.white,
  read: colors.textSecondary,
  notify: colors.terminalLog,
  connect: colors.connected,
  disconnect: colors.disconnected,
  scan: colors.warning,
  error: colors.disconnected,
};

export default function ExplorerScreen() {
  const ble = useBle();
  const toast = useToast();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [modalChar, setModalChar] = useState<CharInfo | null>(null);
  const [permBlocked, setPermBlocked] = useState(false);

  const connected = ble.connectionState === "connected";

  // Persist the discovered GATT map to the backend on connect.
  useEffect(() => {
    if (connected && ble.connectedDevice) {
      const gatt = ble.services.map((s) => ({
        uuid: s.uuid,
        characteristics: s.characteristics.map((c) => ({
          uuid: c.uuid,
          is_readable: c.isReadable,
          is_writable: c.isWritableWithResponse || c.isWritableWithoutResponse,
          is_notifiable: c.isNotifiable,
        })),
      }));
      api
        .upsertDevice({
          ble_id: ble.connectedDevice.id,
          name: ble.connectedDevice.name,
          rssi: ble.connectedDevice.rssi,
          gatt,
        })
        .catch(() => {});
    }
  }, [connected, ble.services, ble.connectedDevice]);

  const handleScan = useCallback(async () => {
    if (!ble.bleAvailable) {
      toast.show("Bluetooth indisponible — build Android requis", "info");
      return;
    }
    const res = await ble.requestPermissions();
    if (!res.granted) {
      setPermBlocked(!res.canAskAgain);
      toast.show(
        res.canAskAgain
          ? "Permissions Bluetooth refusées"
          : "Autorisez le Bluetooth dans les réglages",
        "warn",
      );
      return;
    }
    setPermBlocked(false);
    if (!ble.poweredOn) {
      toast.show("Veuillez activer le Bluetooth", "warn");
    }
    ble.startScan();
  }, [ble, toast]);

  const handleConnect = async (device: (typeof ble.devices)[number]) => {
    try {
      await ble.connect(device);
    } catch {
      // logged by context
    }
  };

  const handleWrite = async (hex: string, withResponse: boolean) => {
    if (!modalChar) return;
    try {
      await ble.writeHex(modalChar.serviceUuid, modalChar.uuid, hex, withResponse);
      toast.show("Trame envoyée", "success");
    } catch (e: any) {
      toast.show(`Échec : ${e?.message || e}`, "error");
    }
  };

  const handleSaveCommand = async (payload: {
    name: string;
    category: string;
    hex: string;
    writeType: "withResponse" | "withoutResponse";
  }) => {
    if (!modalChar) return;
    try {
      await api.createCommand({
        name: payload.name,
        category: payload.category,
        service_uuid: modalChar.serviceUuid,
        characteristic_uuid: modalChar.uuid,
        payload_hex: payload.hex,
        write_type: payload.writeType,
      });
      toast.show(`Commande « ${payload.name} » enregistrée`, "success");
      setModalChar(null);
    } catch {
      toast.show("Échec de l'enregistrement", "error");
    }
  };

  const handleRead = async (c: CharInfo) => {
    try {
      await ble.readChar(c.serviceUuid, c.uuid);
    } catch (e: any) {
      toast.show(`Lecture impossible : ${e?.message || e}`, "error");
    }
  };

  const handleNotify = async (c: CharInfo) => {
    try {
      await ble.toggleNotify(c.serviceUuid, c.uuid);
    } catch (e: any) {
      toast.show(`Notif impossible : ${e?.message || e}`, "error");
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="Explorateur BLE" subtitle="Découverte du protocole" />

        {!ble.bleAvailable ? (
          <View style={styles.infoCard} testID="ble-unavailable-card">
            <Bluetooth size={16} color={colors.textSecondary} strokeWidth={2} />
            <Text style={styles.infoText}>
              Le scan Bluetooth requiert un build Android réel. Cet écran reste
              consultable en aperçu, mais le scan/connexion s&apos;exécutera sur
              votre téléphone.
            </Text>
          </View>
        ) : null}

        {/* Connection / scan */}
        {!connected ? (
          <>
            <Pressable
              testID="scan-btn"
              onPress={ble.scanning ? ble.stopScan : handleScan}
              style={({ pressed }) => [
                styles.scanBtn,
                ble.scanning && styles.scanBtnActive,
                pressed && styles.pressed,
              ]}
            >
              <Radio
                size={18}
                color={ble.scanning ? colors.warning : "#000"}
                strokeWidth={2.2}
              />
              <Text
                style={[styles.scanBtnText, ble.scanning && styles.scanBtnTextActive]}
              >
                {ble.scanning ? "Recherche en cours…" : "Scanner les appareils"}
              </Text>
            </Pressable>

            {permBlocked ? (
              <Pressable
                testID="open-settings-btn"
                onPress={() => Linking.openSettings()}
                style={({ pressed }) => [styles.settingsBtn, pressed && styles.pressed]}
              >
                <Settings size={15} color={colors.textPrimary} strokeWidth={2} />
                <Text style={styles.settingsText}>Ouvrir les réglages</Text>
              </Pressable>
            ) : null}

            {ble.devices.map((d) => (
              <Pressable
                key={d.id}
                testID={`device-${d.id}`}
                onPress={() => handleConnect(d)}
                style={({ pressed }) => [styles.deviceRow, pressed && styles.pressed]}
              >
                <View style={styles.deviceLeft}>
                  <View style={styles.deviceIcon}>
                    <Bluetooth size={16} color={colors.textPrimary} strokeWidth={2} />
                  </View>
                  <View style={styles.deviceInfo}>
                    <View style={styles.deviceNameRow}>
                      <Text style={styles.deviceName} numberOfLines={1}>
                        {d.name}
                      </Text>
                      {d.isTarget ? (
                        <View style={styles.targetBadge}>
                          <Text style={styles.targetText}>AURA</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.deviceId} numberOfLines={1}>
                      {d.id}
                    </Text>
                  </View>
                </View>
                <Text style={styles.rssi}>{d.rssi != null ? `${d.rssi} dBm` : "—"}</Text>
              </Pressable>
            ))}

            {!ble.scanning && ble.devices.length === 0 ? (
              <Text style={styles.empty}>
                Aucun appareil. Lancez un scan avec la barre de son allumée à
                proximité.
              </Text>
            ) : null}
          </>
        ) : (
          <View style={styles.connectedCard} testID="connected-card">
            <View style={styles.connectedLeft}>
              <BluetoothConnected size={20} color={colors.connected} strokeWidth={2} />
              <View>
                <Text style={styles.connectedName}>{ble.connectedDevice?.name}</Text>
                <Text style={styles.connectedSub}>
                  {ble.services.length} services GATT
                </Text>
              </View>
            </View>
            <Pressable
              testID="disconnect-btn"
              onPress={ble.disconnect}
              style={({ pressed }) => [styles.disconnectBtn, pressed && styles.pressed]}
            >
              <Text style={styles.disconnectText}>Déconnecter</Text>
            </Pressable>
          </View>
        )}

        {/* GATT services */}
        {connected ? (
          <>
            <Text style={styles.overline}>SERVICES & CARACTÉRISTIQUES</Text>
            {ble.services.map((s) => {
              const open = expanded[s.uuid];
              return (
                <View key={s.uuid} style={styles.serviceCard}>
                  <Pressable
                    testID={`service-${s.uuid}`}
                    onPress={() =>
                      setExpanded((e) => ({ ...e, [s.uuid]: !e[s.uuid] }))
                    }
                    style={styles.serviceHeader}
                  >
                    {open ? (
                      <ChevronDown size={16} color={colors.textSecondary} strokeWidth={2} />
                    ) : (
                      <ChevronRight size={16} color={colors.textSecondary} strokeWidth={2} />
                    )}
                    <Text style={styles.serviceUuid} numberOfLines={1}>
                      {shortUuid(s.uuid)}
                    </Text>
                    <Text style={styles.serviceCount}>{s.characteristics.length}</Text>
                  </Pressable>

                  {open
                    ? s.characteristics.map((c) => (
                        <CharRow
                          key={c.uuid}
                          c={c}
                          monitoring={!!ble.monitored[c.uuid]}
                          lastValue={ble.notifications[c.uuid]}
                          onRead={() => handleRead(c)}
                          onWrite={() => setModalChar(c)}
                          onNotify={() => handleNotify(c)}
                        />
                      ))
                    : null}
                </View>
              );
            })}
          </>
        ) : null}

        {/* Terminal log */}
        <View style={styles.terminalHeader}>
          <Text style={styles.overline}>TERMINAL</Text>
          <Pressable
            testID="clear-log-btn"
            onPress={ble.clearLogs}
            style={({ pressed }) => [styles.clearBtn, pressed && styles.pressed]}
          >
            <Trash2 size={13} color={colors.textTertiary} strokeWidth={2} />
            <Text style={styles.clearText}>Effacer</Text>
          </Pressable>
        </View>
        <View style={styles.terminal}>
          {ble.logs.length === 0 ? (
            <Text style={styles.terminalEmpty}>$ en attente d&apos;activité…</Text>
          ) : (
            ble.logs.slice(0, 60).map((l) => (
              <Text key={l.id} style={styles.logLine}>
                <Text style={styles.logTs}>{l.ts} </Text>
                <Text style={{ color: LOG_COLORS[l.type] ?? colors.textSecondary }}>
                  {l.text}
                </Text>
              </Text>
            ))
          )}
        </View>
      </ScrollView>

      <CharActionModal
        visible={!!modalChar}
        char={modalChar}
        connected={connected}
        onClose={() => setModalChar(null)}
        onWrite={handleWrite}
        onSave={handleSaveCommand}
      />
    </SafeAreaView>
  );
}

function PropBadge({ label }: { label: string }) {
  return (
    <View style={styles.propBadge}>
      <Text style={styles.propText}>{label}</Text>
    </View>
  );
}

function CharRow({
  c,
  monitoring,
  lastValue,
  onRead,
  onWrite,
  onNotify,
}: {
  c: CharInfo;
  monitoring: boolean;
  lastValue?: string;
  onRead: () => void;
  onWrite: () => void;
  onNotify: () => void;
}) {
  const writable = c.isWritableWithResponse || c.isWritableWithoutResponse;
  return (
    <View style={styles.charRow}>
      <View style={styles.charTop}>
        <Text style={styles.charUuid} numberOfLines={1}>
          {shortUuid(c.uuid)}
        </Text>
        <View style={styles.propRow}>
          {c.isReadable ? <PropBadge label="R" /> : null}
          {writable ? <PropBadge label="W" /> : null}
          {c.isNotifiable ? <PropBadge label="N" /> : null}
        </View>
      </View>
      {lastValue ? <Text style={styles.charValue}>← {lastValue}</Text> : null}
      <View style={styles.charActions}>
        {c.isReadable ? (
          <ActionPill
            testID={`read-${c.uuid}`}
            icon={<Eye size={13} color={colors.textPrimary} strokeWidth={2} />}
            label="Lire"
            onPress={onRead}
          />
        ) : null}
        {writable ? (
          <ActionPill
            testID={`write-${c.uuid}`}
            icon={<Zap size={13} color={colors.textPrimary} strokeWidth={2} />}
            label="Tester / Sauver"
            onPress={onWrite}
          />
        ) : null}
        {c.isNotifiable ? (
          <ActionPill
            testID={`notify-${c.uuid}`}
            icon={
              <Radio
                size={13}
                color={monitoring ? colors.terminalLog : colors.textPrimary}
                strokeWidth={2}
              />
            }
            label={monitoring ? "Notif ON" : "Notif"}
            active={monitoring}
            onPress={onNotify}
          />
        ) : null}
      </View>
    </View>
  );
}

function ActionPill({
  icon,
  label,
  onPress,
  active,
  testID,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  active?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        active && styles.pillActive,
        pressed && styles.pressed,
      ]}
    >
      {icon}
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: 120 },
  infoCard: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  infoText: { flex: 1, color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
  scanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  scanBtnActive: { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.warning },
  scanBtnText: { color: "#000", fontFamily: fonts.bold, fontSize: 15 },
  scanBtnTextActive: { color: colors.warning },
  settingsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  settingsText: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 13 },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  deviceLeft: { flexDirection: "row", alignItems: "center", gap: spacing.md, flex: 1 },
  deviceIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  deviceInfo: { flex: 1 },
  deviceNameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  deviceName: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 14, flexShrink: 1 },
  targetBadge: {
    backgroundColor: colors.connected,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  targetText: { color: "#000", fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.5 },
  deviceId: { color: colors.textTertiary, fontFamily: fonts.mono, fontSize: 11, marginTop: 2 },
  rssi: { color: colors.textSecondary, fontFamily: fonts.monoMedium, fontSize: 12 },
  empty: {
    color: colors.textTertiary,
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: "center",
    marginTop: spacing.lg,
    lineHeight: 19,
  },
  connectedCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.3)",
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  connectedLeft: { flexDirection: "row", alignItems: "center", gap: spacing.md, flex: 1 },
  connectedName: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 15 },
  connectedSub: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12, marginTop: 2 },
  disconnectBtn: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  disconnectText: { color: colors.disconnected, fontFamily: fonts.semibold, fontSize: 12 },
  overline: {
    color: colors.textSecondary,
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 2.4,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  serviceCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    overflow: "hidden",
  },
  serviceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
  },
  serviceUuid: { flex: 1, color: colors.textPrimary, fontFamily: fonts.mono, fontSize: 12 },
  serviceCount: {
    color: colors.textTertiary,
    fontFamily: fonts.monoMedium,
    fontSize: 12,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  charRow: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingLeft: spacing.xl,
  },
  charTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  charUuid: { flex: 1, color: colors.terminalUuid, fontFamily: fonts.mono, fontSize: 11 },
  propRow: { flexDirection: "row", gap: 4 },
  propBadge: {
    width: 20,
    height: 18,
    borderRadius: 5,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  propText: { color: colors.textSecondary, fontFamily: fonts.monoBold, fontSize: 10 },
  charValue: { color: colors.terminalLog, fontFamily: fonts.mono, fontSize: 11, marginTop: 6 },
  charActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.full,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  pillActive: { borderColor: colors.terminalLog },
  pillText: { color: colors.textPrimary, fontFamily: fonts.medium, fontSize: 12 },
  pillTextActive: { color: colors.terminalLog },
  terminalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.lg,
  },
  clearBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 4 },
  clearText: { color: colors.textTertiary, fontFamily: fonts.medium, fontSize: 12 },
  terminal: {
    backgroundColor: colors.bgTerminal,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 140,
  },
  terminalEmpty: { color: colors.textTertiary, fontFamily: fonts.mono, fontSize: 12 },
  logLine: { fontFamily: fonts.mono, fontSize: 11, lineHeight: 18 },
  logTs: { color: colors.terminalUuid },
  pressed: { opacity: 0.8 },
});
