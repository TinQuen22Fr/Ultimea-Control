import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform, PermissionsAndroid } from "react-native";

import { base64ToHex, hexToBase64 } from "./hex";
import { TARGET_DEVICE_HINTS } from "@/src/constants/controls";

export type BleDevice = {
  id: string;
  name: string;
  rssi: number | null;
  isTarget: boolean;
};

export type CharInfo = {
  uuid: string;
  serviceUuid: string;
  isReadable: boolean;
  isWritableWithResponse: boolean;
  isWritableWithoutResponse: boolean;
  isNotifiable: boolean;
};

export type ServiceInfo = { uuid: string; characteristics: CharInfo[] };

export type LogLine = { id: string; ts: string; type: string; text: string };

export type CaptureItem = {
  id: string;
  ts: string;
  serviceUuid: string;
  charUuid: string;
  hex: string;
};

export type PermResult = { granted: boolean; canAskAgain: boolean };

type ConnectionState = "disconnected" | "connecting" | "connected";

type BleContextValue = {
  bleAvailable: boolean;
  poweredOn: boolean;
  scanning: boolean;
  devices: BleDevice[];
  connectedDevice: BleDevice | null;
  connectionState: ConnectionState;
  services: ServiceInfo[];
  logs: LogLine[];
  notifications: Record<string, string>;
  monitored: Record<string, boolean>;
  captures: CaptureItem[];
  requestPermissions: () => Promise<PermResult>;
  startScan: () => Promise<void>;
  stopScan: () => void;
  connect: (device: BleDevice) => Promise<void>;
  disconnect: () => Promise<void>;
  writeHex: (
    serviceUuid: string,
    charUuid: string,
    hex: string,
    withResponse: boolean,
  ) => Promise<void>;
  readChar: (serviceUuid: string, charUuid: string) => Promise<string>;
  toggleNotify: (serviceUuid: string, charUuid: string) => Promise<void>;
  monitorAll: () => void;
  stopAllMonitors: () => void;
  clearCaptures: () => void;
  addLog: (type: string, text: string) => void;
  clearLogs: () => void;
};

const BleContext = createContext<BleContextValue | null>(null);

let mkId = 0;
const nextId = () => `${Date.now()}_${mkId++}`;

function deviceName(d: any): string {
  return d?.name || d?.localName || "Sans nom";
}

function isTargetDevice(name: string): boolean {
  const lower = name.toLowerCase();
  return TARGET_DEVICE_HINTS.some((h) => lower.includes(h));
}

