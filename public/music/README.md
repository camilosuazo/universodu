# Música del sacerdote

Coloca aquí los archivos de audio que quieras que el sacerdote reproduzca.

- Coloca tu pista como `sacerdote-theme.mp3` y se servirá desde `/music/sacerdote-theme.mp3`. También puedes definir `VITE_PRIEST_TRACK=/music/mi-cancion.mp3` (o `window.UNIVERSODU_PRIEST_TRACK` en el HTML) para apuntar a otro archivo sin renombrarlo.
- Usa formatos compatibles (WAV, MP3, OGG). Vite copia `public/` directo al build, así que todo lo que guardes aquí quedará disponible en producción.

Arrastra tu canción a esta carpeta, vuelve a compilar/desplegar y el sacerdote la usará automáticamente cuando alguien se acerque.
