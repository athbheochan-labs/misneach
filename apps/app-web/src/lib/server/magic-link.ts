import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import { Resend } from 'resend';
import { getPool } from './db';

const USER_TABLE = process.env.DB_USER_TABLE || 'user';
const MAGIC_LINK_TABLE = process.env.DB_MAGIC_LINK_TABLE || 'magic_link';
const LANGUAGE_SETTING_TABLE = process.env.DB_LANGUAGE_SETTING_TABLE || 'language_setting';

function qi(name: string): string {
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    throw new Error(`Unsafe SQL identifier: ${name}`);
  }
  return `\`${name}\``;
}

type ResolvedTables = {
  user: string;
  magicLink: string;
  languageSetting: string;
  userHasRoleColumn: boolean;
  userHasSignupColumn: boolean;
};

let resolvedTablesCache: ResolvedTables | null = null;

async function listTables(): Promise<string[]> {
  const pool = getPool();
  const schema = process.env.DB_NAME || 'decyphr';
  const [rows] = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = ?`,
    [schema]
  );
  return (rows as Array<{ table_name: string }>).map((r) => r.table_name);
}

function pickTable(existing: string[], preferred: string, candidates: string[]): string {
  if (existing.includes(preferred)) return preferred;
  for (const candidate of candidates) {
    if (existing.includes(candidate)) return candidate;
  }
  throw new Error(
    `Could not resolve table "${preferred}". Existing tables: ${existing.join(', ')}`
  );
}

async function resolveTables(): Promise<ResolvedTables> {
  if (resolvedTablesCache) return resolvedTablesCache;
  const existing = await listTables();
  const pool = getPool();
  const schema = process.env.DB_NAME || 'decyphr';

  const userTable = pickTable(existing, USER_TABLE, ['user', 'users', 'User']);
  const [roleColumnRows] = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = 'role' LIMIT 1`,
    [schema, userTable]
  );
  const [signupColumnRows] = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = 'hasCompletedSignup' LIMIT 1`,
    [schema, userTable]
  );

  const resolved: ResolvedTables = {
    user: userTable,
    magicLink: pickTable(existing, MAGIC_LINK_TABLE, [
      'magic_link',
      'magic_links',
      'magiclink',
      'magic_link_entity',
      'MagicLink'
    ]),
    languageSetting: pickTable(existing, LANGUAGE_SETTING_TABLE, [
      'language_setting',
      'language_settings',
      'languageSetting',
      'LanguageSetting'
    ]),
    userHasRoleColumn: Array.isArray(roleColumnRows) && roleColumnRows.length > 0,
    userHasSignupColumn: Array.isArray(signupColumnRows) && signupColumnRows.length > 0,
  };

  resolvedTablesCache = resolved;
  return resolved;
}

export type AuthUser = {
  id: number;
  email: string;
  clientId: string;
  role: 'learner' | 'admin';
  hasCompletedSignup: boolean;
};

function escapeHtml(value: string): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderMagicLinkEmailHtml(verifyUrl: string, userEmail: string): string {
  const safeUrl = escapeHtml(verifyUrl);
  const safeEmail = escapeHtml(userEmail);

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<meta http-equiv="X-UA-Compatible" content="IE=edge"/>
<meta name="x-apple-disable-message-reformatting"/>
<title>Sign in to Misneach</title>
<style>
  body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
  table,td{mso-table-lspace:0;mso-table-rspace:0}
  img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none}
  body{margin:0!important;padding:0!important;background:#f2ede4;width:100%!important}
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,900;1,9..144,300&family=Instrument+Sans:wght@400;500;600&display=swap');
  .wrapper{background:#f2ede4;padding:48px 16px}
  .container{max-width:520px;margin:0 auto}
  .card{background:#1c2b22;border-radius:20px;overflow:hidden}
  .header{background:#162219;padding:28px 40px;border-bottom:1px solid rgba(126,201,154,0.1)}
  .brand{display:inline-flex;align-items:center;gap:10px}
  .brand-word{font-family:'Fraunces',Georgia,serif;font-weight:900;font-size:20px;letter-spacing:-0.03em;color:#f5f0e8;line-height:1}
  .brand-word em{font-style:italic;font-weight:300;color:#7ec99a}
  .body{padding:40px 40px 32px}
  .greeting{font-family:'Fraunces',Georgia,serif;font-weight:900;font-size:28px;letter-spacing:-0.03em;line-height:1.05;color:#f5f0e8;margin-bottom:16px}
  .greeting em{font-style:italic;font-weight:300;color:#7ec99a}
  .body-text{font-family:'Instrument Sans',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#5a7a64;margin-bottom:24px}
  .btn-wrap{margin:0 0 28px}
  .btn{display:inline-block;background:#7ec99a;color:#1c2b22!important;font-family:'Fraunces',Georgia,serif;font-weight:700;font-size:16px;letter-spacing:-0.01em;text-decoration:none!important;border-radius:12px;padding:15px 32px;mso-padding-alt:15px 32px}
  .divider{border:none;border-top:1px solid rgba(255,255,255,0.07);margin:0 0 24px}
  .link-fallback{font-family:'Instrument Sans',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.65;color:#3a5a44}
  .link-fallback a{color:#5a8a6a;word-break:break-all}
  .expire-pill{display:inline-block;background:rgba(126,201,154,0.1);border:1px solid rgba(126,201,154,0.18);border-radius:100px;padding:5px 14px;font-family:'Instrument Sans',Helvetica,Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#7ec99a;margin-bottom:24px}
  .footer{padding:24px 40px;background:#131f17;border-top:1px solid rgba(255,255,255,0.05)}
  .footer-text{font-family:'Instrument Sans',Helvetica,Arial,sans-serif;font-size:11.5px;line-height:1.65;color:#3a5040;text-align:center}
  .footer-text a{color:#4a7060;text-decoration:none}
  .post-note{font-family:'Instrument Sans',Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#8a7e6e;text-align:center;padding:20px 8px 0}
  @media only screen and (max-width:540px){
    .wrapper{padding:24px 12px}
    .header{padding:22px 24px}
    .body{padding:28px 24px 24px}
    .footer{padding:20px 24px}
    .greeting{font-size:24px}
    .btn{display:block;text-align:center}
  }
</style>
</head>
<body>
<div class="wrapper">
<div class="container">
  <div class="card">
    <div class="header">
      <div class="brand">
        <svg width="28" height="28" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle">
          <path d="M40 6C19 6,8 20,8 36C8 53,19 65,38 66L30 76L50 66C67 63,72 53,72 36C72 20,61 6,40 6Z" fill="rgba(126,201,154,0.12)" stroke="rgba(126,201,154,0.4)" stroke-width="1.5"/>
          <path d="M33 48C36 38,44 28,50 22" stroke="#f5f0e8" stroke-width="4" stroke-linecap="round"/>
          <circle cx="33.5" cy="47" r="3.5" fill="#7ec99a"/>
        </svg>
        <span class="brand-word" style="display:inline-block;vertical-align:middle;margin-left:10px">Misne<em>ach</em></span>
      </div>
    </div>
    <div class="body">
      <div class="expire-pill">Expires in 15 minutes</div>
      <div class="greeting">Your sign-in<br/><em>link.</em></div>
      <div class="body-text">Click the button below to sign in to Misneach. This link is single-use and will expire after 15 minutes.</div>
      <div class="btn-wrap">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeUrl}" style="height:50px;v-text-anchor:middle;width:200px;" arcsize="24%" stroke="f" fillcolor="#7ec99a">
          <w:anchorlock/>
          <center style="color:#1c2b22;font-family:Georgia,serif;font-size:16px;font-weight:bold;">Sign in to Misneach</center>
        </v:roundrect>
        <![endif]-->
        <!--[if !mso]><!-->
        <a class="btn" href="${safeUrl}">Sign in to Misneach</a>
        <!--<![endif]-->
      </div>
      <hr class="divider"/>
      <div class="link-fallback">
        Button not working? Copy and paste this link into your browser:<br/>
        <a href="${safeUrl}">${safeUrl}</a>
      </div>
    </div>
    <div class="footer">
      <div class="footer-text">
        If you didn't request this, you can safely ignore it - no action needed and nothing will change on your account.<br/><br/>
        &copy; Misneach - <a href="https://misneach.ie">misneach.ie</a> - <a href="https://misneach.ie/unsubscribe">Unsubscribe</a>
      </div>
    </div>
  </div>
  <div class="post-note">
    This email was sent to ${safeEmail}.<br/>
    You're receiving this because you tried to sign in at misneach.ie.
  </div>
</div>
</div>
</body>
</html>`;
}

