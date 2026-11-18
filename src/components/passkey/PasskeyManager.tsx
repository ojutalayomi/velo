"use client";

import { useEffect, useState } from "react";
import { KeyRound, Trash2, Loader2, Smartphone, Monitor } from "lucide-react";
import moment from "moment";

import { deletePasskey, listPasskeys } from "@/lib/passkey-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PasskeyRegister } from "./PasskeyRegister";

interface Passkey {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string;
  transports?: string[];
  credentialBackedUp?: boolean;
  credentialDeviceType?: string;
}

export function PasskeyManager() {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadPasskeys = async () => {
    setIsLoading(true);
    const result = await listPasskeys();
    if (result.success && result.passkeys) {
      setPasskeys(result.passkeys);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadPasskeys();
  }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const result = await deletePasskey(id);
    if (result.success) {
      setPasskeys(passkeys.filter((p) => p.id !== id));
    }
    setDeletingId(null);
  };

  const getDeviceIcon = (passkey: Passkey) => {
    const transports = passkey.transports || [];
    if (transports.includes("internal") || passkey.credentialDeviceType === "singleDevice") {
      return <Monitor className="h-5 w-5" />;
    }
    return <Smartphone className="h-5 w-5" />;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Passkeys
            </CardTitle>
            <CardDescription>
              Manage your passkeys for secure, passwordless sign-in
            </CardDescription>
          </div>
          <PasskeyRegister
            onSuccess={() => loadPasskeys()}
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : passkeys.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <KeyRound className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No passkeys yet</p>
            <p className="text-sm mt-1">
              Add a passkey to enable faster, more secure sign-in
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {passkeys.map((passkey) => (
              <div
                key={passkey.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="text-muted-foreground">
                    {getDeviceIcon(passkey)}
                  </div>
                  <div>
                    <p className="font-medium">{passkey.name}</p>
                    <div className="text-sm text-muted-foreground space-y-0.5">
                      <p>
                        Created {moment(passkey.createdAt).fromNow()}
                      </p>
                      <p>
                        Last used {moment(passkey.lastUsedAt).fromNow()}
                      </p>
                      {passkey.credentialBackedUp && (
                        <p className="text-xs text-green-600 dark:text-green-400">
                          ✓ Backed up
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={deletingId === passkey.id}
                    >
                      {deletingId === passkey.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Passkey</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{passkey.name}"? This
                        action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(passkey.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
