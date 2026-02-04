​📺 Movian Online TV + Torrent Plugin
​Este es un plugin avanzado para Movian Media Center que permite la reproducción de canales de TV en vivo, listas M3U/XML y, ahora, soporte completo para enlaces Magnet y archivos Torrent.
​🚀 Características Principales
​Soporte de Listas: Carga tus propias listas M3U y XML.
​Reproductor Torrent Nativo: Aprovecha el motor interno de BitTorrent de Movian para una reproducción fluida.
​Sistema Híbrido (Fallback): Si el motor nativo falla, el plugin intenta automáticamente abrir el enlace a través de AceStream.
​Favoritos: Guarda tus canales o películas favoritas para acceder rápidamente.
​Proveedores Integrados: Acceso directo a servicios como Tivix, Youtv y más.
​🛠️ Instalación
​Copia la URL de tu repositorio de GitHub (o el enlace al archivo manifest.json).
​En Movian, ve a la sección de Plugins.
​Selecciona Instalar desde URL.
​Pega el enlace y confirma la instalación.
​🧲 Cómo usar Torrents y Magnets
​Hemos simplificado la integración para que no necesites menús complicados:
​En la pantalla principal, selecciona "Add M3U playlist / Magnet".
​Pega tu enlace Magnet (ej. magnet:?xt=urn:btih:...) o la URL de un archivo .torrent.
​Asigna un nombre (ej. "Película HD").
​¡Listo! Al abrirlo, Movian intentará cargarlo primero con su motor nativo.
​Nota: Para que el respaldo (fallback) funcione, asegúrate de configurar la IP de tu servidor AceStream en los ajustes del plugin.
​⚙️ Configuración de AceStream
​Si utilizas un servidor de AceStream externo (como un PC o una Raspberry Pi en tu red):
​Entra en la Configuración del plugin.
​Busca la opción "IP address of AceStream Proxy".
​Introduce la dirección IP de tu servidor (ej. 192.168.1.50).
​El puerto por defecto es el 6878, el cual ya está configurado internamente.
​🛠️ Desarrollo y Contribución
​Si deseas modificar el código o añadir nuevos proveedores:
​El archivo principal es tv.js.
​Asegúrate de mantener las funciones de decodificación al final del archivo.
​Los pull requests son bienvenidos.
​📝 Créditos
​Desarrollado para la comunidad de Movian Media Center.