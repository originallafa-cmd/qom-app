import { NextResponse } from "next/server";
import { getStaffSession, getAdminSession } from "@/lib/auth";

export async function requireStaffOrAdmin() {
  const staff = await getStaffSession();
  if (staff) return { authorized: true, userId: staff.staffId, userName: staff.staffName, role: "staff" };

  const admin = await getAdminSession();
  if (admin) return { authorized: true, userId: null, userName: "Admin", role: "admin" };

  return { authorized: false, userId: null, userName: null, role: null };
}

export async function requireAdmin() {
  const admin = await getAdminSession();
  if (admin) return { authorized: true };
  return { authorized: false };
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
