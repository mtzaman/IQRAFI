import type { GroupRole } from "@/lib/db/schema";

/**
 * Group permission matrix. The server checks these on every mutation; the UI uses the
 * same function only to decide which controls to show.
 */
export const GROUP_ACTIONS = [
  "group.read",
  "group.delete",
  "group.update_settings",
  "group.update_schedule",
  "members.manage",
  "admins.manage",
  "invitations.manage",
  "assignments.reassign",
  "assignments.resolve_incomplete",
  "khatma.start_next",
  "assignment.read_own",
  "assignment.complete_own",
  "assignment.volunteer",
  "progress.view",
] as const;
export type GroupAction = (typeof GROUP_ACTIONS)[number];

const MEMBER: GroupAction[] = [
  "group.read",
  "assignment.read_own",
  "assignment.complete_own",
  "assignment.volunteer",
  "progress.view",
];
const ADMIN: GroupAction[] = [
  ...MEMBER,
  "members.manage",
  "invitations.manage",
  "assignments.reassign",
  "assignments.resolve_incomplete",
  "group.update_settings",
  "khatma.start_next",
];
const OWNER: GroupAction[] = [...ADMIN, "group.delete", "group.update_schedule", "admins.manage"];

const MATRIX: Record<GroupRole, ReadonlySet<GroupAction>> = {
  owner: new Set(OWNER),
  admin: new Set(ADMIN),
  member: new Set(MEMBER),
};

export function can(role: GroupRole | null | undefined, action: GroupAction): boolean {
  return role ? MATRIX[role].has(action) : false;
}

/** Whether an actor may remove or change the role of a target member. */
export function canManageMember(actor: GroupRole, target: GroupRole): boolean {
  if (target === "owner") return false;
  if (actor === "owner") return true;
  return actor === "admin" && target === "member";
}
