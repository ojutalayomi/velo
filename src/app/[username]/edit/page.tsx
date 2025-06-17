'use client'
import { useState, useRef, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Camera, Loader2 } from 'lucide-react'
import { useUser } from '@/app/providers/UserProvider'
import { toast } from '@/hooks/use-toast'
import { useNavigateWithHistory } from '@/hooks/useNavigateWithHistory'
import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'

export default function EditProfile() {
  const userdata = useSelector((state: RootState) => state.user.userdata)
  const router = useRouter()
  const navigate = useNavigateWithHistory()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: userdata.name || '',
    bio: userdata.bio || '',
    location: userdata.location || '',
    website: userdata.website || '',
    displayPicture: userdata.displayPicture || '',
    coverPhoto: userdata.coverPhoto || ''
  })
  
  const dpInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const uploadImage = async (file: File, type: 'displayPicture' | 'coverPhoto') => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)
    
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      
      if (!res.ok) throw new Error('Upload failed')
      
      const data = await res.json()
      return data.url
    } catch (error) {
      console.error(error)
      toast({
        title: "Error uploading image",
        variant: "destructive"
      })
      return null
    }
  }

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>, type: 'displayPicture' | 'coverPhoto') => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive"
      })
      return
    }

    const url = await uploadImage(file, type)
    if (url) {
      setFormData(prev => ({
        ...prev,
        [type]: url
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await fetch('/api/user/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!res.ok) throw new Error('Update failed')

      toast({
        title: "Profile updated successfully"
      })
      router.push(`/${userdata.username}`)
    } catch (error) {
      console.error(error)
      toast({
        title: "Error updating profile",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full min-h-screen dark:bg-black">
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center gap-4 mb-6">
          <ArrowLeft
            onClick={() => navigate()}
            className="cursor-pointer size-6"
          />
          <h1 className="text-2xl font-bold">Edit Profile</h1>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Cover Photo */}
          <div className="relative h-48 w-full bg-gray-200 dark:bg-gray-800 mb-16">
            {formData.coverPhoto && (
              <img 
                src={formData.coverPhoto} 
                alt="Cover"
                className="w-full h-full object-cover"
              />
            )}
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
              onChange={(e) => handleImageChange(e, 'coverPhoto')}
            />

            {/* Profile Picture */}
            <div className="absolute -bottom-12 left-4">
              <div className="relative w-24 h-24">
                <Avatar className="w-24 h-24 border-4 border-white dark:border-black">
                  <AvatarImage src={formData.displayPicture} />
                  <AvatarFallback>{userdata.firstname?.[0]}{userdata.lastname?.[0]}</AvatarFallback>
                </Avatar>
                <Button
                  type="button"
                  variant="ghost"
                  className="absolute inset-0 rounded-full flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100"
                  onClick={() => dpInputRef.current?.click()}
                >
                  <Camera className="size-5" />
                </Button>
                <input
                  ref={dpInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageChange(e, 'displayPicture')}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
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

            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
