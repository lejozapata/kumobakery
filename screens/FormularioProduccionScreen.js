import React, { useEffect, useMemo, useState } from 'react';

import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import {
  actualizarProduccion,
  crearProduccionConInsumos,
  obtenerInsumos,
  obtenerProduccionPorId,
  obtenerRecetas,
} from '../database/db';

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

function parseIngredientes(valor) {
  try {
    const data = JSON.parse(valor || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function normalizarTexto(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function singularizarPalabra(palabra) {
  if (!palabra) return '';

  if (palabra.endsWith('es') && palabra.length > 4) {
    return palabra.slice(0, -2);
  }

  if (palabra.endsWith('s') && palabra.length > 3) {
    return palabra.slice(0, -1);
  }

  return palabra;
}

function normalizarNombreComparable(texto) {
  return normalizarTexto(texto)
    .split(/\s+/)
    .filter(Boolean)
    .map(singularizarPalabra)
    .join(' ')
    .trim();
}

function limpiarTextoParaMatch(texto) {
  return normalizarNombreComparable(texto)
    .replace(/\d+(?:[.,]\d+)?\s*(kg|g|gr|gramo|gramos|ml|l|litro|litros|unidad|unidades|docena|docenas)?/g, ' ')
    .replace(/\b(de|del|la|el|los|las|un|una|y|con|sin)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function obtenerTokens(texto) {
  return limpiarTextoParaMatch(texto)
    .split(' ')
    .filter((token) => token.length > 2);
}

function obtenerCoincidenciasInsumos(textoIngrediente, insumos) {
  const tokensIngrediente = obtenerTokens(textoIngrediente);

  if (tokensIngrediente.length === 0) return [];

  return insumos.filter((insumo) => {
    const tokensInsumo = obtenerTokens(insumo.nombre);

    return tokensIngrediente.some((tokenIngrediente) =>
      tokensInsumo.some((tokenInsumo) =>
        tokenIngrediente === tokenInsumo ||
        tokenIngrediente.includes(tokenInsumo) ||
        tokenInsumo.includes(tokenIngrediente)
      )
    );
  });
}

function extraerCantidadYUnidad(texto) {
  const limpio = normalizarTexto(texto);

  const match = limpio.match(
    /(\d+(?:[.,]\d+)?)\s*(kg|g|gr|gramos|ml|l|litro|litros|unidad|unidades|docena|docenas)/
  );

  if (!match) {
    return {
      cantidad: 0,
      unidad: '',
    };
  }

  let cantidad = Number(String(match[1]).replace(',', '.')) || 0;
  let unidad = match[2];

  if (unidad === 'gr' || unidad === 'gramos') unidad = 'g';
  if (unidad === 'litro' || unidad === 'litros') unidad = 'L';
  if (unidad === 'unidades') unidad = 'unidad';
  if (unidad === 'docenas') unidad = 'docena';

  return {
    cantidad,
    unidad,
  };
}

function normalizarUnidad(unidad) {
  const valor = String(unidad || '').toLowerCase();

  if (valor === 'gr' || valor === 'gramos' || valor === 'gramo') return 'g';
  if (valor === 'kg' || valor === 'kilo' || valor === 'kilos') return 'kg';

  if (valor === 'ml' || valor === 'mililitro' || valor === 'mililitros') return 'ml';
  if (valor === 'l' || valor === 'lt' || valor === 'litro' || valor === 'litros') return 'L';

  if (valor === 'unidad' || valor === 'unidades') return 'unidad';
  if (valor === 'docena' || valor === 'docenas') return 'docena';

  return unidad || '';
}

function convertirCantidad(cantidad, unidadOrigen, unidadDestino) {
  const origen = normalizarUnidad(unidadOrigen);
  const destino = normalizarUnidad(unidadDestino);
  const valor = Number(cantidad || 0);

  if (!valor) return 0;
  if (!origen || !destino) return valor;
  if (origen === destino) return valor;

  if (origen === 'g' && destino === 'kg') return valor / 1000;
  if (origen === 'kg' && destino === 'g') return valor * 1000;

  if (origen === 'ml' && destino === 'L') return valor / 1000;
  if (origen === 'L' && destino === 'ml') return valor * 1000;

  if (origen === 'unidad' && destino === 'docena') return valor / 12;
  if (origen === 'docena' && destino === 'unidad') return valor * 12;

  return valor;
}

function sonUnidadesCompatibles(unidadA, unidadB) {
  const a = normalizarUnidad(unidadA);
  const b = normalizarUnidad(unidadB);

  if (!a || !b) return true;
  if (a === b) return true;

  const peso = ['g', 'kg'];
  const volumen = ['ml', 'L'];
  const conteo = ['unidad', 'docena'];

  return (
    (peso.includes(a) && peso.includes(b)) ||
    (volumen.includes(a) && volumen.includes(b)) ||
    (conteo.includes(a) && conteo.includes(b))
  );
}

function calcularFechaVencimientoLocal(vidaUtilDias) {
  const dias = Number(vidaUtilDias || 0);

  if (dias <= 0) return '';

  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);

  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const anio = fecha.getFullYear();

  return `${dia}/${mes}/${anio}`;
}

function extraerRendimientoNumerico(valor) {
  const match = String(valor || '').match(/\d+(?:[.,]\d+)?/);

  if (!match) return 0;

  return Number(match[0].replace(',', '.')) || 0;
}

function mapearIngredientesConInsumos(receta, insumos) {
  const ingredientes = parseIngredientes(receta?.ingredientes);

  return ingredientes.map((ingrediente) => {
    const textoIngrediente = ingrediente.texto || '';
    const textoNormalizado = normalizarTexto(textoIngrediente);

    const coincidencias = obtenerCoincidenciasInsumos(
      textoIngrediente,
      insumos
    );

    const insumoEncontrado =
      coincidencias.length === 1 ? coincidencias[0] : null;

    const cantidadDetectada = extraerCantidadYUnidad(textoIngrediente);

    if (!insumoEncontrado) {
      return {
        idTemporal: ingrediente.id || String(Date.now()),
        texto_original: textoIngrediente,
        mapeado: false,
        requiere_seleccion: coincidencias.length > 1,
        opciones_coincidencia: coincidencias,
        insumo_id: null,
        insumo_nombre: '',
        unidad_receta: normalizarUnidad(cantidadDetectada.unidad),
        cantidad_receta: Number(cantidadDetectada.cantidad || 0),

        unidad_medida: normalizarUnidad(cantidadDetectada.unidad),
        cantidad_usada: Number(cantidadDetectada.cantidad || 0),
        costo_por_unidad: 0,
        costo_calculado: 0,
        disponible_al_momento: 0,
      };
    }

    const costoPorUnidad = Number(insumoEncontrado.costo_por_unidad || 0);

  const unidadReceta = normalizarUnidad(cantidadDetectada.unidad);
  const unidadInsumo = normalizarUnidad(insumoEncontrado.unidad_medida);

  const cantidadReceta = Number(cantidadDetectada.cantidad || 0);

  const compatible = sonUnidadesCompatibles(unidadReceta, unidadInsumo);

  const cantidadUsadaEnUnidadInsumo = compatible
    ? convertirCantidad(cantidadReceta, unidadReceta, unidadInsumo)
    : cantidadReceta;

  const disponibleAlMomento = Number(insumoEncontrado.cantidad_actual || 0);

  return {
    idTemporal: ingrediente.id || String(Date.now()),
    texto_original: textoIngrediente,
    mapeado: true,
    insumo_id: insumoEncontrado.id,
    insumo_nombre: insumoEncontrado.nombre,

    unidad_receta: unidadReceta,
    cantidad_receta: cantidadReceta,

    unidad_medida: unidadInsumo,
    cantidad_usada: cantidadUsadaEnUnidadInsumo,

    costo_por_unidad: costoPorUnidad,
    costo_calculado: cantidadUsadaEnUnidadInsumo * costoPorUnidad,
    disponible_al_momento: disponibleAlMomento,

    compatible,
  };
  });
}

export default function FormularioProduccionScreen({ navigation, route }) {
  const produccionId = route?.params?.produccionId || null;
  const modoEdicion = Boolean(produccionId);

  const [recetas, setRecetas] = useState([]);
  const [insumos, setInsumos] = useState([]);

  const [recetaSeleccionada, setRecetaSeleccionada] = useState(null);
  const [ingredientesMapeados, setIngredientesMapeados] = useState([]);

  const [cantidadLotes, setCantidadLotes] = useState('1');
  const [utilidadDeseada, setUtilidadDeseada] = useState('40');
  const [unidadesReales, setUnidadesReales] = useState('');
  const [unidadesPerdidas, setUnidadesPerdidas] = useState('0');
  const [notas, setNotas] = useState('');
  const [fechaProduccion, setFechaProduccion] = useState('');
  const [selectorInsumoIndex, setSelectorInsumoIndex] = useState(null);

  useEffect(() => {
    try {
      const recetasData = obtenerRecetas();
      const insumosData = obtenerInsumos();

      setRecetas(recetasData);
      setInsumos(insumosData);
    } catch (error) {
      console.error('Error cargando datos de producción:', error);
      Alert.alert('Error', 'No fue posible cargar recetas e insumos.');
    }
  }, []);

  useEffect(() => {
    if (!produccionId || recetas.length === 0 || insumos.length === 0) {
      return;
    }

    const produccion = obtenerProduccionPorId(produccionId);

    if (!produccion) {
      Alert.alert('Error', 'No se encontró la producción.');
      navigation.goBack();
      return;
    }

    const receta = recetas.find(
      (item) => item.id === produccion.receta_id
    );

    if (!receta) {
      Alert.alert(
        'Receta no encontrada',
        'La receta asociada a esta producción ya no existe.'
      );
      return;
    }

    setRecetaSeleccionada(receta);

    const mapeados = mapearIngredientesConInsumos(receta, insumos);
    setIngredientesMapeados(mapeados);

    setCantidadLotes(String(produccion.cantidad_lotes || '1'));
    setUtilidadDeseada(String(produccion.margen_porcentaje || 40));
    setUnidadesReales(String(produccion.unidades_reales || ''));
    setUnidadesPerdidas(String(produccion.unidades_perdidas || '0'));
    setNotas(produccion.notas || '');
    setFechaProduccion(produccion.fecha || '');
  }, [produccionId, recetas, insumos, navigation]);

  function seleccionarReceta(receta) {
    setRecetaSeleccionada(receta);

    const mapeados = mapearIngredientesConInsumos(receta, insumos);
    setIngredientesMapeados(mapeados);

    setUnidadesReales('');
    setUnidadesPerdidas('0');
    setUtilidadDeseada('40');
  }

  function actualizarCantidadIngrediente(index, valor) {
    const copia = [...ingredientesMapeados];

    const cantidadReceta = Number(String(valor).replace(',', '.')) || 0;

    const cantidadUsadaEnUnidadInsumo = convertirCantidad(
      cantidadReceta,
      copia[index].unidad_receta,
      copia[index].unidad_medida
    );

    copia[index] = {
      ...copia[index],
      cantidad_receta: valor,
      cantidad_usada: cantidadUsadaEnUnidadInsumo,
      costo_calculado:
        cantidadUsadaEnUnidadInsumo *
        Number(copia[index].costo_por_unidad || 0),
    };

    setIngredientesMapeados(copia);
  }

  const rendimientoBase = useMemo(() => {
    return extraerRendimientoNumerico(recetaSeleccionada?.rendimiento);
  }, [recetaSeleccionada]);

  const unidadesEsperadas = useMemo(() => {
    const lotes =
      Number(String(cantidadLotes).replace(',', '.')) || 1;

    return rendimientoBase * lotes;
  }, [cantidadLotes, rendimientoBase]);

  const unidadesRealesCalculadas = useMemo(() => {
    const reales =
      Number(String(unidadesReales).replace(',', '.')) || 0;

    if (reales <= 0) return unidadesEsperadas;

    return reales;
  }, [unidadesReales, unidadesEsperadas]);

  const unidadesPerdidasCalculadas = useMemo(() => {
    return Number(String(unidadesPerdidas).replace(',', '.')) || 0;
  }, [unidadesPerdidas]);

  const unidadesDisponibles = useMemo(() => {
    return Math.max(
      unidadesRealesCalculadas - unidadesPerdidasCalculadas,
      0
    );
  }, [unidadesRealesCalculadas, unidadesPerdidasCalculadas]);

  const costoIngredientes = useMemo(() => {
    return ingredientesMapeados.reduce((total, item) => {
      return total + Number(item.costo_calculado || 0);
    }, 0);
  }, [ingredientesMapeados]);

  const costoEnergia = useMemo(() => {
    const lotes =
      Number(String(cantidadLotes).replace(',', '.')) || 1;

    return Number(recetaSeleccionada?.costo_energia || 0) * lotes;
  }, [recetaSeleccionada, cantidadLotes]);

  const costoTotal = costoIngredientes + costoEnergia;

  const costoPorUnidad = useMemo(() => {
    if (unidadesDisponibles <= 0) return 0;

    return costoTotal / unidadesDisponibles;
  }, [costoTotal, unidadesDisponibles]);

  const utilidadDecimal = useMemo(() => {
    return (
      Number(String(utilidadDeseada).replace(',', '.')) / 100 || 0
    );
  }, [utilidadDeseada]);

  const precioSugerido = useMemo(() => {
    if (costoPorUnidad <= 0) return 0;

    if (utilidadDecimal <= 0) return costoPorUnidad;
    if (utilidadDecimal >= 1) return 0;

    return costoPorUnidad / (1 - utilidadDecimal);
  }, [costoPorUnidad, utilidadDecimal]);

  const utilidadEstimada = useMemo(() => {
    return Math.max(precioSugerido - costoPorUnidad, 0);
  }, [precioSugerido, costoPorUnidad]);


  function seleccionarInsumoManual(index, insumo) {
    const copia = [...ingredientesMapeados];
    const item = copia[index];

    const cantidadReceta =
      Number(String(item.cantidad_receta ?? item.cantidad_usada ?? 0).replace(',', '.')) || 0;

    const unidadReceta = normalizarUnidad(
      item.unidad_receta || item.unidad_medida || ''
    );

    const unidadInsumo = normalizarUnidad(insumo.unidad_medida);

    const compatible = sonUnidadesCompatibles(unidadReceta, unidadInsumo);

    const cantidadUsadaEnUnidadInsumo = compatible
      ? convertirCantidad(cantidadReceta, unidadReceta, unidadInsumo)
      : cantidadReceta;

    const costoPorUnidad = Number(insumo.costo_por_unidad || 0);

    copia[index] = {
      ...item,
      mapeado: true,
      requiere_seleccion: false,
      opciones_coincidencia: [],

      insumo_id: insumo.id,
      insumo_nombre: insumo.nombre,

      unidad_receta: unidadReceta,
      cantidad_receta: cantidadReceta,

      unidad_medida: unidadInsumo,
      cantidad_usada: cantidadUsadaEnUnidadInsumo,

      costo_por_unidad: costoPorUnidad,
      costo_calculado: cantidadUsadaEnUnidadInsumo * costoPorUnidad,
      disponible_al_momento: Number(insumo.cantidad_actual || 0),

      compatible,
    };

    setIngredientesMapeados(copia);
    setSelectorInsumoIndex(null);
  }

  const ingredientesSinMapear = useMemo(() => {
    return ingredientesMapeados.filter((item) => !item.mapeado);
  }, [ingredientesMapeados]);

  const ingredientesConStockInsuficiente = useMemo(() => {
    return ingredientesMapeados.filter((item) => {
      if (!item.mapeado) return false;

      return (
        Number(item.cantidad_usada || 0) >
        Number(item.disponible_al_momento || 0)
      );
    });
  }, [ingredientesMapeados]);

  function guardarProduccion() {
    if (!recetaSeleccionada) {
      Alert.alert('Falta información', 'Selecciona una receta para producir.');
      return;
    }

    if (unidadesDisponibles <= 0) {
      Alert.alert(
        'Producción inválida',
        'Las unidades disponibles deben ser mayores a 0.'
      );
      return;
    }

    if (utilidadDecimal >= 1) {
      Alert.alert(
        'Utilidad inválida',
        'La utilidad deseada debe ser menor al 100%.'
      );
      return;
    }

    if (ingredientesConStockInsuficiente.length > 0) {
  const detalle = ingredientesConStockInsuficiente
    .map((item) => {
      return `• ${item.insumo_nombre}: necesita ${Number(item.cantidad_usada || 0).toLocaleString('es-CO')} ${item.unidad_medida}, disponible ${Number(item.disponible_al_momento || 0).toLocaleString('es-CO')} ${item.unidad_medida}`;
    })
    .join('\n');

  Alert.alert(
    'Stock insuficiente',
    `No puedes guardar esta producción porque hay insumos sin stock suficiente:\n\n${detalle}`
  );

  return;
}

if (ingredientesSinMapear.length > 0) {
  const detalle = ingredientesSinMapear
    .map((item) => `• ${item.texto_original}`)
    .join('\n');

  Alert.alert(
    'Ingredientes sin insumo',
    `Hay ingredientes que no están vinculados a ningún insumo:\n\n${detalle}\n\nSi guardas así, no se descontarán del inventario ni sumarán costo. ¿Quieres guardar de todas formas?`,
    [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: 'Guardar igual',
        style: 'destructive',
        onPress: () => guardarProduccionConfirmada(),
      },
    ]
  );

  return;
}

guardarProduccionConfirmada();

  }

  function guardarProduccionConfirmada() {
    const insumosUsados = ingredientesMapeados
      .filter((item) => item.mapeado)
      .map((item) => ({
        insumo_id: item.insumo_id,
        insumo_nombre: item.insumo_nombre,
        unidad_medida: item.unidad_medida,
        cantidad_usada:
          Number(String(item.cantidad_usada).replace(',', '.')) || 0,
        costo_por_unidad: Number(item.costo_por_unidad || 0),
        costo_calculado: Number(item.costo_calculado || 0),
        disponible_al_momento: Number(item.disponible_al_momento || 0),
      }));

    const vidaUtilDias = Number(recetaSeleccionada.vida_util_dias || 0);
    const fechaVencimiento = calcularFechaVencimientoLocal(vidaUtilDias);

    const payloadProduccion = {
      receta_id: recetaSeleccionada.id,
      receta_nombre: recetaSeleccionada.nombre,

      cantidad_lotes:
        Number(String(cantidadLotes).replace(',', '.')) || 1,

      rendimiento_base: rendimientoBase,
      unidades_esperadas: unidadesEsperadas,
      unidades_reales: unidadesRealesCalculadas,
      unidades_perdidas: unidadesPerdidasCalculadas,
      unidades_resultantes: unidadesDisponibles,

      costo_ingredientes: costoIngredientes,
      costo_energia: costoEnergia,

      margen_porcentaje:
        Number(String(utilidadDeseada).replace(',', '.')) || 40,

      precio_sugerido_personalizado: precioSugerido,

      vida_util_dias: vidaUtilDias,
      fecha_vencimiento: fechaVencimiento,
      conservacion: recetaSeleccionada.conservacion || '',
      tipo_vida_util: recetaSeleccionada.tipo_vida_util || '',

      notas,
      estado: 'calculada',
    };

    if (modoEdicion) {
      actualizarProduccion(produccionId, payloadProduccion);
    } else {
      crearProduccionConInsumos(payloadProduccion, insumosUsados);
    }

    Alert.alert(
      'Producción guardada',
      'La producción fue calculada y guardada correctamente.'
    );

    navigation.goBack();
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>
          {modoEdicion
            ? recetaSeleccionada?.nombre || 'Editar producción'
            : 'Nueva producción'}
        </Text>

        <Text style={styles.subtitle}>
          {modoEdicion
            ? `Producción registrada${fechaProduccion ? ` · ${fechaProduccion}` : ''}`
            : 'Selecciona una receta y calcula el costo real del lote.'}
        </Text>

        <Section title="1. Selecciona la receta">
          {recetas.length === 0 ? (
            <Text style={styles.helperText}>
              Primero debes crear una receta.
            </Text>
          ) : (
            recetas.map((receta) => {
              const activa = recetaSeleccionada?.id === receta.id;

              return (
                <Pressable
                  key={receta.id}
                  style={[
                    styles.recipeCard,
                    activa && styles.recipeCardActive,
                  ]}
                  onPress={() => seleccionarReceta(receta)}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.recipeName,
                        activa && styles.recipeNameActive,
                      ]}
                    >
                      {receta.nombre}
                    </Text>

                    {!!receta.rendimiento && (
                      <Text
                        style={[
                          styles.recipeMeta,
                          activa && styles.recipeMetaActive,
                        ]}
                      >
                        Rendimiento: {receta.rendimiento}
                      </Text>
                    )}
                  </View>

                  {activa && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color="#FFFFFF"
                    />
                  )}
                </Pressable>
              );
            })
          )}
        </Section>

        {recetaSeleccionada && (
          <>
            <Section title="2. Parámetros del lote">
              <Input
                label="Cantidad de lotes"
                value={cantidadLotes}
                onChangeText={setCantidadLotes}
                keyboardType="decimal-pad"
                placeholder="1"
              />

              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>
                  Rendimiento base de receta
                </Text>

                <Text style={styles.summaryValue}>
                  {rendimientoBase} unidades
                </Text>
              </View>

              <View style={[styles.summaryCard, { marginTop: 10 }]}>
                <Text style={styles.summaryLabel}>
                  Unidades esperadas
                </Text>

                <Text style={styles.summaryValue}>
                  {unidadesEsperadas}
                </Text>
              </View>

              <View style={{ marginTop: 12 }}>
                <Input
                  label="Unidades reales obtenidas (opcional)"
                  value={unidadesReales}
                  onChangeText={setUnidadesReales}
                  keyboardType="decimal-pad"
                  placeholder={`Ej: ${unidadesEsperadas}`}
                />

                <Text style={styles.helperText}>
                  Si no escribes nada, se usarán las esperadas automáticamente.
                </Text>
              </View>

              <View style={{ marginTop: 8 }}>
                <Input
                  label="Unidades perdidas / descartadas"
                  value={unidadesPerdidas}
                  onChangeText={setUnidadesPerdidas}
                  keyboardType="decimal-pad"
                  placeholder="0"
                />
              </View>

              <View style={[styles.summaryCardStrong, { marginTop: 12 }]}>
                <Text style={styles.summaryLabelStrong}>
                  Disponibles para venta
                </Text>

                <Text style={styles.summaryValueStrong}>
                  {unidadesDisponibles}
                </Text>
              </View>
            </Section>

            <Section title="3. Ingredientes detectados">
              {ingredientesMapeados.length === 0 ? (
                <Text style={styles.helperText}>
                  Esta receta no tiene ingredientes registrados.
                </Text>
              ) : (
                ingredientesMapeados.map((item, index) => (
                  <View
                    key={`${item.idTemporal}-${index}`}
                    style={styles.ingredientCard}
                  >
                    <View style={styles.ingredientHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.originalText}>
                          {item.texto_original}
                        </Text>

                        {item.mapeado ? (
                          <Text style={styles.mappedText}>
                            Mapeado con: {item.insumo_nombre}
                          </Text>
                        ) : (
                          <>
                            <Text style={styles.notMappedText}>
                              {item.requiere_seleccion
                                ? 'Se encontraron varias coincidencias'
                                : 'No se encontró un insumo coincidente'}
                            </Text>

                            {item.requiere_seleccion ? (
                              <Pressable
                                style={styles.selectInsumoButton}
                                onPress={() => {
                                  setSelectorInsumoIndex(
                                    selectorInsumoIndex === index ? null : index
                                  );
                                }}
                              >
                                <Text style={styles.selectInsumoButtonText}>
                                  {selectorInsumoIndex === index
                                    ? 'Ocultar opciones'
                                    : 'Elegir insumo'}
                                </Text>
                              </Pressable>
                            ) : null}
                          </>
                        )}
                      </View>

                      <Ionicons
                        name={
                          item.mapeado
                            ? 'checkmark-circle'
                            : 'alert-circle-outline'
                        }
                        size={22}
                        color={item.mapeado ? '#2F855A' : '#B45309'}
                      />
                    </View>

                    {item.requiere_seleccion && selectorInsumoIndex === index ? (
                      <View style={styles.inlineSelectorBox}>
                        <Text style={styles.inlineSelectorTitle}>
                          Elige el insumo correcto
                        </Text>

                        {(item.opciones_coincidencia || []).map((insumo) => (
                          <Pressable
                            key={insumo.id}
                            style={styles.inlineOption}
                            onPress={() => seleccionarInsumoManual(index, insumo)}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={styles.inlineOptionTitle}>
                                {insumo.nombre}
                              </Text>

                              <Text style={styles.inlineOptionMeta}>
                                Disponible: {Number(insumo.cantidad_actual || 0).toLocaleString('es-CO')}{' '}
                                {insumo.unidad_medida} · Costo: {COP.format(insumo.costo_por_unidad || 0)}
                              </Text>
                            </View>

                            <Ionicons
                              name="chevron-forward"
                              size={20}
                              color="#8B5E4E"
                            />
                          </Pressable>
                        ))}
                      </View>
                    ) : null}

                    {item.mapeado && (
                      <>
                        <View style={styles.row}>
                          <Input
                            half
                            label={`Cantidad usada (${
                              item.unidad_receta || item.unidad_medida || 'unidad'
                            })`}
                            value={String(item.cantidad_receta ?? '')}
                            onChangeText={(valor) =>
                              actualizarCantidadIngrediente(index, valor)
                            }
                            keyboardType="decimal-pad"
                          />

                          <View style={styles.costMiniBox}>
                            <Text style={styles.costMiniLabel}>Costo</Text>

                            <Text style={styles.costMiniValue}>
                              {COP.format(item.costo_calculado || 0)}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.helperText}>
                          Disponible en inventario:{' '}
                          {Number(item.disponible_al_momento || 0).toLocaleString('es-CO')}{' '}
                          {item.unidad_medida}
                        </Text>
                      </>
                    )}
                  </View>
                ))
              )}
            </Section>

            <Section title="4. Resultado del costeo">
              <View style={styles.summaryGrid}>
                <SummaryCard
                  label="Ingredientes"
                  value={COP.format(costoIngredientes)}
                />

                <SummaryCard
                  label="Energía"
                  value={COP.format(costoEnergia)}
                />

                <SummaryCard
                  label="Costo total"
                  value={COP.format(costoTotal)}
                  strong
                />

                <SummaryCard
                  label="Costo unidad vendible"
                  value={COP.format(costoPorUnidad)}
                  strong
                />
              </View>
            </Section>

            <Section title="5. Precio sugerido">
              <Input
                label="Utilidad deseada (%)"
                value={utilidadDeseada}
                onChangeText={setUtilidadDeseada}
                keyboardType="decimal-pad"
                placeholder="40"
              />

              <Text style={styles.helperText}>
                Ejemplo: 40 significa que deseas ganar aproximadamente un 40%
                sobre el precio final del producto.
              </Text>

              <View style={[styles.summaryCard, { marginTop: 14 }]}>
                <Text style={styles.summaryLabel}>
                  Costo real por unidad
                </Text>

                <Text style={styles.summaryValue}>
                  {COP.format(costoPorUnidad)}
                </Text>
              </View>

              <View style={[styles.summaryCard, { marginTop: 10 }]}>
                <Text style={styles.summaryLabel}>
                  Utilidad estimada por unidad
                </Text>

                <Text style={styles.summaryValue}>
                  {COP.format(utilidadEstimada)}
                </Text>
              </View>

              <View style={[styles.priceCardRecommended, { marginTop: 10 }]}>
                <Text style={styles.priceLabelRecommended}>
                  Precio sugerido de venta
                </Text>

                <Text style={styles.priceValueRecommended}>
                  {COP.format(precioSugerido)}
                </Text>
              </View>
            </Section>

            <Section title="Notas">
              <Input
                multiline
                label="Notas de producción"
                value={notas}
                onChangeText={setNotas}
                placeholder="Ej: Se dañaron 2 unidades, revisar humedad..."
              />
            </Section>

            <Pressable style={styles.saveButton} onPress={guardarProduccion}>
              <Ionicons name="save-outline" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>
                {modoEdicion ? 'Actualizar producción' : 'Guardar producción'}
              </Text>
            </Pressable>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Input({ label, half, multiline, ...props }) {
  return (
    <View style={[styles.inputWrap, half && styles.inputHalf]}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor="#A79C95"
        style={[styles.input, multiline && styles.textArea]}
      />
    </View>
  );
}

function SummaryCard({ label, value, strong }) {
  return (
    <View style={[styles.summaryCard, strong && styles.summaryCardStrong]}>
      <Text style={[styles.summaryLabel, strong && styles.summaryLabelStrong]}>
        {label}
      </Text>

      <Text style={[styles.summaryValue, strong && styles.summaryValueStrong]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F3',
  },

  content: {
    padding: 18,
    paddingBottom: 60,
  },

  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#3B2A24',
  },

  subtitle: {
    marginTop: 4,
    marginBottom: 16,
    color: '#7A6F68',
    fontSize: 14,
  },

  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EFE3DA',
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#3B2A24',
    marginBottom: 12,
  },

  recipeCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8DCD3',
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#FFF8F3',
    flexDirection: 'row',
    alignItems: 'center',
  },

  recipeCardActive: {
    backgroundColor: '#8B5E4E',
    borderColor: '#8B5E4E',
  },

  recipeName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3B2A24',
  },

  recipeNameActive: {
    color: '#FFFFFF',
  },

  recipeMeta: {
    marginTop: 3,
    fontSize: 12,
    color: '#7A6F68',
  },

  recipeMetaActive: {
    color: '#F7EDE6',
  },

  row: {
    flexDirection: 'row',
    gap: 10,
  },

  inputWrap: {
    marginBottom: 12,
  },

  inputHalf: {
    flex: 1,
  },

  label: {
    fontSize: 13,
    color: '#7A6F68',
    marginBottom: 6,
    fontWeight: '700',
  },

  input: {
    minHeight: 46,
    borderRadius: 15,
    backgroundColor: '#FFF8F3',
    borderWidth: 1,
    borderColor: '#E8DCD3',
    paddingHorizontal: 14,
    color: '#3B2A24',
    fontSize: 15,
  },

  textArea: {
    minHeight: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },

  helperText: {
    color: '#8A7D75',
    fontSize: 12,
    lineHeight: 17,
  },

  ingredientCard: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#FFF8F3',
    borderWidth: 1,
    borderColor: '#E8DCD3',
  },

  ingredientHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },

  originalText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#3B2A24',
  },

  mappedText: {
    marginTop: 3,
    fontSize: 12,
    color: '#2F855A',
    fontWeight: '700',
  },

  notMappedText: {
    marginTop: 3,
    fontSize: 12,
    color: '#B45309',
    fontWeight: '700',
  },

  costMiniBox: {
    flex: 1,
    minHeight: 46,
    borderRadius: 15,
    backgroundColor: '#F7EDE6',
    paddingHorizontal: 12,
    justifyContent: 'center',
  },

  costMiniLabel: {
    color: '#7A6F68',
    fontSize: 12,
    fontWeight: '700',
  },

  costMiniValue: {
    color: '#3B2A24',
    fontSize: 16,
    fontWeight: '900',
  },

  summaryGrid: {
    gap: 10,
  },

  summaryCard: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#FFF8F3',
    borderWidth: 1,
    borderColor: '#E8DCD3',
  },

  summaryCardStrong: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#F7EDE6',
    borderWidth: 1,
    borderColor: '#E8DCD3',
  },

  summaryLabel: {
    color: '#7A6F68',
    fontSize: 12,
    fontWeight: '700',
  },

  summaryLabelStrong: {
    color: '#3B2A24',
    fontSize: 12,
    fontWeight: '800',
  },

  summaryValue: {
    marginTop: 4,
    color: '#3B2A24',
    fontSize: 18,
    fontWeight: '900',
  },

  summaryValueStrong: {
    marginTop: 4,
    color: '#3B2A24',
    fontSize: 21,
    fontWeight: '900',
  },

  priceCardRecommended: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#8B5E4E',
    marginBottom: 10,
  },

  priceLabelRecommended: {
    color: '#F7EDE6',
    fontSize: 13,
    fontWeight: '800',
  },

  priceValueRecommended: {
    marginTop: 4,
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
  },

  saveButton: {
    minHeight: 52,
    borderRadius: 22,
    backgroundColor: '#8B5E4E',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },

  selectInsumoButton: {
  marginTop: 10,
  alignSelf: 'flex-start',
  paddingVertical: 8,
  paddingHorizontal: 12,
  borderRadius: 12,
  backgroundColor: '#8B5E4E',
},

