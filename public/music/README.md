# Música del sacerdote

Coloca aquí los archivos de audio que quieras que el sacerdote reproduzca.

- El motor busca por defecto `sacerdote-theme.mp3` dentro de esta carpeta y lo sirve desde el backend (`/music/sacerdote-theme.mp3`).
- Puedes cambiar el archivo configurando la variable `VITE_PRIEST_TRACK` (por ejemplo `VITE_PRIEST_TRACK=/music/mi-cancion.mp3` en tu `.env` o en Vercel).
- Asegúrate de usar formatos compatibles con los navegadores (MP3, OGG, WAV). Vite copiará esta carpeta tal cual al build final.

Simplemente arrastra la canción a este directorio, vuelve a desplegar y el sacerdote la usará automáticamente.
