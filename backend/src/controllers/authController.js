import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { query, withTransaction } from '../config/db.js';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';
import { sendPasswordResetEmail } from '../services/emailService.js';

const cookieOptions = {
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: env.cookieSameSite,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    created_at: user.created_at,
  };
}

function setToken(res, user) {
  const token = jwt.sign(
    { email: user.email },
    env.jwtSecret,
    { subject: String(user.id), expiresIn: env.jwtExpiresIn },
  );
  res.cookie('studyflow_token', token, cookieOptions);
}

export async function register(req, res) {
  const { name, email, password } = req.body;
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await query('SELECT id FROM users WHERE email=? LIMIT 1', [normalizedEmail]);
  if (existing.length) throw new HttpError(409, 'An account with this email already exists.');

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await query(
    'INSERT INTO users (name,email,password_hash) VALUES (?,?,?)',
    [name.trim(), normalizedEmail, passwordHash],
  );
  const user = { id: result.insertId, name: name.trim(), email: normalizedEmail };
  setToken(res, user);
  res.status(201).json({ success: true, user });
}

export async function login(req, res) {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = req.body.password;
  const rows = await query('SELECT * FROM users WHERE email=? LIMIT 1', [email]);
  if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash))) {
    throw new HttpError(401, 'Incorrect email or password.');
  }
  setToken(res, rows[0]);
  res.json({ success: true, user: publicUser(rows[0]) });
}

export async function logout(req, res) {
  res.clearCookie('studyflow_token', {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    path: '/',
  });
  res.json({ success: true, message: 'Signed out successfully.' });
}

export async function me(req, res) {
  const rows = await query(
    'SELECT id,name,email,created_at FROM users WHERE id=?',
    [req.user.id],
  );
  if (!rows.length) throw new HttpError(404, 'Account not found.');
  res.json({ success: true, user: rows[0] });
}

export async function updateProfile(req, res) {
  const name = String(req.body.name || '').trim();
  if (name.length < 2 || name.length > 80) {
    throw new HttpError(400, 'Name must contain 2–80 characters.');
  }
  await query('UPDATE users SET name=? WHERE id=?', [name, req.user.id]);
  res.json({ success: true, user: { id: req.user.id, name } });
}

export async function requestPasswordReset(req, res) {
  const email = String(req.body.email || '').trim().toLowerCase();
  const users = await query('SELECT id FROM users WHERE email=? LIMIT 1', [email]);
  let developmentToken;

  if (users.length) {
    const userId = users[0].id;
    const rawToken = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Revoke older outstanding links before creating the newest one.
    await query(
      'UPDATE password_reset_tokens SET used_at=UTC_TIMESTAMP() WHERE user_id=? AND used_at IS NULL',
      [userId],
    );
    await query(
      'INSERT INTO password_reset_tokens (user_id,token_hash,expires_at) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 MINUTE))',
      [userId, tokenHash],
    );

    if (env.smtpConfigured) {
      try {
        await sendPasswordResetEmail(email, rawToken);
      } catch (error) {
        // Revoke a token that could not be delivered. Never log its value or recipient.
        await query(
          'UPDATE password_reset_tokens SET used_at=UTC_TIMESTAMP() WHERE token_hash=? AND used_at IS NULL',
          [tokenHash],
        );
        console.error('Password reset email delivery failed:', error?.code || 'SMTP_ERROR');
      }
    } else if (env.nodeEnv === 'development') {
      // Deliberately available only for local development, never production.
      developmentToken = rawToken;
    }
  }

  // Same response whether or not the email belongs to an account.
  res.json({
    success: true,
    message: 'If an account exists, password reset instructions will be sent.',
    ...(developmentToken ? { developmentToken } : {}),
  });
}

export async function resetPassword(req, res) {
  const { token, password } = req.body;
  const tokenHash = crypto.createHash('sha256').update(String(token || '')).digest('hex');
  const passwordHash = await bcrypt.hash(password, 12);

  const changed = await withTransaction(async (connection) => {
    const [rows] = await connection.execute(
      `SELECT id,user_id
       FROM password_reset_tokens
       WHERE token_hash=? AND used_at IS NULL AND expires_at>UTC_TIMESTAMP()
       LIMIT 1 FOR UPDATE`,
      [tokenHash],
    );
    if (!rows.length) return false;

    const reset = rows[0];
    const [claimed] = await connection.execute(
      'UPDATE password_reset_tokens SET used_at=UTC_TIMESTAMP() WHERE id=? AND used_at IS NULL',
      [reset.id],
    );
    if (claimed.affectedRows !== 1) return false;

    await connection.execute(
      'UPDATE users SET password_hash=? WHERE id=?',
      [passwordHash, reset.user_id],
    );
    // A successful password change invalidates every other outstanding reset link.
    await connection.execute(
      'UPDATE password_reset_tokens SET used_at=UTC_TIMESTAMP() WHERE user_id=? AND used_at IS NULL',
      [reset.user_id],
    );
    return true;
  });

  if (!changed) {
    throw new HttpError(400, 'This password reset link is invalid, expired, or already used.');
  }

  res.json({ success: true, message: 'Password updated. You can now sign in.' });
}
