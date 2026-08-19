import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function subirArchivo(bucket: string, path: string, token: string, file: File): Promise<boolean> {
  const { error } = await supabase.storage.from(bucket).uploadToSignedUrl(path, token, file)
  if (error) {
    console.error(`Error subiendo archivo a ${bucket}:`, error)
    return false
  }
  return true
}

/**
 * Sube un archivo directamente a Supabase Storage usando una signed URL
 * generada por el backend (POST /servicio/{id}/imagen/signed-url).
 * Devuelve la URL pública final, o null si falla.
 */
export async function subirImagenServicio(path: string, token: string, file: File): Promise<string | null> {
  const ok = await subirArchivo("servicios", path, token, file)
  if (!ok) return null
  const { data } = supabase.storage.from("servicios").getPublicUrl(path)
  return data.publicUrl
}

/**
 * Sube el documento de verificación de identidad al bucket privado `documentos`.
 * No devuelve URL pública (el bucket no es público) — solo confirma si la subida fue bien.
 */
export async function subirDocumentoProveedor(path: string, token: string, file: File): Promise<boolean> {
  return subirArchivo("documentos", path, token, file)
}