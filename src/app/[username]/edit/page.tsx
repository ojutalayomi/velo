"use client";
import { useState, useRef, ChangeEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigateWithHistory } from "@/hooks/useNavigateWithHistory";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import LeftSideBar from "@/components/LeftSideBar";
import { updateUserData } from "@/redux/userSlice";
import { useDispatch } from "react-redux";

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
    setFormData({
      name: userdata.name || "",
      bio: userdata.bio || "",
      location: userdata.location || "",
      website: userdata.website || "",
      displayPicture: userdata.displayPicture || "",
      coverPhoto: userdata.coverPhoto || "",
    });
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
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          bucketName: "profile-display-images",
        }),
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      return data.url;
    } catch (error) {
      console.error(error);
      toast({
        title: "Error uploading image",
        variant: "destructive",
      });
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
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
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

      toast({
        title: "Profile updated successfully",
      });
      router.push(`/${userdata.username}`);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error updating profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex h-screen max-h-screen dark:bg-black overflow-auto">
      <div className="md:w-3/5 flex-1 h-screen max-h-screen dark:bg-black overflow-auto">
        <div className="flex backdrop-blur-lg top-0 sticky gap-4 items-center z-10 w-full px-3 py-2">
          <ArrowLeft onClick={() => navigate()} className="cursor-pointer size-6" />
          <h1 className="text-xl font-bold">Edit Profile</h1>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Cover Photo */}
          <div className="relative h-48 w-full bg-gray-200 dark:bg-gray-800 mb-16">
            <Avatar
              className="h-full w-full object-cover rounded-none"
              data-s3-url={formData.coverPhoto || userdata.coverPhoto}
            >
              <AvatarImage
                className="w-full h-full rounded-none object-cover aspect-auto"
                src={formData.coverPhoto || userdata.coverPhoto}
              />
              <AvatarFallback className="w-full h-full rounded-none">
                {userdata.firstname?.[0]}
                {userdata.lastname?.[0]}
              </AvatarFallback>
            </Avatar>
            <Button
              type="button"
              variant="ghost"
              className="absolute inset-0 w-full h-full flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100"
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
              <div className="relative w-24 h-24">
                <Avatar
                  className="w-24 h-24 border-4 border-white dark:border-black"
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
                  className="absolute inset-0 h-full rounded-full flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100"
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </form>
      </div>
      <LeftSideBar />
    </div>
  );
}
