# Música del sacerdote

Coloca aquí los archivos de audio que quieras que el sacerdote reproduzca.

- El motor intenta cargar primero `VITE_PRIEST_TRACK` si está configurado. Si no, busca `sacerdote-theme.mp3` y luego `sacerdote-theme.wav` en esta carpeta. Utiliza esos nombres para tus pistas o define tu propia ruta con la variable de entorno.
- Usa formatos compatibles (WAV, MP3, OGG). Vite copia `public/` directo al build, así que todo lo que guardes aquí quedará disponible en producción.

Arrastra tu canción a esta carpeta, vuelve a compilar/desplegar y el sacerdote la usará automáticamente cuando alguien se acerque.
