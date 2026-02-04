/* eslint-disable camelcase */
/* eslint-disable guard-for-in */
/* eslint-disable no-unused-vars */
/* eslint-disable max-len */
/* eslint-disable require-jsdoc */
/* eslint-disable one-var */
/* eslint-disable no-var */

/**
 * Online TV plugin for Movian Media Center 
 * Total Compatibility Version: tv.js + Base64.js
 */

var page = require('showtime/page');
var service = require('showtime/service');
var settings = require('showtime/settings');
var http = require('showtime/http');
var string = require('native/string');
var popup = require('native/popup');
var io = require('native/io');

// --- INTEGRACIÓN CON UTILS/BASE64.JS ---
var Base64 = require('./utils/Base64').Base64; 
var DeanEdwardsUnpacker = require('./utils/Dean-Edwards-Unpacker').unpacker;

var plugin = JSON.parse(Plugin.manifest);
var logo = Plugin.path + plugin.icon;

// --- SOPORTE PARA TEXTO ENRIQUECIDO ---
RichText = function(x) {
  this.str = x.toString();
};

RichText.prototype.toRichString = function(x) {
  return this.str;
};

var UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.84 Safari/537.36';

// --- FUNCIONES AUXILIARES ---
function setPageHeader(page, title) {
  if (page.metadata) {
    page.metadata.title = new RichText(decodeURIComponent(title));
    page.metadata.logo = logo;
  }
  page.type = 'directory';
  page.contents = 'items';
  page.loading = false;
}

var blue = '6699CC', orange = 'FFA500', red = 'EE0000', green = '008B45';

function coloredStr(str, color) {
  return '<font color="' + color + '">' + str + '</font>';
}

/**
 * Función que utiliza el archivo utils/Base64.js
 * Detecta si una cadena es Base64 válida y la decodifica.
 */
function smartDecode(str) {
  if (!str) return '';
  // Intento de limpieza si viene con prefijos comunes
  var cleanStr = str.replace('base64:', '');
  try {
    // Expresión regular para validar formato Base64
    if (/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/.test(cleanStr)) {
      return Base64.decode(cleanStr);
    }
  } catch (e) {
    return str;
  }
  return str;
}

// --- CONFIGURACIÓN DE SERVICIO ---
service.create(plugin.title, plugin.id + ':start', 'tv', true, logo);

settings.globalSettings(plugin.id, plugin.title, logo, plugin.synopsis);
settings.createString('acestreamIp', 'IP AceStream Proxy', '192.168.0.93', function(v) {
  service.acestreamIp = v;
});

var store = require('movian/store').create('favorites');
var playlists = require('movian/store').create('playlists');
if (!store.list) store.list = '[]';
if (!playlists.list) playlists.list = '[]';

// --- RUTAS DE REPRODUCCIÓN ---

new page.Route(plugin.id + ':torrentPlayback:(.*):(.*)', function(page, url, title) {
  page.loading = true;
  var decodedUrl = smartDecode(unescape(url)); // Uso de Base64 aquí
  
  var nativeSource = 'torrent:' + decodedUrl;
  var aceSource = 'http://' + service.acestreamIp + ':6878/ace/getstream?url=' + escape(decodedUrl);

  page.type = 'video';
  page.source = 'videoparams:' + JSON.stringify({
    title: unescape(title),
    canonicalUrl: plugin.id + ':torrentPlayback:' + url + ':' + title,
    sources: [
      {url: nativeSource, mimetype: 'video/torrent'},
      {url: aceSource, mimetype: 'application/x-mpegURL'}
    ],
    no_fs_scan: true
  });
  page.loading = false;
});

function playUrl(page, url, canonicalUrl, title, mimetype) {
  if (url) {
    var finalUrl = smartDecode(url); // Uso de Base64 aquí
    if (finalUrl.substr(0, 2) == '//') finalUrl = 'http:' + finalUrl;
    
    page.type = 'video';
    page.source = 'videoparams:' + JSON.stringify({
      title: title,
      canonicalUrl: canonicalUrl,
      sources: [{
        url: finalUrl.match(/m3u8/) ? 'hls:' + finalUrl : finalUrl,
        mimetype: mimetype || void(0),
      }],
      no_subtitle_scan: true,
      no_fs_scan: true,
    });
  } else {
    page.error('URL no válida');
  }
  page.loading = false;
}

// --- LÓGICA DE ITEMS Y PLAYLISTS ---

function isPlaylist(pl) {
  var upl = unescape(pl).toUpperCase();
  if (upl.indexOf('MAGNET:') === 0 || upl.indexOf('.TORRENT') !== -1) return false;
  var extension = upl.split('.').pop();
  if (upl.substr(0, 4) == 'XML:') return 'xml';
  if (upl.substr(0, 4) == 'M3U:' || (extension == 'M3U')) return 'm3u';
  return false;
}

function addItem(page, url, title, icon, description) {
  var type = 'video';
  var link;
  var playlistType = isPlaylist(url);

  // Si la URL está en Base64, la procesamos antes de decidir la ruta
  var processedUrl = smartDecode(url);

  if (processedUrl.indexOf('magnet:') === 0 || processedUrl.toLowerCase().indexOf('.torrent') !== -1) {
    link = plugin.id + ':torrentPlayback:' + escape(processedUrl) + ':' + escape(title);
  } else if (playlistType) {
    link = playlistType + ':' + encodeURIComponent(processedUrl) + ':' + escape(title);
    type = 'directory';
  } else {
    var linkUrl = processedUrl.toUpperCase().match(/M3U8/) ? 'hls:' + processedUrl : processedUrl;
    link = 'videoparams:' + JSON.stringify({
      title: title,
      sources: [{ url: linkUrl }],
      no_fs_scan: true
    });
  }

  page.appendItem(link, type, {
    title: new RichText(title),
    icon: icon || null,
    description: new RichText(coloredStr('Link: ', orange) + processedUrl)
  });
}

// --- INICIO ---
new page.Route(plugin.id + ':start', function(page) {
  setPageHeader(page, plugin.title);
  
  page.appendItem('', 'separator', { title: 'Gestión de Contenido' });
  
  page.options.createAction('addPlaylistM3U', 'Añadir M3U / Magnet / Base64', function() {
    var result = popup.textDialog('Introduce URL (Soporta Base64):', true, true);
    if (!result.rejected && result.input) {
      var name = popup.textDialog('Nombre de la lista:', true, true);
      if (!name.rejected && name.input) {
        var entry = JSON.stringify({ title: encodeURIComponent(name.input), link: 'm3u:' + encodeURIComponent(result.input) });
        playlists.list = JSON.stringify([entry].concat(eval(playlists.list)));
        page.redirect(plugin.id + ':start');
      }
    }
  });

  // Mostrar listas guardadas
  var pl = eval(playlists.list);
  for (var i in pl) {
    var item = JSON.parse(pl[i]);
    var rawLink = decodeURIComponent(item.link);
    // Intentamos decodificar por si el usuario pegó un Base64 directamente
    var cleanLink = smartDecode(rawLink); 
    
    var route = cleanLink.indexOf('magnet:') !== -1 ? 
                plugin.id + ':torrentPlayback:' + escape(cleanLink) : 
                'm3u:' + encodeURIComponent(cleanLink);

    page.appendItem(route, 'directory', { title: decodeURIComponent(item.title) });
  }
});
