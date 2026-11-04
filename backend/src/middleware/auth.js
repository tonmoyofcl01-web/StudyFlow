import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function requireAuth(req, res, next) {
  const token = req.cookies?.studyflow_token;
  if (!token) {
    return res.status(401).json({ success: false, message: 'Please sign in to continue.' });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = { id: Number(payload.sub), email: payload.email };
    return next();
  } catch {
    res.clearCookie('studyflow_token', {
      httpOnly: true,
      secure: env.cookieSecure,
      sameSite: env.cookieSameSite,
      path: '/',
    });
    return res.status(401).json({
      success: false,
      message: 'Your session has expired. Please sign in again.',
    });
  }
}
