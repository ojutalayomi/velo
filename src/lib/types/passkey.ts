/**
 * Passkey (WebAuthn) types for authentication
 */

export interface PasskeyCredential {
  id: string; // Credential ID (base64url)
  publicKey: Uint8Array; // Public key bytes
  counter: number; // Signature counter
  transports?: AuthenticatorTransport[]; // Supported transports (usb, nfc, ble, internal)
  createdAt: string; // ISO timestamp
  lastUsedAt: string; // ISO timestamp
  name: string; // User-friendly name (e.g., "MacBook Pro Touch ID", "iPhone")
  aaguid?: string; // Authenticator attestation GUID
  credentialDeviceType?: string; // "singleDevice" | "multiDevice"
  credentialBackedUp?: boolean; // Whether the credential is backed up
}

export interface PasskeyChallenge {
  challenge: string;
  userId?: string;
  expiresAt: number; // Unix timestamp
  type: "registration" | "authentication";
}
