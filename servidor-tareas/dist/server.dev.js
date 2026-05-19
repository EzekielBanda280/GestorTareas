"use strict";

var express = require('express');

var cors = require('cors');

var app = express();
var PORT = 3000;
app.use(cors());
app.use(express.json());
app.use(express["static"](path.join(__dirname, 'public')));
var datosSincronizados = {
  usuarioActivo: "Ninguno",
  pendientes: [],
  completadas: []
};
app.get('/api/tareas', function (req, res) {
  res.json(datosSincronizados);
});
app.post('/api/sincronizar', function (req, res) {
  var _req$body = req.body,
      usuarioActivo = _req$body.usuarioActivo,
      pendientes = _req$body.pendientes,
      completadas = _req$body.completadas;
  datosSincronizados.usuarioActivo = usuarioActivo || "Ninguno";
  datosSincronizados.pendientes = pendientes || [];
  datosSincronizados.completadas = completadas || [];
  console.log("[Sincro] \xA1Datos actualizados por el usuario m\xF3vil: ".concat(datosSincronizados.usuarioActivo, "!"));
  res.status(200).json({
    mensaje: "Sincronización local exitosa",
    status: "OK"
  });
});
app.listen(PORT, function () {
  console.log("URL de la API: https://gestor-de-tareas-9bl6.onrender.com");
});
//# sourceMappingURL=server.dev.js.map
