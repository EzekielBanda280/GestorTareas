const express = require('express');
const cors = require('cors');
const path = require('path'); 
const fs = require('fs'); // <--- Añadido para guardar datos en disco
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// RUTA DEL ARCHIVO JSON DONDE SE GUARDARÁ LA INFORMACIÓN
const DB_PATH = path.join(__dirname, 'usuarios.json');

// Función para cargar los usuarios desde el archivo JSON de forma segura
const cargarUsuarios = () => {
    try {
        if (fs.existsSync(DB_PATH)) {
            const data = fs.readFileSync(DB_PATH, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error("Error al leer usuarios.json, inicializando vacío:", error);
    }
    return {};
};

// Función para guardar los usuarios en el archivo JSON
const guardarUsuarios = (datos) => {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(datos, null, 2), 'utf8');
    } catch (error) {
        console.error("Error al escribir en usuarios.json:", error);
    }
};

// Inicializar la base de datos persistente
let sistemaUsuarios = cargarUsuarios();

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
// 🔐 ENDPOINT DE AUTENTICACIÓN PARA LA APP MÓVIL Y WEB
// ========================================================
app.post('/api/login', (req, res) => {
    const { usuario, contrasena } = req.body;
    if (!usuario || !contrasena) return res.status(400).json({ error: "Campos incompletos" });

    const userKey = usuario.toLowerCase().trim();
    
    // Recargar desde el archivo por si acaso hubo cambios externos
    sistemaUsuarios = cargarUsuarios();
    const cuenta = sistemaUsuarios[userKey];

    if (cuenta && String(cuenta.contrasena).trim() === String(contrasena).trim()) {
        res.json({ status: "OK", mensaje: "Acceso concedido", usuario: cuenta.usuarioActivo });
    } else {
        res.status(401).json({ error: "Usuario o contraseña incorrectos" });
    }
});

// ========================================================
// 👥 CRUD DE USUARIOS (Para el Administrador Web)
// ========================================================

// 1. LEER (Obtener todos los usuarios del sistema)
app.get('/api/usuarios', (req, res) => {
    sistemaUsuarios = cargarUsuarios();
    const lista = Object.keys(sistemaUsuarios).map(key => ({
        id: key,
        username: sistemaUsuarios[key].usuarioActivo,
        contrasena: sistemaUsuarios[key].contrasena,
        totalPendientes: sistemaUsuarios[key].pendientes ? sistemaUsuarios[key].pendientes.length : 0
    }));
    res.json(lista);
});

// 2. CREAR (Registrar nuevo usuario desde la Web o App de forma persistente)
app.post('/api/usuarios/crear', (req, res) => {
    const { username, contrasena } = req.body;
    if (!username || !contrasena) return res.status(400).json({ error: "Datos insuficientes para crear usuario" });

    const userKey = username.toLowerCase().trim();
    sistemaUsuarios = cargarUsuarios();

    if (sistemaUsuarios[userKey]) {
        return res.status(400).json({ error: "El usuario ya existe en el sistema" });
    }

    sistemaUsuarios[userKey] = {
        contrasena: String(contrasena).trim(),
        usuarioActivo: username.trim(),
        pendientes: [],
        completadas: []
    };

    guardarUsuarios(sistemaUsuarios); // <--- Guarda los cambios en el disco duro
    res.json({ mensaje: "Usuario creado exitosamente" });
});

// 3. ACTUALIZAR (Modificar contraseña desde la Web)
app.put('/api/usuarios/actualizar', (req, res) => {
    const { username, nuevaContrasena } = req.body;
    const userKey = (username || "").toLowerCase().trim();
    sistemaUsuarios = cargarUsuarios();

    if (sistemaUsuarios[userKey]) {
        sistemaUsuarios[userKey].contrasena = String(nuevaContrasena).trim();
        guardarUsuarios(sistemaUsuarios);
        return res.json({ mensaje: "Contraseña de usuario actualizada" });
    }
    res.status(404).json({ error: "Usuario no encontrado" });
});

// 4. ELIMINAR (Dar de baja un usuario y sus datos)
app.delete('/api/usuarios/eliminar', (req, res) => {
    const { username } = req.body;
    const userKey = (username || "").toLowerCase().trim();
    sistemaUsuarios = cargarUsuarios();

    if (sistemaUsuarios[userKey]) {
        delete sistemaUsuarios[userKey];
        guardarUsuarios(sistemaUsuarios);
        return res.json({ mensaje: "Usuario y sus tareas eliminados del sistema" });
    }
    res.status(404).json({ error: "No se pudo eliminar, usuario no encontrado" });
});

