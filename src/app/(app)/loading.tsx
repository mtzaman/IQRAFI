import { LoadingState } from "@/components/ui/States";
import { getI18n } from "@/i18n/server";

export default async function Loading() {
  const { t } = await getI18n();
  return <LoadingState label={t.common.loading} />;
}
