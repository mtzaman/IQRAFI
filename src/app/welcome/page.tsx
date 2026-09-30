import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { getCurrentUser } from "@/server/auth/current";
import { Onboarding } from "./Onboarding";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.common.getStarted };
}

export default async function WelcomePage() {
  const user = await getCurrentUser();
  return <Onboarding signedIn={!!user} />;
}
