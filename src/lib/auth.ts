import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

const STAFF_SESSION_COOKIE = "qom_staff_session";
const ADMIN_SESSION_COOKIE = "qom_admin_session";
const SESSION_MAX_AGE = 30 * 60; // 30 minutes

export interface StaffSession {
  staffId: string;
  staffName: string;
  expiresAt: number;
}

export interface AdminSession {
  authenticated: boolean;
  expiresAt: number;
}

// Staff PIN auth
export async function verifyStaffPin(pin: string, pinHash: string): Promise<boolean> {
  return bcrypt.compare(pin, pinHash);
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

// Staff session
export async function setStaffSession(staffId: string, staffName: string) {
  const cookieStore = await cookies();
  const session: StaffSession = {
    staffId,
    staffName,
    expiresAt: Date.now() + SESSION_MAX_AGE * 1000,
  };
  cookieStore.set(STAFF_SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function getStaffSession(): Promise<StaffSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(STAFF_SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const session: StaffSession = JSON.parse(raw);
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
  cookieStore.delete(STAFF_SESSION_COOKIE);
}

// Admin session
export async function setAdminSession() {
  const cookieStore = await cookies();
  const session: AdminSession = {
    authenticated: true,
    expiresAt: Date.now() + 8 * 60 * 60 * 1000, // 8 hours
  };
  cookieStore.set(ADMIN_SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 8 * 60 * 60,
    path: "/",
  });
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const session: AdminSession = JSON.parse(raw);
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
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}