selectInsumoButtonText: {
  color: '#FFFFFF',
  fontSize: 12,
  fontWeight: '900',
},

modalOverlay: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.35)',
  justifyContent: 'flex-end',
  padding: 0,
},

modalCard: {
  width: '100%',
  borderTopLeftRadius: 28,
  borderTopRightRadius: 28,
  backgroundColor: '#FFFFFF',
  padding: 22,
  paddingBottom: 28,
},

modalHandle: {
  alignSelf: 'center',
  width: 42,
  height: 5,
  borderRadius: 999,
  backgroundColor: '#E8DCD3',
  marginBottom: 16,
},

modalTitle: {
  fontSize: 20,
  fontWeight: '900',
  color: '#3B2A24',
},

modalSubtitle: {
  marginTop: 4,
  marginBottom: 14,
  color: '#7A6F68',
  fontSize: 13,
},

modalOption: {
  padding: 14,
  borderRadius: 16,
  backgroundColor: '#FFF8F3',
  borderWidth: 1,
  borderColor: '#E8DCD3',
  marginBottom: 10,
},

modalOptionTitle: {
  fontSize: 15,
  fontWeight: '900',
  color: '#3B2A24',
},

modalOptionMeta: {
  marginTop: 4,
  fontSize: 12,
  color: '#7A6F68',
},

modalCloseButton: {
  marginTop: 6,
  padding: 12,
  borderRadius: 14,
  alignItems: 'center',
  backgroundColor: '#F7EDE6',
},

modalCloseText: {
  color: '#8B5E4E',
  fontWeight: '900',
},

inlineSelectorBox: {
  marginTop: 4,
  marginBottom: 10,
  padding: 12,
  borderRadius: 16,
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: '#E8DCD3',
},

inlineSelectorTitle: {
  fontSize: 13,
  fontWeight: '900',
  color: '#3B2A24',
  marginBottom: 8,
},

inlineOption: {
  padding: 12,
  borderRadius: 14,
  backgroundColor: '#FFF8F3',
  borderWidth: 1,
  borderColor: '#E8DCD3',
  marginBottom: 8,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
},

inlineOptionTitle: {
  fontSize: 14,
  fontWeight: '900',
  color: '#3B2A24',
},

inlineOptionMeta: {
  marginTop: 3,
  fontSize: 12,
  color: '#7A6F68',
},

});