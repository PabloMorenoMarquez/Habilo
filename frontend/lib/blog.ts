import fs from "fs"
import path from "path"
import matter from "gray-matter"
import { Marked } from "marked"

export type BlogSeccion = { id: string; titulo: string }

export type BlogPost = {
  slug: string
  titulo: string
  descripcion: string
  fecha: string
  autor: string
  categoria: string
  contenido: string
  indice: BlogSeccion[]
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

function crearId(titulo: string): string {
  return titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

// Los h2 llevan id para que el índice del artículo pueda enlazarlos.
const markdown = new Marked({
  gfm: true,
  async: false,
  renderer: {
    heading({ tokens, depth, text }) {
      const html = this.parser.parseInline(tokens)
      const id = depth === 2 ? ` id="${crearId(text)}"` : ""
      return `<h${depth}${id}>${html}</h${depth}>
`
    },
  },
})

function extraerIndice(contenido: string, archivo: string): BlogSeccion[] {
  const ids = new Set<string>()
  return markdown.lexer(contenido).flatMap((token) => {
    if (token.type !== "heading" || token.depth !== 2) return []
    const id = crearId(token.text)
    if (!id || ids.has(id)) {
      throw new Error(`Blog: el apartado "${token.text}" está vacío o repetido en ${archivo}`)
    }
    ids.add(id)
    return [{ id, titulo: token.text }]
  })
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
      contenido: markdown.parse(content) as string,
      indice: extraerIndice(content, archivo),
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
