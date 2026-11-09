import { redirect } from "next/navigation"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; ref?: string }>
}) {
  const { token, ref } = await searchParams

  const query = [
    token ? `token=${encodeURIComponent(token)}` : null,
    ref ? `ref=${encodeURIComponent(ref)}` : null,
  ]
    .filter(Boolean)
    .join("&")

  redirect(query ? `/login?${query}` : "/home")
}