async function findUserByEmail(email: string): Promise<AuthUser | null> {
  const tables = await resolveTables();
  const pool = getPool();
  const roleSql = tables.userHasRoleColumn ? ', role' : '';
  const signupSql = tables.userHasSignupColumn ? ', hasCompletedSignup' : '';
  const [rows] = await pool.query(
    `SELECT id, email, clientId${roleSql}${signupSql} FROM ${qi(tables.user)} WHERE email = ? LIMIT 1`,
    [email]
  );

  const user = (rows as any[])[0];
  if (!user) return null;

  return {
    id: Number(user.id),
    email: String(user.email),
    clientId: String(user.clientId),
    role: user.role === 'admin' ? 'admin' : 'learner',
    hasCompletedSignup: tables.userHasSignupColumn
      ? Boolean(Number(user.hasCompletedSignup))
      : true,
  };
}

async function createUser(email: string): Promise<AuthUser> {
  const tables = await resolveTables();
  const pool = getPool();
  const clientId = uuidv4();
  let result: unknown;
  if (tables.userHasRoleColumn && tables.userHasSignupColumn) {
    [result] = await pool.query(
      `INSERT INTO ${qi(tables.user)} (email, clientId, role, hasCompletedSignup, createdAt) VALUES (?, ?, ?, ?, NOW())`,
      [email, clientId, 'learner', 0]
    );
  } else if (tables.userHasRoleColumn) {
    [result] = await pool.query(
      `INSERT INTO ${qi(tables.user)} (email, clientId, role, createdAt) VALUES (?, ?, ?, NOW())`,
      [email, clientId, 'learner']
    );
  } else if (tables.userHasSignupColumn) {
    [result] = await pool.query(
      `INSERT INTO ${qi(tables.user)} (email, clientId, hasCompletedSignup, createdAt) VALUES (?, ?, ?, NOW())`,
      [email, clientId, 0]
    );
  } else {
    [result] = await pool.query(
      `INSERT INTO ${qi(tables.user)} (email, clientId, createdAt) VALUES (?, ?, NOW())`,
      [email, clientId]
    );
  }

  const id = Number((result as any).insertId);
  return { id, email, clientId, role: 'learner', hasCompletedSignup: false };
}

