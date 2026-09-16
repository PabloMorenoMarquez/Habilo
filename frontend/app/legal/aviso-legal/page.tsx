import { LegalDocument } from "@/components/legal-document"

export const metadata = { title: "Aviso legal | Habilo" }

export default function LegalNoticePage() {
  return (
    <LegalDocument title="Aviso legal">
      <section>
        <h2>1. Datos identificativos</h2>
        <p>En cumplimiento del artículo 10 de la Ley 34/2002, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), el titular de Habilo es:</p>
        <p><strong>Pablo Moreno Márquez</strong><br />NIF: 02333804V<br />Dirección de contacto (en defecto de domicilio de actividad, conforme al art. 10.1.a LSSI-CE): <a href="mailto:pablomorenomarquez@gmail.com" className="text-primary hover:underline">pablomorenomarquez@gmail.com</a></p>
        <p>A la fecha de esta versión, Pablo Moreno Márquez opera Habilo como persona física, sin que exista todavía alta como autónomo ni constitución de sociedad. Esta situación es transitoria y corresponde a una fase de validación de la plataforma sin cobro de comisiones ni ingresos asociados a la actividad.</p>
      </section>

      <section>
        <h2>2. Objeto</h2>
        <p>Este Aviso Legal regula el acceso y uso del sitio web y la aplicación de Habilo, una plataforma que pone en contacto a personas que buscan contratar servicios de proximidad con profesionales que los ofrecen. El uso de la Plataforma implica la aceptación de este Aviso Legal, de los Términos y Condiciones y de la Política de Privacidad.</p>
      </section>

      <section>
        <h2>3. Condición de intermediario</h2>
        <p>Habilo actúa exclusivamente como intermediario tecnológico entre Clientes y Profesionales, sin prestar por sí misma los servicios anunciados en la Plataforma. El detalle de esta relación se recoge en los <a href="/legal/terminos-y-condiciones" className="text-primary hover:underline">Términos y Condiciones</a>.</p>
      </section>

      <section>
        <h2>4. Alojamiento y proveedores tecnológicos</h2>
        <p>La base de datos y determinados servicios de almacenamiento son gestionados por Supabase. El procesamiento de pagos, cuando esté activo, se realizará a través de Stripe, Inc. El detalle de estos tratamientos se recoge en la <a href="/legal/privacidad" className="text-primary hover:underline">Política de Privacidad</a>.</p>
      </section>

      <section>
        <h2>5. Propiedad intelectual e industrial</h2>
        <p>Todos los contenidos del sitio web (textos, diseño, código fuente, marca "Habilo" y logotipo) son titularidad de Pablo Moreno Márquez o de sus licenciantes, y están protegidos por la normativa de propiedad intelectual e industrial. Queda prohibida su reproducción, distribución o transformación sin autorización expresa, salvo en lo necesario para el uso ordinario de la Plataforma.</p>
      </section>

      <section>
        <h2>6. Enlaces</h2>
        <p>Habilo no se hace responsable del contenido de sitios web de terceros a los que pueda enlazarse desde la Plataforma, ni de sus políticas de privacidad o condiciones de uso.</p>
      </section>

      <section>
        <h2>7. Legislación aplicable</h2>
        <p>Este Aviso Legal se rige por la legislación española. Para resolver cualquier controversia, las partes se someterán a los juzgados y tribunales competentes conforme a la normativa de protección de consumidores cuando el usuario tenga dicha condición.</p>
      </section>

      <section>
        <h2>8. Contacto</h2>
        <p>Para cualquier consulta: <a href="mailto:pablomorenomarquez@gmail.com" className="text-primary hover:underline">pablomorenomarquez@gmail.com</a></p>
      </section>
    </LegalDocument>
  )
}