// ========================================================
// 📋 ENDPOINTS DE TAREAS (Sincronización Bidireccional)
// ========================================================

app.get('/api/tareas', (req, res) => {
    const usuarioSolicitante = req.query.usuario || "Ninguno";
    const userKey = usuarioSolicitante.toLowerCase().trim();
    sistemaUsuarios = cargarUsuarios();

    if (sistemaUsuarios[userKey]) {
        res.json({
            usuarioActivo: sistemaUsuarios[userKey].usuarioActivo,
            pendientes: sistemaUsuarios[userKey].pendientes || [],
            completadas: sistemaUsuarios[userKey].completadas || []
        });
    } else {
        res.status(404).json({ error: "El usuario no existe en el sistema web." });
    }
});

app.post('/api/sincronizar', (req, res) => {
    const { usuarioActivo, pendientes, completadas } = req.body;
    const userKey = (usuarioActivo || "").toLowerCase().trim();
    sistemaUsuarios = cargarUsuarios();
    
    // Auto-registro de contingencia: si la app sincroniza un usuario que el servidor perdió por reinicio, lo vuelve a dar de alta de forma automática.
    if (!sistemaUsuarios[userKey]) {
        sistemaUsuarios[userKey] = {
            contrasena: "789", // Asigna la clave base por defecto informada por el usuario
            usuarioActivo: usuarioActivo,
            pendientes: [],
            completadas: []
        };
    }

    sistemaUsuarios[userKey].pendientes = normalizarListaTareas(pendientes);
    sistemaUsuarios[userKey].completadas = normalizarListaTareas(completadas);

    guardarUsuarios(sistemaUsuarios);
    console.log(`[Sincro masiva] Actualizado el usuario: ${usuarioActivo}`);
    res.status(200).json({ mensaje: "Sincronización en la nube exitosa", status: "OK" });
});

app.post('/api/tareas/crear', (req, res) => {
    const { texto, tipo, usuario } = req.body;
    const userKey = (usuario || "Ninguno").toLowerCase().trim();
    sistemaUsuarios = cargarUsuarios();
    
    if (!sistemaUsuarios[userKey]) return res.status(404).json({ error: "Usuario inexistente" });
    if (!texto) return res.status(400).json({ error: "Texto vacío" });

    const lista = tipo === 'completada' ? 'completadas' : 'pendientes';
    if (!sistemaUsuarios[userKey][lista]) sistemaUsuarios[userKey][lista] = [];
    
    sistemaUsuarios[userKey][lista].push(String(texto).trim());
    guardarUsuarios(sistemaUsuarios);
    res.json({ mensaje: "Creado", datos: sistemaUsuarios[userKey] });
});

app.put('/api/tareas/actualizar', (req, res) => {
    const { index, nuevoTexto, tipo, usuario } = req.body;
    const userKey = (usuario || "Ninguno").toLowerCase().trim();
    const lista = tipo === 'completada' ? 'completadas' : 'pendientes';
    sistemaUsuarios = cargarUsuarios();

    if (sistemaUsuarios[userKey] && sistemaUsuarios[userKey][lista] && sistemaUsuarios[userKey][lista][index] !== undefined) {
        sistemaUsuarios[userKey][lista][index] = String(nuevoTexto).trim();
        guardarUsuarios(sistemaUsuarios);
        return res.json({ mensaje: "Actualizado" });
    }
    res.status(404).json({ error: "No encontrado" });
});

app.delete('/api/tareas/eliminar', (req, res) => {
    const { index, tipo, usuario } = req.body;
    const userKey = (usuario || "Ninguno").toLowerCase().trim();
    const lista = tipo === 'completada' ? 'completadas' : 'pendientes';
    sistemaUsuarios = cargarUsuarios();

    if (sistemaUsuarios[userKey] && sistemaUsuarios[userKey][lista] && sistemaUsuarios[userKey][lista][index] !== undefined) {
        sistemaUsuarios[userKey][lista].splice(index, 1);
        guardarUsuarios(sistemaUsuarios);
        return res.json({ mensaje: "Eliminado" });
    }
    res.status(404).json({ error: "No se pudo eliminar" });
});

app.listen(PORT, () => {
    console.log(`Servidor de Render corriendo en el puerto ${PORT}`);
});

app.listen(PORT, () => {
    console.log(`Servidor de Render corriendo en el puerto ${PORT}`);
});
