"use client";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useRef, ChangeEvent, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import { LocationPicker } from "@/components/LocationPicker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTheme } from "@/app/providers/ThemeProvider";
import { useNavigateWithHistory } from "@/hooks/useNavigateWithHistory";
import { BUCKETNAME, S3UploadBody } from "@/lib/types/s3";
import { RootState } from "@/redux/store";
import { updateUserData } from "@/redux/userSlice";


export default function EditProfile() {
  const dispatch = useDispatch();
  const userdata = useSelector((state: RootState) => state.user.userdata);
  const router = useRouter();
  const navigate = useNavigateWithHistory();
  const [isLoading, setIsLoading] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    location: "",
    website: "",
    displayPicture: "",
    coverPhoto: "",
    username: "",
    dob: "",
    isPrivate: false,
    theme: "system" as "system" | "light" | "dark",
  });
  const { setTheme } = useTheme();

  const [selectedFiles, setSelectedFiles] = useState<{
    displayPicture?: File;
    coverPhoto?: File;
  }>({});

  const dpInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setFormData({
        name: userdata.name || "",
        bio: userdata.bio || "",
        location: userdata.location || "",
        website: userdata.website || "",
        displayPicture: userdata.displayPicture || "",
        coverPhoto: userdata.coverPhoto || "",
        username: userdata.username || "",
        dob: userdata.dob ? userdata.dob.slice(0, 10) : "",
        isPrivate: !!userdata.isPrivate,
        theme: userdata.theme || "system",
      });
    }, 100);
    return () => clearTimeout(t);
  }, [userdata]);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const uploadImage = async (file: File, type: "displayPicture" | "coverPhoto") => {
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: S3UploadBody({
          filename: file.name,
          contentType: file.type,
          bucketName: type === "displayPicture" ? BUCKETNAME.PROFILE : BUCKETNAME.BANNER,
        }),
      });
      if (!res.ok) throw new Error("Failed to get upload URL");

      // The API returns a presigned POST, so the file must be sent to S3 itself.
      const { url, fields } = await res.json();
      const body = new FormData();
      Object.entries(fields as Record<string, string>).forEach(([k, v]) => body.append(k, v));
      body.append("file", file);

      const uploadRes = await fetch(url, { method: "POST", body });
      if (!uploadRes.ok) throw new Error("Upload failed");

      return url + fields.key;
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  const handleImageChange = async (
    e: ChangeEvent<HTMLInputElement>,
    type: "displayPicture" | "coverPhoto"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      toast.error("File too large", {
        description: "Please upload an image smaller than 5MB",
      });
      return;
    }

    // Store the file for later upload
    setSelectedFiles((prev) => ({
      ...prev,
      [type]: file,
    }));

    // Create a temporary URL for preview
    const previewUrl = URL.createObjectURL(file);
    setFormData((prev) => ({
      ...prev,
      [type]: previewUrl,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let displayPictureUrl = formData.displayPicture;
      let coverPhotoUrl = formData.coverPhoto;

      // Only upload if new files were selected
      if (selectedFiles.displayPicture) {
        const uploaded = await uploadImage(selectedFiles.displayPicture, "displayPicture");
        if (!uploaded) throw new Error("Profile picture upload failed");
        displayPictureUrl = uploaded;
      }
      if (selectedFiles.coverPhoto) {
        const uploaded = await uploadImage(selectedFiles.coverPhoto, "coverPhoto");
        if (!uploaded) throw new Error("Cover photo upload failed");
        coverPhotoUrl = uploaded;
      }

      const res = await fetch("/api/user/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          displayPicture: displayPictureUrl.startsWith("blob:") ? "" : displayPictureUrl,
          coverPhoto: coverPhotoUrl.startsWith("blob:") ? "" : coverPhotoUrl,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Update failed");
      }

      const data = await res.json();
      dispatch(updateUserData(data.data));
      setTheme(formData.theme);

      toast.success("Profile updated successfully");
      router.push(`/${data.data?.username || userdata.username}`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Error updating profile");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen max-h-screen w-full flex-1 overflow-auto">
      <div className="sticky top-0 z-10 flex w-full items-center gap-4 px-3 py-2 backdrop-blur-lg">
        <ArrowLeft onClick={() => navigate()} className="size-6 cursor-pointer" />
        <h1 className="text-xl font-bold">Edit Profile</h1>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Cover Photo */}
        <div className="relative mb-16 h-48 w-full bg-gray-200 dark:bg-gray-800">
          <Avatar
            className="size-full rounded-none object-cover"
            data-s3-url={formData.coverPhoto || userdata.coverPhoto}
          >
            <AvatarImage
              className="aspect-auto size-full rounded-none object-cover"
              src={formData.coverPhoto || userdata.coverPhoto}
            />
            <AvatarFallback className="size-full rounded-none">
              {userdata.firstname?.[0]}
              {userdata.lastname?.[0]}
            </AvatarFallback>
          </Avatar>
          <Button
            type="button"
            variant="ghost"
            className="absolute inset-0 flex size-full items-center justify-center bg-black/30 opacity-60 hover:opacity-100"
            onClick={() => coverInputRef.current?.click()}
          >
            <Camera className="size-6" />
          </Button>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleImageChange(e, "coverPhoto")}
          />

          {/* Profile Picture */}
          <div className="absolute -bottom-12 left-4">
            <div className="relative size-24">
              <Avatar
                className="size-24 border-4 border-white dark:border-black"
                data-s3-url={formData.displayPicture || userdata.displayPicture}
              >
                <AvatarImage src={formData.displayPicture || userdata.displayPicture} />
                <AvatarFallback>
                  {userdata.firstname?.[0]}
                  {userdata.lastname?.[0]}
                </AvatarFallback>
              </Avatar>
              <Button
                type="button"
                variant="ghost"
                className="absolute inset-0 flex h-full items-center justify-center rounded-full bg-black/30 opacity-60 hover:opacity-100"
                onClick={() => dpInputRef.current?.click()}
              >
                <Camera className="size-5" />
              </Button>
              <input
                ref={dpInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageChange(e, "displayPicture")}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 px-2">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              maxLength={50}
            />
          </div>

          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              maxLength={20}
              pattern="[A-Za-z0-9_]{3,20}"
              title="3-20 letters, numbers or underscores"
              autoCapitalize="none"
            />
            <p className="mt-1 text-xs text-gray-500">
              You can change your username once every 30 days.
            </p>
          </div>

          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              maxLength={160}
            />
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              value={formData.location}
              readOnly
              onClick={() => setLocationOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setLocationOpen(true);
                }
              }}
              className="cursor-pointer"
              placeholder="Select location"
            />
            <LocationPicker
              key={locationOpen ? "open" : "closed"}
              open={locationOpen}
              onOpenChange={setLocationOpen}
              onSelect={(loc) =>
                setFormData((prev) => ({ ...prev, location: loc.name.slice(0, 30) }))
              }
              initial={formData.location ? { name: formData.location } : null}
            />
          </div>

          <div>
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              name="website"
              type="url"
              value={formData.website}
              onChange={handleInputChange}
              placeholder="https://"
            />
          </div>

          <div>
            <Label htmlFor="dob">Date of birth</Label>
            <Input
              id="dob"
              name="dob"
              type="date"
              value={formData.dob}
              onChange={handleInputChange}
              max={new Date().toISOString().slice(0, 10)}
            />
          </div>

          <div>
            <Label htmlFor="theme">Theme</Label>
            <select
              id="theme"
              name="theme"
              value={formData.theme}
              onChange={handleInputChange}
              className="h-10 w-full rounded-md border bg-transparent px-3 text-sm dark:bg-zinc-900"
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          <label className="flex cursor-pointer items-start gap-3" htmlFor="isPrivate">
            <input
              id="isPrivate"
              name="isPrivate"
              type="checkbox"
              checked={formData.isPrivate}
              onChange={handleInputChange}
              className="mt-1 size-4"
            />
            <span>
              <span className="block text-sm font-medium">Private account</span>
              <span className="block text-xs text-gray-500">
                Only you can see your followers and following lists.
              </span>
            </span>
          </label>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
