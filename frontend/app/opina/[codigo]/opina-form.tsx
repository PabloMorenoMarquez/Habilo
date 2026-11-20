"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { CheckCircle, Loader, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Logo } from "@/components/brand/logo"
import { ApiError, crearResenaAlumno, getFormularioResena, type CrearResenaAlumnoInput } from "@/lib/api"
import { cn } from "@/lib/utils"

type Relacion = CrearResenaAlumnoInput["relacion"]
type Antiguedad = CrearResenaAlumnoInput["antiguedad"]

// Mismos límites que CrearResenaAlumno en el backend.
const COMENTARIO_MIN = 20
const COMENTARIO_MAX = 1000
const NOMBRE_MAX = 40
const CONTACTO_MAX = 120

const RELACIONES: { valor: Relacion; texto: string }[] = [
  { valor: "alumno", texto: "Alumno/a" },
  { valor: "padre_madre", texto: "Madre o padre de alumno" },
]

const ANTIGUEDADES: { valor: Antiguedad; texto: string }[] = [
  { valor: "menos_3_meses", texto: "Menos de 3 meses" },
  { valor: "3_12_meses", texto: "De 3 a 12 meses" },
  { valor: "mas_1_ano", texto: "Más de 1 año" },
]

const TEXTO_PUNTUACION = ["", "Mal", "Regular", "Bien", "Muy bien", "Excelente"]

interface Errores {
  puntuacion?: string
  comentario?: string
  autorNombre?: string
  relacion?: string
  antiguedad?: string
  contacto?: string
  consentimiento?: string
}

// Elemento que recibe el foco cuando ese campo es el primero con error.
const CAMPO_DE_ERROR: Record<keyof Errores, string> = {
  puntuacion: "opina-estrella-1",
  comentario: "opina-comentario",
  autorNombre: "opina-nombre",
  relacion: "opina-relacion-alumno",
  antiguedad: "opina-antiguedad-menos_3_meses",
  contacto: "opina-contacto",
  consentimiento: "opina-consentimiento",
}

const OPCION_CLASE =
  "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border px-3 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"

type Carga = { estado: "cargando" } | { estado: "invalido" } | { estado: "error" } | { estado: "listo"; nombre: string }

function ErrorCampo({ id, texto }: { id: string; texto?: string }) {
  if (!texto) return null
  return (
    <p id={id} role="alert" className="text-sm text-destructive">
      {texto}
    </p>
  )
}

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-background px-5 pb-28 pt-8 sm:pt-14">
      <div className="mx-auto w-full max-w-md space-y-8">
        <Link href="/" aria-label="Habilo, ir al inicio" className="inline-block text-2xl">
          <Logo />
        </Link>
        {children}
      </div>
    </main>
  )
}

