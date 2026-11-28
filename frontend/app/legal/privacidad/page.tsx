import { LegalDocument } from "@/components/legal-document"
import { ConsentSettingsButton } from "@/components/consent-settings-button"

export const metadata = { title: "Política de privacidad | Habilo" }

export default function PrivacyPage() {
  return (
    <LegalDocument title="Política de privacidad">
      <section>
        <h2>1. Responsable del tratamiento</h2>
        <p>Los datos personales recogidos a través de Habilo son tratados por:</p>
        <p><strong>Pablo Moreno Márquez</strong><br />NIF: 02333804V<br />Dirección de contacto (en defecto de domicilio de actividad, conforme al art. 10.1.a LSSI-CE): <a href="mailto:soporte@habilo.es" className="text-primary hover:underline">soporte@habilo.es</a></p>
      </section>

      <section>
        <h2>2. Qué datos recogemos</h2>
        <h3>2.1. Datos que facilitas directamente</h3>
        <ul>
          <li>Datos de tu cuenta de Google o Facebook (nombre, email y foto de perfil) al iniciar sesión mediante OAuth.</li>
          <li>Teléfono y ciudad, si decides completarlos en tu perfil.</li>
          <li>Si te registras como Profesional: descripción de tu actividad, años de experiencia, radio de acción, horario de disponibilidad y el documento acreditativo que subas para la verificación cuando esta funcionalidad esté activa.</li>
          <li>El contenido de los mensajes que envías a través del chat.</li>
          <li>Si contactas con un profesional sin crear cuenta: nombre, WhatsApp o email, mensaje, página de origen, parámetros UTM y código de referido.</li>
          <li>Si activas tu perfil público como Profesional: nombre, foto, ciudad, zona, materias, niveles, precio y tu consentimiento expreso para publicarlos. El consentimiento para usar tu imagen o voz en redes sociales es separado y opcional.</li>
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
          <li>Registrar errores técnicos: interés legítimo en la seguridad y estabilidad de la Plataforma (art. 6.1.f RGPD). Sentry no recibe datos de usuario, cuerpos de petición, cookies, cabeceras, parámetros de URL ni variables locales.</li>
          <li>Medir el uso de la Plataforma con analítica: tu consentimiento (art. 6.1.a RGPD). Solo se activa si aceptas y puedes retirarlo en cualquier momento.</li>
        </ul>
      </section>

      <section>
        <h2>4. Con quién compartimos tus datos</h2>
        <p>Para prestar el servicio, algunos datos se comparten con los siguientes encargados del tratamiento:</p>
        <ul>
          <li>Supabase (base de datos y almacenamiento de archivos).</li>
          <li>Google LLC y Meta Platforms, Inc. (autenticación mediante OAuth).</li>
          <li>PostHog, Inc. (analítica de producto, solo si aceptas la analítica).</li>
          <li>Functional Software, Inc. (Sentry, registro de errores técnicos).</li>
          <li>Vercel, Inc. (Vercel Analytics, solo si aceptas la analítica).</li>
          <li>Resend (envío de emails transaccionales y confirmación de la lista de espera con doble opt-in).</li>
        </ul>
        <p>Habilo no vende tus datos personales a terceros ni los utiliza con fines publicitarios ajenos a la propia Plataforma.</p>
      </section>

      <section>
        <h2>5. Cuánto tiempo conservamos tus datos</h2>
        <p>Conservamos tus datos mientras mantengas una cuenta activa. Tras la baja, conservaremos determinados datos durante los plazos legalmente exigidos, en particular a efectos de posibles reclamaciones.</p>
        <p>Los datos de los formularios de contacto sin cuenta se conservan durante 12 meses desde el último contacto, salvo que ejerzas antes tu derecho de supresión.</p>
      </section>

      <section aria-labelledby="opiniones-profesores">
        <h2 id="opiniones-profesores">6. Opiniones sobre profesores</h2>
        <p>Cualquier alumno o familia puede dejar una opinión sobre un profesor desde el enlace que este comparte, sin crear cuenta.</p>
        <ul>
          <li><strong>Datos:</strong> la opinión y su puntuación, el nombre con el que quieres que se publique, tu relación con el profesor (alumno o madre/padre de alumno), cuánto tiempo llevas con él y un email o teléfono de contacto.</li>
          <li><strong>Finalidad:</strong> publicar la opinión en el perfil del profesor y comprobar que es real. Para ello podemos escribirte al email o teléfono que indiques. Ese contacto es privado: no se publica ni se comparte con el profesor.</li>
          <li><strong>Base legal:</strong> tu consentimiento (art. 6.1.a RGPD), que das al marcar la casilla del formulario.</li>
          <li><strong>Menores:</strong> si el alumno tiene menos de 14 años, la opinión debe escribirla y aceptarla su madre, padre o tutor, porque antes de esa edad el consentimiento no es válido sin ellos (art. 7 LOPDGDD). Los alumnos de 14 años o más pueden escribirla ellos mismos.</li>
          <li><strong>Conservación:</strong> mientras la opinión está pendiente de revisión conservamos todos sus datos. El email o teléfono se borra 90 días después de revisarla. Si la publicamos, la opinión, el nombre mostrado, la relación y el tiempo con el profesor se conservan mientras siga publicada. Las opiniones rechazadas se borran enteras 90 días después de revisarlas.</li>
          <li><strong>Retirada:</strong> puedes pedir que retiremos tu opinión en cualquier momento escribiendo a <a href="mailto:soporte@habilo.es" className="text-primary hover:underline">soporte@habilo.es</a>.</li>
        </ul>
      </section>

      <section>
        <h2>7. Tus derechos</h2>
        <p>Puedes ejercer en cualquier momento los derechos de acceso, rectificación, supresión, limitación del tratamiento, portabilidad y oposición a tratamientos basados en el interés legítimo.</p>
        <p>Puedes ejercerlos escribiendo a <a href="mailto:soporte@habilo.es" className="text-primary hover:underline">soporte@habilo.es</a>. También puedes reclamar ante la Agencia Española de Protección de Datos (<a href="https://www.aepd.es" target="_blank" rel="noreferrer" className="text-primary hover:underline">www.aepd.es</a>).</p>
        <div id="borrar-datos" className="scroll-mt-24">
          <h3>Cómo borrar tu cuenta y tus datos</h3>
          <p>Da igual si entraste con Google o con Facebook: entra en Habilo, abre «Mi perfil» y pulsa «Eliminar mi cuenta». Se borran al momento tu cuenta, tu perfil, tus anuncios y sus fotos. Si tienes historial compartido con otras personas (solicitudes, mensajes o valoraciones), esas conversaciones se conservan, pero sin tu nombre ni tus datos. Los datos de pagos que la ley obligue a guardar se conservan durante el plazo legal.</p>
          <p>Si no puedes entrar en tu cuenta, escribe a <a href="mailto:soporte@habilo.es" className="text-primary hover:underline">soporte@habilo.es</a> desde el correo de tu cuenta con el asunto «Borrar mi cuenta». La borramos en un plazo máximo de 30 días y te confirmamos por correo cuando esté hecho.</p>
          <p>Ten en cuenta que, si después vuelves a entrar con Google o con Facebook, se crea una cuenta nueva.</p>
          <p>Además, puedes quitar el acceso de Habilo a tu cuenta de Facebook en Facebook → Configuración y privacidad → Configuración → Apps y sitios web, o a tu cuenta de Google en myaccount.google.com → Seguridad → Aplicaciones de terceros con acceso a la cuenta.</p>
        </div>
      </section>

      <section>
        <h2>8. Seguridad</h2>
        <p>Habilo aplica medidas técnicas y organizativas razonables para proteger tus datos, incluyendo el cifrado de las comunicaciones y el control de acceso a los sistemas. Ningún sistema es invulnerable al cien por cien.</p>
      </section>

      <section>
        <h2>9. Menores de edad</h2>
        <p>La Plataforma no está dirigida a menores de 18 años. Si detectamos una cuenta registrada por un menor, procederemos a su cancelación.</p>
        <p>La única excepción son las opiniones sobre profesores, que no requieren cuenta: puede dejarlas un alumno de 14 años o más; si es menor de 14, su madre, padre o tutor (ver el apartado 6).</p>
      </section>

      <section>
        <h2>10. Cookies</h2>
        <p>Habilo utiliza almacenamiento técnico necesario para el funcionamiento de la Plataforma, por ejemplo, para mantener tu sesión iniciada. Estas cookies no requieren consentimiento.</p>
        <p>La analítica es opcional. PostHog y Vercel Analytics solo se inicializan y empiezan a medir después de que pulses “Aceptar analítica”. Antes de esa decisión, o si eliges “Solo esenciales”, no se inicializan, no se envían eventos y no se guardan identificadores analíticos. La base legal es tu consentimiento (art. 6.1.a RGPD).</p>
        <p>Si retiras el consentimiento, dejamos de enviar eventos y eliminamos las cookies y los identificadores analíticos de PostHog. Solo conservamos un marcador técnico de tu decisión. Puedes cambiar o retirar tu consentimiento en cualquier momento:</p>
        <p><ConsentSettingsButton /></p>
      </section>

      <section>
        <h2>11. Cambios en esta Política</h2>
        <p>Habilo podrá actualizar esta Política para adaptarla a cambios normativos o en el funcionamiento de la Plataforma, incluyendo la constitución de una entidad o la activación del procesamiento de pagos. La versión vigente será siempre la publicada en la Plataforma.</p>
      </section>

      <section>
        <h2>12. Contacto</h2>
        <p>Para cualquier consulta: <a href="mailto:soporte@habilo.es" className="text-primary hover:underline">soporte@habilo.es</a></p>
      </section>
    </LegalDocument>
  )
}