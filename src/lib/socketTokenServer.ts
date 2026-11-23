import { SignJWT } from "jose";

/** How long a socket token lives; clients ask for a new one before it runs out. */
export const SOCKET_TOKEN_TTL_SECONDS = 60 * 60;

/**
 * A token proving to the socket server that `userId` is who is connecting. Only call this once
 * the user has been authenticated (a session check, or an API route acting for them). Returns
 * null when SOCKET_AUTH_SECRET is not configured.
 */
export async function signSocketToken(userId: string, ttlSeconds = SOCKET_TOKEN_TTL_SECONDS) {
  const secret = process.env.SOCKET_AUTH_SECRET;
  if (!secret) return null;
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setAudience("velo-socket")
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(new TextEncoder().encode(secret));
}
