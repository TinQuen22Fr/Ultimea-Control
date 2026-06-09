import { useCallback, useState } from "react";

import { api, Command } from "@/src/api/client";
import { useBle } from "@/src/ble/BleContext";
import { useToast } from "@/src/components/ToastProvider";
import {
  AURA_PREFIX,
  buildAuraFrame,
} from "@/src/ble/hex";
import {
  AURA_VOLUME_MAX,
  AURA_VOLUME_PARAM,
  controlLabel,
} from "@/src/constants/controls";

// Centralises "press a control -> send the bound BLE command" logic,
// shared by the Remote and EQ screens.
export function useController() {
  const ble = useBle();
  const toast = useToast();
  const [bindings, setBindings] = useState<Record<string, string>>({});
  const [commands, setCommands] = useState<Command[]>([]);

  const reload = useCallback(async () => {
    try {
      const [b, c] = await Promise.all([api.getBindings(), api.getCommands()]);
      setBindings(b);
      setCommands(c);
    } catch {
      // network errors are non-fatal for the controller
    }
  }, []);

  const isBound = useCallback((key: string) => !!bindings[key], [bindings]);

  const sendControl = useCallback(
    async (controlKey: string, label?: string): Promise<boolean> => {
      const name = label || controlLabel(controlKey);
      const cmd = commands.find((c) => c.id === bindings[controlKey]);

      if (!cmd) {
        toast.show(`« ${name} » non liée — associez une commande`, "warn");
        return false;
      }

      const canBle =
        ble.connectionState === "connected" &&
        !!cmd.characteristic_uuid &&
        !!cmd.service_uuid;

      if (canBle) {
        try {
          await ble.writeHex(
            cmd.service_uuid as string,
            cmd.characteristic_uuid as string,
            cmd.payload_hex,
            cmd.write_type === "withResponse",
          );
          api
            .createLog({
              action: "write",
              characteristic_uuid: cmd.characteristic_uuid,
              value_hex: cmd.payload_hex,
              message: name,
            })
            .catch(() => {});
          toast.show(`${name} envoyé`, "success");
          return true;
        } catch (e: any) {
          toast.show(`Échec : ${e?.message || e}`, "error");
          return false;
        }
      }

      // Not connected: log as a dry-run so the activity log still shows it.
      api
        .createLog({
          action: "write",
          characteristic_uuid: cmd.characteristic_uuid,
          value_hex: cmd.payload_hex,
          message: `${name} (démo)`,
        })
        .catch(() => {});

      if (!ble.bleAvailable) {
        toast.show(`${name} — mode démo (build Android requis)`, "info");
      } else {
        toast.show(`${name} — connectez la barre de son d'abord`, "warn");
      }
      return false;
    },
    [bindings, commands, ble, toast],
  );

  // Find the best characteristic to write Aura frames to: prefer the char of a
  // bound volume command, otherwise the first writable char on the connected device.
  const volumeWriteTarget = useCallback(() => {
    for (const key of ["volume_set", "volume_up", "volume_down"]) {
      const cmd = commands.find((c) => c.id === bindings[key]);
      if (cmd?.service_uuid && cmd?.characteristic_uuid) {
        return {
          service: cmd.service_uuid,
          char: cmd.characteristic_uuid,
          withResponse: cmd.write_type === "withResponse",
        };
      }
    }
    for (const s of ble.services) {
      for (const ch of s.characteristics) {
        if (ch.isWritableWithResponse || ch.isWritableWithoutResponse) {
          return { service: s.uuid, char: ch.uuid, withResponse: ch.isWritableWithResponse };
        }
      }
    }
    return null;
  }, [commands, bindings, ble.services]);

  // Sends the volume as an ABSOLUTE value: AA 01 00 02 03 <value> <chk>.
  // `level` is the 0–100 dial value, mapped onto 0..AURA_VOLUME_MAX device units.
  const sendVolumeAbsolute = useCallback(
    async (level: number): Promise<boolean> => {
      if (ble.connectionState !== "connected") return false;
      const target = volumeWriteTarget();
      if (!target) {
        toast.show("Aucune cible d'écriture — associez une commande Volume", "warn");
        return false;
      }
      const dev = Math.max(
        0,
        Math.min(AURA_VOLUME_MAX, Math.round((level / 100) * AURA_VOLUME_MAX)),
      );
      const valueHex = dev.toString(16).padStart(2, "0");
      const frame = buildAuraFrame(AURA_PREFIX, AURA_VOLUME_PARAM, valueHex).hex;
      try {
        await ble.writeHex(target.service, target.char, frame, target.withResponse);
        api
          .createLog({
            action: "write",
            characteristic_uuid: target.char,
            value_hex: frame,
            message: `Volume ${dev}/${AURA_VOLUME_MAX}`,
          })
          .catch(() => {});
        return true;
      } catch (e: any) {
        toast.show(`Échec volume : ${e?.message || e}`, "error");
        return false;
      }
    },
    [ble, volumeWriteTarget, toast],
  );

  return { bindings, commands, reload, sendControl, sendVolumeAbsolute, isBound };
}
