/**
 * WebAuthn (Passkey) utilities for server-side operations
 */

import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
  type VerifiedAuthenticationResponse,
  type VerifiedRegistrationResponse,
} from "@simplewebauthn/server";

import { PasskeyCredential } from "./types/passkey";

// Get the origin from environment or construct it
const RP_NAME = "Velo Chat";
const RP_ID = process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID || "localhost";
const ORIGIN =
  process.env.NEXT_PUBLIC_BASE_URL || `https://${RP_ID}` || "http://localhost:3000";

export interface GenerateRegistrationOptionsParams {
  userId: string;
  username: string;
  displayName: string;
  existingCredentials?: PasskeyCredential[];
}

export interface GenerateAuthenticationOptionsParams {
  credentials?: PasskeyCredential[];
}

export interface VerifyRegistrationParams {
  response: RegistrationResponseJSON;
  expectedChallenge: string;
}

export interface VerifyAuthenticationParams {
  response: AuthenticationResponseJSON;
  expectedChallenge: string;
  credential: PasskeyCredential;
}

/**
 * Generate registration options for creating a new passkey
 */
export async function generatePasskeyRegistrationOptions(
  params: GenerateRegistrationOptionsParams
): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const { userId, username, displayName, existingCredentials = [] } = params;

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: username,
    userDisplayName: displayName,
    userID: new Uint8Array(new TextEncoder().encode(userId)),
    // Don't prompt users for additional information about the authenticator
    attestationType: "none",
    // Prevent users from re-registering existing authenticators
    excludeCredentials: existingCredentials.map((cred) => ({
      id: cred.id,
      type: "public-key" as const,
      transports: cred.transports,
    })),
    authenticatorSelection: {
      // Prefer platform authenticators (Touch ID, Windows Hello, etc.)
      authenticatorAttachment: "platform",
      // Require user verification (biometrics, PIN, etc.)
      userVerification: "preferred",
      // Allow discoverable credentials (passkeys)
      residentKey: "preferred",
    },
  });

  return options;
}

/**
 * Generate authentication options for signing in with a passkey
 */
export async function generatePasskeyAuthenticationOptions(
  params: GenerateAuthenticationOptionsParams
): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const { credentials = [] } = params;

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    // Allow the authenticator to use any of the user's registered credentials
    allowCredentials:
      credentials.length > 0
        ? credentials.map((cred) => ({
            id: cred.id,
            type: "public-key" as const,
            transports: cred.transports,
          }))
        : [],
    userVerification: "preferred",
  });

  return options;
}

/**
 * Verify a registration response from the client
 */
export async function verifyPasskeyRegistration(
  params: VerifyRegistrationParams
): Promise<VerifiedRegistrationResponse> {
  const { response, expectedChallenge } = params;

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    requireUserVerification: true,
  });

  return verification;
}

/**
 * Verify an authentication response from the client
 */
export async function verifyPasskeyAuthentication(
  params: VerifyAuthenticationParams
): Promise<VerifiedAuthenticationResponse> {
  const { response, expectedChallenge, credential } = params;

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    credential: {
      id: credential.id,
      publicKey: new Uint8Array(credential.publicKey),
      counter: credential.counter,
      transports: credential.transports,
    },
    requireUserVerification: true,
  });

  return verification;
}

/**
 * Convert registration verification to a PasskeyCredential
 */
export function registrationToPasskeyCredential(
  verification: VerifiedRegistrationResponse,
  name: string
): PasskeyCredential {
  const { registrationInfo } = verification;
  if (!registrationInfo) {
    throw new Error("Registration info is missing");
  }

  const { credential, aaguid, credentialDeviceType, credentialBackedUp } =
    registrationInfo;

  return {
    id: credential.id,
    publicKey: credential.publicKey,
    counter: credential.counter,
    transports: [], // Will be populated from client response
    createdAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
    name,
    aaguid,
    credentialDeviceType,
    credentialBackedUp,
  };
}

/**
 * Get a user-friendly device name based on user agent
 */
export function getDeviceName(userAgent: string): string {
  const ua = userAgent.toLowerCase();

  if (ua.includes("iphone")) return "iPhone";
  if (ua.includes("ipad")) return "iPad";
  if (ua.includes("mac")) return "Mac";
  if (ua.includes("windows")) return "Windows PC";
  if (ua.includes("android")) return "Android Device";
  if (ua.includes("linux")) return "Linux Device";

  return "Unknown Device";
}
