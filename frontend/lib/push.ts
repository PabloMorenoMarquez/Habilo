import { apiFetch } from "@/lib/api"

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/")

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

export async function suscribirseAPush(): Promise<boolean> {
  try {
    console.log("=== INICIO SUSCRIPCIÓN PUSH ===")

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.error("Push no soportado por el navegador")
      return false
    }

    console.log("PushManager disponible")

    const permiso = await Notification.requestPermission()
    console.log("Permiso de notificaciones:", permiso)

    if (permiso !== "granted") {
      console.error("Permiso no concedido")
      return false
    }

    const registration = await navigator.serviceWorker.ready

    console.log("Service Worker activo:", registration.active?.state)
    console.log("Service Worker scope:", registration.scope)

    const suscripcionExistente =
      await registration.pushManager.getSubscription()

    console.log(
      "Suscripción existente:",
      suscripcionExistente
    )

    if (suscripcionExistente) {
      console.log("Ya existe una suscripción, reutilizándola")

      const json = suscripcionExistente.toJSON()

      await apiFetch("/suscripciones-push/", {
        method: "POST",
        body: JSON.stringify({
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        }),
      })

      console.log("Suscripción existente enviada al backend")
      return true
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

    console.log("VAPID pública:", publicKey)
    console.log("Longitud VAPID:", publicKey?.length)

    if (!publicKey) {
      console.error("NEXT_PUBLIC_VAPID_PUBLIC_KEY no está definida")
      return false
    }

    const applicationServerKey = urlBase64ToUint8Array(publicKey)

    console.log(
      "Bytes applicationServerKey:",
      applicationServerKey.length
    )

    const suscripcion =
      await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array( process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY! ) as BufferSource,
      })

    console.log("SUSCRIPCIÓN CREADA:", suscripcion)

    const json = suscripcion.toJSON()

    console.log("Endpoint:", json.endpoint)
    console.log("p256dh:", json.keys?.p256dh)
    console.log("auth:", json.keys?.auth)

    await apiFetch("/suscripciones-push/", {
      method: "POST",
      body: JSON.stringify({
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
      }),
    })

    console.log("Suscripción guardada correctamente en backend")
    console.log("=== SUSCRIPCIÓN PUSH OK ===")

    return true
  } catch (e) {
    console.error("=== ERROR SUSCRIPCIÓN PUSH ===", e)
    console.error("name:", (e as Error).name)
    console.error("message:", (e as Error).message)
    console.error("stack:", (e as Error).stack)

    return false
  }
}