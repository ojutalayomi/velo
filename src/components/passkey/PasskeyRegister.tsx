"use client";

import { cloneElement, isValidElement, useState } from "react";
import { KeyRound, Loader2, Check, X } from "lucide-react";

import { isPasskeySupported, registerPasskey } from "@/lib/passkey-client";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PasskeyRegisterProps {
  onSuccess?: (credential: any) => void;
  trigger?: React.ReactNode;
}

export function PasskeyRegister({ onSuccess, trigger }: PasskeyRegisterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const supported = isPasskeySupported();

  const handleRegister = async () => {
    setIsLoading(true);
    setError("");
    setSuccess(false);

    try {
      const result = await registerPasskey(deviceName || undefined);

      if (result.success) {
        setSuccess(true);
        onSuccess?.(result.credential);
        setTimeout(() => {
          setIsOpen(false);
          setDeviceName("");
          setSuccess(false);
        }, 2000);
      } else {
        setError(result.error || "Registration failed");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (!supported) {
    return (
      <Alert variant="destructive">
        <X className="h-4 w-4" />
        <AlertDescription>
          Passkeys are not supported in your current browser. Please use a modern browser like
          Chrome, Safari, or Edge.
        </AlertDescription>
      </Alert>
    );
  }

  const defaultTrigger = (
    <Button variant="outline">
      <KeyRound className="mr-2 h-4 w-4" />
      Add Passkey
    </Button>
  );
  const triggerEl = trigger ?? defaultTrigger;
  const opener = isValidElement<{ onClick?: React.MouseEventHandler }>(triggerEl) ? (
    cloneElement(triggerEl, {
      onClick: (e: React.MouseEvent) => {
        triggerEl.props.onClick?.(e);
        setIsOpen(true);
      },
    })
  ) : (
    <span className="contents" onClick={() => setIsOpen(true)}>
      {triggerEl}
    </span>
  );

  return (
    <>
      {opener}
      <ResponsiveDialog open={isOpen} onOpenChange={setIsOpen}>
        <ResponsiveDialogContent className="sm:max-w-[425px]">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Create a Passkey</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Passkeys let you sign in securely using your face, fingerprint, or device PIN.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="device-name">Device Name (Optional)</Label>
              <Input
                id="device-name"
                placeholder="e.g., MacBook Pro, iPhone"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                disabled={isLoading || success}
              />
              <p className="text-sm text-muted-foreground">
                Give this passkey a memorable name to identify it later.
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <X className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <Check className="h-4 w-4" />
                <AlertDescription>Passkey created successfully!</AlertDescription>
              </Alert>
            )}

            <Button onClick={handleRegister} disabled={isLoading || success}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Passkey...
                </>
              ) : success ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Passkey Created!
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Create Passkey
                </>
              )}
            </Button>
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}
