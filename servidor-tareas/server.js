const express = require('express');
const cors = require('cors');
const path = require('path'); 
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// ========================================================
// 📦 BASE DE DATOS BLINDADA (Con tus usuarios ya precargados)
// ========================================================
let sistemaUsuarios = {
    "limont": {
        contrasena: "789",
        usuarioActivo: "limont",
        pendientes: ["Comer"],
        completadas: []
    },
    "bandae": {
        contrasena: "1234", // <-- Cambia "1234" por la contraseña real que usa bandae
        usuarioActivo: "bandae",
        pendientes: [],
        completadas: []
    }
};

// Función auxiliar para limpiar strings de la App Móvil
const normalizarListaTareas = (lista) => {
    if (!Array.isArray(lista)) return [];
    return lista.map(tarea => {
        if (typeof tarea === 'object' && tarea !== null) {
            return tarea.texto || tarea.title || JSON.stringify(tarea);
        }
        return String(tarea).trim();
    });
};

app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

// ========================================================
// 🔐 ENDPOINT DE AUTENTICACIÓN
// ========================================================
app.post('/api/login', (req, res) => {
    const { usuario, contrasena } = req.body;
    if (!usuario || !contrasena) return res.status(400).json({ error: "Campos incompletos" });

    const userKey = usuario.toLowerCase().trim();
    const cuenta = sistemaUsuarios[userKey];

    if (cuenta && String(cuenta.contrasena).trim() === String(contrasena).trim()) {
        res.json({ status: "OK", mensaje: "Acceso concedido", usuario: cuenta.usuarioActivo });
    } else {
        res.status(401).json({ error: "Usuario o contraseña incorrectos" });
    }
});

// ========================================================
// 👥 CRUD DE USUARIOS (Seguridad en memoria)
// ========================================================

app.get('/api/usuarios', (req, res) => {
    const lista = Object.keys(sistemaUsuarios).map(key => ({
        id: key,
        username: sistemaUsuarios[key].usuarioActivo,
        contrasena: sistemaUsuarios[key].contrasena,
        totalPendientes: sistemaUsuarios[key].pendientes ? sistemaUsuarios[key].pendientes.length : 0
    }));
    res.json(lista);
});

app.post('/api/usuarios/crear', (req, res) => {
    const { username, contrasena } = req.body;
    if (!username || !contrasena) return res.status(400).json({ error: "Datos insuficientes" });

    const userKey = username.toLowerCase().trim();
    if (sistemaUsuarios[userKey]) {
        return res.status(400).json({ error: "El usuario ya existe" });
    }

    sistemaUsuarios[userKey] = {
        contrasena: String(contrasena).trim(),
        usuarioActivo: username.trim(),
        pendientes: [],
        completadas: []
    };
    res.json({ mensaje: "Usuario creado exitosamente" });
});

app.put('/api/usuarios/actualizar', (req, res) => {
    const { username, nuevaContrasena } = req.body;
    const userKey = (username || "").toLowerCase().trim();

    if (sistemaUsuarios[userKey]) {
        sistemaUsuarios[userKey].contrasena = String(nuevaContrasena).trim();
        return res.json({ mensaje: "Contraseña actualizada" });
    }
    res.status(404).json({ error: "Usuario no encontrado" });
});

app.delete('/api/usuarios/eliminar', (req, res) => {
    const { username } = req.body;
    const userKey = (username || "").toLowerCase().trim();

    if (sistemaUsuarios[userKey]) {
        delete sistemaUsuarios[userKey];
        return res.json({ mensaje: "Usuario eliminado" });
    }
    res.status(404).json({ error: "Usuario no encontrado" });
});

// ========================================================
// 📋 ENDPOINTS DE TAREAS
// ========================================================

app.get('/api/tareas', (req, res) => {
    const usuarioSolicitante = req.query.usuario || "Ninguno";
    const userKey = usuarioSolicitante.toLowerCase().trim();

    if (sistemaUsuarios[userKey]) {
        res.json({
            usuarioActivo: sistemaUsuarios[userKey].usuarioActivo,
            pendientes: sistemaUsuarios[userKey].pendientes || [],
            completadas: sistemaUsuarios[userKey].completadas || []
        });
    } else {
        res.status(404).json({ error: "El usuario no existe." });
    }
});

app.post('/api/sincronizar', (req, res) => {
    const { usuarioActivo, pendientes, completadas } = req.body;
    const userKey = (usuarioActivo || "").toLowerCase().trim();
    
    // Si por alguna razón la app manda un usuario que no está mapeado, lo crea en caliente
    if (!sistemaUsuarios[userKey]) {
        sistemaUsuarios[userKey] = {
            contrasena: "789", 
            usuarioActivo: usuarioActivo,
            pendientes: [],
            completadas: []
        };
    }

    sistemaUsuarios[userKey].pendientes = normalizarListaTareas(pendientes);
    sistemaUsuarios[userKey].completadas = normalizarListaTareas(completadas);

    console.log(`[Sincro] Sincronizado: ${usuarioActivo}`);
    res.status(200).json({ mensaje: "Sincronización exitosa", status: "OK" });
});

app.post('/api/tareas/crear', (req, res) => {
    const { texto, tipo, usuario } = req.body;
    const userKey = (usuario || "Ninguno").toLowerCase().trim();
    
    if (!sistemaUsuarios[userKey]) return res.status(404).json({ error: "Usuario inexistente" });
    if (!texto) return res.status(400).json({ error: "Texto vacío" });

    const lista = tipo === 'completada' ? 'completadas' : 'pendientes';
    if (!sistemaUsuarios[userKey][lista]) sistemaUsuarios[userKey][lista] = [];
    
    sistemaUsuarios[userKey][lista].push(String(texto).trim());
    res.json({ mensaje: "Creado", datos: sistemaUsuarios[userKey] });
});

app.put('/api/tareas/actualizar', (req, res) => {
    const { index, nuevoTexto, tipo, usuario } = req.body;
    const userKey = (usuario || "Ninguno").toLowerCase().trim();
    const lista = tipo === 'completada' ? 'completadas' : 'pendientes';

    if (sistemaUsuarios[userKey] && sistemaUsuarios[userKey][lista] && sistemaUsuarios[userKey][lista][index] !== undefined) {
        sistemaUsuarios[userKey][lista][index] = String(nuevoTexto).trim();
        return res.json({ mensaje: "Actualizado" });
    }
    res.status(404).json({ error: "No encontrado" });
});

app.delete('/api/tareas/eliminar', (req, res) => {
    const { index, tipo, usuario } = req.body;
    const userKey = (usuario || "Ninguno").toLowerCase().trim();
    const lista = tipo === 'completada' ? 'completadas' : 'pendientes';

    if (sistemaUsuarios[userKey] && sistemaUsuarios[userKey][lista] && sistemaUsuarios[userKey][lista][index] !== undefined) {
        sistemaUsuarios[userKey][lista].splice(index, 1);
        return res.json({ mensaje: "Eliminado" });
    }
    res.status(404).json({ error: "No se pudo eliminar" });
});

// ========================================================
// 🔄 MANEJO DE CIERRE LIMPIO
// ========================================================
const server = app.listen(PORT, () => {
    console.log(`Servidor blindado corriendo en el puerto ${PORT}`);
});

process.on('SIGTERM', () => {
    server.close(() => {
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    server.close(() => {
        process.exit(0);
    });
});
