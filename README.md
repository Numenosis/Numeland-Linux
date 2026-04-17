# Numeland: WinRate Tracker

Un trackeador de competencias y winrates con estética minimalista monocromática (Bento Grid / The Neighbourhood aesthetic). 

Este proyecto está construido con **React (Vite), TypeScript, Tailwind CSS v4 y Firebase**. Es completamente compatible con entornos Linux.

## Requisitos Previos para Linux (Ubuntu/Debian/Mint)

Para correr este proyecto en tu distribución de Linux, necesitarás tener instalado **Node.js** y **Git**.
Si no los tienes, puedes instalarlos abriendo tu terminal y ejecutando:

```bash
sudo apt update
sudo apt install nodejs npm git
```
*(Recomendación: Usa Node.js versión 18 o superior).*

## Instrucciones de Instalación local

1. **Clona el repositorio** (una vez que lo hayas subido a tu GitHub) o descomprime el archivo ZIP.
   ```bash
   git clone https://github.com/TU_USUARIO/numeland.git
   cd numeland
   ```

2. **Instala las dependencias** del proyecto mediante npm:
   ```bash
   npm install
   ```

3. **Inicia el servidor de desarrollo**:
   ```bash
   npm run dev
   ```

4. **Abre la aplicación**:
   Abre tu navegador de preferencia (Firefox, Chrome, Brave) y dirígete a:
   `http://localhost:3000`

## Estructura y Configuración de Base de Datos (Firebase)

El proyecto utiliza Firebase (Authentication y Firestore).
La clave de configuración se encuentra en el archivo `firebase-applet-config.json`. 

```json
{
  "projectId": "...",
  "appId": "...",
  "apiKey": "...",
  "authDomain": "...",
  "firestoreDatabaseId": "..."
}
```

**Nota sobre GitHub:** Las claves de Firebase para el frontend (apikey, etc.) son públicas por diseño para que las aplicaciones web funcionen. Sin embargo, toda la seguridad de la app está respaldada por las **Security Rules** de Firestore configuradas por consola, previniendo que cualquiera edite la base de datos sin estar logeado o tocando datos que no le pertenecen.

## Construcción para Producción

Si deseas compilar la aplicación para subirla a un host como Vercel, Netlify o un servidor Nginx en Linux:

```bash
npm run build
```
Los archivos estáticos minificados se generarán en la carpeta `dist/`.

## Características
- Autenticación mediante Correo/Contraseña predeterminado (`admin` / `admin`).
- Registro con validación robusta de contraseñas.
- Firestore en tiempo real usando el sistema `Long Polling` forzado para evitar problemas de firewall en diferentes redes.
- Interfaz gráfica fluida usando `motion/react`.
