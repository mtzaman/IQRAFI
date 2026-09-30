import { fmt, type Dictionary } from "@/i18n/config";

type Data = Record<string, string | number | null>;

/** Gentle, translated text for a stored notification. */
export function notificationText(t: Dictionary, type: string, data: Data) {
  const types = t.notifications.types;
  if (type === "member_joined" && !data.name) return fmt(types.member_joined_unnamed, data);
  if (type === "assignment_taken_over" && !data.helper) return fmt(types.assignment_taken_over_unnamed, data);
  const template = (types as Record<string, string>)[type];
  return template ? fmt(template, data) : "";
}

