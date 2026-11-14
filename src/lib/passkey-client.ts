/**
 * Client-side WebAuthn utilities using @simplewebauthn/browser
 */

import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/browser";

/**
 * Check if passkeys are supported in the current browser
 */
export function isPasskeySupported(): boolean {
  return (
    typeof window !== "undefined" &&
    window.PublicKeyCredential !== undefined &&
    typeof window.PublicKeyCredential === "function"
  );
}

/**
 * Check if conditional UI (autofill) is supported
 */
export async function isConditionalUISupported(): Promise<boolean> {
  if (!isPasskeySupported()) return false;

  try {
    const available =
      await window.PublicKeyCredential.isConditionalMediationAvailable?.();
    return available === true;
  } catch {
    return false;
  }
}

/**
 * Register a new passkey
 */
export async function registerPasskey(deviceName?: string): Promise<{
  success: boolean;
  error?: string;
  credential?: any;
}> {
  try {
    if (!isPasskeySupported()) {
      return {
        success: false,
        error: "Passkeys are not supported in this browser",
      };
    }

    // Get registration options from server
    const optionsResponse = await fetch("/api/passkey/register/options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!optionsResponse.ok) {
      const error = await optionsResponse.json();
      return {
        success: false,
        error: error.message || "Failed to get registration options",
      };
    }

    const options: PublicKeyCredentialCreationOptionsJSON =
      await optionsResponse.json();

    // Start registration ceremony
    let registrationResponse: RegistrationResponseJSON;
    try {
      registrationResponse = await startRegistration({ optionsJSON: options });
    } catch (error: any) {
      console.error("Registration error:", error);
      return {
        success: false,
        error: error.message || "Registration was cancelled or failed",
      };
    }

    // Verify registration with server
    const verificationResponse = await fetch("/api/passkey/register/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        response: registrationResponse,
        deviceName,
      }),
    });

    if (!verificationResponse.ok) {
      const error = await verificationResponse.json();
      return {
        success: false,
        error: error.message || "Failed to verify registration",
      };
    }

    const result = await verificationResponse.json();
    return {
      success: true,
      credential: result.credential,
    };
  } catch (error: any) {
    console.error("Passkey registration error:", error);
    return {
      success: false,
      error: error.message || "An unexpected error occurred",
    };
  }
}

/**
 * Authenticate with a passkey
 */
export async function authenticateWithPasskey(username?: string): Promise<{
  success: boolean;
  error?: string;
  user?: any;
}> {
  try {
    if (!isPasskeySupported()) {
      return {
        success: false,
        error: "Passkeys are not supported in this browser",
      };
    }

    // Get authentication options from server
    const optionsResponse = await fetch("/api/passkey/authenticate/options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });

    if (!optionsResponse.ok) {
      const error = await optionsResponse.json();
      return {
        success: false,
        error: error.message || "Failed to get authentication options",
      };
    }

    const options: PublicKeyCredentialRequestOptionsJSON =
      await optionsResponse.json();

    // Start authentication ceremony
    let authenticationResponse: AuthenticationResponseJSON;
    try {
      authenticationResponse = await startAuthentication({
        optionsJSON: options,
      });
    } catch (error: any) {
      console.error("Authentication error:", error);
      return {
        success: false,
        error: error.message || "Authentication was cancelled or failed",
      };
    }

    // Verify authentication with server
    const verificationResponse = await fetch(
      "/api/passkey/authenticate/verify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response: authenticationResponse,
        }),
      }
    );

    if (!verificationResponse.ok) {
      const error = await verificationResponse.json();
      return {
        success: false,
        error: error.message || "Failed to verify authentication",
      };
    }

    const result = await verificationResponse.json();
    return {
      success: true,
      user: result.user,
    };
  } catch (error: any) {
    console.error("Passkey authentication error:", error);
    return {
      success: false,
      error: error.message || "An unexpected error occurred",
    };
  }
}

/**
 * Get list of user's passkeys
 */
export async function listPasskeys(): Promise<{
  success: boolean;
  passkeys?: any[];
  error?: string;
}> {
  try {
    const response = await fetch("/api/passkey/list");

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.message || "Failed to list passkeys",
      };
    }

    const result = await response.json();
    return {
      success: true,
      passkeys: result.passkeys,
    };
  } catch (error: any) {
    console.error("List passkeys error:", error);
    return {
      success: false,
      error: error.message || "An unexpected error occurred",
    };
  }
}

/**
 * Delete a passkey
 */
export async function deletePasskey(credentialId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const response = await fetch(`/api/passkey/delete?id=${encodeURIComponent(credentialId)}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.message || "Failed to delete passkey",
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Delete passkey error:", error);
    return {
      success: false,
      error: error.message || "An unexpected error occurred",
    };
  }
}
