# App de Seguimiento de Titulación

Aplicación móvil para digitalizar y dar seguimiento al proceso de titulación de los egresados del
**Instituto Tecnológico de Conkal** (Tecnológico Nacional de México), Conkal, Yucatán.

La app permite consultar las etapas del proceso y sus requisitos, cargar los documentos solicitados,
conocer su estado de revisión y dar seguimiento al avance del trámite. Este repositorio concentra la
documentación, el código fuente, las pruebas y las presentaciones del proyecto, y se irá actualizando
conforme avance el trabajo.

## Equipo

| Foto | Integrante | Correo |
|:---:|---|---|
| <img src="fotos/misael-can-balam.jpg.png" width="120"> | **Misael Can Balam** | L23800326@conkal.tecnm.mx |
| <img src="fotos/adriana-cen-gonzalez.jpg.png" width="120"> | **Adriana Cen González** | L23800036@conkal.tecnm.mx |
| <img src="fotos/cristian-poot-ix.jpg" width="120"> | **Cristian Poot Ix** | L23800035@conkal.tecnm.mx |

## Organización del repositorio (ramas)

| Rama | Contenido |
|---|---|
| [`main`](../../tree/main) | Portada, equipo y fotos |
| [`documentacion`](../../tree/documentacion) | Definición de usuarios, Especificación de requerimientos de software, Artículo |
| [`codigos-fuente`](../../tree/codigos-fuente) | Código de la app móvil, API y base de datos |
| [`pruebas`](../../tree/pruebas) | Formatos, videos y audios |
| [`presentaciones`](../../tree/presentaciones) | Divulgación e Investigadores |

## Documentación

Disponible en la rama [`documentacion`](../../tree/documentacion):

- **Definición de usuarios:** perfiles Egresado, Revisor, Asesor y Administrador.
- **Especificación de requerimientos de software:** requisitos funcionales y no funcionales (borrador v0.1).
- **Artículo:** metodología y practicidad de la aplicación, elaborado con la plantilla del congreso CITCA 2025.

## Tecnologías

| Componente | Tecnología |
|---|---|
| Aplicación móvil | Ionic (Android) |
| API | Node.js + Express |
| Base de datos | MariaDB |
| Correo y autenticación | Resend (validación de correo institucional) |
| Gestión del proyecto | Scrum, Jira y GitHub |

## Estado del proyecto

- **Desarrollo:** primera versión funcional con las 8 historias de usuario planificadas, en 4 sprints.
- **Pruebas:** pruebas internas del equipo en inicio de sesión, registro, consulta de requisitos,
  carga de documentos y seguimiento del avance.
- **Pendiente:** evaluación con usuarios reales, integración con el SIIA, versión para iOS y chatbot de asistencia.

## Cómo navegar el repositorio

Para ver el contenido de otra rama, usa el selector de ramas en la parte superior izquierda de GitHub
o los enlaces de la tabla anterior.
