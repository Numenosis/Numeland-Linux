# Checklist de Requerimientos de Seguridad - Numeland

A continuación se detalla el análisis de seguridad de la aplicación actual, desglosado por áreas críticas de ciberseguridad. Se indica claramente qué directrices se están cumpliendo (✅) y cuáles no (❌), junto con la razón.

## 1. Autenticación y Gestión de Identidad (IAM)
- ✅ **[CUMPLE] Políticas de contraseñas fuertes:** La interfaz de registro (New System) exige obligatoriamente mínimo 8 caracteres, mayúsculas, minúsculas, números y un carácter especial.
- ✅ **[CUMPLE] Sesiones cifradas:** Al utilizar Firebase Auth, los tokens de sesión (JWT) se generan, manejan y almacenan de forma segura bajo los estándares de Google Cloud, evitando el manejo manual de cookies inseguras en el cliente.
- ❌ **[NO CUMPLE] Ausencia de credenciales incrustadas (Hardcoded Secrets):** *Implementado temporalmente por solicitud.* El sistema `admin/admin` contiene el correo y la contraseña real (`admin123456`) directamente en el código de React (`Auth.tsx`). Cualquier persona que inspeccione el código fuente en su navegador puede ver las credenciales reales de la cuenta administrativa.
- ❌ **[NO CUMPLE] Prevención de enumeración de usuarios:** Cuando se intenta registrar a un usuario ya existente, la UI lanza "Este nombre de usuario ya está en uso". Esto permite a un atacante hacer *fuerza bruta* para adivinar qué usuarios existen en tu sistema.

## 2. Autorización y Control de Acceso (Reglas de Firestore)
- ✅ **[CUMPLE] Default Deny (Principio de Menor Privilegio):** La base de datos asume que todo está bloqueado a menos que se indique explícitamente lo contrario.
- ✅ **[CUMPLE] Aislamiento de datos (Multi-tenancy seguro):** Ningún usuario puede ver, editar o borrar información que pertenezca a otra persona. Las reglas validan rigurosamente que el ID de sesión coincida con el propietario del documento (`isOwner` / `isDocOwner`).
- ✅ **[CUMPLE] Inmutabilidad de registros críticos:** Las partidas (`matches`) tienen explícitamente programado un bloqueo absoluto para edición (`allow update: if false;`). Un usuario puede borrar una partida o registrar una nueva, pero no puede "modificar" secretamente una derrota para convertirla en victoria.

## 3. Protección de Datos y Validación de Entrada
- ✅ **[CUMPLE] Schema Validation en Backend:** Nunca se debe confiar solo en la validación FrontEnd. Firestore actualmente valida que el nombre de la competencia ("name") sea un `string`, no esté vacío, y no sobrepase los 100 caracteres. Las victorias y derrotas están obligadas a ser "números" no-negativos (`wins >= 0`).
- ✅ **[CUMPLE] Evitar Inyección NoSQL masiva:** Se restringen explícitamente las "claves o payloads" inesperados limitando el modelo en el backend.
- ❌ **[NO CUMPLE] Límite de tamaño estricto global (DoS Prevention):** Aunque las competencias están protegidas, si existieran perfiles de usuario con campos abiertos, un usuario malintencionado podría enviar variables tipo `string` de 1 MegaByte por cada campo y agotar pronto tu límite gratuito de almacenamiento (Resource Exhaustion).

## 4. Seguridad de Frontend e Infraestructura
- ✅ **[CUMPLE] Mitigación parcial de ataques XSS:** React, por defecto, "escapa" (sanitiza) todas las variables inyectadas en el DOM antes de renderizarlas, evitando que inyecciones de Scripts HTML básicos sean ejecutados.
- ❌ **[NO CUMPLE] Content Security Policy (CSP):** El archivo `index.html` no especifica qué dominios son seguros para cargar imágenes, scripts, o fuentes web. (Se podría añadir una etiqueta meta para limitar esto exclusivamente a Firebase, Google Fonts y dominio local).
- ❌ **[NO CUMPLE] Logs de Auditoría (Audit Trails):** Si alguien roba la sesión mediante el ordenador de un tercero y borra todas las competencias de dicho usuario, el sistema actualmente no guarda un log histórico de *"El dia X se solicitó un borrado de la colección Y mediante la IP Z"*.

---
**Nota de evaluación final:** 
La aplicación tiene una postura de seguridad muy alta respecto a **"Aislamiento de bases de datos y Prevención de lectura"** (Nadie robará tus datos), pero al guardar las credenciales del admin escritas directamente en el Frontend por temas logísticos/especificaciones de la entrega, se incumple la regla número 1 del desarrollo seguro. Si esta app pasara a escenario productivo comercial con clientes reales, bastaría con crear el "admin" desde consola y eliminar el verificador hardcoded `if (username == 'admin')` del FrontEnd.
