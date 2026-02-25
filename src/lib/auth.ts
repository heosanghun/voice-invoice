import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { promises as fs } from "fs";
import path from "path";
import { getSupabase, USERS_TABLE } from "./supabase";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "voice-invoice-dev-secret-change-in-production"
);
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: string;
  corpNum?: string;
  corpName?: string;
  ceoName?: string;
  addr?: string;
  bizType?: string;
  bizClass?: string;
  contactName?: string;
  contactEmail?: string;
  contactTel?: string;
  popbillRegistered?: boolean;
  popbillUserId?: string;
  certRegistered?: boolean;
}

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  created_at: string;
  corp_num?: string | null;
  corp_name?: string | null;
  ceo_name?: string | null;
  addr?: string | null;
  biz_type?: string | null;
  biz_class?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_tel?: string | null;
  popbill_registered?: boolean | null;
  popbill_user_id?: string | null;
  cert_registered?: boolean | null;
};

function rowToUser(r: UserRow): User {
  return {
    id: r.id,
    email: r.email,
    passwordHash: r.password_hash,
    name: r.name,
    createdAt: r.created_at,
    corpNum: r.corp_num ?? undefined,
    corpName: r.corp_name ?? undefined,
    ceoName: r.ceo_name ?? undefined,
    addr: r.addr ?? undefined,
    bizType: r.biz_type ?? undefined,
    bizClass: r.biz_class ?? undefined,
    contactName: r.contact_name ?? undefined,
    contactEmail: r.contact_email ?? undefined,
    contactTel: r.contact_tel ?? undefined,
    popbillRegistered: r.popbill_registered ?? undefined,
    popbillUserId: r.popbill_user_id ?? undefined,
    certRegistered: r.cert_registered ?? undefined,
  };
}

function userToRow(u: Partial<User>): Record<string, unknown> {
  const r: Record<string, unknown> = {};
  if (u.id != null) r.id = u.id;
  if (u.email != null) r.email = u.email;
  if (u.passwordHash != null) r.password_hash = u.passwordHash;
  if (u.name != null) r.name = u.name;
  if (u.createdAt != null) r.created_at = u.createdAt;
  if (u.corpNum != null) r.corp_num = u.corpNum;
  if (u.corpName != null) r.corp_name = u.corpName;
  if (u.ceoName != null) r.ceo_name = u.ceoName;
  if (u.addr != null) r.addr = u.addr;
  if (u.bizType != null) r.biz_type = u.bizType;
  if (u.bizClass != null) r.biz_class = u.bizClass;
  if (u.contactName != null) r.contact_name = u.contactName;
  if (u.contactEmail != null) r.contact_email = u.contactEmail;
  if (u.contactTel != null) r.contact_tel = u.contactTel;
  if (u.popbillRegistered != null) r.popbill_registered = u.popbillRegistered;
  if (u.popbillUserId != null) r.popbill_user_id = u.popbillUserId;
  if (u.certRegistered != null) r.cert_registered = u.certRegistered;
  return r;
}

// ---------- 파일 저장소 (Supabase 미사용 시)
const DATA_DIR =
  process.env.VERCEL
    ? path.join("/tmp", "voice-invoice-data")
    : path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readUsersFile(): Promise<User[]> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(USERS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeUsersFile(users: User[]) {
  await ensureDataDir();
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

// ---------- 공통 로직
export async function createUser(
  email: string,
  password: string,
  name: string
): Promise<User> {
  const sb = getSupabase();
  const id = `u_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const passwordHash = await bcrypt.hash(password, 10);
  const emailLower = email.toLowerCase();

  if (sb) {
    const { data: existing } = await sb
      .from(USERS_TABLE)
      .select("id")
      .ilike("email", emailLower)
      .maybeSingle();
    if (existing) throw new Error("이미 가입된 이메일입니다.");
    const row = {
      id,
      email: emailLower,
      password_hash: passwordHash,
      name,
      created_at: new Date().toISOString(),
    };
    const { error } = await sb.from(USERS_TABLE).insert(row);
    if (error) throw new Error(error.message);
    return { id, email: emailLower, name, createdAt: row.created_at } as User;
  }

  const users = await readUsersFile();
  if (users.some((u) => u.email.toLowerCase() === emailLower)) {
    throw new Error("이미 가입된 이메일입니다.");
  }
  const user: User = {
    id,
    email: emailLower,
    passwordHash,
    name,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  await writeUsersFile(users);
  return { ...user, passwordHash: "" } as User;
}

export async function verifyUser(
  email: string,
  password: string
): Promise<User | null> {
  const sb = getSupabase();
  const emailLower = email.toLowerCase();

  if (sb) {
    const { data: row, error } = await sb
      .from(USERS_TABLE)
      .select("*")
      .ilike("email", emailLower)
      .maybeSingle();
    if (error || !row) return null;
    const user = rowToUser(row as UserRow);
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return null;
    const { passwordHash: _, ...safe } = user;
    return safe as User;
  }

  const users = await readUsersFile();
  const user = users.find((u) => u.email.toLowerCase() === emailLower);
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  const { passwordHash: _, ...safe } = user;
  return safe as User;
}

export async function getUserById(id: string): Promise<User | null> {
  const sb = getSupabase();

  if (sb) {
    const { data: row, error } = await sb
      .from(USERS_TABLE)
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error || !row) return null;
    const user = rowToUser(row as UserRow);
    const { passwordHash: _, ...safe } = user;
    return safe as User;
  }

  const users = await readUsersFile();
  const user = users.find((u) => u.id === id);
  if (!user) return null;
  const { passwordHash: _, ...safe } = user;
  return safe as User;
}

export async function updateUser(
  id: string,
  updates: Partial<Omit<User, "id" | "email" | "passwordHash" | "createdAt">>
): Promise<User | null> {
  const sb = getSupabase();

  if (sb) {
    const row = userToRow(updates);
    if (Object.keys(row).length === 0) return getUserById(id);
    const { error } = await sb.from(USERS_TABLE).update(row).eq("id", id);
    if (error) throw new Error(error.message);
    return getUserById(id);
  }

  const users = await readUsersFile();
  const idx = users.findIndex((u) => u.id === id);
  if (idx < 0) return null;
  users[idx] = { ...users[idx], ...updates };
  await writeUsersFile(users);
  const { passwordHash: _, ...safe } = users[idx];
  return safe as User;
}

export async function createToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(TOKEN_MAX_AGE)
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return (payload.sub as string) ?? null;
  } catch {
    return null;
  }
}
