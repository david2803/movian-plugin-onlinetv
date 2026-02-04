/*
  (The MIT License as published by OSI)
  Base64 ECMAScript codec object
  Copyright (c) 2008 Peter S. May
*/

var Base64 = (function() {
  var table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

  function rord(q, n) { return (table.indexOf(q.charAt(n)) & 0x3F); }
  function rchr(x) { return table.charAt(0x3F & x); }
  function ord(c, n) { return 0xFF & c.charCodeAt(n); }
  function chr(x) { return String.fromCharCode(0xFF & x); }
  
  function r64_x24(q) {
    return (rord(q, 0) << 18) | (rord(q, 1) << 12) | (rord(q, 2) << 6) | rord(q, 3);
  }
  
  function x24_r64(x) {
    return rchr(x >> 18) + rchr(x >> 12) + rchr(x >> 6) + rchr(x);
  }
  
  function c3_x24(c) {
    return (ord(c, 0) << 16) | (ord(c, 1) << 8) | ord(c, 2);
  }
  
  function x24_c3(x) {
    return chr(x >> 16) + chr(x >> 8) + chr(x);
  }

  function reqstr(s) {
    if (typeof s !== 'string') throw "String expected";
  }

  return {
    encode: function(s) {
      reqstr(s);
      var len = s.length;
      var out = [];
      for (var i = 0; i < len; i += 3) {
        var w = x24_r64(c3_x24((s.substring(i, i + 3) + "\0\0").substring(0, 3)));
        if (3 > len - i) {
          w = (w.substring(0, 1 + len - i) + "==").substring(0, 4);
        }
        out.push(w);
      }
      return out.join('') || '';
    },

    decode: function(s) {
      reqstr(s);
      var len = s.length;
      var out = [];
      var m;
      for (var i = 0; i < len; i += 4) {
        var w = s.substring(i, i + 4);
        if (/^[A-Za-z0-9+\/]{4}$/.test(w)) {
          out.push(x24_c3(r64_x24(w)));
        } else if (m = /^([A-Za-z0-9+\/]{2,3})==?$/.exec(w)) {
          if (w.length !== 4) throw "Invalid length";
          w = (m[1] + "AA").substring(0, 4);
          var c3 = x24_c3(r64_x24(w));
          out.push(c3.substring(0, m[1].length - 1));
        }
      }
      return out.join('') || '';
    }
  };
})();

// Exportación correcta para Movian
exports.Base64 = Base64;
