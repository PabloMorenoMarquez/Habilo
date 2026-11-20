// Utilidades de las reseñas de profesores (formulario /opina y ficha pública).

/**
 * Caracteres de un texto recortado, contados como el backend (pydantic cuenta
 * puntos de código Unicode). `.length` cuenta unidades UTF-16 y un emoji vale 2,
 * así que un comentario corto con emojis pasaría aquí y el servidor lo rechazaría.
 */
export function contarCaracteres(texto: string): number {
  return Array.from(texto.trim()).length
}

/**
 * Frase bajo «Reseñas» en la ficha. Habilo solo revisa antes de publicar las
 * reseñas de alumnos por enlace; las valoraciones de clases reservadas en
 * Habilo se publican al momento, así que si hay alguna la frase no puede decir
 * que se revisan todas.
 */
export function fraseRevisionResenas(resenas: { origen?: "habilo" | "alumno" }[]): string {
  const hayDeClaseReservada = resenas.some((resena) => resena.origen !== "alumno")
  if (!hayDeClaseReservada) {
    return "Las reseñas las escriben alumnos y familias del profesor. Habilo revisa cada una antes de publicarla y comprueba algunas con quien la escribió."
  }
  return "Las reseñas las escriben alumnos y familias del profesor, o quien ha hecho una clase reservada en Habilo. Habilo revisa antes de publicarlas las de alumnos y familias, y comprueba algunas con quien la escribió."
}
