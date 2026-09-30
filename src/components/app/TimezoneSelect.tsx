"use client";

import { useMemo, useSyncExternalStore } from "react";
import { Select } from "@/components/ui/Field";

const noopSubscribe = () => () => undefined;

/** IANA timezone picker defaulting to the browser's timezone when the account has none yet. */
export function TimezoneSelect({ id, name, defaultValue }: { id: string; name: string; defaultValue: string }) {
  const browserTz = useSyncExternalStore(noopSubscribe, () => Intl.DateTimeFormat().resolvedOptions().timeZone, () => null);
  const zones = useMemo(() => {
    const list = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
    return list.includes("UTC") ? list : ["UTC", ...list];
  }, []);
  const initial = defaultValue === "UTC" && browserTz ? browserTz : defaultValue;
  return (
    <Select id={id} name={name} key={initial} defaultValue={initial}>
      {(zones.includes(initial) ? zones : [initial, ...zones]).map((z) => (
        <option key={z} value={z}>
          {z.replace(/_/g, " ")}
        </option>
      ))}
    </Select>
  );
}
