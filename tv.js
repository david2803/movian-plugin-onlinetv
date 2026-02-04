/* eslint-disable camelcase */
/* eslint-disable no-var */

/**
 * K&D IPTV - Versión Final Corregida
 */

var page = require('showtime/page');
var service = require('showtime/service');
var settings = require('showtime/settings');
var popup = require('native/popup');

// --- IMPORTACIÓN DE TUS MÓDULOS EN /UTILS ---
var Base64 = require('./utils/Base64').Base64; 
var Unpacker = require('./utils/Dean-Edwards-Unpacker').unpacker;
var Utils = require('./utils/utils');

var plugin = JSON.parse(Plugin.manifest);
var logo = Plugin.path + plugin.icon;

// --- PERSISTENCIA ---
var playlists = require('movian/store').create('playlists');
var history = require('movian/store').create('history');

if (!playlists.list) playlists.list = '[]';
if (!history.list) history.list = '[]';

// --- FUNCIONES ---
function coloredStr(str, color) { return '<font color="' + color + '">' + str + '</font>'; }

function smartDecode(str) {
  if (!str) return '';
  var cleanStr = str.replace('base64:', '').trim();
  if (/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/.test(cleanStr) && cleanStr.length > 5) {
    try { return Base64.decode(cleanStr); } catch (e) { return str; }
  }
  return str;
}

function addToHistory(title, link) {
  var currentHistory = JSON.parse(history.list);
  currentHistory = currentHistory.filter(function(item) { return item.link !== link; });
  currentHistory.unshift({ title: title, link: link });
  if (currentHistory.length > 10) currentHistory.pop();
  history.list = JSON.stringify(currentHistory);
}

// --- RUTA PRINCIPAL ---
service.create(plugin.title, plugin.id + ':start', 'tv', true, logo);

new page.Route(plugin.id + ':start', function(page) {
  page.metadata.title = new RichText(plugin.title);
  page.metadata.logo = logo;
  page.type = 'directory';
  page.contents = 'items';

  // 1. LISTA OFICIAL (FIJA)
  page.appendItem('', 'separator', { title: 'Servicio Oficial' });
  var defaultUrl = 'http://bit.ly/KDmovis';
  page.appendItem('m3u:' + encodeURIComponent(defaultUrl), 'directory', { 
    title: coloredStr('★ K&D IPTV Premium', '00CCFF'),
    icon: logo,
    description: 'Lista oficial actualizada automáticamente.'
  });

  // 2. HISTORIAL
  var hist = JSON.parse(history.list);
  if (hist.length > 0) {
    page.appendItem('', 'separator', { title: 'Recientes' });
    hist.forEach(function(item) {
      page.appendItem(item.link, 'video', { title: decodeURIComponent(item.title) });
    });
  }

  // 3. SECCIÓN USUARIO
  page.appendItem('', 'separator', { title: 'Mis Listas' });
  page.options.createAction('addPl', 'Añadir Lista/Magnet', function() {
    var res = popup.textDialog('Enlace o Base64:', true, true);
    if (!res.rejected && res.input) {
      var name = popup.textDialog('Nombre:', true, true);
      if (!name.rejected && name.input) {
        var current = JSON.parse(playlists.list);
        current.unshift({ title: encodeURIComponent(name.input), link: encodeURIComponent(res.input) });
        playlists.list = JSON.stringify(current);
        page.redirect(plugin.id + ':start');
      }
    }
  });

  // Mostrar listas guardadas
  var pl = JSON.parse(playlists.list);
  pl.forEach(function(item) {
    var cleanLink = smartDecode(decodeURIComponent(item.link));
    var route = (cleanLink.indexOf('magnet:') === 0) ? 
                plugin.id + ':torrentPlayback:' + escape(cleanLink) + ':' + item.title :
                'm3u:' + encodeURIComponent(cleanLink);
    page.appendItem(route, 'directory', { title: decodeURIComponent(item.title) });
  });
});

// --- RUTA TORRENT ---
new page.Route(plugin.id + ':torrentPlayback:(.*):(.*)', function(page, url, title) {
  var decodedUrl = smartDecode(unescape(url));
  addToHistory(title, plugin.id + ':torrentPlayback:' + url + ':' + title);
  page.type = 'video';
  page.source = 'videoparams:' + JSON.stringify({
    title: unescape(title),
    sources: [
      {url: 'torrent:' + decodedUrl, mimetype: 'video/torrent'},
      {url: 'http://127.0.0.1:6878/ace/getstream?url=' + escape(decodedUrl), mimetype: 'application/x-mpegURL'}
    ]
  });
});

// Soporte RichText para Movian
function RichText(str) { this.str = str; }
RichText.prototype.toRichString = function() { return this.str; };
