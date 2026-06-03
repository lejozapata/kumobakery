// ======================================================
// DATABASE / DB.JS
// Base de datos local SQLite para KUMO Bakery
// ======================================================

import * as SQLite from 'expo-sqlite';

// ======================================================
// CONFIGURACIÓN GENERAL DE BASE DE DATOS
// ======================================================

const DB_NAME = 'sara_reposteria.db';

const db = SQLite.openDatabaseSync(DB_NAME);

// ======================================================
// CONSTANTES DE COSTO ENERGÉTICO
// Horno KitchenAid KCO224: 1800 W = 1.8 kW
// Tarifa EPM usada: 864.69 COP/kWh
// ======================================================

const TARIFA_KWH_DEFAULT = 864.69;
const POTENCIA_HORNO_KW = 1.8;

// ======================================================
// UTILIDAD DE MIGRACIÓN
// Agrega columnas nuevas sin borrar información existente.
// ======================================================

function agregarColumnaSiNoExiste(
  nombreTabla,
  nombreColumna,
  definicionColumna
) {
  const columnas = db.getAllSync(
    `PRAGMA table_info(${nombreTabla});`
  );

  const existe = columnas.some(
    (columna) => columna.name === nombreColumna
  );

  if (!existe) {
    db.execSync(`
      ALTER TABLE ${nombreTabla}
      ADD COLUMN ${nombreColumna} ${definicionColumna};
    `);
  }
}

// ======================================================
// TABLA CLIENTES
// Clientes creados desde pedidos o desde futuro módulo Clientes
// ======================================================

function asegurarTablaClientes() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      telefono TEXT,
      email TEXT,
      direccion TEXT,
      notas TEXT,
      eliminado INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT
    );
  `);
}

// ======================================================
// TABLA INSUMOS
// ======================================================

function asegurarTablaInsumos() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS insumos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      categoria TEXT,
      unidad_medida TEXT,
      cantidad_actual REAL DEFAULT 0,
      cantidad_minima REAL DEFAULT 0,
      costo_total_compra REAL DEFAULT 0,
      cantidad_compra REAL DEFAULT 0,
      costo_por_unidad REAL DEFAULT 0,
      proveedor TEXT,
      fecha_vencimiento TEXT,
      notas TEXT,
      eliminado INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT
    );
  `);

  agregarColumnaSiNoExiste(
    'insumos',
    'foto_uri',
    'TEXT'
  );
}

// ======================================================
// TABLAS PRODUCCIÓN
// ======================================================

function asegurarTablaProducciones() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS producciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receta_id INTEGER,
      receta_nombre TEXT,
      fecha TEXT DEFAULT CURRENT_TIMESTAMP,
      cantidad_lotes REAL DEFAULT 1,
      unidades_resultantes REAL DEFAULT 0,
      costo_ingredientes REAL DEFAULT 0,
      costo_energia REAL DEFAULT 0,
      costo_total REAL DEFAULT 0,
      costo_por_unidad REAL DEFAULT 0,

      precio_sugerido_30 REAL DEFAULT 0,
      precio_sugerido_40 REAL DEFAULT 0,
      precio_sugerido_50 REAL DEFAULT 0,

      margen_porcentaje REAL DEFAULT 40,
      precio_sugerido_personalizado REAL DEFAULT 0,

      notas TEXT,
      estado TEXT DEFAULT 'borrador',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT
    );
  `);

  agregarColumnaSiNoExiste(
    'producciones',
    'rendimiento_base',
    'REAL DEFAULT 0'
  );

  agregarColumnaSiNoExiste(
    'producciones',
    'unidades_esperadas',
    'REAL DEFAULT 0'
  );

  agregarColumnaSiNoExiste(
    'producciones',
    'unidades_reales',
    'REAL DEFAULT 0'
  );

  agregarColumnaSiNoExiste(
    'producciones',
    'unidades_perdidas',
    'REAL DEFAULT 0'
  );

  agregarColumnaSiNoExiste(
    'producciones',
    'unidades_disponibles',
    'REAL DEFAULT 0'
  );

  agregarColumnaSiNoExiste(
    'producciones',
    'precio_sugerido_personalizado',
    'REAL DEFAULT 0'
  );

  agregarColumnaSiNoExiste(
  'producciones',
  'oculta',
  'INTEGER DEFAULT 0'
);

  agregarColumnaSiNoExiste(
    'producciones',
    'vida_util_dias',
    'INTEGER DEFAULT 0'
  );

  agregarColumnaSiNoExiste(
    'producciones',
    'fecha_vencimiento',
    'TEXT'
  );

  agregarColumnaSiNoExiste(
    'producciones',
    'conservacion',
    'TEXT'
  );

  agregarColumnaSiNoExiste(
    'producciones',
    'tipo_vida_util',
    'TEXT'
  );

  db.execSync(`
    CREATE TABLE IF NOT EXISTS produccion_insumos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produccion_id INTEGER,
      insumo_id INTEGER,
      insumo_nombre TEXT,
      unidad_medida TEXT,
      cantidad_usada REAL DEFAULT 0,
      costo_por_unidad REAL DEFAULT 0,
      costo_calculado REAL DEFAULT 0,
      disponible_al_momento REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// ======================================================
// TABLAS PEDIDOS
// pedidos: encabezado general
// pedidos_detalle: productos vendidos
// pedidos_empaques: empaques usados
// movimientos_inventario: trazabilidad futura
// ======================================================

