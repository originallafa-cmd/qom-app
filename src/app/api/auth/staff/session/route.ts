import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/auth";

export async function GET() {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ name: null }, { status: 401 });
  }
  return NextResponse.json({ name: session.staffName, id: session.staffId });
}
