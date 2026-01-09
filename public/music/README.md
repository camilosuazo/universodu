# Música del sacerdote

Coloca aquí los archivos de audio que quieras que el sacerdote reproduzca.

- El motor incluye un tema base `sacerdote-theme.wav`. Si dejas este mismo nombre, se servirá desde `/music/sacerdote-theme.wav`.
- Puedes reemplazarlo por cualquier otro archivo o apuntar a uno distinto configurando la variable `VITE_PRIEST_TRACK` (ej. `VITE_PRIEST_TRACK=/music/mi-cancion.mp3`).
- Usa formatos compatibles (WAV, MP3, OGG). Vite copia `public/` directo al build, así que todo lo que guardes aquí quedará disponible en producción.

Arrastra tu canción a esta carpeta, vuelve a compilar/desplegar y el sacerdote la usará automáticamente cuando alguien se acerque.
