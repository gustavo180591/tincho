import { SignJWT, jwtVerify } from 'jose';
import { JWT_SECRET } from '$env/static/private';

const secret = new TextEncoder().encode(JWT_SECRET);

export async function createAuthJWT(payload: { id: string; email: string; role: string }) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret);
}

export async function verifyAuthJWT(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return { payload, error: null };
  } catch (error) {
    return { payload: null, error: 'Invalid or expired token' };
  }
}