function asegurarTablasPedidos() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      cliente_id INTEGER,
      cliente_nombre TEXT,
      cliente_telefono TEXT,

      fecha_entrega TEXT,

      requiere_domicilio INTEGER DEFAULT 0,
      direccion_entrega TEXT,
      costo_envio REAL DEFAULT 0,

      subtotal_productos REAL DEFAULT 0,
      costo_empaques REAL DEFAULT 0,
      total REAL DEFAULT 0,

      estado TEXT DEFAULT 'pendiente',
      notas TEXT,

      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT
    );
  `);

  agregarColumnaSiNoExiste(
    'pedidos',
    'cliente_id',
    'INTEGER'
  );

  agregarColumnaSiNoExiste(
    'pedidos',
    'requiere_domicilio',
    'INTEGER DEFAULT 0'
  );

  agregarColumnaSiNoExiste(
    'pedidos',
    'direccion_entrega',
    'TEXT'
  );

  agregarColumnaSiNoExiste(
    'pedidos',
    'costo_envio',
    'REAL DEFAULT 0'
  );

  db.execSync(`
    CREATE TABLE IF NOT EXISTS pedidos_detalle (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      pedido_id INTEGER,
      produccion_id INTEGER,

      receta_nombre TEXT,

      cantidad REAL DEFAULT 0,

      precio_unitario REAL DEFAULT 0,
      costo_unitario REAL DEFAULT 0,

      subtotal REAL DEFAULT 0,

      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS pedidos_empaques (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      pedido_id INTEGER,

      insumo_id INTEGER,
      insumo_nombre TEXT,

      cantidad REAL DEFAULT 0,

      costo_unitario REAL DEFAULT 0,
      subtotal REAL DEFAULT 0,

      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS movimientos_inventario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      tipo_origen TEXT,
      origen_id INTEGER,

      tipo_movimiento TEXT,

      referencia_tipo TEXT,
      referencia_id INTEGER,

      descripcion TEXT,

      cantidad REAL DEFAULT 0,

      costo_unitario REAL DEFAULT 0,

      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// ======================================================
// INICIALIZACIÓN GENERAL
// ======================================================

export function initDatabase() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS recetas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      favorita INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  agregarColumnaSiNoExiste(
    'recetas',
    'tiempo_preparacion_min',
    'INTEGER DEFAULT 0'
  );

  agregarColumnaSiNoExiste(
    'recetas',
    'tiempo_coccion_min',
    'INTEGER DEFAULT 0'
  );

  agregarColumnaSiNoExiste(
    'recetas',
    'tiempo_reposo_min',
    'INTEGER DEFAULT 0'
  );

  agregarColumnaSiNoExiste(
    'recetas',
    'tiempo_total_min',
    'INTEGER DEFAULT 0'
  );

  agregarColumnaSiNoExiste(
    'recetas',
    'temperatura_horneado_c',
    'INTEGER DEFAULT 0'
  );

  agregarColumnaSiNoExiste(
    'recetas',
    'costo_energia',
    'REAL DEFAULT 0'
  );

  agregarColumnaSiNoExiste(
    'recetas',
    'tarifa_kwh',
    'REAL DEFAULT 0'
  );

  agregarColumnaSiNoExiste(
    'recetas',
    'rendimiento',
    'TEXT'
  );

  agregarColumnaSiNoExiste(
    'recetas',
    'ingredientes',
    'TEXT'
  );

  agregarColumnaSiNoExiste(
    'recetas',
    'instrucciones',
    'TEXT'
  );

  agregarColumnaSiNoExiste(
    'recetas',
    'equipo_cocina',
    'TEXT'
  );

  agregarColumnaSiNoExiste(
    'recetas',
    'foto_uri',
    'TEXT'
  );

  agregarColumnaSiNoExiste(
    'recetas',
    'video_url',
    'TEXT'
  );

    agregarColumnaSiNoExiste(
    'recetas',
    'vida_util_dias',
    'INTEGER DEFAULT 0'
  );

  agregarColumnaSiNoExiste(
    'recetas',
    'conservacion',
    'TEXT'
  );

  agregarColumnaSiNoExiste(
    'recetas',
    'tipo_vida_util',
    'TEXT'
  );

  agregarColumnaSiNoExiste(
    'recetas',
    'updated_at',
    'TEXT'
  );

  asegurarTablaClientes();
  asegurarTablaInsumos();
  asegurarTablaProducciones();
  asegurarTablasPedidos();
}

// ======================================================
// RECETAS - CONSULTAS
// ======================================================

export function obtenerRecetas() {
  return db.getAllSync(`
    SELECT *
    FROM recetas
    ORDER BY created_at DESC;
  `);
}

export function obtenerRecetaPorId(id) {
  return db.getFirstSync(
    `
    SELECT *
    FROM recetas
    WHERE id = ?;
    `,
    [id]
  );
}

// ======================================================
// RECETAS - CREAR
// ======================================================

export function crearReceta(receta) {
  const horasHorno =
    (Number(receta.tiempo_coccion_min) || 0) / 60;

  const costoEnergia =
    POTENCIA_HORNO_KW *
    horasHorno *
    TARIFA_KWH_DEFAULT;

  db.runSync(
    `
    INSERT INTO recetas (
      nombre,
      descripcion,
      tiempo_preparacion_min,
      tiempo_coccion_min,
      tiempo_reposo_min,
      tiempo_total_min,
      temperatura_horneado_c,
      costo_energia,
      tarifa_kwh,
      rendimiento,
      ingredientes,
      instrucciones,
      equipo_cocina,
      foto_uri,
      video_url,
      vida_util_dias,
      conservacion,
      tipo_vida_util,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP);
    `,
    [
      receta.nombre,
      receta.descripcion,
      receta.tiempo_preparacion_min,
      receta.tiempo_coccion_min,
      receta.tiempo_reposo_min,
      receta.tiempo_total_min,
      receta.temperatura_horneado_c,
      costoEnergia,
      TARIFA_KWH_DEFAULT,
      receta.rendimiento,
      receta.ingredientes,
      receta.instrucciones,
      receta.equipo_cocina,
      receta.foto_uri,
      receta.video_url,
      receta.vida_util_dias,
      receta.conservacion,
      receta.tipo_vida_util,
    ]
  );
}

// ======================================================
// RECETAS - ACTUALIZAR
// ======================================================

export function actualizarReceta(id, receta) {
  const horasHorno =
    (Number(receta.tiempo_coccion_min) || 0) / 60;

  const costoEnergia =
    POTENCIA_HORNO_KW *
    horasHorno *
    TARIFA_KWH_DEFAULT;

  db.runSync(
    `
    UPDATE recetas
    SET
      nombre = ?,
      descripcion = ?,
      tiempo_preparacion_min = ?,
      tiempo_coccion_min = ?,
      tiempo_reposo_min = ?,
      tiempo_total_min = ?,
      temperatura_horneado_c = ?,
      costo_energia = ?,
      tarifa_kwh = ?,
      rendimiento = ?,
      ingredientes = ?,
      instrucciones = ?,
      equipo_cocina = ?,
      foto_uri = ?,
      video_url = ?,
      vida_util_dias = ?,
      conservacion = ?,
      tipo_vida_util = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?;
    `,
    [
      receta.nombre,
      receta.descripcion,
      receta.tiempo_preparacion_min,
      receta.tiempo_coccion_min,
      receta.tiempo_reposo_min,
      receta.tiempo_total_min,
      receta.temperatura_horneado_c,
      costoEnergia,
      TARIFA_KWH_DEFAULT,
      receta.rendimiento,
      receta.ingredientes,
      receta.instrucciones,
      receta.equipo_cocina,
      receta.foto_uri,
      receta.video_url,
      receta.vida_util_dias,
      receta.conservacion,
      receta.tipo_vida_util,
      id,
    ]
  );
}

// ======================================================
// RECETAS - FAVORITOS Y ELIMINAR
// ======================================================

export function alternarFavoritaReceta(id, favoritaActual) {
  const nuevoValor = favoritaActual === 1 ? 0 : 1;

  db.runSync(
    `
    UPDATE recetas
    SET favorita = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?;
    `,
    [nuevoValor, id]
  );
}

export function eliminarReceta(id) {
  db.runSync(
    `
    DELETE FROM recetas
    WHERE id = ?;
    `,
    [id]
  );
}

// ======================================================
// CLIENTES - CREAR / CONSULTAR / ACTUALIZAR
// ======================================================

export function crearCliente(cliente) {
  asegurarTablaClientes();

  const resultado = db.runSync(
    `
    INSERT INTO clientes (
      nombre,
      telefono,
      email,
      direccion,
      notas,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP);
    `,
    [
      cliente.nombre || '',
      cliente.telefono || '',
      cliente.email || '',
      cliente.direccion || '',
      cliente.notas || '',
    ]
  );

  return resultado.lastInsertRowId;
}

export function obtenerClientes({ busqueda = '' } = {}) {
  asegurarTablaClientes();

  return db.getAllSync(
    `
    SELECT *
    FROM clientes
    WHERE eliminado = 0
    AND (
      nombre LIKE ?
      OR telefono LIKE ?
      OR email LIKE ?
      OR direccion LIKE ?
    )
    ORDER BY nombre ASC;
    `,
    [
      `%${busqueda}%`,
      `%${busqueda}%`,
      `%${busqueda}%`,
      `%${busqueda}%`,
    ]
  );
}

export function obtenerClientePorId(id) {
  asegurarTablaClientes();

  return db.getFirstSync(
    `
    SELECT *
    FROM clientes
    WHERE id = ?;
    `,
    [id]
  );
}

export function actualizarCliente(id, cliente) {
  asegurarTablaClientes();

  db.runSync(
    `
    UPDATE clientes
    SET
      nombre = ?,
      telefono = ?,
      email = ?,
      direccion = ?,
      notas = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?;
    `,
    [
      cliente.nombre || '',
      cliente.telefono || '',
      cliente.email || '',
      cliente.direccion || '',
      cliente.notas || '',
      id,
    ]
  );
}

export function eliminarCliente(id) {
  asegurarTablaClientes();

  db.runSync(
    `
    UPDATE clientes
    SET eliminado = 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?;
    `,
    [id]
  );
}

// ======================================================
// INSUMOS - CONSULTAS
// ======================================================

export function obtenerInsumos({ busqueda = '' } = {}) {
  asegurarTablaInsumos();

  return db.getAllSync(
    `
    SELECT *
    FROM insumos
    WHERE eliminado = 0
    AND (
      nombre LIKE ?
      OR categoria LIKE ?
      OR proveedor LIKE ?
    )
    ORDER BY nombre ASC;
    `,
    [
      `%${busqueda}%`,
      `%${busqueda}%`,
      `%${busqueda}%`,
    ]
  );
}

export function obtenerInsumoPorId(id) {
  asegurarTablaInsumos();

  return db.getFirstSync(
    `
    SELECT *
    FROM insumos
    WHERE id = ?;
    `,
    [id]
  );
}

// ======================================================
// INSUMOS - CREAR
// ======================================================

export function crearInsumo(insumo) {
  asegurarTablaInsumos();

  const cantidadCompra = Number(insumo.cantidad_compra || 0);
  const costoTotalCompra = Number(insumo.costo_total_compra || 0);

  const costoPorUnidad =
    cantidadCompra > 0 ? costoTotalCompra / cantidadCompra : 0;

  db.runSync(
    `
    INSERT INTO insumos (
      nombre,
      categoria,
      unidad_medida,
      cantidad_actual,
      cantidad_minima,
      costo_total_compra,
      cantidad_compra,
      costo_por_unidad,
      proveedor,
      fecha_vencimiento,
      notas,
      foto_uri,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP);
    `,
    [
      insumo.nombre,
      insumo.categoria,
      insumo.unidad_medida,
      insumo.cantidad_actual,
      insumo.cantidad_minima,
      costoTotalCompra,
      cantidadCompra,
      costoPorUnidad,
      insumo.proveedor,
      insumo.fecha_vencimiento,
      insumo.notas,
      insumo.foto_uri || '',
    ]
  );
}

// ======================================================
// INSUMOS - ACTUALIZAR
// ======================================================

export function actualizarInsumo(id, insumo) {
  asegurarTablaInsumos();

  const cantidadCompra = Number(insumo.cantidad_compra || 0);
  const costoTotalCompra = Number(insumo.costo_total_compra || 0);

  const costoPorUnidad =
    cantidadCompra > 0 ? costoTotalCompra / cantidadCompra : 0;

  db.runSync(
    `
    UPDATE insumos
    SET
      nombre = ?,
      categoria = ?,
      unidad_medida = ?,
      cantidad_actual = ?,
      cantidad_minima = ?,
      costo_total_compra = ?,
      cantidad_compra = ?,
      costo_por_unidad = ?,
      proveedor = ?,
      fecha_vencimiento = ?,
      notas = ?,
      foto_uri = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?;
    `,
    [
      insumo.nombre,
      insumo.categoria,
      insumo.unidad_medida,
      insumo.cantidad_actual,
      insumo.cantidad_minima,
      costoTotalCompra,
      cantidadCompra,
      costoPorUnidad,
      insumo.proveedor,
      insumo.fecha_vencimiento,
      insumo.notas,
      insumo.foto_uri || '',
      id,
    ]
  );
}

// ======================================================
// INSUMOS - ELIMINAR LÓGICO
// ======================================================

export function eliminarInsumo(id) {
  asegurarTablaInsumos();

  db.runSync(
    `
    UPDATE insumos
    SET eliminado = 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?;
    `,
    [id]
  );
}

// ======================================================
// FUNCIÓN DE CÁLCULO DE PRECIO SUGERIDO
// Utilidad deseada:
// precio = costo unidad / (1 - utilidad%)
// Ejemplo: costo 580, utilidad 40%
// precio = 580 / 0.60 = 966
// ======================================================

function calcularPrecioSugeridoPersonalizado(
  costoPorUnidad,
  margenPorcentaje
) {
  const utilidadDecimal =
    Number(margenPorcentaje || 40) / 100;

  if (costoPorUnidad <= 0) return 0;
  if (utilidadDecimal <= 0) return costoPorUnidad;
  if (utilidadDecimal >= 1) return 0;

  return costoPorUnidad / (1 - utilidadDecimal);
}

// ======================================================
// FECHA VENCIMIENTO
// ======================================================

function calcularFechaVencimiento(fechaBase, vidaUtilDias) {
  const dias = Number(vidaUtilDias || 0);

  if (dias <= 0) return '';

  const base = fechaBase ? new Date(String(fechaBase).replace(' ', 'T')) : new Date();

  if (Number.isNaN(base.getTime())) return '';

  base.setDate(base.getDate() + dias);

  const dia = String(base.getDate()).padStart(2, '0');
  const mes = String(base.getMonth() + 1).padStart(2, '0');
  const anio = base.getFullYear();

  return `${dia}/${mes}/${anio}`;
}


// ======================================================
// PRODUCCIÓN - CREAR PRODUCCIÓN
// ======================================================

export function crearProduccion(produccion) {
  asegurarTablaProducciones();

  const rendimientoBase = Number(produccion.rendimiento_base || 0);
  const cantidadLotes = Number(produccion.cantidad_lotes || 1);

  const unidadesEsperadas =
    Number(produccion.unidades_esperadas || 0) ||
    rendimientoBase * cantidadLotes;

  const unidadesReales =
    Number(produccion.unidades_reales || 0) ||
    unidadesEsperadas;

  const unidadesPerdidas =
    Number(produccion.unidades_perdidas || 0);

  const unidadesDisponibles = Math.max(
    unidadesReales - unidadesPerdidas,
    0
  );

  const costoIngredientes =
    Number(produccion.costo_ingredientes || 0);

  const costoEnergia =
    Number(produccion.costo_energia || 0);

  const costoTotal = costoIngredientes + costoEnergia;

  const costoPorUnidad =
    unidadesDisponibles > 0
      ? costoTotal / unidadesDisponibles
      : 0;

  const precioSugerido30 =
    costoPorUnidad > 0 ? costoPorUnidad / 0.7 : 0;

  const precioSugerido40 =
    costoPorUnidad > 0 ? costoPorUnidad / 0.6 : 0;

  const precioSugerido50 =
    costoPorUnidad > 0 ? costoPorUnidad / 0.5 : 0;

  const margenPorcentaje =
    Number(produccion.margen_porcentaje || 40);

  const precioSugeridoPersonalizado =
    calcularPrecioSugeridoPersonalizado(
      costoPorUnidad,
      margenPorcentaje
    );

  const vidaUtilDias = Number(produccion.vida_util_dias || 0);
  const fechaVencimiento =
    produccion.fecha_vencimiento ||
    calcularFechaVencimiento(new Date(), vidaUtilDias);

  const resultado = db.runSync(
    `
    INSERT INTO producciones (
      receta_id,
      receta_nombre,
      cantidad_lotes,
      unidades_resultantes,
      rendimiento_base,
      unidades_esperadas,
      unidades_reales,
      unidades_perdidas,
      unidades_disponibles,
      costo_ingredientes,
      costo_energia,
      costo_total,
      costo_por_unidad,
      precio_sugerido_30,
      precio_sugerido_40,
      precio_sugerido_50,
      margen_porcentaje,
      precio_sugerido_personalizado,
      vida_util_dias,
      fecha_vencimiento,
      conservacion,
      tipo_vida_util,
      notas,
      estado,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP);
    `,
    [
      produccion.receta_id,
      produccion.receta_nombre,
      cantidadLotes,
      unidadesDisponibles,
      rendimientoBase,
      unidadesEsperadas,
      unidadesReales,
      unidadesPerdidas,
      unidadesDisponibles,
      costoIngredientes,
      costoEnergia,
      costoTotal,
      costoPorUnidad,
      precioSugerido30,
      precioSugerido40,
      precioSugerido50,
      margenPorcentaje,
      precioSugeridoPersonalizado,
      vidaUtilDias,
      fechaVencimiento,
      produccion.conservacion || '',
      produccion.tipo_vida_util || '',
      produccion.notas || '',
      produccion.estado || 'calculada',
    ]
  );

  return resultado.lastInsertRowId;
}

// ======================================================
// PRODUCCIÓN - CREAR PRODUCCIÓN CON INSUMOS
// ======================================================

export function crearProduccionConInsumos(
  produccion,
  insumosUsados = []
) {
  asegurarTablaProducciones();
  asegurarTablaInsumos();

  const produccionId = crearProduccion(produccion);

  insumosUsados.forEach((item) => {
    const cantidadUsada = Number(item.cantidad_usada || 0);
    const costoPorUnidad = Number(item.costo_por_unidad || 0);
    const costoCalculado = Number(item.costo_calculado || 0);

    db.runSync(
      `
      INSERT INTO produccion_insumos (
        produccion_id,
        insumo_id,
        insumo_nombre,
        unidad_medida,
        cantidad_usada,
        costo_por_unidad,
        costo_calculado,
        disponible_al_momento
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `,
      [
        produccionId,
        item.insumo_id,
        item.insumo_nombre,
        item.unidad_medida,
        cantidadUsada,
        costoPorUnidad,
        costoCalculado,
        item.disponible_al_momento,
      ]
    );

    if (item.insumo_id && cantidadUsada > 0) {
      db.runSync(
        `
        UPDATE insumos
        SET
          cantidad_actual = MAX(cantidad_actual - ?, 0),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?;
        `,
        [
          cantidadUsada,
          item.insumo_id,
        ]
      );

      db.runSync(
        `
        INSERT INTO movimientos_inventario (
          tipo_origen,
          origen_id,
          tipo_movimiento,
          referencia_tipo,
          referencia_id,
          descripcion,
          cantidad,
          costo_unitario
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `,
        [
          'produccion',
          produccionId,
          'salida',
          'insumo',
          item.insumo_id,
          `Uso en producción: ${produccion.receta_nombre || ''}`,
          cantidadUsada,
          costoPorUnidad,
        ]
      );
    }
  });

  return produccionId;
}

// ======================================================
// PRODUCCIÓN - CONSULTAS
// ======================================================

export function obtenerProducciones() {
  asegurarTablaProducciones();

  return db.getAllSync(`
    SELECT *
    FROM producciones
    WHERE COALESCE(oculta, 0) = 0
    ORDER BY created_at DESC;
  `);
}

export function obtenerProduccionesAgotadasVisibles() {
  asegurarTablaProducciones();

  return db.getAllSync(`
    SELECT *
    FROM producciones
    WHERE COALESCE(oculta, 0) = 0
    AND COALESCE(unidades_disponibles, unidades_resultantes, 0) <= 0
    ORDER BY created_at DESC;
  `);
}

export function ocultarProduccion(id) {
  asegurarTablaProducciones();

  db.runSync(
    `
    UPDATE producciones
    SET
      oculta = 1,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?;
    `,
    [id]
  );
}

export function depurarProduccionesAgotadas() {
  asegurarTablaProducciones();

  db.runSync(`
    UPDATE producciones
    SET
      oculta = 1,
      updated_at = CURRENT_TIMESTAMP
    WHERE COALESCE(oculta, 0) = 0
    AND COALESCE(unidades_disponibles, unidades_resultantes, 0) <= 0;
  `);
}

export function obtenerProduccionPorId(id) {
  asegurarTablaProducciones();

  return db.getFirstSync(
    `
    SELECT *
    FROM producciones
    WHERE id = ?;
    `,
    [id]
  );
}

export function obtenerInsumosDeProduccion(produccionId) {
  asegurarTablaProducciones();

  return db.getAllSync(
    `
    SELECT *
    FROM produccion_insumos
    WHERE produccion_id = ?
    ORDER BY id ASC;
    `,
    [produccionId]
  );
}

// ======================================================
// PRODUCCIÓN - ACTUALIZAR/EDITAR
// ======================================================

export function actualizarProduccion(id, produccion) {
  asegurarTablaProducciones();

  const rendimientoBase = Number(produccion.rendimiento_base || 0);
  const cantidadLotes = Number(produccion.cantidad_lotes || 1);

  const unidadesEsperadas =
    Number(produccion.unidades_esperadas || 0) ||
    rendimientoBase * cantidadLotes;

  const unidadesReales =
    Number(produccion.unidades_reales || 0) ||
    unidadesEsperadas;

  const unidadesPerdidas =
    Number(produccion.unidades_perdidas || 0);

  const unidadesDisponibles = Math.max(
    unidadesReales - unidadesPerdidas,
    0
  );

  const costoIngredientes =
    Number(produccion.costo_ingredientes || 0);

  const costoEnergia =
    Number(produccion.costo_energia || 0);

  const costoTotal = costoIngredientes + costoEnergia;

  const costoPorUnidad =
    unidadesDisponibles > 0
      ? costoTotal / unidadesDisponibles
      : 0;

  const precioSugerido30 =
    costoPorUnidad > 0 ? costoPorUnidad / 0.7 : 0;

  const precioSugerido40 =
    costoPorUnidad > 0 ? costoPorUnidad / 0.6 : 0;

  const precioSugerido50 =
    costoPorUnidad > 0 ? costoPorUnidad / 0.5 : 0;

  const margenPorcentaje =
    Number(produccion.margen_porcentaje || 40);

  const precioSugeridoPersonalizado =
    calcularPrecioSugeridoPersonalizado(
      costoPorUnidad,
      margenPorcentaje
    );

  const vidaUtilDias = Number(produccion.vida_util_dias || 0);
  const fechaVencimiento =
    produccion.fecha_vencimiento ||
    calcularFechaVencimiento(new Date(), vidaUtilDias);

  db.runSync(
    `
    UPDATE producciones
    SET
      cantidad_lotes = ?,
      unidades_resultantes = ?,
      rendimiento_base = ?,
      unidades_esperadas = ?,
      unidades_reales = ?,
      unidades_perdidas = ?,
      unidades_disponibles = ?,
      costo_ingredientes = ?,
      costo_energia = ?,
      costo_total = ?,
      costo_por_unidad = ?,
      precio_sugerido_30 = ?,
      precio_sugerido_40 = ?,
      precio_sugerido_50 = ?,
      margen_porcentaje = ?,
      precio_sugerido_personalizado = ?,
      vida_util_dias = ?,
      fecha_vencimiento = ?,
      conservacion = ?,
      tipo_vida_util = ?,
      notas = ?,
      estado = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?;
    `,
    [
      cantidadLotes,
      unidadesDisponibles,
      rendimientoBase,
      unidadesEsperadas,
      unidadesReales,
      unidadesPerdidas,
      unidadesDisponibles,
      costoIngredientes,
      costoEnergia,
      costoTotal,
      costoPorUnidad,
      precioSugerido30,
      precioSugerido40,
      precioSugerido50,
      margenPorcentaje,
      precioSugeridoPersonalizado,
      vidaUtilDias,
      fechaVencimiento,
      produccion.conservacion || '',
      produccion.tipo_vida_util || '',
      produccion.notas || '',
      produccion.estado || 'calculada',
      id,
    ]
  );
}

// ======================================================
// PRODUCCIÓN - ELIMINAR
// ======================================================

export function eliminarProduccion(id) {
  asegurarTablaProducciones();

  db.runSync(
    `
    DELETE FROM produccion_insumos
    WHERE produccion_id = ?;
    `,
    [id]
  );

  db.runSync(
    `
    DELETE FROM producciones
    WHERE id = ?;
    `,
    [id]
  );
}

// ======================================================
// PEDIDOS - CREAR
// Crea pedido, detalle de productos y empaques.
// Todavía NO descuenta stock automáticamente.
// ======================================================

export function crearPedido(
  pedido,
  productos = [],
  empaques = []
) {
  asegurarTablaClientes();
  asegurarTablaProducciones();
  asegurarTablaInsumos();
  asegurarTablasPedidos();

  const subtotalProductos = productos.reduce((total, item) => {
    const cantidad = Number(item.cantidad || 0);
    const precioUnitario = Number(item.precio_unitario || 0);
    return total + cantidad * precioUnitario;
  }, 0);

  const costoEmpaques = empaques.reduce((total, item) => {
    const cantidad = Number(item.cantidad || 0);
    const costoUnitario = Number(item.costo_unitario || 0);
    return total + cantidad * costoUnitario;
  }, 0);

  const requiereDomicilio = pedido.requiere_domicilio ? 1 : 0;
  const costoEnvio = requiereDomicilio ? Number(pedido.costo_envio || 0) : 0;
  const total = subtotalProductos + costoEmpaques + costoEnvio;

  const resultado = db.runSync(
    `
    INSERT INTO pedidos (
      cliente_id,
      cliente_nombre,
      cliente_telefono,
      fecha_entrega,
      requiere_domicilio,
      direccion_entrega,
      subtotal_productos,
      costo_empaques,
      costo_envio,
      total,
      estado,
      notas,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP);
    `,
    [
      Number(pedido.cliente_id || 0),
      String(pedido.cliente_nombre || ''),
      String(pedido.cliente_telefono || ''),
      String(pedido.fecha_entrega || ''),
      requiereDomicilio,
      requiereDomicilio ? String(pedido.direccion_entrega || '') : '',
      Number(subtotalProductos || 0),
      Number(costoEmpaques || 0),
      Number(costoEnvio || 0),
      Number(total || 0),
      String(pedido.estado || 'pendiente'),
      String(pedido.notas || ''),
    ]
  );

  const pedidoId = Number(resultado.lastInsertRowId || 0);

  productos.forEach((item) => {
    const produccionId = Number(item.produccion_id || 0);
    const cantidad = Number(item.cantidad || 0);
    const precioUnitario = Number(item.precio_unitario || 0);
    const costoUnitario = Number(item.costo_unitario || 0);
    const recetaNombre = String(item.receta_nombre || '');
    const subtotal = cantidad * precioUnitario;

    db.runSync(
      `
      INSERT INTO pedidos_detalle (
        pedido_id,
        produccion_id,
        receta_nombre,
        cantidad,
        precio_unitario,
        costo_unitario,
        subtotal
      )
      VALUES (?, ?, ?, ?, ?, ?, ?);
      `,
      [
        pedidoId,
        produccionId,
        recetaNombre,
        cantidad,
        precioUnitario,
        costoUnitario,
        subtotal,
      ]
    );

    if (produccionId > 0 && cantidad > 0) {
      db.runSync(
        `
        UPDATE producciones
        SET
          unidades_disponibles = MAX(unidades_disponibles - ?, 0),
          unidades_resultantes = MAX(unidades_resultantes - ?, 0),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?;
        `,
        [
          cantidad,
          cantidad,
          produccionId,
        ]
      );

      db.runSync(
        `
        INSERT INTO movimientos_inventario (
          tipo_origen,
          origen_id,
          tipo_movimiento,
          referencia_tipo,
          referencia_id,
          descripcion,
          cantidad,
          costo_unitario
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `,
        [
          'pedido',
          pedidoId,
          'salida',
          'produccion',
          produccionId,
          `Venta en pedido: ${recetaNombre}`,
          cantidad,
          costoUnitario,
        ]
      );
    }
  });

  empaques.forEach((item) => {
    const insumoId = Number(item.insumo_id || 0);
    const cantidad = Number(item.cantidad || 0);
    const costoUnitario = Number(item.costo_unitario || 0);
    const insumoNombre = String(item.insumo_nombre || '');
    const subtotal = cantidad * costoUnitario;

    db.runSync(
      `
      INSERT INTO pedidos_empaques (
        pedido_id,
        insumo_id,
        insumo_nombre,
        cantidad,
        costo_unitario,
        subtotal
      )
      VALUES (?, ?, ?, ?, ?, ?);
      `,
      [
        pedidoId,
        insumoId,
        insumoNombre,
        cantidad,
        costoUnitario,
        subtotal,
      ]
    );

    if (insumoId > 0 && cantidad > 0) {
      db.runSync(
        `
        UPDATE insumos
        SET
          cantidad_actual = MAX(cantidad_actual - ?, 0),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?;
        `,
        [
          cantidad,
          insumoId,
        ]
      );

      db.runSync(
        `
        INSERT INTO movimientos_inventario (
          tipo_origen,
          origen_id,
          tipo_movimiento,
          referencia_tipo,
          referencia_id,
          descripcion,
          cantidad,
          costo_unitario
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `,
        [
          'pedido',
          pedidoId,
          'salida',
          'insumo',
          insumoId,
          `Empaque usado en pedido: ${insumoNombre}`,
          cantidad,
          costoUnitario,
        ]
      );
    }
  });

  return pedidoId;
}

// ======================================================
// PEDIDOS - STOCK HELPERS
// ======================================================

function devolverStockPedido(pedidoId) {
  asegurarTablaProducciones();
  asegurarTablaInsumos();
  asegurarTablasPedidos();

  const productosAnteriores = db.getAllSync(
    `
    SELECT *
    FROM pedidos_detalle
    WHERE pedido_id = ?;
    `,
    [pedidoId]
  );

  const empaquesAnteriores = db.getAllSync(
    `
    SELECT *
    FROM pedidos_empaques
    WHERE pedido_id = ?;
    `,
    [pedidoId]
  );

  productosAnteriores.forEach((item) => {
    const produccionId = Number(item.produccion_id || 0);
    const cantidad = Number(item.cantidad || 0);

    if (produccionId > 0 && cantidad > 0) {
      db.runSync(
        `
        UPDATE producciones
        SET
          unidades_disponibles = COALESCE(unidades_disponibles, 0) + ?,
          unidades_resultantes = COALESCE(unidades_resultantes, 0) + ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?;
        `,
        [cantidad, cantidad, produccionId]
      );
    }
  });

  empaquesAnteriores.forEach((item) => {
    const insumoId = Number(item.insumo_id || 0);
    const cantidad = Number(item.cantidad || 0);

    if (insumoId > 0 && cantidad > 0) {
      db.runSync(
        `
        UPDATE insumos
        SET
          cantidad_actual = COALESCE(cantidad_actual, 0) + ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?;
        `,
        [cantidad, insumoId]
      );
    }
  });

  db.runSync(
    `
    DELETE FROM movimientos_inventario
    WHERE tipo_origen = 'pedido'
    AND origen_id = ?;
    `,
    [pedidoId]
  );
}

function descontarStockPedido(pedidoId, productos = [], empaques = []) {
  productos.forEach((item) => {
    const produccionId = Number(item.produccion_id || 0);
    const cantidad = Number(item.cantidad || 0);
    const costoUnitario = Number(item.costo_unitario || 0);
    const recetaNombre = String(item.receta_nombre || '');

    if (produccionId > 0 && cantidad > 0) {
      db.runSync(
        `
        UPDATE producciones
        SET
          unidades_disponibles = MAX(COALESCE(unidades_disponibles, 0) - ?, 0),
          unidades_resultantes = MAX(COALESCE(unidades_resultantes, 0) - ?, 0),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?;
        `,
        [cantidad, cantidad, produccionId]
      );

      db.runSync(
        `
        INSERT INTO movimientos_inventario (
          tipo_origen,
          origen_id,
          tipo_movimiento,
          referencia_tipo,
          referencia_id,
          descripcion,
          cantidad,
          costo_unitario
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `,
        [
          'pedido',
          pedidoId,
          'salida',
          'produccion',
          produccionId,
          `Venta en pedido: ${recetaNombre}`,
          cantidad,
          costoUnitario,
        ]
      );
    }
  });

  empaques.forEach((item) => {
    const insumoId = Number(item.insumo_id || 0);
    const cantidad = Number(item.cantidad || 0);
    const costoUnitario = Number(item.costo_unitario || 0);
    const insumoNombre = String(item.insumo_nombre || '');

    if (insumoId > 0 && cantidad > 0) {
      db.runSync(
        `
        UPDATE insumos
        SET
          cantidad_actual = MAX(COALESCE(cantidad_actual, 0) - ?, 0),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?;
        `,
        [cantidad, insumoId]
      );

      db.runSync(
        `
        INSERT INTO movimientos_inventario (
          tipo_origen,
          origen_id,
          tipo_movimiento,
          referencia_tipo,
          referencia_id,
          descripcion,
          cantidad,
          costo_unitario
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `,
        [
          'pedido',
          pedidoId,
          'salida',
          'insumo',
          insumoId,
          `Empaque usado en pedido: ${insumoNombre}`,
          cantidad,
          costoUnitario,
        ]
      );
    }
  });
}

// ======================================================
// PEDIDOS - ACTUALIZAR
// Edita encabezado, devuelve stock anterior y descuenta stock nuevo.
// ======================================================

export function actualizarPedido(
  id,
  pedido,
  productos = [],
  empaques = []
) {
  asegurarTablaClientes();
  asegurarTablaProducciones();
  asegurarTablaInsumos();
  asegurarTablasPedidos();

  devolverStockPedido(id);

  const subtotalProductos = productos.reduce((total, item) => {
    const cantidad = Number(item.cantidad || 0);
    const precioUnitario = Number(item.precio_unitario || 0);
    return total + cantidad * precioUnitario;
  }, 0);

  const costoEmpaques = empaques.reduce((total, item) => {
    const cantidad = Number(item.cantidad || 0);
    const costoUnitario = Number(item.costo_unitario || 0);
    return total + cantidad * costoUnitario;
  }, 0);

  const requiereDomicilio = pedido.requiere_domicilio ? 1 : 0;
  const costoEnvio = requiereDomicilio
    ? Number(pedido.costo_envio || 0)
    : 0;

  const total = subtotalProductos + costoEmpaques + costoEnvio;

  db.runSync(
    `
    UPDATE pedidos
    SET
      cliente_id = ?,
      cliente_nombre = ?,
      cliente_telefono = ?,
      fecha_entrega = ?,
      requiere_domicilio = ?,
      direccion_entrega = ?,
      subtotal_productos = ?,
      costo_empaques = ?,
      costo_envio = ?,
      total = ?,
      estado = ?,
      notas = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?;
    `,
    [
      Number(pedido.cliente_id || 0),
      pedido.cliente_nombre || '',
      pedido.cliente_telefono || '',
      pedido.fecha_entrega || '',
      requiereDomicilio,
      requiereDomicilio ? pedido.direccion_entrega || '' : '',
      subtotalProductos,
      costoEmpaques,
      costoEnvio,
      total,
      pedido.estado || 'pendiente',
      pedido.notas || '',
      id,
    ]
  );

  db.runSync(`DELETE FROM pedidos_detalle WHERE pedido_id = ?;`, [id]);
  db.runSync(`DELETE FROM pedidos_empaques WHERE pedido_id = ?;`, [id]);

  productos.forEach((item) => {
    const cantidad = Number(item.cantidad || 0);
    const precioUnitario = Number(item.precio_unitario || 0);
    const costoUnitario = Number(item.costo_unitario || 0);
    const subtotal = cantidad * precioUnitario;

    db.runSync(
      `
      INSERT INTO pedidos_detalle (
        pedido_id,
        produccion_id,
        receta_nombre,
        cantidad,
        precio_unitario,
        costo_unitario,
        subtotal
      )
      VALUES (?, ?, ?, ?, ?, ?, ?);
      `,
      [
        id,
        item.produccion_id,
        item.receta_nombre || '',
        cantidad,
        precioUnitario,
        costoUnitario,
        subtotal,
      ]
    );
  });

  empaques.forEach((item) => {
    const cantidad = Number(item.cantidad || 0);
    const costoUnitario = Number(item.costo_unitario || 0);
    const subtotal = cantidad * costoUnitario;

    db.runSync(
      `
      INSERT INTO pedidos_empaques (
        pedido_id,
        insumo_id,
        insumo_nombre,
        cantidad,
        costo_unitario,
        subtotal
      )
      VALUES (?, ?, ?, ?, ?, ?);
      `,
      [
        id,
        item.insumo_id,
        item.insumo_nombre || '',
        cantidad,
        costoUnitario,
        subtotal,
      ]
    );
  });

  descontarStockPedido(id, productos, empaques);
}

// ======================================================
// PEDIDOS - CONSULTAS
// ======================================================

export function obtenerPedidos() {
  asegurarTablasPedidos();

  return db.getAllSync(`
    SELECT *
    FROM pedidos
    ORDER BY created_at DESC;
  `);
}

export function obtenerPedidoPorId(id) {
  asegurarTablasPedidos();

  return db.getFirstSync(
    `
    SELECT *
    FROM pedidos
    WHERE id = ?;
    `,
    [id]
  );
}

export function obtenerDetallePedido(pedidoId) {
  asegurarTablasPedidos();

  return db.getAllSync(
    `
    SELECT *
    FROM pedidos_detalle
    WHERE pedido_id = ?
    ORDER BY id ASC;
    `,
    [pedidoId]
  );
}

export function obtenerEmpaquesPedido(pedidoId) {
  asegurarTablasPedidos();

  return db.getAllSync(
    `
    SELECT *
    FROM pedidos_empaques
    WHERE pedido_id = ?
    ORDER BY id ASC;
    `,
    [pedidoId]
  );
}


export function actualizarEstadoPedido(id, estado) {
  asegurarTablasPedidos();

  db.runSync(
    `
    UPDATE pedidos
    SET
      estado = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?;
    `,
    [
      String(estado || 'pendiente'),
      Number(id || 0),
    ]
  );
}

// ======================================================
// PEDIDOS - ELIMINAR
// ======================================================

export function eliminarPedido(id) {
  asegurarTablaProducciones();
  asegurarTablaInsumos();
  asegurarTablasPedidos();

  devolverStockPedido(id);

  db.runSync(
    `
    DELETE FROM pedidos_detalle
    WHERE pedido_id = ?;
    `,
    [id]
  );

  db.runSync(
    `
    DELETE FROM pedidos_empaques
    WHERE pedido_id = ?;
    `,
    [id]
  );

  db.runSync(
    `
    DELETE FROM pedidos
    WHERE id = ?;
    `,
    [id]
  );
}

// ======================================================
// DASHBOARD / INICIO
// Métricas rápidas para la pantalla principal
// ======================================================

export function obtenerResumenDashboard() {
  asegurarTablaInsumos();
  asegurarTablaProducciones();
  asegurarTablasPedidos();

  const pedidosPendientes = db.getFirstSync(`
    SELECT COUNT(*) AS total
    FROM pedidos
    WHERE estado = 'pendiente';
  `);

  const pedidosPreparacion = db.getFirstSync(`
    SELECT COUNT(*) AS total
    FROM pedidos
    WHERE estado = 'en_preparacion';
  `);

  const pedidosActivos = db.getFirstSync(`
    SELECT COUNT(*) AS total
    FROM pedidos
    WHERE estado IN ('pendiente', 'en_preparacion');
  `);

  const ventasMes = db.getFirstSync(`
    SELECT COALESCE(SUM(total), 0) AS total
    FROM pedidos
    WHERE estado != 'cancelado'
    AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now');
  `);

  const produccionesActivas = db.getFirstSync(`
    SELECT COUNT(*) AS total
    FROM producciones
    WHERE COALESCE(oculta, 0) = 0
    AND COALESCE(unidades_disponibles, unidades_resultantes, 0) > 0;
  `);

  const insumosAgotados = db.getFirstSync(`
    SELECT COUNT(*) AS total
    FROM insumos
    WHERE eliminado = 0
    AND COALESCE(cantidad_actual, 0) <= 0;
  `);

  const insumosBajoStock = db.getFirstSync(`
    SELECT COUNT(*) AS total
    FROM insumos
    WHERE eliminado = 0
    AND COALESCE(cantidad_actual, 0) > 0
    AND COALESCE(cantidad_minima, 0) > 0
    AND COALESCE(cantidad_actual, 0) <= COALESCE(cantidad_minima, 0);
  `);

  return {
    pedidos_pendientes: Number(pedidosPendientes?.total || 0),
    pedidos_en_preparacion: Number(pedidosPreparacion?.total || 0),
    pedidos_activos: Number(pedidosActivos?.total || 0),
    ventas_mes: Number(ventasMes?.total || 0),
    producciones_activas: Number(produccionesActivas?.total || 0),
    insumos_agotados: Number(insumosAgotados?.total || 0),
    insumos_bajo_stock: Number(insumosBajoStock?.total || 0),
  };
}

export function obtenerPedidosActivosDashboard() {
  asegurarTablasPedidos();

  return db.getAllSync(`
    SELECT *
    FROM pedidos
    WHERE estado IN ('pendiente', 'en_preparacion')
    ORDER BY created_at DESC
    LIMIT 5;
  `);
}


// ======================================================
// DIAGNÓSTICO / DEBUG
// ======================================================

export function obtenerTablas() {
  return db.getAllSync(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
    ORDER BY name;
  `);
}

export function contarRegistros(tabla) {
  return db.getAllSync(`
    SELECT COUNT(*) AS total
    FROM ${tabla};
  `);
}

export function obtenerMovimientosInventario() {
  asegurarTablaInsumos();
  asegurarTablaProducciones();
  asegurarTablasPedidos();

  return db.getAllSync(`
    SELECT
      mi.*,

      CASE
        WHEN mi.referencia_tipo = 'insumo' THEN i.nombre
        WHEN mi.referencia_tipo = 'produccion' THEN p.receta_nombre
        ELSE mi.descripcion
      END AS referencia_nombre,

      CASE
        WHEN mi.tipo_origen = 'pedido' THEN ped.cliente_nombre
        WHEN mi.tipo_origen = 'produccion' THEN prod.receta_nombre
        ELSE ''
      END AS origen_nombre

    FROM movimientos_inventario mi

    LEFT JOIN insumos i
      ON mi.referencia_tipo = 'insumo'
      AND mi.referencia_id = i.id

    LEFT JOIN producciones p
      ON mi.referencia_tipo = 'produccion'
      AND mi.referencia_id = p.id

    LEFT JOIN pedidos ped
      ON mi.tipo_origen = 'pedido'
      AND mi.origen_id = ped.id

    LEFT JOIN producciones prod
      ON mi.tipo_origen = 'produccion'
      AND mi.origen_id = prod.id

    ORDER BY mi.created_at DESC;
  `);
}

function asegurarTablaComprobantesPedido() {
  asegurarTablasPedidos();

  db.execSync(`
    CREATE TABLE IF NOT EXISTS comprobantes_pedido (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_id INTEGER,
      ruta_pdf TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export function registrarComprobantePedido(pedidoId, rutaPdf) {
  asegurarTablaComprobantesPedido();

  db.runSync(
    `
    INSERT INTO comprobantes_pedido (
      pedido_id,
      ruta_pdf
    )
    VALUES (?, ?);
    `,
    [pedidoId, rutaPdf || '']
  );
}

export function obtenerComprobantesPedido() {
  asegurarTablaComprobantesPedido();

  return db.getAllSync(`
    SELECT *
    FROM comprobantes_pedido
    ORDER BY created_at DESC;
  `);
}

function asegurarTablaConfiguracion() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS configuracion (
      clave TEXT PRIMARY KEY,
      valor TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export function guardarConfiguracion(clave, valor) {
  asegurarTablaConfiguracion();

  db.runSync(
    `
    INSERT INTO configuracion (
      clave,
      valor,
      updated_at
    )
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(clave)
    DO UPDATE SET
      valor = excluded.valor,
      updated_at = CURRENT_TIMESTAMP;
    `,
    [clave, valor]
  );
}

export function obtenerConfiguracion(clave) {
  asegurarTablaConfiguracion();

  const row = db.getFirstSync(
    `
    SELECT valor
    FROM configuracion
    WHERE clave = ?;
    `,
    [clave]
  );

  return row?.valor || '';
}