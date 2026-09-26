'use client'

import { useState, useRef } from 'react'
import { Loader2, Upload, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from './Avatar'
import { useToast } from './Toast'

interface AvatarUploaderProps {
  url: string | null
  name: string
  onUpload: (url: string | null) => Promise<void>
}

export function AvatarUploader({ url, name, onUpload }: AvatarUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true)
      const file = event.target.files?.[0]
      if (!file) return

      // Validate size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('Image must be less than 2MB')
      }

      const fileExt = file.name.split('.').pop()
      const filePath = `${Math.random().toString(36).substring(2)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      await onUpload(data.publicUrl)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleRemove() {
    try {
      setUploading(true)
      await onUpload(null)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar url={url} name={name} size="lg" className="h-16 w-16 text-lg" />
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 rounded-md bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-200 disabled:opacity-50 transition-colors"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            Upload Photo
          </button>
          {url && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading}
              className="flex items-center gap-2 rounded-md bg-danger-50 px-3 py-1.5 text-sm font-medium text-danger-700 hover:bg-danger-100 disabled:opacity-50 transition-colors"
            >
              <X size={16} />
              Remove
            </button>
          )}
        </div>
        <p className="text-xs text-neutral-500">JPG, GIF or PNG. Max size of 2MB.</p>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/gif, image/webp"
        className="hidden"
      />
    </div>
  )
}
