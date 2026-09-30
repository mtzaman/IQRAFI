import { describe, expect, it } from "vitest";
import { addDays, cycleDaysFor, dateInTimezone, daysBetween, dueDateFor, isValidTimezone } from "@/lib/khatma/schedule";
import { can, canManageMember } from "@/lib/permissions";

describe("schedule", () => {
  it("maps schedules to cycle lengths", () => {
    expect(cycleDaysFor("daily")).toBe(1);
    expect(cycleDaysFor("every_2_days")).toBe(2);
    expect(cycleDaysFor("every_3_days")).toBe(3);
    expect(cycleDaysFor("weekly")).toBe(7);
    expect(cycleDaysFor("custom", 30)).toBe(30);
    expect(() => cycleDaysFor("custom", 0)).toThrow();
    expect(() => cycleDaysFor("custom", 400)).toThrow();
  });

  it("does calendar arithmetic across month boundaries", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(dueDateFor("2026-09-30", 1)).toBe("2026-09-30");
    expect(dueDateFor("2026-09-30", 7)).toBe("2026-10-06");
    expect(daysBetween("2026-09-30", "2026-10-06")).toBe(6);
  });

  it("resolves the local date in a group's timezone", () => {
    const instant = new Date("2026-09-30T22:30:00Z");
    expect(dateInTimezone(instant, "UTC")).toBe("2026-09-30");
    expect(dateInTimezone(instant, "Asia/Karachi")).toBe("2026-10-01");
    expect(dateInTimezone(instant, "America/New_York")).toBe("2026-09-30");
    expect(isValidTimezone("Europe/London")).toBe(true);
    expect(isValidTimezone("Mars/Base")).toBe(false);
  });
});

describe("permissions", () => {
  it("lets only the owner delete the group or manage admins", () => {
    expect(can("owner", "group.delete")).toBe(true);
    expect(can("admin", "group.delete")).toBe(false);
    expect(can("member", "group.delete")).toBe(false);
    expect(can("owner", "admins.manage")).toBe(true);
    expect(can("admin", "admins.manage")).toBe(false);
  });

  it("lets admins manage members and reassign Juz, but not members", () => {
    for (const action of ["members.manage", "assignments.reassign", "assignments.resolve_incomplete"] as const) {
      expect(can("owner", action)).toBe(true);
      expect(can("admin", action)).toBe(true);
      expect(can("member", action)).toBe(false);
    }
  });

  it("lets every member read, complete their own Juz and volunteer", () => {
    for (const role of ["owner", "admin", "member"] as const) {
      expect(can(role, "assignment.complete_own")).toBe(true);
      expect(can(role, "assignment.volunteer")).toBe(true);
      expect(can(role, "progress.view")).toBe(true);
    }
    expect(can(null, "group.read")).toBe(false);
  });

  it("protects the owner and restricts admins to managing members", () => {
    expect(canManageMember("admin", "owner")).toBe(false);
    expect(canManageMember("admin", "admin")).toBe(false);
    expect(canManageMember("admin", "member")).toBe(true);
    expect(canManageMember("owner", "admin")).toBe(true);
    expect(canManageMember("member", "member")).toBe(false);
  });
});
