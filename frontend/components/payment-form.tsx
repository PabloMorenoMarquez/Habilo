"use client"

import { useState } from "react"
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js"
import { Button } from "@/components/ui/button"
import { Loader } from "lucide-react"

export default function PaymentForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setProcesando(true)
    setError(null)

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    })

    if (confirmError) {
      setError(confirmError.message ?? "No se pudo procesar el pago")
      setProcesando(false)
      return
    }

    if (paymentIntent && (paymentIntent.status === "requires_capture" || paymentIntent.status === "succeeded")) {
      onSuccess()
    } else {
      setError("El pago no se pudo autorizar. Prueba con otra tarjeta.")
    }

    setProcesando(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: "accordion" }} />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={!stripe || procesando} className="w-full">
        {procesando ? (
          <>
            <Loader className="animate-spin" size={16} /> Procesando...
          </>
        ) : (
          "Confirmar y pagar"
        )}
      </Button>
    </form>
  )
}