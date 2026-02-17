const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');          // ← LÍNEA NUEVA
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3005;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

app.use(cors());           // ← LÍNEA NUEVA (antes de express.json)
app.use(express.json());

// Middleware
app.use(express.json());

// Ruta principal
app.get('/', (req, res) => {
  res.json({ 
    mensaje: 'API de Freelancer conectada a Supabase',
    rutas: {
      '/tablas': 'Ver TODA la información de todas las tablas',
      '/schema': 'Ver estructura de la base de datos',
      '/clientes': 'Listar clientes',
      '/freelancers': 'Listar freelancers',
      '/proyectos': 'Listar proyectos',
      '/habilidades': 'Listar habilidades',
      '/aplicaciones': 'Listar aplicaciones',
      '/freelancer-habilidades': 'Listar relación freelancer-habilidades'
    }
  });
});

// NUEVA RUTA: Mostrar toda la información de todas las tablas
app.get('/tablas', async (req, res) => {
  try {
    // Obtener datos de todas las tablas
    const [clientes, freelancers, proyectos, habilidades, aplicaciones, freelancerHabilidad] = await Promise.all([
      supabase.from('clientes').select('*'),
      supabase.from('freelancers').select('*'),
      supabase.from('proyectos').select('*, clientes(nombre, correo)'),
      supabase.from('habilidades').select('*'),
      supabase.from('aplicaciones').select('*, freelancers(nombre, correo), proyectos(titulo)'),
      supabase.from('freelancer_habilidad').select('*, freelancers(nombre), habilidades(nombre)')
    ]);

    // Verificar errores
    if (clientes.error) throw clientes.error;
    if (freelancers.error) throw freelancers.error;
    if (proyectos.error) throw proyectos.error;
    if (habilidades.error) throw habilidades.error;
    if (aplicaciones.error) throw aplicaciones.error;
    if (freelancerHabilidad.error) throw freelancerHabilidad.error;

    res.json({
      mensaje: 'Información completa de todas las tablas',
      estadisticas: {
        total_clientes: clientes.data.length,
        total_freelancers: freelancers.data.length,
        total_proyectos: proyectos.data.length,
        total_habilidades: habilidades.data.length,
        total_aplicaciones: aplicaciones.data.length,
        total_relaciones_habilidades: freelancerHabilidad.data.length
      },
      datos: {
        clientes: clientes.data,
        freelancers: freelancers.data,
        proyectos: proyectos.data,
        habilidades: habilidades.data,
        aplicaciones: aplicaciones.data,
        freelancer_habilidad: freelancerHabilidad.data
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mostrar estructura de la base de datos
app.get('/schema', async (req, res) => {
  try {
    const schema = {
      aplicaciones: {
        descripcion: 'Aplicaciones de freelancers a proyectos',
        columnas: {
          id_aplicacion: 'integer (PK, auto)',
          id_freelancer: 'integer (FK -> freelancers)',
          id_proyecto: 'integer (FK -> proyectos)',
          estado: 'varchar (pendiente, aceptado, rechazado)',
          mensaje_propuesta: 'text'
        }
      },
      clientes: {
        descripcion: 'Clientes que publican proyectos',
        columnas: {
          id_cliente: 'integer (PK, auto)',
          nombre: 'varchar (NOT NULL)',
          correo: 'varchar (NOT NULL, UNIQUE)',
          telefono: 'varchar',
          contrasena: 'varchar (NOT NULL)'
        }
      },
      freelancers: {
        descripcion: 'Freelancers disponibles',
        columnas: {
          id_freelancer: 'integer (PK, auto)',
          nombre: 'varchar (NOT NULL)',
          telefono: 'varchar',
          correo: 'varchar (NOT NULL, UNIQUE)',
          contrasena: 'varchar (NOT NULL)',
          biografia: 'text',
          fecha_registro: 'timestamp (default: NOW())'
        }
      },
      habilidades: {
        descripcion: 'Catálogo de habilidades',
        columnas: {
          id_habilidad: 'integer (PK, auto)',
          nombre: 'varchar (NOT NULL)'
        }
      },
      freelancer_habilidad: {
        descripcion: 'Relación freelancers-habilidades',
        columnas: {
          id_freelancer: 'integer (PK, FK -> freelancers)',
          id_habilidad: 'integer (PK, FK -> habilidades)',
          anios_experiencia: 'integer',
          nivel: 'varchar (bajo, intermedio, avanzado)'
        }
      },
      proyectos: {
        descripcion: 'Proyectos publicados por clientes',
        columnas: {
          id_proyecto: 'integer (PK, auto)',
          titulo: 'varchar (NOT NULL)',
          descripcion: 'text',
          presupuesto: 'numeric',
          id_cliente: 'integer (FK -> clientes)',
          fecha_publicacion: 'timestamp (default: NOW())',
          estado: 'varchar (activo, cerrado, en_progreso)'
        }
      }
    };

    res.json({
      mensaje: 'Estructura de la base de datos',
      tablas: schema
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CRUD para CLIENTES
app.get('/clientes', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('*');
    
    if (error) throw error;
    res.json({
      total: data.length,
      clientes: data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/clientes/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('id_cliente', req.params.id)
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/clientes', async (req, res) => {
  try {
    const { nombre, correo, telefono, contrasena } = req.body;
    const { data, error } = await supabase
      .from('clientes')
      .insert([{ nombre, correo, telefono, contrasena }])
      .select();
    
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CRUD para FREELANCERS
app.get('/freelancers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('freelancers')
      .select('*');
    
    if (error) throw error;
    res.json({
      total: data.length,
      freelancers: data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/freelancers/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('freelancers')
      .select(`
        *,
        freelancer_habilidad (
          anios_experiencia,
          nivel,
          habilidades (nombre)
        )
      `)
      .eq('id_freelancer', req.params.id)
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/freelancers', async (req, res) => {
  try {
    const { nombre, telefono, correo, contrasena, biografia } = req.body;
    const { data, error } = await supabase
      .from('freelancers')
      .insert([{ nombre, telefono, correo, contrasena, biografia }])
      .select();
    
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CRUD para PROYECTOS
app.get('/proyectos', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('proyectos')
      .select(`
        *,
        clientes (nombre, correo)
      `);
    
    if (error) throw error;
    res.json({
      total: data.length,
      proyectos: data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/proyectos/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('proyectos')
      .select(`
        *,
        clientes (nombre, correo, telefono),
        aplicaciones (
          id_aplicacion,
          estado,
          mensaje_propuesta,
          freelancers (nombre, correo)
        )
      `)
      .eq('id_proyecto', req.params.id)
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/proyectos', async (req, res) => {
  try {
    const { titulo, descripcion, presupuesto, id_cliente } = req.body;
    const { data, error } = await supabase
      .from('proyectos')
      .insert([{ titulo, descripcion, presupuesto, id_cliente }])
      .select();
    
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CRUD para HABILIDADES
app.get('/habilidades', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('habilidades')
      .select('*');
    
    if (error) throw error;
    res.json({
      total: data.length,
      habilidades: data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/habilidades', async (req, res) => {
  try {
    const { nombre } = req.body;
    const { data, error } = await supabase
      .from('habilidades')
      .insert([{ nombre }])
      .select();
    
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CRUD para APLICACIONES
app.get('/aplicaciones', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('aplicaciones')
      .select(`
        *,
        freelancers (nombre, correo),
        proyectos (titulo, presupuesto, clientes(nombre))
      `);
    
    if (error) throw error;
    res.json({
      total: data.length,
      aplicaciones: data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/aplicaciones', async (req, res) => {
  try {
    const { id_freelancer, id_proyecto, mensaje_propuesta } = req.body;
    const { data, error } = await supabase
      .from('aplicaciones')
      .insert([{ id_freelancer, id_proyecto, mensaje_propuesta }])
      .select();
    
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/aplicaciones/:id', async (req, res) => {
  try {
    const { estado } = req.body;
    const { data, error } = await supabase
      .from('aplicaciones')
      .update({ estado })
      .eq('id_aplicacion', req.params.id)
      .select();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CRUD para FREELANCER_HABILIDAD
app.get('/freelancer-habilidades', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('freelancer_habilidad')
      .select(`
        *,
        freelancers (nombre, correo),
        habilidades (nombre)
      `);
    
    if (error) throw error;
    res.json({
      total: data.length,
      relaciones: data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/freelancer-habilidades', async (req, res) => {
  try {
    const { id_freelancer, id_habilidad, anios_experiencia, nivel } = req.body;
    const { data, error } = await supabase
      .from('freelancer_habilidad')
      .insert([{ id_freelancer, id_habilidad, anios_experiencia, nivel }])
      .select();
    
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const path = require('path');

// servir archivos estáticos del proyecto
app.use(express.static(__dirname));

// ruta amigable del dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'freelancer-dashboard.html'));
});


// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📊 Ver TODA la información: http://localhost:${PORT}/tablas`);
  console.log(`📋 Ver estructura: http://localhost:${PORT}/schema`);
});