const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

let usuariosSincronizados = {};

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

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

app.post('/api/sincronizar', (req, res) => {
    const { usuarioActivo, pendientes, completadas } = req.body;
    
    if (!usuarioActivo || usuarioActivo === "Ninguno") {
        return res.status(400).json({ error: "Nombre de usuario no válido para sincronizar." });
    }

    const userKey = usuarioActivo.toLowerCase().trim();

    usuariosSincronizados[userKey] = {
        usuarioActivo: usuarioActivo,
        pendientes: pendientes || [],
        completadas: completadas || []
    };

    console.log(`[Nube Render] ¡Datos sincronizados para el usuario: ${usuarioActivo}!`);

    res.status(200).json({
        mensaje: "Sincronización en la nube exitosa",
        status: "OK"
    });
});


app.post('/api/tareas/crear', (req, res) => {
    const { texto, tipo, usuario } = req.body;
    const userKey = (usuario || "Ninguno").toLowerCase().trim();
    if (!texto || userKey === "ninguno") return res.status(400).json({ error: "Datos insuficientes" });

    if (!usuariosSincronizados[userKey]) {
        usuariosSincronizados[userKey] = { usuarioActivo: usuario, pendientes: [], completadas: [] };
    }
    const lista = tipo === 'completada' ? 'completadas' : 'pendientes';
    usuariosSincronizados[userKey][lista].push(texto);
    res.json({ mensaje: "Creado", datos: usuariosSincronizados[userKey] });
});

app.put('/api/tareas/actualizar', (req, res) => {
    const { index, nuevoTexto, tipo, usuario } = req.body;
    const userKey = (usuario || "Ninguno").toLowerCase().trim();
    const lista = tipo === 'completada' ? 'completadas' : 'pendientes';

    if (usuariosSincronizados[userKey] && usuariosSincronizados[userKey][lista][index] !== undefined) {
        usuariosSincronizados[userKey][lista][index] = nuevoTexto;
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
});const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let datosSincronizados = {
    usuarioActivo: "Ninguno",
    pendientes: [],
    completadas: []
};


app.get('/api/tareas', (req, res) => {
    res.json(datosSincronizados);
});

app.post('/api/sincronizar', (req, res) => {
    const { usuarioActivo, pendientes, completadas } = req.body;
    

    datosSincronizados.usuarioActivo = usuarioActivo || "Ninguno";
    datosSincronizados.pendientes = pendientes || [];
    datosSincronizados.completadas = completadas || [];
    
    console.log(`[Sincro] ¡Datos actualizados por el usuario móvil: ${datosSincronizados.usuarioActivo}!`);
    
    res.status(200).json({ 
        mensaje: "Sincronización local exitosa",
        status: "OK" 
    });
});

app.listen(PORT, () => {
    console.log(`URL de la API: https://gestor-de-tareas-9bl6.onrender.com`);
});
