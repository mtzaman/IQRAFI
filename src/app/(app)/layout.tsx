import type { ReactNode } from "react";
import { AppShell } from "@/components/app/AppShell";
import { getCurrentUser } from "@/server/auth/current";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  return <AppShell user={user}>{children}</AppShell>;
}
