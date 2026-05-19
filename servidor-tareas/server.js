const express = require('express');
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