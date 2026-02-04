/* eslint-disable camelcase */
/* eslint-disable guard-for-in */
/* eslint-disable no-unused-vars */
/* eslint-disable max-len */
/* eslint-disable require-jsdoc */
/* eslint-disable one-var */
/* eslint-disable no-var */

/**
 * Online TV plugin for Movian Media Center 
 * Versión Final: Base64 + Torrent + Historial
 */

var page = require('showtime/page');
var service = require('showtime/service');
var settings = require('showtime/settings');
var http = require('showtime/http');
var popup = require('native/popup');
var io = require('native/io');

// --- IMPORTACIÓN DE MÓDULOS ---
var Base64 = require('./utils/Base64').Base64; 
var plugin = JSON.parse(Plugin.manifest);
var logo = Plugin.path + plugin.icon;

// --- PERSISTENCIA (FAVORITOS, LISTAS E HISTORIAL) ---
var store = require('movian/store').create('favorites');
var playlists = require('movian/store').create('playlists');
var history = require('movian/store').create('history');

if (!store.list) store.list = '[]';
if (!playlists.list) playlists.list = '[]';
if (!history.list) history.list = '[]';

// --- ESTILOS ---
var orange = 'FFA500', green = '008B45';
function coloredStr(str, color) { return '<font color="' + color + '">' + str + '</font>'; }

RichText = function(x) { this.str = x.toString(); };
RichText.prototype.toRichString = function() { return this.str; };

// --- LÓGICA BASE64 (COMPATIBILIDAD CON Base64.js) ---
function smartDecode(str) {
  if (!str) return '';
  var cleanStr = str.replace('base64:', '').trim();
  try {
    // Verifica si es un Base64 válido antes de intentar
    if (/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/.test(cleanStr)) {
      return Base64.decode(cleanStr);
    }
  } catch (e) { return str; }
  return str;
}

// --- GESTIÓN DE HISTORIAL ---
function addToHistory(title, link, icon) {
  var currentHistory = JSON.parse(history.list);
  var entry = { title: title, link: link, icon: icon, time: new Date().getTime() };
  
  // Evitar duplicados: eliminar si ya existe el mismo link
  currentHistory = currentHistory.filter(function(item) { return item.link !== link; });
  
  // Añadir al inicio y limitar a 10 elementos
  currentHistory.unshift(entry);
  if (currentHistory.length > 10) currentHistory.pop();
  
  history.list = JSON.stringify(currentHistory);
}

// --- RUTAS ---

service.create(plugin.title, plugin.id + ':start', 'tv', true, logo);

new page.Route(plugin.id + ':start', function(page) {
  if (page.metadata) page.metadata.title = new RichText(plugin.title);
  
  // Sección Historial
  var hist = JSON.parse(history.list);
  if (hist.length > 0) {
    page.appendItem('', 'separator', { title: 'Vistos recientemente' });
    hist.forEach(function(item) {
      page.appendItem(item.link, 'video', {
        title: decodeURIComponent(item.title),
        icon: item.icon ? decodeURIComponent(item.icon) : null
      });
    });
  }

  page.appendItem('', 'separator', { title: 'Mi Contenido' });
  page.appendItem(plugin.id + ':favorites', 'directory', { title: 'Mis Favoritos' });

  // Botón para añadir M3U o Base64
  page.options.createAction('addPl', 'Añadir M3U / Base64 / Magnet', function() {
    var res = popup.textDialog('URL o Base64:', true, true);
    if (!res.rejected && res.input) {
      var name = popup.textDialog('Nombre:', true, true);
      if (!name.rejected && name.input) {
        var entry = JSON.stringify({ title: encodeURIComponent(name.input), link: encodeURIComponent(res.input) });
        playlists.list = JSON.stringify([entry].concat(eval(playlists.list)));
        page.redirect(plugin.id + ':start');
      }
    }
  });

  // Listar Playlists guardadas
  var pl = eval(playlists.list);
  for (var i in pl) {
    var item = JSON.parse(pl[i]);
    var decodedLink = smartDecode(decodeURIComponent(item.link));
    var route = 'm3u:' + encodeURIComponent(decodedLink);
    page.appendItem(route, 'directory', { title: decodeURIComponent(item.title) });
  }
});

// Ruta de reproducción Torrent con registro en historial
new page.Route(plugin.id + ':torrentPlayback:(.*):(.*)', function(page, url, title) {
  var decodedUrl = smartDecode(unescape(url));
  var cleanTitle = unescape(title);
  
  // Guardar en el historial al reproducir
  addToHistory(title, plugin.id + ':torrentPlayback:' + url + ':' + title, null);

  page.type = 'video';
  page.source = 'videoparams:' + JSON.stringify({
    title: cleanTitle,
    sources: [
      {url: 'torrent:' + decodedUrl, mimetype: 'video/torrent'},
      {url: 'http://' + service.acestreamIp + ':6878/ace/getstream?url=' + escape(decodedUrl), mimetype: 'application/x-mpegURL'}
    ]
  });
});

// Función global para añadir items (usada por scrapers internos)
function addItem(page, url, title, icon) {
  var processedUrl = smartDecode(url);
  var link;
  
  if (processedUrl.indexOf('magnet:') === 0 || processedUrl.indexOf('.torrent') !== -1) {
    link = plugin.id + ':torrentPlayback:' + escape(processedUrl) + ':' + escape(title);
  } else {
    link = 'videoparams:' + JSON.stringify({
      title: title,
      sources: [{ url: processedUrl.match(/m3u8/) ? 'hls:' + processedUrl : processedUrl }]
    });
  }

  var item = page.appendItem(link, 'video', {
    title: new RichText(title),
    icon: icon || null
  });

  // Al hacer clic, Movian registra la acción y nosotros podemos interceptar para el historial si fuera necesario
}
