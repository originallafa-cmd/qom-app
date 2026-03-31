import { cookies } from "next/headers";
import { sealData, unsealData } from "iron-session";
import bcrypt from "bcryptjs";

const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-change-in-production-min-32-chars!!";
const STAFF_COOKIE = "qom_staff_session";
const ADMIN_COOKIE = "qom_admin_session";
const STAFF_MAX_AGE = 30 * 60; // 30 minutes
const ADMIN_MAX_AGE = 8 * 60 * 60; // 8 hours

export interface StaffSession {
  staffId: string;
  staffName: string;
  expiresAt: number;
}

export interface AdminSession {
  authenticated: boolean;
  expiresAt: number;
}

// PIN helpers
export async function verifyStaffPin(pin: string, pinHash: string): Promise<boolean> {
  return bcrypt.compare(pin, pinHash);
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

// ─── Staff Session ───────────────────────────────

export async function setStaffSession(staffId: string, staffName: string) {
  const cookieStore = await cookies();
  const session: StaffSession = {
    staffId,
    staffName,
    expiresAt: Date.now() + STAFF_MAX_AGE * 1000,
  };
  const sealed = await sealData(session, { password: SESSION_SECRET, ttl: STAFF_MAX_AGE });
  cookieStore.set(STAFF_COOKIE, sealed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: STAFF_MAX_AGE,
    path: "/",
  });
}

export async function getStaffSession(): Promise<StaffSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(STAFF_COOKIE)?.value;
  if (!raw) return null;
  try {
    const session = await unsealData<StaffSession>(raw, { password: SESSION_SECRET });
    if (!session.staffId || !session.expiresAt) return null;
    if (session.expiresAt < Date.now()) {
      await clearStaffSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export async function clearStaffSession() {
  const cookieStore = await cookies();
  cookieStore.delete(STAFF_COOKIE);
}

// ─── Admin Session ───────────────────────────────

export async function setAdminSession() {
  const cookieStore = await cookies();
  const session: AdminSession = {
    authenticated: true,
    expiresAt: Date.now() + ADMIN_MAX_AGE * 1000,
  };
  const sealed = await sealData(session, { password: SESSION_SECRET, ttl: ADMIN_MAX_AGE });
  cookieStore.set(ADMIN_COOKIE, sealed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ADMIN_MAX_AGE,
    path: "/",
  });
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!raw) return null;
  try {
    const session = await unsealData<AdminSession>(raw, { password: SESSION_SECRET });
    if (!session.authenticated || !session.expiresAt) return null;
    if (session.expiresAt < Date.now()) {
      await clearAdminSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
}
