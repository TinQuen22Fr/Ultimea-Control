import { useCallback, useState } from "react";

import { api, Command } from "@/src/api/client";
import { useBle } from "@/src/ble/BleContext";
import { useToast } from "@/src/components/ToastProvider";
import { controlLabel } from "@/src/constants/controls";

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

  return { bindings, commands, reload, sendControl, isBound };
}
