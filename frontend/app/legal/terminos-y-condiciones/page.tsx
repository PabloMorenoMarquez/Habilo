import { LegalDocument } from "@/components/legal-document"

export const metadata = { title: "Términos y condiciones | Habilo" }

export default function TermsPage() {
  return (
    <LegalDocument title="Términos y condiciones de uso">
      <section>
        <h2>1. Objeto y aceptación</h2>
        <p><strong>1.1.</strong> Los presentes Términos y Condiciones (en adelante, los "Términos") regulan el acceso y uso de la plataforma Habilo (en adelante, la "Plataforma" o "Habilo"), un espacio digital que pone en contacto a personas que buscan contratar servicios de proximidad (en adelante, "Clientes") con personas físicas o jurídicas que ofrecen dichos servicios de forma profesional o particular (en adelante, "Profesionales").</p>
        <p><strong>1.2.</strong> Habilo es operada por Pablo Moreno Márquez — NIF 02333804V — Dirección de contacto (en defecto de domicilio de actividad, conforme al art. 10.1.a LSSI-CE): pablomorenomarquez@gmail.com</p>
        <p><strong>1.3.</strong> El acceso y uso de la Plataforma atribuye la condición de "Usuario" e implica la aceptación plena y sin reservas de estos Términos, así como de la Política de Privacidad, en su versión publicada en cada momento en que el Usuario acceda a la Plataforma.</p>
        <p><strong>1.4.</strong> El uso de la Plataforma requiere ser mayor de edad (18 años) y tener capacidad legal para contratar.</p>
      </section>

      <section>
        <h2>2. Definiciones</h2>
        <ul>
          <li><strong>Plataforma:</strong> el sitio web y aplicaciones de Habilo, incluidos todos sus componentes técnicos.</li>
          <li><strong>Cliente:</strong> Usuario que busca contratar un Servicio publicado por un Profesional.</li>
          <li><strong>Profesional:</strong> Usuario que publica uno o varios Servicios para ser contratados por Clientes.</li>
          <li><strong>Servicio:</strong> la prestación concreta publicada por un Profesional en la Plataforma.</li>
          <li><strong>Solicitud:</strong> el contacto iniciado por un Cliente respecto a un Servicio, que da comienzo a una conversación de negociación.</li>
          <li><strong>Oferta:</strong> la propuesta de precio formulada por Cliente o Profesional dentro de una Solicitud, que debe ser aceptada por la otra parte para considerarse acordada.</li>
        </ul>
      </section>

      <section>
        <h2>3. Naturaleza de Habilo: plataforma intermediaria</h2>
        <p><strong>3.1.</strong> Habilo actúa exclusivamente como intermediario tecnológico que facilita el contacto y la negociación entre Clientes y Profesionales. Habilo no presta los Servicios anunciados, no es parte del contrato de prestación de servicios y no actúa como empleador, agencia de colocación ni representante de ningún Profesional.</p>
        <p><strong>3.2.</strong> Los Profesionales actúan por cuenta propia, bajo su propia responsabilidad profesional, fiscal y de seguridad social. Corresponde a cada Profesional disponer de las licencias, habilitaciones, seguros de responsabilidad civil y demás requisitos legales necesarios.</p>
        <p><strong>3.3.</strong> En esta fase piloto, Habilo no procesa, retiene ni cobra ningún importe. Cualquier acuerdo económico se gestiona íntegramente fuera de Habilo, directamente entre Cliente y Profesional y bajo la exclusiva responsabilidad de ambos.</p>
      </section>

      <section>
        <h2>4. Registro y cuenta de usuario</h2>
        <p><strong>4.1.</strong> El acceso a determinadas funcionalidades requiere registro mediante cuenta de Google u otros proveedores que se habiliten en el futuro.</p>
        <p><strong>4.2.</strong> El Usuario es responsable de la veracidad y actualización de los datos facilitados, así como de la custodia de sus credenciales.</p>
        <p><strong>4.3.</strong> Un mismo Usuario puede actuar como Cliente y como Profesional simultáneamente, sin cuentas separadas.</p>
        <p><strong>4.4.</strong> Habilo puede suspender o cancelar cuentas que incumplan estos Términos, incluyendo suplantación, fraude, conducta abusiva o incumplimiento reiterado de compromisos adquiridos.</p>
      </section>

      <section>
        <h2>5. Publicación de Servicios por Profesionales</h2>
        <p><strong>5.1.</strong> El Profesional es el único responsable de la exactitud, legalidad y vigencia de la información publicada sobre sus Servicios, incluyendo precio, descripción y alcance.</p>
        <p><strong>5.2.</strong> Habilo puede solicitar documentación acreditativa de identidad o cualificación profesional. Durante la fase piloto, la verificación automatizada mediante documento de identidad y selfie permanece desactivada. La verificación de un perfil no constituye garantía, aval ni certificación de la calidad, legalidad o resultado del Servicio.</p>
        <p><strong>5.3.</strong> Habilo puede rechazar o retirar la verificación de un Profesional cuando la documentación sea insuficiente o no veraz.</p>
      </section>

      <section>
        <h2>6. Proceso de contratación: negociación y ofertas</h2>
        <p><strong>6.1.</strong> El contacto entre Cliente y Profesional no implica compromiso de pago alguno.</p>
        <p><strong>6.2.</strong> El precio final se determina mediante una Oferta, ya sea al precio publicado, mediante una propuesta libre o mediante cálculo automático por horas, y debe ser aceptada expresamente por la otra parte.</p>
        <p><strong>6.3.</strong> Una vez aceptada una Oferta, Cliente y Profesional acuerdan directamente la forma, momento y método de pago. Habilo no interviene ni garantiza ese acuerdo económico.</p>
      </section>

      <section>
        <h2>7. Sistema de pagos</h2>
        <p><strong>7.1.</strong> Durante la fase piloto Habilo no ofrece ni gestiona pagos dentro de la Plataforma.</p>
        <p><strong>7.2.</strong> Cuando Habilo active el procesamiento de pagos, se gestionará mediante un proveedor autorizado (Stripe, Inc.) y esta sección se actualizará con el funcionamiento, comisión y momento del cobro. La actualización se notificará con antelación razonable.</p>
      </section>

      <section>
        <h2>8. Cancelaciones</h2>
        <p><strong>8.1.</strong> Cliente o Profesional pueden cancelar una Solicitud en negociación o pendiente de respuesta, sin coste ni penalización.</p>
        <p><strong>8.2.</strong> Al no existir cobro a través de la Plataforma, las devoluciones acordadas directamente son responsabilidad exclusiva de las partes.</p>
        <p><strong>8.3.</strong> Todo motivo de cancelación queda registrado a efectos de resolución de incidencias y reputación.</p>
      </section>

      <section>
        <h2>9. Valoraciones</h2>
        <p>Tras la finalización de un Servicio, el Cliente puede valorar al Profesional. Las valoraciones deben corresponder a experiencias reales y ser respetuosas. Habilo puede retirar las que incumplan lo anterior, previa revisión administrativa.</p>
      </section>

      <section>
        <h2>10. Conducta prohibida, bloqueos, reportes y suspensión</h2>
        <p><strong>10.1.</strong> Queda prohibido usar la Plataforma para fines distintos de la contratación legítima de servicios, incluyendo publicar información falsa, acosar o publicar contenido ilícito.</p>
        <p><strong>10.2.</strong> Cualquier Usuario puede bloquear a otro, impidiendo el contacto futuro y cancelando automáticamente las Solicitudes activas entre ambos.</p>
        <p><strong>10.3.</strong> Cualquier Usuario puede reportar conducta indebida. El equipo de administración puede adoptar medidas, incluida la suspensión temporal o definitiva.</p>
        <p><strong>10.4.</strong> La suspensión impide el acceso inmediato, incluso con sesiones o credenciales válidas.</p>
      </section>

      <section>
        <h2>11. Propiedad intelectual</h2>
        <p><strong>11.1.</strong> Los contenidos propios de la Plataforma (diseño, marca, código y base de datos) son titularidad de Pablo Moreno Márquez o sus licenciantes.</p>
        <p><strong>11.2.</strong> El contenido publicado por los Usuarios sigue siendo suyo, quienes conceden a Habilo una licencia no exclusiva para mostrarlo con el fin de prestar el servicio de intermediación.</p>
      </section>

      <section>
        <h2>12. Protección de datos</h2>
        <p>El tratamiento de datos personales realizado por Habilo se rige por su <a href="/legal/privacidad" className="text-primary hover:underline">Política de Privacidad</a>, que forma parte integrante de estos Términos.</p>
      </section>

      <section>
        <h2>13. Limitación de responsabilidad</h2>
        <p><strong>13.1.</strong> Habilo no garantiza la calidad, idoneidad, legalidad ni resultado de los Servicios, ni responde de daños derivados de su ejecución, salvo fallo directamente imputable a la Plataforma.</p>
        <p><strong>13.2.</strong> Habilo no responde de daños derivados de la actividad presencial de los Profesionales, siendo responsabilidad del Profesional disponer de cobertura adecuada.</p>
        <p><strong>13.3.</strong> Habilo no asume responsabilidad por acuerdos económicos, impagos, devoluciones o disputas de pago, al producirse fuera de la Plataforma.</p>
        <p><strong>13.4.</strong> Habilo no garantiza la disponibilidad ininterrumpida, aunque adoptará medidas razonables para minimizar interrupciones.</p>
      </section>

      <section>
        <h2>14. Función de garantía</h2>
        <p>Habilo prevé habilitar en el futuro una funcionalidad de garantía limitada a la devolución del importe pagado en determinados supuestos. No constituirá un seguro ni cubrirá daños materiales o personales. Esta sección se completará cuando se implemente.</p>
      </section>

      <section>
        <h2>15. Modificación de los Términos</h2>
        <p>Habilo podrá modificar estos Términos, en particular al activar el cobro de comisión o cambiar la forma jurídica del titular. Los cambios se notificarán con antelación razonable y se entenderán aceptados si el Usuario continúa usando la Plataforma tras su entrada en vigor.</p>
      </section>

      <section>
        <h2>16. Duración y terminación</h2>
        <p>El Usuario puede darse de baja en cualquier momento. Habilo podrá suspender o cancelar el acceso en caso de incumplimiento, conforme a la sección 10.</p>
      </section>

      <section>
        <h2>17. Ley aplicable y jurisdicción</h2>
        <p>Estos Términos se rigen por la legislación española. Las partes se someterán a los juzgados y tribunales competentes conforme a la normativa de protección de consumidores cuando el Usuario tenga dicha condición.</p>
      </section>

      <section>
        <h2>18. Contacto</h2>
        <p>Para cualquier consulta: <a href="mailto:pablomorenomarquez@gmail.com" className="text-primary hover:underline">pablomorenomarquez@gmail.com</a></p>
      </section>
    </LegalDocument>
  )
}