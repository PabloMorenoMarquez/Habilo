import { LegalDocument } from "@/components/legal-document"

export const metadata = { title: "Política de privacidad | Habilo" }

export default function PrivacyPage() {
  return (
    <LegalDocument title="Política de privacidad">
      <section>
        <h2>1. Responsable del tratamiento</h2>
        <p>Los datos personales recogidos a través de Habilo son tratados por:</p>
        <p><strong>Pablo Moreno Márquez</strong><br />NIF: 02333804V<br />Dirección de contacto (en defecto de domicilio de actividad, conforme al art. 10.1.a LSSI-CE): <a href="mailto:pablomorenomarquez@gmail.com" className="text-primary hover:underline">pablomorenomarquez@gmail.com</a></p>
      </section>

      <section>
        <h2>2. Qué datos recogemos</h2>
        <h3>2.1. Datos que facilitas directamente</h3>
        <ul>
          <li>Datos de tu cuenta de Google o Facebook (nombre, email y foto de perfil) al iniciar sesión mediante OAuth.</li>
          <li>Teléfono y ciudad, si decides completarlos en tu perfil.</li>
          <li>Si te registras como Profesional: descripción de tu actividad, años de experiencia, radio de acción, horario de disponibilidad y el documento acreditativo que subas para la verificación cuando esta funcionalidad esté activa.</li>
          <li>El contenido de los mensajes que envías a través del chat.</li>
          <li>Valoraciones, comentarios y reportes que redactes sobre otros usuarios.</li>
        </ul>
        <h3>2.2. Datos que se generan por el uso</h3>
        <ul>
          <li>Ubicación aproximada para la búsqueda de servicios de proximidad, obtenida mediante la API de geolocalización del navegador o mediante la dirección introducida manualmente.</li>
          <li>Historial de solicitudes, ofertas y servicios contratados a través del chat.</li>
          <li>Información técnica básica de conexión (dirección IP y tipo de dispositivo) con fines de seguridad.</li>
        </ul>
        <h3>2.3. Datos de pago</h3>
        <p>Habilo se encuentra actualmente en fase piloto, sin cobro de comisiones ni procesamiento de pagos activo dentro de la Plataforma. Los acuerdos económicos se gestionan fuera de Habilo. Cuando esta funcionalidad se active, esta sección se actualizará para reflejar el uso de Stripe, Inc. como encargado del tratamiento y se notificará adecuadamente.</p>
      </section>

      <section>
        <h2>3. Finalidad y base legal</h2>
        <ul>
          <li>Gestionar tu registro y darte acceso a la Plataforma: ejecución del contrato (art. 6.1.b RGPD).</li>
          <li>Mostrarte servicios cercanos y permitir el contacto entre Clientes y Profesionales: ejecución del contrato.</li>
          <li>Gestionar reportes, bloqueos y suspensiones: interés legítimo en mantener un entorno seguro y cumplimiento de estos Términos.</li>
          <li>Enviarte comunicaciones esenciales sobre tu cuenta o solicitudes: ejecución del contrato.</li>
          <li>Cumplir obligaciones legales aplicables: cumplimiento de una obligación legal (art. 6.1.c RGPD).</li>
        </ul>
      </section>

      <section>
        <h2>4. Con quién compartimos tus datos</h2>
        <p>Para prestar el servicio, algunos datos se comparten con los siguientes encargados del tratamiento:</p>
        <ul>
          <li>Supabase (base de datos y almacenamiento de archivos).</li>
          <li>Google LLC y Meta Platforms, Inc. (autenticación mediante OAuth).</li>
        </ul>
        <p>Habilo no vende tus datos personales a terceros ni los utiliza con fines publicitarios ajenos a la propia Plataforma.</p>
      </section>

      <section>
        <h2>5. Cuánto tiempo conservamos tus datos</h2>
        <p>Conservamos tus datos mientras mantengas una cuenta activa. Tras la baja, conservaremos determinados datos durante los plazos legalmente exigidos, en particular a efectos de posibles reclamaciones.</p>
      </section>

      <section>
        <h2>6. Tus derechos</h2>
        <p>Puedes ejercer en cualquier momento los derechos de acceso, rectificación, supresión, limitación del tratamiento, portabilidad y oposición a tratamientos basados en el interés legítimo.</p>
        <p>Puedes ejercerlos escribiendo a <a href="mailto:pablomorenomarquez@gmail.com" className="text-primary hover:underline">pablomorenomarquez@gmail.com</a>. También puedes reclamar ante la Agencia Española de Protección de Datos (<a href="https://www.aepd.es" target="_blank" rel="noreferrer" className="text-primary hover:underline">www.aepd.es</a>).</p>
      </section>

      <section>
        <h2>7. Seguridad</h2>
        <p>Habilo aplica medidas técnicas y organizativas razonables para proteger tus datos, incluyendo el cifrado de las comunicaciones y el control de acceso a los sistemas. Ningún sistema es invulnerable al cien por cien.</p>
      </section>

      <section>
        <h2>8. Menores de edad</h2>
        <p>La Plataforma no está dirigida a menores de 18 años. Si detectamos una cuenta registrada por un menor, procederemos a su cancelación.</p>
      </section>

      <section>
        <h2>9. Cookies</h2>
        <p>Habilo utiliza cookies técnicas necesarias para el funcionamiento de la Plataforma, por ejemplo, para mantener tu sesión iniciada.</p>
      </section>

      <section>
        <h2>10. Cambios en esta Política</h2>
        <p>Habilo podrá actualizar esta Política para adaptarla a cambios normativos o en el funcionamiento de la Plataforma, incluyendo la constitución de una entidad o la activación del procesamiento de pagos. La versión vigente será siempre la publicada en la Plataforma.</p>
      </section>

      <section>
        <h2>11. Contacto</h2>
        <p>Para cualquier consulta: <a href="mailto:pablomorenomarquez@gmail.com" className="text-primary hover:underline">pablomorenomarquez@gmail.com</a></p>
      </section>
    </LegalDocument>
  )
}