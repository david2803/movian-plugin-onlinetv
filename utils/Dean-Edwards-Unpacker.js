/**
 * Unpacker for Dean Edward's p.a.c.k.e.r
 * Adaptado para Movian Media Center
 */

var P_A_C_K_E_R = {
    detect: function(str) {
        if (!str || typeof str !== 'string') return false;
        return (P_A_C_K_E_R.get_chunks(str).length > 0);
    },

    get_chunks: function(str) {
        // Busca bloques que empiecen con eval(function(p,a,c,k,e,r)...
        var chunks = str.match(/eval\(\(?function\(.*?(,0,\{\}\)\)|split\('\|'\)\)\))($|\n)/g);
        return chunks ? chunks : [];
    },

    unpack: function(str) {
        var chunks = P_A_C_K_E_R.get_chunks(str);
        if (!chunks) return str;
        
        for (var i = 0; i < chunks.length; i++) {
            var chunk = chunks[i].replace(/\n$/, '');
            var unpacked = P_A_C_K_E_R.unpack_chunk(chunk);
            str = str.split(chunk).join(unpacked);
        }
        return str;
    },

    unpack_chunk: function(str) {
        var unpacked_source = '';
        // Guardamos una referencia al eval real del sistema
        var __real_eval = eval;
        
        if (P_A_C_K_E_R.detect(str)) {
            try {
                // Redirigimos temporalmente el eval para capturar el código descomprimido
                eval = function(s) { 
                    unpacked_source += s;
                    return unpacked_source;
                };
                
                // Ejecutamos el chunk ofuscado
                __real_eval(str);
                
                if (typeof unpacked_source === 'string' && unpacked_source) {
                    str = unpacked_source;
                }
            } catch (e) {
                // Si falla, devolvemos el original para evitar que el plugin se cierre
            } finally {
                // Restauramos SIEMPRE el eval original
                eval = __real_eval;
            }
        }
        return str;
    }
};

// Exportación para el sistema de módulos de Movian
exports.unpacker = P_A_C_K_E_R;
