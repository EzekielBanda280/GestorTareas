const express = require('express');
const cors = require('cors');
const path = require('path'); 
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 1. Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Objeto dinámico para guardar los datos en memoria
let usuariosSincronizados = {};

/**
 * FUNCIÓN AUXILIAR: Limpia las listas de tareas asegurando que todo sea un String plano.
 * Si la app móvil manda un objeto como { texto: "Comer" } o { title: "Comer" }, extrae solo el texto.
 */
const normalizarListaTareas = (lista) => {
    if (!Array.isArray(lista)) return [];
    return lista.map(tarea => {
        if (typeof tarea === 'object' && tarea !== null) {
            // Intenta extraer los nombres de propiedades comunes que usan las apps móviles
            return tarea.texto || tarea.title || tarea.description || JSON.stringify(tarea);
        }
        return String(tarea).trim();
    });
};

// 2. RUTA RAÍZ: Apunta directamente al archivo index.html dentro de public
app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

// ========================================================
// 📋 1. ENDPOINT PARA EL GESTOR WEB (Obtener tareas)
// ========================================================
app.get('/api/tareas', (req, res) => {
    const usuarioSolicitante = req.query.usuario || "Ninguno";
    const userKey = usuarioSolicitante.toLowerCase().trim();

    if (usuariosSincronizados[userKey]) {
        res.json({
            usuarioActivo: usuariosSincronizados[userKey].usuarioActivo,
            pendientes: usuariosSincronizados[userKey].pendientes,
            completadas: usuariosSincronizados[userKey].completadas
        });
    } else {
        res.json({
            usuarioActivo: usuarioSolicitante,
            pendientes: [],
            completadas: []
        });
    }
});

// ========================================================
// 🔄 2. ENDPOINT PARA LA APP MÓVIL (Sincronización masiva)
// ========================================================
app.post('/api/sincronizar', (req, res) => {
    const { usuarioActivo, pendientes, completadas } = req.body;
    
    if (!usuarioActivo || usuarioActivo === "Ninguno") {
        return res.status(400).json({ error: "Nombre de usuario no válido para sincronizar." });
    }

    const userKey = usuarioActivo.toLowerCase().trim();

    // Blindamos la entrada de datos de la App Móvil usando la función de normalización
    usuariosSincronizados[userKey] = {
        usuarioActivo: usuarioActivo,
        pendientes: normalizarListaTareas(pendientes),
        completadas: normalizarListaTareas(completadas)
    };

    console.log(`[Nube Render] ¡Datos sincronizados y normalizados para el usuario: ${usuarioActivo}!`);

    res.status(200).json({
        mensaje: "Sincronización en la nube exitosa",
        status: "OK"
    });
});

// ========================================================
// ➕🛠️ ENDPOINTS CRUD ADICIONALES PARA EL GESTOR WEB
// ========================================================

app.post('/api/tareas/crear', (req, res) => {
    const { texto, tipo, usuario } = req.body;
    const userKey = (usuario || "Ninguno").toLowerCase().trim();
    if (!texto || userKey === "ninguno") return res.status(400).json({ error: "Datos insuficientes" });

    if (!usuariosSincronizados[userKey]) {
        usuariosSincronizados[userKey] = { usuarioActivo: usuario, pendientes: [], completadas: [] };
    }
    
    const lista = tipo === 'completada' ? 'completadas' : 'pendientes';
    
    // Si el texto enviado por el front web es un objeto por error, lo extraemos bien
    let textoLimpio = texto;
    if (typeof texto === 'object' && texto !== null) {
        textoLimpio = texto.texto || texto.title || JSON.stringify(texto);
    }

    usuariosSincronizados[userKey][lista].push(String(textoLimpio).trim());
    res.json({ mensaje: "Creado", datos: usuariosSincronizados[userKey] });
});

app.put('/api/tareas/actualizar', (req, res) => {
    const { index, nuevoTexto, tipo, usuario } = req.body;
    const userKey = (usuario || "Ninguno").toLowerCase().trim();
    const lista = tipo === 'completada' ? 'completadas' : 'pendientes';

    if (usuariosSincronizados[userKey] && usuariosSincronizados[userKey][lista][index] !== undefined) {
        let textoLimpio = nuevoTexto;
        if (typeof nuevoTexto === 'object' && nuevoTexto !== null) {
            textoLimpio = nuevoTexto.texto || nuevoTexto.title || JSON.stringify(nuevoTexto);
        }

        usuariosSincronizados[userKey][lista][index] = String(textoLimpio).trim();
        return res.json({ mensaje: "Actualizado", datos: usuariosSincronizados[userKey] });
    }
    res.status(404).json({ error: "No encontrado" });
});

app.delete('/api/tareas/eliminar', (req, res) => {
    const { index, tipo, usuario } = req.body;
    const userKey = (usuario || "Ninguno").toLowerCase().trim();
    const lista = tipo === 'completada' ? 'completadas' : 'pendientes';

    if (usuariosSincronizados[userKey] && usuariosSincronizados[userKey][lista][index] !== undefined) {
        usuariosSincronizados[userKey][lista].splice(index, 1);
        return res.json({ mensaje: "Eliminado", datos: usuariosSincronizados[userKey] });
    }
    res.status(404).json({ error: "No se pudo eliminar" });
});

app.listen(PORT, () => {
    console.log(`Servidor de Render corriendo en el puerto ${PORT}`);
});
