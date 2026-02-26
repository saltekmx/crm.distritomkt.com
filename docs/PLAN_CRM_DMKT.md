# Plan de Desarrollo:Sistema CRM DistritoMKT

Objetivo: Sistema integral para gestionar todo el ciclo de vida de proyectos de la agencia, desde la solicitud del cliente hasta el cobro y cierre, potenciado por Inteligencia Artificial.

Duración estimada: 18 semanas

---

## Semana 1: Acceso y Seguridad

- [ ] Login con Google (solo correos @distritomkt.com)
- [ ] Roles: Administrador, Administrativo, Ejecutivo
- [ ] Cada rol ve y hace solo lo que le corresponde
- [ ] Interfaz base con navegación y tema visual DistritoMKT

---

## Semana 2: Clientes

- [ ] Directorio de clientes con búsqueda y filtros
- [ ] Contactos por cliente (nombre, email, teléfono, cargo)
- [ ] Datos fiscales (RFC, razón social, régimen, dirección)
- [ ] Reglas de cobro por cliente (días de pago, portal de facturas, si requieren OC)
- [ ] Ficha completa del cliente con pestañas: info, contactos, proyectos, historial

---

## Semana 3: Registro de Proyectos

- [ ] Capturar cliente, tipo de proyecto, urgencia, fechas y responsable
- [ ] Tipos: activaciones, eventos, stands, displays, POP, promocionales, producciones, staffs, etc.
- [ ] Código automático por proyecto (DMKT-0001)
- [ ] Checklist de requisitos según el tipo de proyecto
- [ ] Estados operativos: Solicitud → Propuesta → Cotizado → Aprobado → En proceso → Entregado → Cerrado
- [ ] Estados administrativos: Por facturar → Facturado → Pago parcial → Cobrado → Cerrado
- [ ] Ficha del proyecto con pestañas: resumen, timeline, archivos, costos, ODCs

---

## Semana 4: Tracking y Kanban

- [ ] Tablero Kanban drag & drop tipo Monday (por estado operativo)
- [ ] Vista tabla con filtros por estado, cliente, responsable, fecha y urgencia
- [ ] Timeline automático (quién hizo qué y cuándo)
- [ ] Filtros rápidos: mis proyectos, por cliente, por urgencia

---

## Semana 5: Asistente AI (Chat y Registro)

- [ ] Panel de chat siempre disponible dentro del sistema
- [ ] Entiende el contexto de la pantalla donde estás
- [ ] Historial de conversaciones
- [ ] Describir una solicitud en texto libre y la AI pregunta lo necesario
- [ ] Genera un borrador de proyecto que el usuario revisa y confirma

---

## Semana 6: AI Propuestas

- [ ] La AI genera una propuesta en texto basada en el proyecto
- [ ] El usuario itera ("hazla más formal", "agrega esto", "quita lo otro")
- [ ] Se guardan todas las versiones
- [ ] Genera documento con formato listo para enviar al cliente
- [ ] Si no cumple estándar visual, se marca para diseño
- [ ] El usuario sube la versión final enviada al cliente

---

## Semana 7: Archivos y Evidencias

- [ ] Subida de archivos drag & drop con barra de progreso
- [ ] Librería de archivos con búsqueda y filtros
- [ ] Carpetas automáticas: proyectos, cotizaciones, ODCs, evidencias, facturas
- [ ] Preview de imágenes, PDFs y documentos sin descargar
- [ ] Archivos vinculados a cada proyecto
- [ ] Versionado de documentos (propuesta v1, v2, final)

---

## Semana 8: Proveedores y Costeo

- [ ] Catálogo de proveedores con categorías de servicio, contacto e historial
- [ ] La AI genera checklist de todo lo que hay que cotizar a partir de la propuesta
- [ ] Fichas de solicitud de costeo con las specs que el proveedor necesita (individuales o agrupadas)
- [ ] Envío automático de fichas por email a proveedores seleccionados
- [ ] Opción de descarga manual si el usuario prefiere enviar por fuera
- [ ] Captura de respuestas de cada proveedor
- [ ] Comparativa lado a lado entre proveedores
- [ ] La AI recomienda mejor opción calidad/precio

---

## Semana 9: Cotización al Cliente

- [ ] Cotización con reglas de margen mínimo (configurable, ej. 30%)
- [ ] La AI sugiere precios basándose en costos reales + márgenes
- [ ] Alerta si un margen está por debajo del mínimo
- [ ] Preview de cotización antes de enviar
- [ ] PDF con logo, colores DMKT, desglose de items y términos
- [ ] Envío por email desde el sistema con template profesional
- [ ] Tracking de apertura (saber si el cliente abrió el email)

---

## Semana 10: Portal del Cliente y Confirmación

- [ ] URL única por cotización donde el cliente ve y aprueba sin login
- [ ] El cliente puede aprobar o solicitar cambios desde ahí
- [ ] Registro de solicitud, envío y aprobación de muestras
- [ ] Confirmación formal del cliente → cambia estado → se habilitan ODCs
- [ ] La AI sugiere cuándo hacer follow-up y alerta proyectos sin respuesta

---

## Semana 11: Órdenes de Compra (ODCs)

- [ ] Crear ODCs desde el proyecto con código automático (ODC-0001)
- [ ] Solo si el proyecto está aprobado; se bloquean al entregar
- [ ] Al confirmar, se envía automáticamente al proveedor con PDF adjunto
- [ ] Copia al ejecutivo y equipo administrativo
- [ ] Incluye instrucciones para que el proveedor suba su factura
- [ ] El proveedor sube su factura (XML CFDI) y el sistema extrae RFC, monto y UUID
- [ ] Valida que la factura corresponda a la ODC
- [ ] Notifica al equipo cuando llega factura nueva
- [ ] Vista global de todas las ODCs con filtros por estado, proveedor y proyecto

