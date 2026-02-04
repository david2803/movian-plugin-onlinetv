/**
 * Utilidades de extracción de datos para Movian
 * Escanea objetos JSON/JS en busca de fuentes de video y etiquetas.
 */

function findSourcesList(text, source, label) {
  var retval = [];
  // Expresión regular mejorada para detectar objetos {source: "...", label: "..."} o viceversa
  var reg = new RegExp('\\{[^{]*' + source + '["\']?\\s*:\\s*[^{]+' + label + '["\']?\\s*:\\s*[^}]+\\}|\\{[^{]*' + label + '["\']?\\s*:\\s*[^{]+' + source + '["\']?\\s*:\\s*[^}]+\\}', 'g');
  var m;

  do {
    m = reg.exec(text);

    if (m) {
      try {
        var labelMatch = m[0].match(new RegExp(label + '["\']?\\s*:\\s*["\']([^"\']*)'));
        var sourceMatch = m[0].match(new RegExp(source + '["\']?\\s*:\\s*["\']([^"\']*)'));
        
        if (labelMatch && sourceMatch) {
          var labelText = labelMatch[1];
          var link = sourceMatch[1].replace(/\\/g, ''); // Limpiar backslashes de URLs escapadas
          
          retval.push(labelText);
          retval.push(link);
        }
      } catch (e) {
        // Si un objeto está mal formado, saltamos al siguiente sin romper el plugin
        continue;
      }
    }
  } while (m);

  return (retval.length > 0) ? retval : null;
}

// Exportación para que funcione con require('./utils/utils')
exports.findSourcesList = findSourcesList;
