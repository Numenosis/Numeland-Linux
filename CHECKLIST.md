# Checklist de Requerimientos - VibeCheck: WinRate Tracker

## 1. Estándares de Codificación
- [ ] **TypeScript**: Uso estricto de tipos para evitar errores en tiempo de ejecución.
- [ ] **Componentes Funcionales**: Uso de React 19 con Hooks (`useState`, `useEffect`, `useMemo`).
- [ ] **Estructura de Archivos**: Separación clara entre componentes UI, lógica de Firebase y utilidades.
- [ ] **Tailwind CSS**: Uso consistente de clases de utilidad para el diseño.
- [ ] **Naming Conventions**: PascalCase para componentes, camelCase para funciones y variables.

## 2. Eficiencia y Rendimiento
- [ ] **Real-time Updates**: Uso de `onSnapshot` de Firestore para actualizaciones sin recargar.
- [ ] **Optimización de Renders**: Uso de `useMemo` para cálculos pesados (como el winrate global).
- [ ] **Lazy Loading**: (Opcional) Carga diferida de componentes pesados.
- [ ] **Asset Optimization**: Uso de fuentes de Google Fonts y optimización de imágenes (si las hay).

## 3. Seguridad
- [ ] **Firebase Auth**: Autenticación segura mediante Google Sign-In.
- [ ] **Firestore Security Rules**: Reglas que impiden que un usuario lea o escriba datos de otro.
- [ ] **Validación Frontend**: Uso de `Zod` para validar entradas de texto antes de enviarlas a la base de datos.
- [ ] **Manejo de Sesiones**: Persistencia de sesión gestionada por Firebase Auth.

## 4. Experiencia de Usuario (UX/UI)
- [ ] **Estética "The Neighbourhood"**: Paleta monocromática (negro, blanco, grises), alto contraste, minimalismo.
- [ ] **Animaciones Dinámicas**: Uso de `motion/react` para transiciones suaves y feedback visual.
- [ ] **Diseño Responsivo**: Adaptabilidad a dispositivos móviles y escritorio.
- [ ] **Manejo de Errores**: Feedback claro al usuario en caso de fallos de red o permisos.

## 5. Funcionalidad Mínima
- [ ] **Login/Logout**: Flujo completo de autenticación.
- [ ] **CRUD de Competencias**: Crear, leer y eliminar competencias.
- [ ] **Registro de Partidas**: Botones rápidos para registrar victorias y derrotas.
- [ ] **Cálculo de WinRate**: Visualización dinámica del porcentaje de victorias.
