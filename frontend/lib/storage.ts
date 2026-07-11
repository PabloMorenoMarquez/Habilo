import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Sube un archivo directamente a Supabase Storage usando una signed URL
 * generada por el backend (POST /servicio/{id}/imagen/signed-url).
 * Devuelve la URL pública final, o null si falla.
 */
export async function subirImagenServicio(
  path: string,
  token: string,
  file: File
): Promise<string | null> {
  const { error } = await supabase.storage
    .from("servicios")
    .uploadToSignedUrl(path, token, file)

  if (error) {
    console.error("Error subiendo imagen:", error)
    return null
  }

  const { data } = supabase.storage.from("servicios").getPublicUrl(path)
  return data.publicUrl
}