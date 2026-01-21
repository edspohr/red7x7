# Especificación Funcional - Red7x7

## 1. Visión General

**Red7x7** es una plataforma de **Networking Corporativo** diseñada para facilitar la conexión, colaboración y crecimiento entre profesionales. La aplicación gestiona una red de contactos dinámica donde la visibilidad y el acceso a la información dependen de la interacción real (asistencia a reuniones) y el nivel de suscripción del usuario.

## 2. Roles de Usuario y Permisos

El sistema maneja tres niveles de usuarios, cada uno con capacidades específicas:

### 2.1. Socio7x7 (Usuario Básico)

Es el nivel de entrada para todos los usuarios registrados.

- **Acceso:** Panel de Control, Directorio, Mis Reuniones, Perfil.
- **Directorio:** Puede ver la lista de miembros (nombre, empresa, cargo, fotos), pero **NO** puede ver datos de contacto (email, teléfono) a menos que haya conectado previamente con ellos.
- **Reuniones:** Puede ver sus reuniones pasadas y futuras.
- **Check-in:** Tiene un "Pasaporte Digital" (QR) para registrar asistencia en eventos presenciales.
- **Restricción:** Vista limitada en el directorio ("Plan Socio: Vista limitada").

### 2.2. Pro (Usuario Premium)

Usuarios con suscripción activa que disfrutan de beneficios de networking acelerado.

- **Todo lo de Socio7x7**, más:
- **Créditos de Desbloqueo:** Recibe **5 créditos mensuales** para "desbloquear" datos de contacto de personas que _no_ conoce.
- **Gestión de Desbloqueos:** Puede ver permanentemente los datos de los contactos que ha desbloqueado manualmente.
- **Distintivo:** Badge de "Pro Member" en su perfil y comentarios.

### 2.3. Admin (Administrador)

Usuarios encargados de la gestión de la plataforma.

- **Visibilidad Total:** Puede ver todos los datos de contacto de todos los usuarios sin restricciones.
- **Gestión de Usuarios:**
  - Añadir usuarios manualmente o por carga masiva (CSV).
  - Editar perfiles y roles.
  - Eliminar usuarios.
- **Gestión de Reuniones:**
  - Crear, editar y agendar reuniones (Virtuales o Presenciales).
  - Generar minutas automáticas y detectar participantes usando **IA (Gemini)**.
  - Gestionar el Check-in de usuarios mediante escáner QR integrado.
- **Comunicación:** Publicar anuncios globales (con opción de fijar con "chincheta").

## 3. Módulos Principales

### 3.1. Autenticación y Perfil

- **Registro/Login:** Soporte para Email/Contraseña y **Google Auth**.
- **Perfil de Usuario:**
  - Datos básicos: Nombre, Email, Empresa, Cargo, Teléfono, LinkedIn.
  - Foto: URL de imagen o avatar generado automáticamente por iniciales.
  - Tags de Networking: Campos "Busco" (ej. Inversionistas) y "Ofrezco" (ej. Consultoría) para facilitar el match.
  - **Pasaporte QR:** Un código QR único generado para cada perfil que sirve identificación rápida en eventos.

### 3.2. Directorio Inteligente (Smart Directory)

El corazón de la plataforma. La visibilidad de los datos de contacto se rige por la "Lógica de Conexión":

1.  **Conexión por Reunión (Orgánica):** Si el Usuario A y el Usuario B asisten a la misma reunión (registrado mediante Check-in o asignación manual), el sistema los marca automáticamente como "Conocidos" (`peopleMet`). A partir de ese momento, ambos pueden ver sus datos de contacto mutuamente para siempre.
2.  **Desbloqueo Pro (Pago):** Un usuario Pro puede gastar 1 crédito para ver los datos de alguien con quien no ha coincidido en reuniones.
3.  **Privacidad por Defecto:** Si no hay conexión ni desbloqueo, los datos sensibles (teléfono, email) permanecen ocultos.

### 3.3. Gestión de Reuniones

- **Tipos de Reunión:**
  - **Virtual:** Enlace a videollamada.
  - **Presencial:** Dirección física y escaneo de QR habilitado.
- **Calendario:** Integración para añadir eventos a Google Calendar.
- **Asistente de Minutas (IA):**
  - El administrador puede pegar notas "crudas" de una reunión.
  - El sistema usa IA (Google Gemini) para:
    1.  Redactar un **resumen ejecutivo** formateado.
    2.  **Detectar participantes** mencionados en el texto y pre-seleccionarlos para el registro de asistencia.

### 3.4. Panel de Anuncios

- Sistema de comunicación unidireccional (Admin -> Usuarios).
- Los anuncios pueden ser "Fijados" para aparecer siempre al principio.
- Formato de tarjeta con título, fecha y contenido.

## 4. Flujos Críticos del Sistema

### A. Flujo de Check-in (El "Match")

1.  Usuario asiste a evento y muestra su **Pasaporte QR** (en móvil).
2.  Administrador usa la función de **Escáner** en la app.
3.  Al escanear:
    - El usuario se marca como "Asistente" en la reunión.
    - **Mágicamente:** El usuario "conecta" con TODOS los demás participantes actuales de la reunión (se añaden a su lista de `peopleMet` y viceversa).
    - Los datos de contacto se vuelven visibles instantáneamente entre todos los participantes.

### B. Flujo de Onboarding

1.  Al primer inicio de sesión, el usuario ve una **guía interactiva** (Tour).
2.  Se le explica el Pasaporte QR y cómo funciona el desbloqueo de contactos.
3.  Se le invita a completar su perfil ("Busco"/"Ofrezco") para ser más relevante en el directorio.

### C. Importación de Usuarios (Admin)

1.  Admin sube archivo CSV (Nombre, Email, Empresa, Cargo).
2.  El sistema crea cuentas "pasivas" o pre-registradas.
3.  Cuando el usuario real se registra con ese email (o usa Google Auth), el sistema detecta el perfil preexistente y fusiona los datos automáticamente.
