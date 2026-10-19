/* ============================================================
   tools/seed.mjs — تهيئة قاعدة بيانات D1 + زرع المستخدم الافتراضي
   ------------------------------------------------------------
   الاستعمال:
     node tools/seed.mjs            # طبّق المخطط (idempotent) + زرع المستخدم
     node tools/seed.mjs --hash     # اطبع بصمة كلمة مرور فقط
   ============================================================ */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const PBKDF2_ITERS = 10000;

/* بصمة كلمة المرور: pbkdf2_sha256$<iters>$<saltB64>$<hashB64> */
export function hashPassword(password, iters = PBKDF2_ITERS) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(password, salt, iters, 32, "sha256");
  return `pbkdf2_sha256$${iters}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function newId() {
  return crypto.randomUUID();
}

export function loadEnv() {
  const file = path.join(ROOT, ".env");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  loadEnv();

  const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
  const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID;
  const DB_NAME = process.env.CLOUDFLARE_D1_NAME || "tfkir-content";
  const DB_ID = process.env.CLOUDFLARE_D1_ID;
  if (!TOKEN || !ACCOUNT || !DB_ID) {
    console.error("ناقص: CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_D1_ID");
    process.exit(1);
  }

  if (process.argv.includes("--hash")) {
    console.log(hashPassword(process.argv[process.argv.indexOf("--hash") + 1] || "1234"));
    process.exit(0);
  }

  const sql = (text) =>
    fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/d1/database/${DB_ID}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql: text, params: [] }),
    }).then(async (r) => {
      const j = await r.json();
      if (!j.success) throw new Error(JSON.stringify(j.errors));
      return j.result;
    });

  const username = process.env.ADMIN_USERNAME || "yas";
  const password = process.env.ADMIN_PASSWORD || "1234";
  const uid = newId();

  console.log(`→ تطبيق المخطط على ${DB_NAME}`);
  const schema = fs.readFileSync(path.join(ROOT, "db/schema.sql"), "utf8");
  for (const stmt of schema.split(";").map((s) => s.trim()).filter(Boolean)) {
    await sql(stmt);
  }

  console.log(`→ زرع المستخدم الافتراضي: ${username}`);
  await sql(
    `DELETE FROM sessions WHERE user_id IN (SELECT id FROM users);
     DELETE FROM users WHERE username_lower = :u;`
      .replace(":u", JSON.stringify(username.toLowerCase()).replace(/"/g, "'"))
  );
  await sql(
    `INSERT INTO users (id, username, username_lower, display_name, password_hash, must_change)
     VALUES ('${uid}', '${username.replace(/'/g, "''")}', '${username.toLowerCase().replace(/'/g, "''")}',
             'الدكتور ياسر حسن', '${hashPassword(password)}', 1);`
  );

  console.log("✓ تمت التهيئة — سيُطلب تغيير بيانات الدخول عند أول تسجيل دخول.");
}