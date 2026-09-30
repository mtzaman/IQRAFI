import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getI18n } from "@/i18n/server";
import { getCurrentUser, safeNextPath } from "@/server/auth/current";
import { oauthAvailability } from "@/server/auth/oauth";
import { AuthForm } from "../AuthForm";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.auth.signupTitle };
}

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const target = safeNextPath(next, "/groups/new?welcome=1");
  if (await getCurrentUser()) redirect(target);
  return <AuthForm mode="signup" next={target} oauth={oauthAvailability()} oauthError={error === "oauth"} />;
}
