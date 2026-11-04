import dotenv from 'dotenv';
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const jwtSecret = process.env.JWT_SECRET || '';
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const cookieSameSite = (process.env.COOKIE_SAME_SITE || 'lax').toLowerCase();
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
const trustProxyValue = process.env.TRUST_PROXY || '0';
if (!/^\d+$/.test(trustProxyValue)) {
  throw new Error('TRUST_PROXY must be a non-negative number of trusted proxy hops (for example, 1).');
}
const trustProxy = Number(trustProxyValue);

if (!['development', 'test', 'production'].includes(nodeEnv)) {
  throw new Error('NODE_ENV must be development, test, or production.');
}
if (!jwtSecret || jwtSecret.includes('REPLACE_WITH') || jwtSecret.length < 32) {
  throw new Error('JWT_SECRET is required and must contain at least 32 characters. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
}
if (isProduction && jwtSecret.length < 64) {
  throw new Error('Production JWT_SECRET must contain at least 64 characters. Generate a 64-byte random secret.');
}
if (!['lax', 'strict', 'none'].includes(cookieSameSite)) {
  throw new Error('COOKIE_SAME_SITE must be lax, strict, or none.');
}
if (cookieSameSite === 'none' && !isProduction && process.env.COOKIE_SECURE !== 'true') {
  throw new Error('COOKIE_SAME_SITE=none requires COOKIE_SECURE=true.');
}
let parsedClientOrigin;
try {
  parsedClientOrigin = new URL(clientOrigin);
} catch {
  throw new Error('CLIENT_ORIGIN must be a valid absolute URL.');
}
if (isProduction && parsedClientOrigin.protocol !== 'https:') {
  throw new Error('Production CLIENT_ORIGIN must use HTTPS.');
}
if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
  throw new Error('SMTP_PORT must be a valid TCP port.');
}

const smtp = {
  host: process.env.SMTP_HOST || '',
  port: smtpPort,
  secure: smtpSecure,
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || '',
  from: process.env.SMTP_FROM || '',
};
const smtpConfigured = Boolean(smtp.host && smtp.user && smtp.pass && smtp.from);
if (isProduction && !smtpConfigured) {
  throw new Error('Production requires SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM to deliver password-reset emails.');
}

export const env = {
  port: Number(process.env.PORT || 5000),
  nodeEnv,
  isProduction,
  clientOrigin: parsedClientOrigin.origin,
  trustProxy,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'studyflow',
  },
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieSecure: isProduction || process.env.COOKIE_SECURE === 'true',
  cookieSameSite,
  smtp,
  smtpConfigured,
};