---

## Semana 12: Pagos a Proveedores

- [ ] Generar archivos TXT en formato bancario mexicano para pagos masivos
- [ ] Fechas de pago según acuerdo con cada proveedor
- [ ] El equipo admin puede cambiar la fecha manualmente
- [ ] Subir comprobante de pago y marcar ODC como pagada
- [ ] Dashboard de pagos pendientes y programados

---

## Semana 13: Entrega y Cierre Operativo

- [ ] Checklist de entrega según tipo de proyecto
- [ ] Subida obligatoria de evidencias (fotos, videos, documentos)
- [ ] Al marcar como entregado se bloquean nuevas ODCs
- [ ] Encuesta automática al cliente post-entrega (formulario sin login)
- [ ] Score de satisfacción histórico por cliente
- [ ] Galería de evidencias con búsqueda por tags
- [ ] Links temporales para compartir evidencias con clientes

---

## Semana 14: Cobro y Cierre Administrativo

- [ ] Solicitud de factura con datos fiscales del cliente
- [ ] Registro de facturas emitidas por proyecto
- [ ] Alertas de vencimiento según reglas de pago de cada cliente
- [ ] Cuentas por cobrar (aging report)
- [ ] Registro de pagos recibidos (parciales o totales)
- [ ] Conciliación: subir estado de cuenta y match automático
- [ ] Validar que todas las ODCs estén pagadas y el cobro completo
- [ ] P&L por proyecto: cuánto costó, cuánto cobramos, cuánto ganamos

---

## Semana 15: Dashboard y Reportes

- [ ] KPIs: proyectos activos, facturación del mes, cartera vencida, pipeline por estado
- [ ] Gráficas: ingresos por mes, por cliente, por tipo de proyecto
- [ ] Rendimiento por ejecutivo (proyectos, cierres, satisfacción)
- [ ] Reportes: facturación, márgenes, cartera, gasto por proveedor
- [ ] Exportar a Excel/CSV
- [ ] Dashboard personal por usuario y vista de equipo para managers

---

## Semana 16: AI Analytics

- [ ] Preguntas en lenguaje natural: "¿cuánto facturamos en enero?", "¿qué cliente nos debe más?"
- [ ] Detección de anomalías: cliente que dejó de comprar, margen bajo, proveedor que se retrasa
- [ ] Alertas inteligentes basadas en los datos del negocio

---

## Semana 17: Notificaciones, Búsqueda y Pulido

- [ ] Notificaciones in-app y por email configurables
- [ ] Búsqueda global rápida
- [ ] Calendario con deadlines, fechas de pago y vencimientos
- [ ] Delegación (un usuario actúa en nombre de otro)
- [ ] Interfaz responsive para celular y tablet

---

## Semana 18: Pruebas, Migración y Lanzamiento

- [ ] Prueba del flujo completo: solicitud → propuesta → costeo → cotización → ODC → entrega → cobro → cierre
- [ ] Pruebas de seguridad y permisos
- [ ] Migración de datos del sistema anterior
- [ ] Verificación de integridad de datos migrados
- [ ] Puesta en producción con dominio y certificado
- [ ] Monitoreo y alertas automáticas de errores
- [ ] Capacitación con todo el equipo
- [ ] Documentación / guía de uso
- [ ] Soporte post-lanzamiento (2 semanas)

---

## Resumen

| Semana | Entregable |
|--------|-----------|
| 1 | Login, roles y permisos |
| 2 | Directorio de clientes con datos fiscales |
| 3 | Registro de proyectos con estados y checklist |
| 4 | Kanban tipo Monday y tracking |
| 5 | Chat AI y registro de solicitudes por conversación |
| 6 | Generación de propuestas con AI |
| 7 | Archivos, librería y versionado |
| 8 | Proveedores, fichas de costeo y comparativa |
| 9 | Cotización al cliente con márgenes y PDF |
| 10 | Portal del cliente, muestras y confirmación |
| 11 | ODCs automáticas y facturas XML |
| 12 | Pagos TXT bancarios a proveedores |
| 13 | Entrega, evidencias y encuestas de satisfacción |
| 14 | Facturación, cobranza, conciliación y P&L |
| 15 | Dashboard y reportes |
| 16 | AI Analytics |
| 17 | Notificaciones, búsqueda, calendario y pulido |
| 18 | Pruebas, migración, capacitación y go-live |

---

## Flujo del Sistema

```
Solicitud → Propuesta (AI) → Costeo a proveedores → Cotización con márgenes
    → Presentación al cliente → Aprobación → ODCs a proveedores
    → Producción/tracking → Facturas de proveedores → Entrega + evidencias
    → Encuesta satisfacción → Facturación al cliente → Cobro → Cierre + P&L
    → Dashboard / Reportes / AI Analytics
```

---

## Servicios Externos

| Servicio | Para qué |
|----------|----------|
| Google Workspace | Login con cuentas @distritomkt.com |
| Almacenamiento en la nube | Archivos, evidencias, documentos |
| Proveedor de AI | Asistente, propuestas, análisis |
| Servicio de email | ODCs, cotizaciones, notificaciones |
| Monitoreo | Errores y caídas del sistema |

---

## Notas

1. Desde la semana 4 el equipo ya puede usar el sistema para tracking de proyectos
2. La AI está integrada desde el inicio, no es un agregado posterior
3. El ciclo financiero completo está cubierto: costeo → ODC → pago → factura → cobro → P&L
4. El sistema notifica y alerta, no espera a que alguien revise
5. Todo queda registrado y es buscable: evidencias, propuestas, facturas, historial
6. Con 2 personas en paralelo se puede reducir a 12-13 semanas
