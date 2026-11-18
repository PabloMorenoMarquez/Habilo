// Regenera los iconos de la app a partir de la marca de Habilo.
// Uso, desde frontend/:  node scripts/generate-icons.mjs
// La geometría es la misma que la de components/brand/logo.tsx; si cambia una, cambia la otra.
import { writeFile } from "node:fs/promises"
import sharp from "sharp"

const BLUE = "#005EE3" // --primary del tema claro
const CORAL = "#FF6B4A"
const WHITE = "#FFFFFF"

const mark = (scale = 1) => `
  <g transform="translate(100 100) scale(${scale}) translate(-110.5 -95.5)">
    <path d="M58 50 V154 M58 124 C58 88 118 88 118 124 V154" fill="none" stroke="${WHITE}"
      stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M136 22 C140 50 150 60 178 64 C150 68 140 78 136 106 C132 78 122 68 94 64 C122 60 132 50 136 22Z"
      fill="${CORAL}"/>
  </g>`

// radius: 46 = esquinas redondeadas con transparencia; 0 = cuadrado a sangre (el sistema lo recorta).
const svg = ({ radius = 0, scale = 0.86 } = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <rect width="200" height="200" rx="${radius}" fill="${BLUE}"/>${mark(scale)}
</svg>
`

const png = (source, size, file) =>
  sharp(Buffer.from(source), { density: 72 * (size / 200) * 4 })
    .resize(size, size)
    .png()
    .toFile(file)

const rounded = svg({ radius: 46 })
const bleed = svg()

await writeFile("public/icon.svg", rounded)
await Promise.all([
  // Pestaña y resultados de Google: Google exige un cuadrado múltiplo de 48 px.
  png(rounded, 192, "app/icon.png"),
  png(rounded, 32, "public/icon-light-32x32.png"),
  png(rounded, 32, "public/icon-dark-32x32.png"),
  png(bleed, 192, "public/icon-192.png"),
  png(bleed, 512, "public/icon-512.png"),
  png(bleed, 180, "public/apple-icon.png"),
  // Maskable: la marca cabe en el 80 % central, que es la zona que ningún recorte toca.
  png(svg({ scale: 0.66 }), 512, "public/icon-maskable-512.png"),
])
// favicon.ico (16, 32 y 48 px) para navegadores y rastreadores que lo piden en la raíz.
const icoSizes = [16, 32, 48]
const icoPngs = await Promise.all(
  icoSizes.map((size) => sharp(Buffer.from(rounded), { density: 72 * (size / 200) * 4 }).resize(size, size).png().toBuffer())
)
const header = Buffer.alloc(6 + 16 * icoSizes.length)
header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(icoSizes.length, 4)
let offset = header.length
icoSizes.forEach((size, i) => {
  const entry = 6 + 16 * i
  header.writeUInt8(size, entry)
  header.writeUInt8(size, entry + 1)
  header.writeUInt16LE(1, entry + 4)
  header.writeUInt16LE(32, entry + 6)
  header.writeUInt32LE(icoPngs[i].length, entry + 8)
  header.writeUInt32LE(offset, entry + 12)
  offset += icoPngs[i].length
})
await writeFile("app/favicon.ico", Buffer.concat([header, ...icoPngs]))
console.log("Iconos regenerados")
