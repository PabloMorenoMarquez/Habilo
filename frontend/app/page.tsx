import { redirect } from "next/navigation"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  redirect(token ? `/login?token=${encodeURIComponent(token)}` : "/home")
}