async function ensureDefaultLanguageSetting(userId: number): Promise<void> {
  const tables = await resolveTables();
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id FROM ${qi(tables.languageSetting)} WHERE userId = ? LIMIT 1`,
    [userId]
  );

  if ((rows as any[]).length > 0) return;

  await pool.query(
    `INSERT INTO ${qi(tables.languageSetting)} (firstLanguage, targetLanguage, immersionLevel, userId) VALUES (?, ?, ?, ?)`,
    ['en', 'ga', 'normal', userId]
  );
}

async function issueMagicLink(userId: number): Promise<{ rawToken: string; expiresAt: Date }> {
  const tables = await resolveTables();
  const pool = getPool();
  const rawToken = crypto.randomBytes(32).toString('hex');
  const token = await bcrypt.hash(rawToken, 10);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await pool.query(
    `INSERT INTO ${qi(tables.magicLink)} (token, expiresAt, createdAt, userId) VALUES (?, ?, NOW(), ?)`,
    [token, expiresAt, userId]
  );

  return { rawToken, expiresAt };
}

export async function generateMagicLink(email: string): Promise<{ verifyUrl: string }> {
  const user = await ensureUserByEmail(email);
  const { rawToken } = await issueMagicLink(user.id);

  const appUrl = process.env.WEB_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5173';
  const verifyUrl = `${appUrl}/auth/verify-request?token=${rawToken}&email=${encodeURIComponent(email)}`;
  return { verifyUrl };
}

export async function ensureUserByEmail(email: string): Promise<AuthUser> {
  const normalized = email.trim().toLowerCase();
  let user = await findUserByEmail(normalized);
  if (!user) user = await createUser(normalized);
  await ensureDefaultLanguageSetting(user.id);
  return user;
}

export async function deliverMagicLinkEmail(email: string, verifyUrl: string): Promise<void> {
  const deliveryMode = process.env.EMAIL_DELIVERY || 'log';

  if (deliveryMode === 'log' || !process.env.RESEND_API_KEY) {
    console.log('—— MAGIC LINK (WEB) ——');
    console.log('To:', email);
    console.log('Verify URL:', verifyUrl);
    console.log('—————————————');
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const emailHtml = renderMagicLinkEmailHtml(verifyUrl, email);
  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'no-reply@example.com',
    to: email,
    subject: 'Sign in to Misneach',
    html: emailHtml,
    text: `Sign in to Misneach\n\nUse this link to sign in (expires in 15 minutes):\n${verifyUrl}\n\nIf you did not request this, you can ignore this email.`,
  });
}

export async function verifyMagicLink(email: string, rawToken: string): Promise<AuthUser> {
  const tables = await resolveTables();
  const user = await findUserByEmail(email);
  if (!user) throw new Error('User not found');

  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, token, expiresAt FROM ${qi(tables.magicLink)} WHERE userId = ? ORDER BY createdAt DESC LIMIT 1`,
    [user.id]
  );

  const magicLink = (rows as any[])[0];
  if (!magicLink) throw new Error('Token not found');

  if (new Date(magicLink.expiresAt).getTime() < Date.now()) {
    throw new Error('Token expired');
  }

  const isValid = await bcrypt.compare(rawToken, String(magicLink.token));
  if (!isValid) throw new Error('Invalid token');

  await ensureDefaultLanguageSetting(user.id);
  return user;
}

export async function markSignupCompleteByUserId(userId: number): Promise<void> {
  const tables = await resolveTables();
  if (!tables.userHasSignupColumn) return;
  const pool = getPool();
  await pool.query(
    `UPDATE ${qi(tables.user)} SET hasCompletedSignup = ? WHERE id = ?`,
    [1, userId]
  );
}
