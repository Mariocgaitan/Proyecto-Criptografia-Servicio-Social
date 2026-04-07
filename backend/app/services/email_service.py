"""
Servicio del módulo de Correos — envío de notificaciones por SMTP.
"""
import html
import smtplib
from email.message import EmailMessage
from typing import Optional
import logging

from app.core.config import settings, PROJECT_ROOT

logger = logging.getLogger(__name__)

TEC_FOOTER_HTML = """
        <div style="margin-top: 40px; font-size: 11px; color: #555; line-height: 1.4; border-top: 1px solid #ddd; padding-top: 15px;">
            <p style="margin: 0 0 5px 0;"><strong>Servicio Social</strong><br/>
            <img src="cid:logo_servicio" alt="Logo Servicio Social" width="120" style="margin: 10px 0;" /><br/>
            Campus Ciudad de México</p>
            <p style="margin: 0 0 10px 0; color: #003865; font-weight: bold;">TECNOLÓGICO DE MONTERREY</p>
            <p style="margin: 0 0 15px 0; font-style: italic;">Innovación, liderazgo y emprendimiento para el florecimiento humano</p>
            
            <p style="margin: 0 0 15px 0; color: #2e7d32; font-weight: bold;">
                <span style="font-family: Webdings, 'Segoe UI Symbol'; font-size: 14px;">P</span> Considere por favor su responsabilidad ambiental antes de imprimir este E-mail
            </p>
            
            <p style="text-align: justify; margin: 0 0 10px 0; font-size: 10px; color: #777;">
                El contenido de este mensaje de datos no se considera oferta, propuesta o acuerdo, sino hasta que sea confirmado en documento por escrito que contenga la firma autógrafa del apoderado legal del ITESM. El contenido de este mensaje de datos es confidencial y se entiende dirigido y para uso exclusivo del destinatario, por lo que no podrá distribuirse y/o difundirse por ningún medio sin la previa autorización del emisor original. Si usted no es el destinatario, se le prohíbe su utilización total o parcial para cualquier fin.
            </p>
            <p style="text-align: justify; margin: 0; font-size: 10px; color: #777;">
                The content of this data transmission must not be considered an offer, proposal, understanding or agreement unless it is confirmed in a document signed by a legal representative of ITESM. The content of this data transmission is confidential and is intended to be delivered only to the addressees. Therefore, it shall not be distributed and/or disclosed through any means without the authorization of the original sender. If you are not the addressee, you are forbidden from using it, either totally or partially, for any purpose.
            </p>
        </div>
        <p style="font-size: 12px; color: #777; text-align: center; margin-top: 20px;">Este es un mensaje automático, por favor no respondas a este correo.</p>
"""

def _crear_cliente_smtp() -> Optional[smtplib.SMTP]:
    """Crea y autentica el cliente SMTP si las credenciales están configuradas."""
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("Credenciales SMTP no configuradas. Correo simulado.")
        return None
    try:
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        return server
    except Exception as e:
        logger.error(f"Error al conectar con SMTP: {e}")
        return None

def enviar_correo_inscripcion(to_email: str, nombre_alumno: str, nombre_proyecto: str, nombre_empresa: str):
    """Envía un correo notificando al alumno su inscripción exitosa."""
    asunto = f"¡Inscripción Exitosa! Proyecto: {nombre_proyecto}"

    esc_alumno = html.escape(nombre_alumno)
    esc_proyecto = html.escape(nombre_proyecto)
    esc_empresa = html.escape(nombre_empresa)

    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #003865;">Feria del Servicio Social - TEC CCM</h2>
        </div>
        <p>Hola <strong>{esc_alumno}</strong>,</p>
        <p>Tu inscripción ha sido confirmada satisfactoriamente en el siguiente proyecto:</p>
        <div style="background-color: #f4f6f9; padding: 15px; border-left: 4px solid #003865; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Empresa / Organización:</strong> {esc_empresa}</p>
          <p style="margin: 0;"><strong>Proyecto:</strong> {esc_proyecto}</p>
        </div>
        <p>Mantente en contacto con la organización para los siguientes pasos.</p>
        {TEC_FOOTER_HTML}
      </body>
    </html>
    """
    _enviar_html(to_email, asunto, html_content)

def enviar_correo_baja(to_email: str, nombre_alumno: str, nombre_proyecto: str, nombre_empresa: str):
    """Envía un correo notificando al alumno que ha sido dado de baja de un proyecto."""
    asunto = f"Aviso de Baja de Proyecto: {nombre_proyecto}"

    esc_alumno = html.escape(nombre_alumno)
    esc_proyecto = html.escape(nombre_proyecto)
    esc_empresa = html.escape(nombre_empresa)

    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #003865;">Feria del Servicio Social - TEC CCM</h2>
        </div>
        <p>Hola <strong>{esc_alumno}</strong>,</p>
        <p>Te informamos que has sido <strong>dado(a) de baja</strong> del siguiente proyecto:</p>
        <div style="background-color: #fff0f0; padding: 15px; border-left: 4px solid #d32f2f; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Empresa / Organización:</strong> {esc_empresa}</p>
          <p style="margin: 0;"><strong>Proyecto:</strong> {esc_proyecto}</p>
        </div>
        <p>Si consideras que esto es un error o requieres más información, te invitamos a que te comuniques con el encargado de la organización o con tu director de carrera.</p>
        {TEC_FOOTER_HTML}
      </body>
    </html>
    """
    _enviar_html(to_email, asunto, html_content)

def _enviar_html(to_email: str, asunto: str, html_content: str):
    """Lógica común para forjar y despachar un EmailMessage."""
    logger.info(f"[EMAIL SIMULADO/ENVIADO] Para: {to_email} | Asunto: {asunto}")
    
    msg = EmailMessage()
    msg['Subject'] = asunto
    msg['From'] = settings.SMTP_FROM_EMAIL
    msg['To'] = to_email
    msg.set_content("Abre este correo en un cliente que soporte HTML.")
    msg.add_alternative(html_content, subtype='html')

    # Adjuntar logo para mostrarlo en línea
    logo_path = PROJECT_ROOT / "frontend" / "src" / "assets" / "ser_social.png"
    if logo_path.exists():
        try:
            with open(logo_path, "rb") as f:
                img_data = f.read()
                msg.get_payload()[0].add_related(
                    img_data,
                    maintype="image",
                    subtype="png",
                    cid="<logo_servicio>"
                )
        except Exception as e:
            logger.warning(f"No se pudo cargar el logo para el correo: {e}")

    server = _crear_cliente_smtp()
    if server:
        try:
            server.send_message(msg)
            logger.info(f"Correo enviado correctamente a {to_email}")
        except Exception as e:
            logger.error(f"Error despachando correo a {to_email}: {e}")
        finally:
            server.quit()
