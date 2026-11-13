import fs from "fs"
import path from "path"
import matter from "gray-matter"
import { marked } from "marked"

export type BlogPost = {
  slug: string
  titulo: string
  descripcion: string
  fecha: string
  autor: string
  categoria: string
  contenido: string
  tiempoLectura: number
}

const DIRECTORIO = path.join(process.cwd(), "content", "blog")
const CAMPOS = ["titulo", "slug", "descripcion", "fecha", "autor", "categoria"] as const
const PALABRAS_POR_MINUTO = 200

function contarPalabras(markdown: string): number {
  const texto = markdown
    // Enlaces e imágenes: conserva el texto visible y descarta la URL.
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#*`>|_~-]/g, " ")
  return texto.split(/\s+/).filter((palabra) => /[\p{L}\p{N}]/u.test(palabra)).length
}

function cargarPosts(): BlogPost[] {
  const archivos = fs.readdirSync(DIRECTORIO).filter((nombre) => nombre.endsWith(".md"))
  const vistos = new Map<string, string>()

  const posts = archivos.map((archivo) => {
    const { data, content } = matter(fs.readFileSync(path.join(DIRECTORIO, archivo), "utf8"))

    for (const campo of CAMPOS) {
      if (typeof data[campo] !== "string" || data[campo].trim() === "") {
        throw new Error(`Blog: falta el campo "${campo}" en ${archivo}`)
      }
    }

    const slug: string = data.slug
    const repetido = vistos.get(slug)
    if (repetido) {
      throw new Error(`Blog: el slug "${slug}" está repetido en ${repetido} y ${archivo}`)
    }
    vistos.set(slug, archivo)

    return {
      slug,
      titulo: data.titulo,
      descripcion: data.descripcion,
      fecha: data.fecha,
      autor: data.autor,
      categoria: data.categoria,
      contenido: marked.parse(content, { gfm: true, async: false }) as string,
      tiempoLectura: Math.max(1, Math.ceil(contarPalabras(content) / PALABRAS_POR_MINUTO)),
    }
  })

  return posts.sort(
    (a, b) => b.fecha.localeCompare(a.fecha) || a.titulo.localeCompare(b.titulo, "es")
  )
}

export function getAllPosts(): BlogPost[] {
  return cargarPosts()
}

export function getPostBySlug(slug: string): BlogPost | null {
  return cargarPosts().find((post) => post.slug === slug) ?? null
}

export function getSlugs(): string[] {
  return cargarPosts().map((post) => post.slug)
}

const FORMATO_FECHA = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})

export function formatFecha(fecha: string): string {
  return FORMATO_FECHA.format(new Date(`${fecha}T00:00:00Z`))
}
