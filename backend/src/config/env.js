import dotenv from 'dotenv';
dotenv.config();
export const env = {
  port: Number(process.env.PORT || 5000), nodeEnv: process.env.NODE_ENV || 'development',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  db: {host:process.env.DB_HOST||'localhost', port:Number(process.env.DB_PORT||3306), user:process.env.DB_USER||'root', password:process.env.DB_PASSWORD||'', database:process.env.DB_NAME||'studyflow'},
  jwtSecret:process.env.JWT_SECRET || 'development-only-change-this-secret-before-deploying', jwtExpiresIn:process.env.JWT_EXPIRES_IN||'7d',
  cookieSecure:process.env.COOKIE_SECURE==='true', cookieSameSite:process.env.COOKIE_SAME_SITE||'lax'
};
if (env.nodeEnv==='production' && env.jwtSecret.length<32) throw new Error('JWT_SECRET must contain at least 32 characters in production');
