import { NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/current";
import { exportUserData } from "@/server/services/users";

/** GDPR data export: everything IQRAFI stores about the signed-in user, as JSON. */
export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const data = await exportUserData(session.user.id);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="iqrafi-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "cache-control": "no-store",
    },
  });
}