export default function OpinaForm({ codigo }: { codigo: string }) {
  const [carga, setCarga] = useState<Carga>({ estado: "cargando" })
  const [intentoCarga, setIntentoCarga] = useState(0)

  const [puntuacion, setPuntuacion] = useState(0)
  const [comentario, setComentario] = useState("")
  const [autorNombre, setAutorNombre] = useState("")
  const [relacion, setRelacion] = useState<Relacion | "">("")
  const [antiguedad, setAntiguedad] = useState<Antiguedad | "">("")
  const [contacto, setContacto] = useState("")
  const [consentimiento, setConsentimiento] = useState(false)
  const [website, setWebsite] = useState("")
  const [errores, setErrores] = useState<Errores>({})
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)
  const graciasRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    let vigente = true
    getFormularioResena(codigo)
      .then((datos) => {
        if (vigente) setCarga({ estado: "listo", nombre: datos.nombre_profesor })
      })
      .catch((err) => {
        if (!vigente) return
        setCarga(err instanceof ApiError && err.status === 404 ? { estado: "invalido" } : { estado: "error" })
      })
    return () => {
      vigente = false
    }
  }, [codigo, intentoCarga])

  useEffect(() => {
    if (enviado) graciasRef.current?.focus()
  }, [enviado])

  const limpiarError = (campo: keyof Errores) => {
    setErrores((previos) => {
      if (!previos[campo]) return previos
      const siguientes = { ...previos }
      delete siguientes[campo]
      return siguientes
    })
  }

  if (carga.estado === "cargando") {
    return (
      <Marco>
        <div className="flex items-center gap-3 text-muted-foreground" role="status">
          <Loader size={18} className="animate-spin" aria-hidden="true" />
          Cargando…
        </div>
      </Marco>
    )
  }

  if (carga.estado === "invalido") {
    return (
      <Marco>
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-foreground">Este enlace no es válido</h1>
          <p className="text-muted-foreground">
            Puede que esté incompleto o que el profesor lo haya cambiado. Pídele que te lo vuelva a enviar.
          </p>
        </div>
      </Marco>
    )
  }

  if (carga.estado === "error") {
    return (
      <Marco>
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-foreground">No se pudo cargar el formulario</h1>
          <p className="text-muted-foreground">Revisa tu conexión e inténtalo de nuevo.</p>
          <Button
            variant="outline"
            onClick={() => {
              setCarga({ estado: "cargando" })
              setIntentoCarga((n) => n + 1)
            }}
          >
            Reintentar
          </Button>
        </div>
      </Marco>
    )
  }

  const nombre = carga.nombre
  const nombreDePila = nombre.trim().split(/\s+/)[0] || nombre

  if (enviado) {
    return (
      <Marco>
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <CheckCircle size={32} className="text-primary" aria-hidden="true" />
          <h1 ref={graciasRef} tabIndex={-1} className="text-2xl font-bold text-foreground outline-none">
            Opinión enviada
          </h1>
          <p role="status" className="leading-relaxed text-foreground">
            Gracias. Revisaremos tu opinión y la publicaremos en el perfil de {nombre} en unos días.
          </p>
        </div>
      </Marco>
    )
  }

  const validar = (): Errores => {
    const nuevos: Errores = {}
    if (puntuacion < 1 || puntuacion > 5) nuevos.puntuacion = "Elige de 1 a 5 estrellas."
    const largo = comentario.trim().length
    if (largo < COMENTARIO_MIN) {
      nuevos.comentario = `Cuéntanos un poco más (mínimo ${COMENTARIO_MIN} caracteres).`
    } else if (largo > COMENTARIO_MAX) {
      nuevos.comentario = `Máximo ${COMENTARIO_MAX} caracteres.`
    }
    if (!autorNombre.trim()) nuevos.autorNombre = "Escribe cómo quieres que aparezca tu nombre."
    if (!relacion) nuevos.relacion = "Indica quién escribe la opinión."
    if (!antiguedad) nuevos.antiguedad = "Indica cuánto tiempo lleváis de clases."
    if (contacto.trim().length < 3) nuevos.contacto = "Indica un email o teléfono."
    if (!consentimiento) nuevos.consentimiento = "Acepta que publiquemos tu opinión para poder enviarla."
    return nuevos
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorEnvio(null)
    const nuevosErrores = validar()
    setErrores(nuevosErrores)
    const primerError = (Object.keys(nuevosErrores) as (keyof Errores)[])[0]
    if (primerError) {
      // En móvil los errores quedan muy arriba: llevamos al primero.
      document.getElementById(CAMPO_DE_ERROR[primerError])?.focus()
      return
    }
    if (!relacion || !antiguedad) return

    setEnviando(true)
    try {
      await crearResenaAlumno(codigo, {
        puntuacion,
        comentario: comentario.trim(),
        autor_nombre: autorNombre.trim(),
        relacion,
        antiguedad,
        contacto: contacto.trim(),
        consentimiento: true,
        website,
      })
      setEnviado(true)
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setErrorEnvio(err.message)
      } else if (err instanceof ApiError && err.status === 429) {
        setErrorEnvio("Se han enviado demasiadas opiniones desde esta conexión. Inténtalo dentro de un rato.")
      } else if (err instanceof ApiError && err.status === 404) {
        setErrorEnvio("Este enlace ya no es válido. Pide al profesor que te lo vuelva a enviar.")
      } else {
        setErrorEnvio("No se pudo enviar. Inténtalo de nuevo.")
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Marco>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold leading-tight text-foreground text-balance">
          ¿Qué tal las clases con {nombre}?
        </h1>
        <p className="text-muted-foreground">
          Tu opinión ayuda a otras familias a elegir profesor. Tardas un par de minutos y no hace falta crear
          cuenta.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <div
          role="group"
          aria-labelledby="opina-puntuacion-titulo"
          aria-describedby={errores.puntuacion ? "opina-puntuacion-error" : undefined}
          className="space-y-2"
        >
          <p id="opina-puntuacion-titulo" className="text-sm font-medium leading-none">
            Puntuación
          </p>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => {
              const llena = n <= puntuacion
              return (
                <button
                  key={n}
                  id={`opina-estrella-${n}`}
                  type="button"
                  aria-label={n === 1 ? "1 estrella" : `${n} estrellas`}
                  aria-pressed={puntuacion === n}
                  onClick={() => {
                    setPuntuacion(n)
                    limpiarError("puntuacion")
                  }}
                  className="-ml-1 grid size-11 place-items-center rounded-md outline-none transition-transform duration-150 ease-out first:ml-0 focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-90"
                >
                  <Star
                    size={30}
                    aria-hidden="true"
                    className={cn(
                      "transition-colors duration-150",
                      llena ? "fill-amber-400 text-amber-400" : "fill-transparent text-muted-foreground/50"
                    )}
                  />
                </button>
              )
            })}
            <span className="ml-2 text-sm text-muted-foreground" aria-live="polite">
              {TEXTO_PUNTUACION[puntuacion]}
            </span>
          </div>
          <ErrorCampo id="opina-puntuacion-error" texto={errores.puntuacion} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="opina-comentario">Tu opinión</Label>
          <Textarea
            id="opina-comentario"
            value={comentario}
            onChange={(event) => {
              setComentario(event.target.value)
              limpiarError("comentario")
            }}
            rows={5}
            maxLength={COMENTARIO_MAX}
            placeholder="Cómo explica, qué tal la puntualidad, si se nota el progreso…"
            aria-invalid={Boolean(errores.comentario)}
            aria-describedby={cn("opina-comentario-cuenta", errores.comentario && "opina-comentario-error")}
          />
          <p id="opina-comentario-cuenta" className="text-right text-xs text-muted-foreground">
            {comentario.trim().length}/{COMENTARIO_MAX}
          </p>
          <ErrorCampo id="opina-comentario-error" texto={errores.comentario} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="opina-nombre">Tu nombre, tal como se publicará</Label>
          <Input
            id="opina-nombre"
            value={autorNombre}
            onChange={(event) => {
              setAutorNombre(event.target.value)
              limpiarError("autorNombre")
            }}
            maxLength={NOMBRE_MAX}
            autoComplete="off"
            placeholder="Marta G."
            aria-invalid={Boolean(errores.autorNombre)}
            aria-describedby={cn("opina-nombre-ayuda", errores.autorNombre && "opina-nombre-error")}
          />
          <p id="opina-nombre-ayuda" className="text-xs text-muted-foreground">
            Puedes poner solo tu nombre y la inicial del apellido.
          </p>
          <ErrorCampo id="opina-nombre-error" texto={errores.autorNombre} />
        </div>

        <fieldset className="space-y-3">
          <legend className="mb-3 text-sm font-medium leading-none">¿Quién escribe?</legend>
          <RadioGroup
            value={relacion}
            onValueChange={(valor) => {
              setRelacion(valor as Relacion)
              limpiarError("relacion")
            }}
            aria-invalid={Boolean(errores.relacion)}
            aria-describedby={errores.relacion ? "opina-relacion-error" : undefined}
            className="gap-2"
          >
            {RELACIONES.map((opcion) => (
              <Label
                key={opcion.valor}
                htmlFor={`opina-relacion-${opcion.valor}`}
                className={cn(OPCION_CLASE, errores.relacion && "border-destructive")}
              >
                <RadioGroupItem id={`opina-relacion-${opcion.valor}`} value={opcion.valor} />
                {opcion.texto}
              </Label>
            ))}
          </RadioGroup>
          <ErrorCampo id="opina-relacion-error" texto={errores.relacion} />
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="mb-3 text-sm font-medium leading-none">
            ¿Cuánto tiempo lleváis de clases con {nombreDePila}?
          </legend>
          <RadioGroup
            value={antiguedad}
            onValueChange={(valor) => {
              setAntiguedad(valor as Antiguedad)
              limpiarError("antiguedad")
            }}
            aria-invalid={Boolean(errores.antiguedad)}
            aria-describedby={errores.antiguedad ? "opina-antiguedad-error" : undefined}
            className="gap-2"
          >
            {ANTIGUEDADES.map((opcion) => (
              <Label
                key={opcion.valor}
                htmlFor={`opina-antiguedad-${opcion.valor}`}
                className={cn(OPCION_CLASE, errores.antiguedad && "border-destructive")}
              >
                <RadioGroupItem id={`opina-antiguedad-${opcion.valor}`} value={opcion.valor} />
                {opcion.texto}
              </Label>
            ))}
          </RadioGroup>
          <ErrorCampo id="opina-antiguedad-error" texto={errores.antiguedad} />
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="opina-contacto">Tu email o teléfono</Label>
          <Input
            id="opina-contacto"
            value={contacto}
            onChange={(event) => {
              setContacto(event.target.value)
              limpiarError("contacto")
            }}
            maxLength={CONTACTO_MAX}
            autoComplete="email"
            aria-invalid={Boolean(errores.contacto)}
            aria-describedby={cn("opina-contacto-ayuda", errores.contacto && "opina-contacto-error")}
          />
          <p id="opina-contacto-ayuda" className="text-xs text-muted-foreground">
            No se publica. Solo lo ve Habilo, por si necesitamos confirmar que la opinión es tuya, y lo borramos a
            los 90 días.
          </p>
          <ErrorCampo id="opina-contacto-error" texto={errores.contacto} />
        </div>

        <div className="space-y-2 rounded-xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="opina-consentimiento"
              checked={consentimiento}
              onCheckedChange={(valor) => {
                setConsentimiento(valor === true)
                limpiarError("consentimiento")
              }}
              aria-invalid={Boolean(errores.consentimiento)}
              aria-describedby={errores.consentimiento ? "opina-consentimiento-error" : undefined}
            />
            <Label htmlFor="opina-consentimiento" className="text-sm font-normal leading-snug">
              Acepto que se publique mi opinión, con el nombre que he escrito, en el perfil de {nombre}.
            </Label>
          </div>
          <p className="pl-7 text-xs text-muted-foreground">
            Más información en la{" "}
            <Link href="/legal/privacidad" className="underline underline-offset-2 hover:text-foreground">
              política de privacidad
            </Link>
            .
          </p>
          <div className="pl-7">
            <ErrorCampo id="opina-consentimiento-error" texto={errores.consentimiento} />
          </div>
        </div>

        <div className="hidden" aria-hidden="true">
          <Input
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </div>

        {errorEnvio && (
          <p role="alert" className="text-sm text-destructive">
            {errorEnvio}
          </p>
        )}

        <Button type="submit" className="h-12 w-full" disabled={enviando} aria-busy={enviando}>
          {enviando ? (
            <>
              <Loader size={18} className="animate-spin" aria-hidden="true" />
              <span className="sr-only">Enviando…</span>
            </>
          ) : (
            "Enviar opinión"
          )}
        </Button>
      </form>
    </Marco>
  )
}
