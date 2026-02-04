/* eslint-disable camelcase */
/* eslint-disable no-var */

/**
 * K&D IPTV - Versión Final Estable
 */

var page = require('showtime/page');
var service = require('showtime/service');
var settings = require('showtime/settings');
var http = require('showtime/http');
var popup = require('native/popup');
var io = require('native/io');

// --- IMPORTACIÓN DE MÓDULOS ---
var Base64 = require('./utils/Base64').Base64; 
var Unpacker = require('./utils/Dean-Edwards-Unpacker').unpacker;
var Utils = require('./utils/utils');

var plugin = JSON.parse(Plugin.manifest);
var logo = Plugin.path + plugin.icon;

// --- PERSISTENCIA SEGURA ---
var store = require('movian/store').create('favorites');
var playlists = require('movian/store').create('playlists');
var history = require('movian/store').create('history');

if (!store.list) store.list = '[]';
if (!playlists.list) playlists.list = '[]';
if (!history.list) history.list = '[]';

// --- ESTILOS ---
var cyan = '00CCFF';
function coloredStr(str, color) { return '<font color="' + color + '">' + str + '</font>'; }

RichText = function(x) { this.str = x.toString(); };
RichText.prototype.toRichString = function() { return this.str; };

function setPageHeader(page, title) {
  if (page.metadata) {
    page.metadata.title = new RichText(decodeURIComponent(title));
    page.metadata.logo = logo;
  }
  page.type = 'directory';
  page.contents = 'items';
  page.loading = false;
}

// --- LÓGICA DE DECODIFICACIÓN ---
function smartDecode(str) {
  if (!str) return '';
  var cleanStr = str.replace('base64:', '').trim();
  // Validar si es Base64 antes de procesar
  if (/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/.test(cleanStr) && cleanStr.length > 5) {
    try { return Base64.decode(cleanStr); } catch (e) { return str; }
  }
  return str;
}

function addToHistory(title, link, icon) {
  var currentHistory = JSON.parse(history.list);
  var entry = { title: title, link: link, icon: icon };
  currentHistory = currentHistory.filter(function(item) { return item.link !== link; });
  currentHistory.unshift(entry);
  if (currentHistory.length > 10) currentHistory.pop();
  history.list = JSON.stringify(currentHistory);
}

// --- CONFIGURACIÓN ---
settings.createString('acestreamIp', 'IP de AceStream Proxy', '192.168.0.93', function(v) {
  service.acestreamIp = v;
});

// --- RUTA PRINCIPAL ---
service.create(plugin.title, plugin.id + ':start', 'tv', true, logo);

new page.Route(plugin.id + ':start', function(page) {
  setPageHeader(page, plugin.title);

  // 1. LISTA OFICIAL K&D
  page.appendItem('', 'separator', { title: 'Servicio Oficial' });
  var defaultUrl = 'http://bit.ly/KDmovis';
  page.appendItem('m3u:' + encodeURIComponent(defaultUrl), 'directory', { 
    title: coloredStr('★ K&D IPTV Premium', cyan),
    icon: logo,
    description: 'Lista maestra oficial. Actualización automática.'
  });

  // 2. HISTORIAL
  var hist = JSON.parse(history.list);
  if (hist.length > 0) {
    page.appendItem('', 'separator', { title: 'Vistos Recientemente' });
    hist.forEach(function(item) {
      page.appendItem(item.link, 'video', {
        title: decodeURIComponent(item.title),
        icon: item.icon ? decodeURIComponent(item.icon) : null
      });
    });
  }

  // 3. SECCIÓN PERSONAL
  page.appendItem('', 'separator', { title: 'Personal' });
  page.appendItem(plugin.id + ':favorites', 'directory', { title: 'Mis Favoritos' });

  page.options.createAction('addPl', 'Añadir Lista/Magnet/Base64', function() {
    var res = popup.textDialog('Enlace:', true, true);
    if (!res.rejected && res.input) {
      var name = popup.textDialog('Nombre:', true, true);
      if (!name.rejected && name.input) {
        var current = JSON.parse(playlists.list);
        var entry = { title: encodeURIComponent(name.input), link: encodeURIComponent(res.input) };
        current.unshift(entry);
        playlists.list = JSON.stringify(current);
        page.redirect(plugin.id + ':start');
      }
    }
  });

  // Listar adicionales
  var pl = JSON.parse(playlists.list);
  pl.forEach(function(item) {
    var cleanLink = smartDecode(decodeURIComponent(item.link));
    var route = (cleanLink.indexOf('magnet:') === 0) ? 
                plugin.id + ':torrentPlayback:' + escape(cleanLink) + ':' + item.title :
                'm3u:' + encodeURIComponent(cleanLink);
                
    page.appendItem(route, 'directory', { title: decodeURIComponent(item.title) });
  });
});

// --- REPRODUCCIÓN TORRENT ---
new page.Route(plugin.id + ':torrentPlayback:(.*):(.*)', function(page, url, title) {
  var decodedUrl = smartDecode(unescape(url));
  addToHistory(title, plugin.id + ':torrentPlayback:' + url + ':' + title, null);

  page.type = 'video';
  page.source = 'videoparams:' + JSON.stringify({
    title: unescape(title),
    sources: [
      {url: 'torrent:' + decodedUrl, mimetype: 'video/torrent'},
      {url: 'http://' + (service.acestreamIp || '127.0.0.1') + ':6878/ace/getstream?url=' + escape(decodedUrl), mimetype: 'application/x-mpegURL'}
    ],
    no_fs_scan: true
  });
});
