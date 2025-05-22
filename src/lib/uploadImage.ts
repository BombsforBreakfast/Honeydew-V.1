import { supabase } from './supabaseclient'

export async function uploadProfileImage(file: File, userId: string): Promise<string> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}.${fileExt}`
  const filePath = `${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('profile-pictures')
    .upload(filePath, file, {
      upsert: true,
    })

  if (uploadError) {
    console.error('Upload failed:', uploadError)
    throw uploadError
  }

  const { data } = supabase.storage.from('profile-pictures').getPublicUrl(filePath)
  return data.publicUrl
}
