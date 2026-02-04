/* eslint-disable camelcase */
/* eslint-disable guard-for-in */
/* eslint-disable no-unused-vars */
/* eslint-disable max-len */
/* eslint-disable require-jsdoc */
/* eslint-disable one-var */
/* eslint-disable no-var */

/**
 * Online TV plugin for Movian Media Center (Updated with Torrent/Magnet Support)
 */

var page = require('showtime/page');
var service = require('showtime/service');
var settings = require('showtime/settings');
var http = require('showtime/http');
var string = require('native/string');
var popup = require('native/popup');
var io = require('native/io');

// --- IMPORTACIÓN DE UTILS ---
var Base64 = require('./utils/Base64').Base64; // Importación de tu archivo Base64.js
var DeanEdwardsUnpacker = require('./utils/Dean-Edwards-Unpacker').unpacker;

var plugin = JSON.parse(Plugin.manifest);
var logo = Plugin.path + plugin.icon;

RichText = function(x) {
  this.str = x.toString();
};

RichText.prototype.toRichString = function(x) {
  return this.str;
};

var UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.84 Safari/537.36';

function setPageHeader(page, title) {
  if (page.metadata) {
    page.metadata.title = new RichText(decodeURIComponent(title));
    page.metadata.logo = logo;
  }
  page.type = 'directory';
  page.contents = 'items';
  page.loading = false;
}

var blue = '6699CC',
  orange = 'FFA500',
  red = 'EE0000',
  green = '008B45';

function coloredStr(str, color) {
  return '<font color="' + color + '">' + str + '</font>';
}

function trim(s) {
  if (s) return s.replace(/(\r\n|\n|\r)/gm, '').replace(/(^\s*)|(\s*$)/gi, '').replace(/[ ]{2,}/gi, ' ').replace(/\t/g, '');
  return '';
}

service.create(plugin.title, plugin.id + ':start', 'tv', true, logo);

settings.globalSettings(plugin.id, plugin.title, logo, plugin.synopsis);
settings.createBool('disableSampleList', 'Don\'t show Sample M3U list', false, function(v) {
  service.disableSampleList = v;
});
settings.createBool('disableSampleXMLList', 'Don\'t show Sample XML list', false, function(v) {
  service.disableSampleXMLList = v;
});
settings.createBool('disableProvidersList', 'Don\'t show Provider list', false, function(v) {
  service.disableProviderList = v;
});
settings.createBool('disableEPG', 'Don\'t fetch EPG', true, function(v) {
  service.disableEPG = v;
});
settings.createString('acestreamIp', 'IP address of AceStream Proxy. Enter IP only.', '192.168.0.93', function(v) {
  service.acestreamIp = v;
});
settings.createBool('debug', 'Enable debug logging', false, function(v) {
  service.debug = v;
});
settings.createBool('disableMyFavorites', 'Don\'t show My Favorites', false, function(v) {
  service.disableMyFavorites = v;
});
settings.createAction('cleanFavorites', 'Clean My Favorites', function() {
  store.list = '[]';
  popup.notify('Favorites has been cleaned successfully', 2);
});

var store = require('movian/store').create('favorites');
if (!store.list) {
  store.list = '[]';
}

var playlists = require('movian/store').create('playlists');
if (!playlists.list) {
  playlists.list = '[]';
}

function addOptionForAddingToMyFavorites(item, link, title, icon) {
  item.addOptAction('Add \'' + title + '\' to My Favorites', function() {
    var entry = JSON.stringify({
      link: encodeURIComponent(link),
      title: encodeURIComponent(title),
      icon: encodeURIComponent(icon),
    });
    store.list = JSON.stringify([entry].concat(eval(store.list)));
    popup.notify('\'' + title + '\' has been added to My Favorites.', 2);
  });
}

// --- RUTA: REPRODUCCIÓN TORRENT HÍBRIDA ---
new page.Route(plugin.id + ':torrentPlayback:(.*):(.*)', function(page, url, title) {
  page.loading = true;
  page.metadata.title = unescape(title);
  var torrentUrl = unescape(url);

  var nativeSource = 'torrent:' + torrentUrl;
  var aceSource = 'http://' + service.acestreamIp + ':6878/ace/getstream?url=' + escape(torrentUrl);

  page.type = 'video';
  page.source = 'videoparams:' + JSON.stringify({
    title: unescape(title),
    canonicalUrl: plugin.id + ':torrentPlayback:' + url + ':' + title,
    sources: [
      {url: nativeSource, mimetype: 'video/torrent'},
      {url: aceSource, mimetype: 'application/x-mpegURL'}
    ],
    no_fs_scan: true,
    no_subtitle_scan: false
  });
  page.loading = false;
});

new page.Route(plugin.id + ':acestream:(.*):(.*)', function(page, id, title) {
  playUrl(page, 'http://' + service.acestreamIp + ':6878/ace/manifest.m3u8?id=' + id.replace('//', ''), plugin.id + ':acestream:' + id + ':' + title, unescape(title));
});

function playUrl(page, url, canonicalUrl, title, mimetype, icon, subsscan, imdbid) {
  if (url) {
    if (url.substr(0, 2) == '//') url = 'http:' + url;
    page.type = 'video';
    page.source = 'videoparams:' + JSON.stringify({
      title: title,
      imdbid: imdbid ? imdbid : void (0),
      canonicalUrl: canonicalUrl,
      icon: icon ? unescape(icon) : void (0),
      sources: [{
        url: url.match(/m3u8/) ? 'hls:' + url : url,
        mimetype: mimetype ? mimetype : void (0),
      }],
      no_subtitle_scan: subsscan ? false : true,
      no_fs_scan: subsscan ? false : true,
    });
  } else {
    page.error('Sorry, can\'t get the link :(');
  }
  page.loading = false;
}

