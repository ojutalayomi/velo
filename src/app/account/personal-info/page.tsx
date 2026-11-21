"use client";
import { Loader2, Lock, UserPen } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

import { useUser } from "@/app/providers/UserProvider";
import { SettingsGroup, SettingsHeader, SettingsRow } from "@/components/settings/SettingsUI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormState = { name: string; username: string; dob: string; location: string };

const EMPTY: FormState = { name: "", username: "", dob: "", location: "" };

const PersonalInfoPage = () => {
  const router = useRouter();
  const { userdata, loading, refetchUser } = useUser();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saved, setSaved] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  // Fill the form from the signed-in user once it loads.
  useEffect(() => {
    if (loading || !userdata?._id) return;
    const t = setTimeout(() => {
      const values: FormState = {
        name: userdata.name || `${userdata.firstname} ${userdata.lastname}`.trim(),
        username: userdata.username || "",
        dob: userdata.dob ? userdata.dob.slice(0, 10) : "",
        location: userdata.location || "",
      };
      setForm(values);
      setSaved(values);
    }, 0);
    return () => clearTimeout(t);
  }, [userdata, loading]);

  const changed = (Object.keys(form) as (keyof FormState)[]).filter((k) => form[k] !== saved[k]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changed.length) return;
    setSaving(true);
    try {
      // Only send what actually changed.
      const body = Object.fromEntries(changed.map((k) => [k, form[k]]));
      const res = await fetch("/api/user/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Update failed");
      }
      setSaved(form);
      refetchUser();
      toast.success("Personal information updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-h-screen w-full overflow-auto">
      <SettingsHeader title="Personal information" backTo="/general" />

      <main className="mx-auto mb-20 max-w-2xl space-y-6 p-4 tablets:mb-6">
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              maxLength={50}
              placeholder="Your name"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              value={form.username}
              onChange={handleChange}
              maxLength={20}
              pattern="[A-Za-z0-9_]{3,20}"
              title="3-20 letters, numbers or underscores"
              autoCapitalize="none"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              You can change your username once every 30 days.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Input id="email" value={userdata?.email || ""} readOnly disabled className="pr-9" />
              <Lock className="absolute right-3 top-2.5 size-4 text-gray-400" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Your email can&apos;t be changed here.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="dob">Date of birth</Label>
              <Input
                id="dob"
                name="dob"
                type="date"
                value={form.dob}
                onChange={handleChange}
                max={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                value={form.location}
                onChange={handleChange}
                maxLength={30}
                placeholder="City, Country"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            {changed.length > 0 && (
              <Button type="button" variant="ghost" onClick={() => setForm(saved)} disabled={saving}>
                Reset
              </Button>
            )}
            <Button type="submit" disabled={!changed.length || saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </form>

        <SettingsGroup title="Profile">
          <SettingsRow
            icon={<UserPen size={20} />}
            label="Edit profile"
            description="Photo, cover, bio and website"
            onClick={() => router.push(`/${userdata?.username}/edit`)}
          />
        </SettingsGroup>
      </main>
    </div>
  );
};

export default PersonalInfoPage;
