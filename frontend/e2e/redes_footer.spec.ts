import { test, expect } from "@playwright/test"

// El pie de las páginas públicas enlaza a las redes de Habilo. En el chat de Wallapop
// no se pueden pasar los nombres de cuenta, así que se dice «abajo en habilo.es».
const REDES = [
  { nombre: "Instagram", href: "https://www.instagram.com/habilo.app/" },
  { nombre: "TikTok", href: "https://www.tiktok.com/@habilo.es" },
  { nombre: "YouTube", href: "https://www.youtube.com/@Habilo-app" },
]

for (const ruta of ["/", "/da-clases", "/blog"]) {
  test(`el pie de ${ruta} enlaza a las redes de Habilo`, async ({ page }) => {
    await page.goto(ruta)
    const pie = page.locator("footer")
    for (const red of REDES) {
      const enlace = pie.getByRole("link", { name: new RegExp(`Habilo en ${red.nombre}`) })
      await expect(enlace).toHaveAttribute("href", red.href)
      await expect(enlace).toHaveAttribute("target", "_blank")
      await expect(enlace).toHaveAttribute("rel", /noopener/)
    }
  })
}