function isPlaylist(pl) {
  var upl = unescape(pl).toUpperCase();
  if (upl.indexOf('MAGNET:') === 0 || upl.indexOf('.TORRENT') !== -1) return false;

  var extension = upl.split('.').pop();
  if (upl.substr(0, 4) == 'XML:') return 'xml';
  if (upl.substr(0, 4) == 'M3U:' || (extension == 'M3U' && upl.substr(0, 4) != 'HLS:')) return 'm3u';
  if (upl.match(/BIT.DO/) || upl.match(/BIT.LY/) || upl.match(/GOO.GL/) || upl.match(/TINYURL.COM/) || upl.match(/RAW.GITHUB/)) return 'm3u';
  return false;
}

function addItem(page, url, title, icon, description, genre, epgForTitle, headers) {
  if (!epgForTitle) epgForTitle = '';
  var type = 'video';
  var link;
  var playlistType = isPlaylist(url);

  if (url.indexOf('magnet:') === 0 || url.toLowerCase().indexOf('.torrent') !== -1) {
    link = plugin.id + ':torrentPlayback:' + escape(url) + ':' + escape(title);
  } else if (url.match(/([\s\S]*?):(.*)/) && playlistType) {
    link = playlistType + ':' + encodeURIComponent(url) + ':' + escape(title);
    type = 'directory';
  } else if (url.match(/([\s\S]*?):(.*)/) && !url.toUpperCase().match(/HTTP/) && !url.toUpperCase().match(/RTMP/)) {
    link = plugin.id + ':' + url + ':' + escape(title);
  } else {
    var linkUrl = url.toUpperCase().match(/M3U8/) || url.toUpperCase().match(/\.SMIL/) ? 'hls:' + url : url;
    link = 'videoparams:' + JSON.stringify({
      title: title,
      icon: icon ? icon : void (0),
      sources: [{ url: linkUrl }],
      no_fs_scan: true,
      no_subtitle_scan: true,
    });
  }

  if (headers && url.indexOf('magnet:') === -1) {
    io.httpInspectorCreate('.*' + url.replace('http://', '').replace('https://', '').split(/[/?#]/)[0].replace(/\./g, '\\.') + '.*', function(req) {
      var tmp = headers.split('|');
      for (var i in tmp) {
        var header = unescape(tmp[i].replace(/\"/g, '')).match(/([\s\S]*?)=([\s\S]*?)$/);
        if (header) req.setHeader(header[1], header[2]);
      }
    });
  }

  var item = page.appendItem(link, type, {
    title: new RichText(title + epgForTitle),
    icon: icon ? icon : null,
    genre: genre,
    description: new RichText((url.indexOf('magnet:') === 0 ? coloredStr('Protocolo: BitTorrent', green) : coloredStr('Link: ', orange) + url) +
      (description ? '\n' + description : '')),
  });
  addOptionForAddingToMyFavorites(item, link, title, icon);
}

// --- INICIO DEL PLUGIN ---
new page.Route(plugin.id + ':start', function(page) {
  setPageHeader(page, plugin.title);
  if (!service.disableMyFavorites) page.appendItem(plugin.id + ':favorites', 'directory', { title: 'My Favorites' });

  page.appendItem('', 'separator', { title: 'M3U & XML playlists' });

  page.options.createAction('addPlaylistM3U', 'Add M3U playlist / Magnet', function() {
    var result = popup.textDialog('Enter URL or Magnet Link:', true, true);
    if (!result.rejected && result.input) {
      var link = result.input;
      var name = popup.textDialog('Enter name:', true, true);
      if (!name.rejected && name.input) {
        var entry = JSON.stringify({ title: encodeURIComponent(name.input), link: 'm3u:' + encodeURIComponent(link) });
        playlists.list = JSON.stringify([entry].concat(eval(playlists.list)));
        page.flush();
        page.redirect(plugin.id + ':start');
      }
    }
  });

  showPlaylist(page);

  if (!service.disableProviderList) {
    page.appendItem('', 'separator', { title: 'Providers' });
    page.appendItem(plugin.id + ':tivixStart', 'directory', { title: 'tv.tivix.co' });
    page.appendItem(plugin.id + ':youtvStart', 'directory', { title: 'Youtv.com.ua' });
  }
});

function showPlaylist(page) {
  var playlist = eval(playlists.list);
  for (var i in playlist) {
    var itemmd = JSON.parse(playlist[i]);
    var cleanLink = decodeURIComponent(itemmd.link);
    var route = cleanLink.indexOf('magnet:') !== -1 ? plugin.id + ':torrentPlayback:' + escape(cleanLink) : cleanLink + ':' + itemmd.title;

    var item = page.appendItem(route, 'directory', { title: decodeURIComponent(itemmd.title) });
  }
}

// --- FUNCIONES DE DECODIFICACIÓN (Uso de Base64) ---
function decodeData(data) {
  try {
    // Aquí es donde el archivo Base64.js entra en acción
    return Base64.decode(data);
  } catch (e) {
    return data;
  }
}
