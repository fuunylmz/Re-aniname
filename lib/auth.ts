import { SignJWT, jwtVerify } from 'jose';

// Default password if env var is not set (for safety in this demo environment)
// In production, user should set WEB_PASSWORD env var
const DEFAULT_PASSWORD = 'admin'; 
const SECRET_KEY = new TextEncoder().encode(process.env.AUTH_SECRET || 'default-secret-key-change-me');

export async function signToken(payload: any) {
  const alg = 'HS256';
  return new SignJWT(payload)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime('7d') // 7 days session
    .sign(SECRET_KEY);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload;
  } catch (error) {
    return null;
  }
}

export function checkPassword(password: string) {
  const correctPassword = process.env.WEB_PASSWORD || DEFAULT_PASSWORD;
  
  // Debug logging (remove in production!)
  // console.log(`[Auth Debug] Input: "${password}", Expected: "${correctPassword}"`);
  
  return password === correctPassword;
}
