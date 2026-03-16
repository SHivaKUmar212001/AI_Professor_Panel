import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";

export interface StoredUser {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  image: string | null;
  email: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const dataDirectory = path.join(process.cwd(), "data");
const databasePath =
  process.env.USER_DATABASE_PATH ??
  path.join(dataDirectory, "intellect-arena.db");

if (!fs.existsSync(dataDirectory)) {
  fs.mkdirSync(dataDirectory, { recursive: true });
}

function mapStoredUser(row: Record<string, unknown> | undefined): StoredUser | null {
  if (!row) {
    return null;
  }

  return {
    id: String(row.id),
    username: String(row.username),
    displayName: String(row.displayName),
    passwordHash: String(row.passwordHash),
    image: row.image ? String(row.image) : null,
    email: row.email ? String(row.email) : null,
    lastSeenAt: row.lastSeenAt ? String(row.lastSeenAt) : null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function createDatabase() {
  const db = new Database(databasePath, { timeout: 5000 });

  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      displayName TEXT NOT NULL,
      passwordHash TEXT NOT NULL,
      image TEXT,
      email TEXT,
      lastSeenAt TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS users_username_idx ON users (username);
  `);

  return db;
}

type SQLiteDatabase = ReturnType<typeof createDatabase>;

let database: SQLiteDatabase | null = null;

function getDb(): SQLiteDatabase {
  if (!database) {
    database = createDatabase();
  }

  return database;
}

export function findUserByUsername(username: string): StoredUser | null {
  const statement = getDb().prepare(
    `SELECT id, username, displayName, passwordHash, image, email, lastSeenAt, createdAt, updatedAt
     FROM users
     WHERE username = ?`
  );

  return mapStoredUser(statement.get(username) as Record<string, unknown> | undefined);
}

export function findUserById(userId: string): StoredUser | null {
  const statement = getDb().prepare(
    `SELECT id, username, displayName, passwordHash, image, email, lastSeenAt, createdAt, updatedAt
     FROM users
     WHERE id = ?`
  );

  return mapStoredUser(statement.get(userId) as Record<string, unknown> | undefined);
}

export function createUserRecord(input: {
  username: string;
  displayName: string;
  passwordHash: string;
}): Pick<StoredUser, "id" | "username" | "displayName"> {
  const timestamp = new Date().toISOString();
  const user = {
    id: randomUUID(),
    username: input.username,
    displayName: input.displayName,
    passwordHash: input.passwordHash,
    image: null,
    email: null,
    lastSeenAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const statement = getDb().prepare(
    `INSERT INTO users (
      id, username, displayName, passwordHash, image, email, lastSeenAt, createdAt, updatedAt
    )
     VALUES (
      @id, @username, @displayName, @passwordHash, @image, @email, @lastSeenAt, @createdAt, @updatedAt
    )`
  );

  statement.run(user);

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
  };
}

export function touchUserLastSeen(userId: string): void {
  const timestamp = new Date().toISOString();
  const statement = getDb().prepare(
    `UPDATE users
     SET lastSeenAt = ?, updatedAt = ?
     WHERE id = ?`
  );

  statement.run(timestamp, timestamp, userId);
}
