"use client";

import { Loader2, LocateFixed } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Input } from "@/components/ui/input";
import type { PostLocation } from "@/lib/types/type";

export function LocationPicker({
  open,
  onOpenChange,
  onSelect,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (location: PostLocation) => void;
  initial?: PostLocation | null;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initial?.lat !== undefined && initial?.lng !== undefined
      ? { lat: initial.lat, lng: initial.lng }
      : null
  );
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Location is not supported on this device.");
      return;
    }
    setError("");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords: position }) => {
        try {
          const res = await fetch(
            `/api/geocode/reverse?lat=${position.latitude}&lng=${position.longitude}`
          );
          const json = await res.json();
          if (!res.ok) throw new Error(json?.message || "Could not find your place name");
          setName(json.data.name);
          setCoords({ lat: json.data.lat, lng: json.data.lng });
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not find your place name");
        } finally {
          setLocating(false);
        }
      },
      (e) => {
        setLocating(false);
        setError(
          e.code === e.PERMISSION_DENIED
            ? "Location permission was denied. You can type a place instead."
            : "Could not get your location. You can type a place instead."
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 }
    );
  };

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSelect({ name: trimmed.slice(0, 120), ...(coords ?? {}) });
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-md bg-white dark:bg-zinc-900">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Add location</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>Tag a place, or use your current location.</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="space-y-3">
          <Input
            value={name}
            maxLength={120}
            onChange={(e) => {
              setName(e.target.value);
              setCoords(null); // typed text no longer matches the detected coordinates
            }}
            placeholder="e.g. Yaba, Lagos"
            aria-label="Place name"
          />
          <Button type="button" variant="outline" onClick={useCurrentLocation} disabled={locating}>
            {locating ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : (
              <LocateFixed size={16} className="mr-2" />
            )}
            Use my current location
          </Button>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <ResponsiveDialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim()}
            onClick={submit}
            className="bg-brand text-white hover:bg-brand/90"
          >
            Add location
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
