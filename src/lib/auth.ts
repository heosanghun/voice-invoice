import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { promises as fs } from "fs";
import path from "path";

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

// Vercel(서버리스)에서는 배포 디렉터리(/var/task)에 쓰기 불가 → /tmp 사용 (휘발성)
const DATA_DIR =
  process.env.VERCEL
    ? path.join("/tmp", "voice-invoice-data")
    : path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readUsers(): Promise<User[]> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(USERS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeUsers(users: User[]) {
  await ensureDataDir();
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

export async function createUser(
  email: string,
  password: string,
  name: string
): Promise<User> {
  const users = await readUsers();
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error("이미 가입된 이메일입니다.");
  }
  const id = `u_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const passwordHash = await bcrypt.hash(password, 10);
  const user: User = {
    id,
    email: email.toLowerCase(),
    passwordHash,
    name,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  await writeUsers(users);
  return { ...user, passwordHash: "" } as User;
}

export async function verifyUser(
  email: string,
  password: string
): Promise<User | null> {
  const users = await readUsers();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  const { passwordHash: _, ...safe } = user;
  return safe as User;
}

export async function getUserById(id: string): Promise<User | null> {
  const users = await readUsers();
  const user = users.find((u) => u.id === id);
  if (!user) return null;
  const { passwordHash: _, ...safe } = user;
  return safe as User;
}

export async function updateUser(
  id: string,
  updates: Partial<Omit<User, "id" | "email" | "passwordHash" | "createdAt">>
): Promise<User | null> {
  const users = await readUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx < 0) return null;
  users[idx] = { ...users[idx], ...updates };
  await writeUsers(users);
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
