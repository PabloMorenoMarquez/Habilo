const API_URL =
  process.env.API_URL_INTERNAL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000"

export async function fetchPublic<T>(path: string, revalidate = 300): Promise<T | null> {
  const { status, data } = await fetchPublicResponse<T>(path, revalidate)
  return status >= 200 && status < 300 ? data : null
}

export async function fetchPublicResponse<T>(
  path: string,
  revalidate = 300
): Promise<{ status: number; data: T | null }> {
  try {
    const response = await fetch(`${API_URL}${path}`, { next: { revalidate } })
    const data = response.ok ? ((await response.json()) as T) : null
    return { status: response.status, data }
  } catch {
    return { status: 0, data: null }
  }
}
