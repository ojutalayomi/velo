"use client";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useRef, ChangeEvent, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    location: "",
    website: "",
    displayPicture: "",
    coverPhoto: "",
  });

  const [selectedFiles, setSelectedFiles] = useState<{
    displayPicture?: File;
    coverPhoto?: File;
  }>({});

  const dpInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => {
      setFormData({
        name: userdata.name || "",
        bio: userdata.bio || "",
        location: userdata.location || "",
        website: userdata.website || "",
        displayPicture: userdata.displayPicture || "",
        coverPhoto: userdata.coverPhoto || "",
      });
    }, 100)
  }, [userdata]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
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

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      return data.url;
    } catch (error) {
      console.error(error);
      toast.error("Error uploading image");
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
        displayPictureUrl = await uploadImage(selectedFiles.displayPicture, "displayPicture");
      }
      if (selectedFiles.coverPhoto) {
        coverPhotoUrl = await uploadImage(selectedFiles.coverPhoto, "coverPhoto");
      }

      const res = await fetch("/api/user/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          displayPicture: displayPictureUrl,
          coverPhoto: coverPhotoUrl,
        }),
      });

      if (!res.ok) throw new Error("Update failed");

      const data = await res.json();
      dispatch(updateUserData(data.data));

      toast.success("Profile updated successfully");
      router.push(`/${userdata.username}`);
    } catch (error) {
      console.error(error);
      toast.error("Error updating profile");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen max-h-screen w-full flex-1 overflow-auto dark:bg-black">
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
            className="absolute inset-0 flex size-full items-center justify-center bg-black/30 opacity-0 hover:opacity-100"
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
                className="absolute inset-0 flex h-full items-center justify-center rounded-full bg-black/30 opacity-0 hover:opacity-100"
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
              onChange={handleInputChange}
              maxLength={30}
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