export function BleProvider({ children }: { children: React.ReactNode }) {
  const managerRef = useRef<any>(null);
  const monitorSubsRef = useRef<Record<string, any>>({});
  const scanTimeoutRef = useRef<any>(null);

  const [bleAvailable, setBleAvailable] = useState(false);
  const [poweredOn, setPoweredOn] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<BleDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<BleDevice | null>(null);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [notifications, setNotifications] = useState<Record<string, string>>({});
  const [monitored, setMonitored] = useState<Record<string, boolean>>({});
  const [captures, setCaptures] = useState<CaptureItem[]>([]);

  const addLog = useCallback((type: string, text: string) => {
    setLogs((prev) => {
      const line: LogLine = {
        id: nextId(),
        ts: new Date().toLocaleTimeString("fr-FR", { hour12: false }),
        type,
        text,
      };
      const next = [line, ...prev];
      return next.slice(0, 250);
    });
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);

  // Initialise the native manager (native platforms only).
  useEffect(() => {
    if (Platform.OS === "web") return;
    let stateSub: any = null;
    try {
      // Lazy require so web bundling never touches native module.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const BlePlx = require("react-native-ble-plx");
      const manager = new BlePlx.BleManager();
      managerRef.current = manager;
      setBleAvailable(true);
      stateSub = manager.onStateChange((state: string) => {
        setPoweredOn(state === "PoweredOn");
      }, true);
    } catch {
      setBleAvailable(false);
    }
    return () => {
      try {
        stateSub?.remove?.();
        Object.values(monitorSubsRef.current).forEach((s: any) => s?.remove?.());
        managerRef.current?.destroy?.();
      } catch {
        // ignore
      }
    };
  }, []);

  const requestPermissions = useCallback(async (): Promise<PermResult> => {
    if (Platform.OS !== "android") return { granted: true, canAskAgain: true };
    const apiLevel =
      typeof Platform.Version === "number"
        ? Platform.Version
        : parseInt(String(Platform.Version), 10);

    try {
      if (apiLevel < 31) {
        const res = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        return {
          granted: res === PermissionsAndroid.RESULTS.GRANTED,
          canAskAgain: res !== "never_ask_again",
        };
      }
      const res = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      const scan = res[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN];
      const connect = res[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT];
      const granted =
        scan === PermissionsAndroid.RESULTS.GRANTED &&
        connect === PermissionsAndroid.RESULTS.GRANTED;
      const canAskAgain =
        scan !== "never_ask_again" && connect !== "never_ask_again";
      return { granted, canAskAgain };
    } catch {
      return { granted: false, canAskAgain: true };
    }
  }, []);

  const stopScan = useCallback(() => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
    try {
      managerRef.current?.stopDeviceScan?.();
    } catch {
      // ignore
    }
    setScanning(false);
  }, []);

  const startScan = useCallback(async () => {
    const manager = managerRef.current;
    if (!manager) {
      addLog("error", "BLE indisponible (build natif requis)");
      return;
    }
    setDevices([]);
    setScanning(true);
    addLog("scan", "Recherche d'appareils Bluetooth...");
    manager.startDeviceScan(null, { allowDuplicates: false }, (error: any, device: any) => {
      if (error) {
        addLog("error", error.message || "Erreur de scan");
        setScanning(false);
        return;
      }
      if (!device) return;
      const name = deviceName(device);
      setDevices((prev) => {
        if (prev.some((d) => d.id === device.id)) {
          return prev.map((d) =>
            d.id === device.id ? { ...d, rssi: device.rssi ?? d.rssi } : d,
          );
        }
        const entry: BleDevice = {
          id: device.id,
          name,
          rssi: device.rssi ?? null,
          isTarget: isTargetDevice(name),
        };
        // Targets first, then by signal strength.
        return [...prev, entry].sort((a, b) => {
          if (a.isTarget !== b.isTarget) return a.isTarget ? -1 : 1;
          return (b.rssi ?? -999) - (a.rssi ?? -999);
        });
      });
    });
    scanTimeoutRef.current = setTimeout(() => {
      stopScan();
      addLog("scan", "Recherche terminée");
    }, 12000);
  }, [addLog, stopScan]);

  const readServices = useCallback(async (device: any) => {
    const svcs = await device.services();
    const result: ServiceInfo[] = [];
    for (const svc of svcs) {
      const chars = await svc.characteristics();
      result.push({
        uuid: svc.uuid,
        characteristics: chars.map((c: any) => ({
          uuid: c.uuid,
          serviceUuid: svc.uuid,
          isReadable: !!c.isReadable,
          isWritableWithResponse: !!c.isWritableWithResponse,
          isWritableWithoutResponse: !!c.isWritableWithoutResponse,
          isNotifiable: !!c.isNotifiable,
        })),
      });
    }
    return result;
  }, []);

  const connect = useCallback(
    async (device: BleDevice) => {
      const manager = managerRef.current;
      if (!manager) return;
      stopScan();
      setConnectionState("connecting");
      addLog("connect", `Connexion à ${device.name}...`);
      try {
        let connected = await manager.connectToDevice(device.id, {
          requestMTU: 247,
        });
        connected = await connected.discoverAllServicesAndCharacteristics();
        const svcs = await readServices(connected);
        setServices(svcs);
        setConnectedDevice(device);
        setConnectionState("connected");
        addLog("connect", `Connecté — ${svcs.length} services GATT découverts`);

        manager.onDeviceDisconnected(device.id, () => {
          setConnectionState("disconnected");
          setConnectedDevice(null);
          setServices([]);
          monitorSubsRef.current = {};
          setMonitored({});
          addLog("disconnect", `${device.name} déconnecté`);
        });
      } catch (e: any) {
        setConnectionState("disconnected");
        addLog("error", `Échec connexion: ${e?.message || e}`);
        throw e;
      }
    },
    [addLog, readServices, stopScan],
  );

  const disconnect = useCallback(async () => {
    const manager = managerRef.current;
    if (!manager || !connectedDevice) return;
    try {
      await manager.cancelDeviceConnection(connectedDevice.id);
    } catch {
      // ignore
    }
    setConnectionState("disconnected");
    setConnectedDevice(null);
    setServices([]);
    monitorSubsRef.current = {};
    setMonitored({});
  }, [connectedDevice]);

  const writeHex = useCallback(
    async (
      serviceUuid: string,
      charUuid: string,
      hex: string,
      withResponse: boolean,
    ) => {
      const manager = managerRef.current;
      if (!manager || !connectedDevice) {
        throw new Error("Aucun appareil connecté");
      }
      const b64 = hexToBase64(hex);
      if (withResponse) {
        await manager.writeCharacteristicWithResponseForDevice(
          connectedDevice.id,
          serviceUuid,
          charUuid,
          b64,
        );
      } else {
        await manager.writeCharacteristicWithoutResponseForDevice(
          connectedDevice.id,
          serviceUuid,
          charUuid,
          b64,
        );
      }
      addLog("write", `→ ${charUuid.slice(0, 8)} : ${hex.toUpperCase()}`);
    },
    [addLog, connectedDevice],
  );

  const readChar = useCallback(
    async (serviceUuid: string, charUuid: string) => {
      const manager = managerRef.current;
      if (!manager || !connectedDevice) throw new Error("Aucun appareil connecté");
      const c = await manager.readCharacteristicForDevice(
        connectedDevice.id,
        serviceUuid,
        charUuid,
      );
      const hex = c?.value ? base64ToHex(c.value) : "";
      addLog("read", `← ${charUuid.slice(0, 8)} : ${hex || "(vide)"}`);
      return hex;
    },
    [addLog, connectedDevice],
  );

  const beginMonitor = useCallback(
    (serviceUuid: string, charUuid: string) => {
      const manager = managerRef.current;
      if (!manager || !connectedDevice) return;
      if (monitorSubsRef.current[charUuid]) return;
      const sub = manager.monitorCharacteristicForDevice(
        connectedDevice.id,
        serviceUuid,
        charUuid,
        (error: any, c: any) => {
          if (error) {
            addLog("error", error.message || "Erreur notification");
            return;
          }
          const hex = c?.value ? base64ToHex(c.value) : "";
          setNotifications((n) => ({ ...n, [charUuid]: hex }));
          addLog("notify", `◆ ${charUuid.slice(0, 8)} : ${hex}`);
          if (hex) {
            setCaptures((prev) =>
              [
                {
                  id: nextId(),
                  ts: new Date().toLocaleTimeString("fr-FR", { hour12: false }),
                  serviceUuid,
                  charUuid,
                  hex,
                },
                ...prev,
              ].slice(0, 100),
            );
          }
        },
      );
      monitorSubsRef.current[charUuid] = sub;
      setMonitored((m) => ({ ...m, [charUuid]: true }));
    },
    [addLog, connectedDevice],
  );

  const stopMonitor = useCallback((charUuid: string) => {
    const sub = monitorSubsRef.current[charUuid];
    if (!sub) return;
    sub.remove?.();
    delete monitorSubsRef.current[charUuid];
    setMonitored((m) => ({ ...m, [charUuid]: false }));
  }, []);

  const toggleNotify = useCallback(
    async (serviceUuid: string, charUuid: string) => {
      if (!managerRef.current || !connectedDevice) {
        throw new Error("Aucun appareil connecté");
      }
      if (monitorSubsRef.current[charUuid]) {
        stopMonitor(charUuid);
        addLog("notify", `⏹ Notifications arrêtées ${charUuid.slice(0, 8)}`);
        return;
      }
      beginMonitor(serviceUuid, charUuid);
      addLog("notify", `▶ Notifications activées ${charUuid.slice(0, 8)}`);
    },
    [addLog, beginMonitor, stopMonitor, connectedDevice],
  );

  const monitorAll = useCallback(() => {
    if (!connectedDevice) return;
    let count = 0;
    services.forEach((s) =>
      s.characteristics.forEach((c) => {
        if (c.isNotifiable && !monitorSubsRef.current[c.uuid]) {
          beginMonitor(s.uuid, c.uuid);
          count++;
        }
      }),
    );
    addLog(
      "notify",
      count > 0
        ? `▶ Écoute de ${count} caractéristique(s) notifiable(s)`
        : "Aucune caractéristique notifiable à écouter",
    );
  }, [services, beginMonitor, addLog, connectedDevice]);

  const stopAllMonitors = useCallback(() => {
    Object.keys(monitorSubsRef.current).forEach((uuid) => stopMonitor(uuid));
    addLog("notify", "⏹ Écoute arrêtée");
  }, [stopMonitor, addLog]);

  const clearCaptures = useCallback(() => setCaptures([]), []);

  const value: BleContextValue = {
    bleAvailable,
    poweredOn,
    scanning,
    devices,
    connectedDevice,
    connectionState,
    services,
    logs,
    notifications,
    monitored,
    captures,
    requestPermissions,
    startScan,
    stopScan,
    connect,
    disconnect,
    writeHex,
    readChar,
    toggleNotify,
    monitorAll,
    stopAllMonitors,
    clearCaptures,
    addLog,
    clearLogs,
  };

  return <BleContext.Provider value={value}>{children}</BleContext.Provider>;
}

export function useBle(): BleContextValue {
  const ctx = useContext(BleContext);
  if (!ctx) throw new Error("useBle must be used within BleProvider");
  return ctx;
}
