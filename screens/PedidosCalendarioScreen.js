import React, { useCallback, useMemo, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import {
  actualizarEstadoPedido,
  obtenerDetallePedido,
  obtenerPedidos,
} from '../database/db';

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export default function PedidosCalendarioScreen({ navigation }) {
  const hoy = new Date();

  const [pedidos, setPedidos] = useState([]);
  const [detallesPorPedido, setDetallesPorPedido] = useState({});
  const [cargando, setCargando] = useState(true);
  const [mesVisible, setMesVisible] = useState(
    new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  );
  const [fechaSeleccionadaKey, setFechaSeleccionadaKey] = useState(
    obtenerFechaKey(hoy)
  );

  const cargar = useCallback(() => {
    try {
      setCargando(true);

      const data = obtenerPedidos();
      const detalles = {};

      data.forEach((pedido) => {
        try {
          detalles[pedido.id] = obtenerDetallePedido(pedido.id);
        } catch {
          detalles[pedido.id] = [];
        }
      });

      setPedidos(data);
      setDetallesPorPedido(detalles);
    } catch (error) {
      console.error('Error cargando calendario:', error);
      Alert.alert('Error', 'No fue posible cargar el calendario de pedidos.');
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const pedidosPorFechaCreacion = useMemo(() => {
    const mapa = {};

    pedidos.forEach((pedido) => {
        const fecha = obtenerFechaPedido(pedido.created_at);

        if (!fecha) return;

        const key = obtenerFechaKey(fecha);

        if (!mapa[key]) {
        mapa[key] = [];
        }

        mapa[key].push(pedido);
    });

    return mapa;
    }, [pedidos]);

  const diasCalendario = useMemo(() => {
    return construirDiasCalendario(mesVisible, pedidosPorFechaCreacion);
    }, [mesVisible, pedidosPorFechaCreacion]);

  const pedidosSeleccionados = useMemo(() => {
    return pedidosPorFechaCreacion[fechaSeleccionadaKey] || [];
    }, [pedidosPorFechaCreacion, fechaSeleccionadaKey]);

  const resumenSeleccionado = useMemo(() => {
    const pendientes = pedidosSeleccionados.filter(
      (pedido) => pedido.estado === 'pendiente'
    ).length;

    const enPreparacion = pedidosSeleccionados.filter(
      (pedido) => pedido.estado === 'en_preparacion'
    ).length;

    const entregados = pedidosSeleccionados.filter(
      (pedido) => pedido.estado === 'entregado'
    ).length;

    const cancelados = pedidosSeleccionados.filter(
      (pedido) => pedido.estado === 'cancelado'
    ).length;

    const total = pedidosSeleccionados.reduce(
      (acc, pedido) => acc + Number(pedido.total || 0),
      0
    );

    return {
      pendientes,
      enPreparacion,
      entregados,
      cancelados,
      total,
      cantidad: pedidosSeleccionados.length,
    };
  }, [pedidosSeleccionados]);

  function cambiarMes(valor) {
    const nuevoMes = new Date(
      mesVisible.getFullYear(),
      mesVisible.getMonth() + valor,
      1
    );

    setMesVisible(nuevoMes);
    setFechaSeleccionadaKey(obtenerFechaKey(nuevoMes));
  }

  function volverAHoy() {
    const hoyActual = new Date();

    setMesVisible(
      new Date(hoyActual.getFullYear(), hoyActual.getMonth(), 1)
    );
    setFechaSeleccionadaKey(obtenerFechaKey(hoyActual));
  }

  function crearPedidoParaFecha() {
    navigation.navigate('FormularioPedido', {
      fechaPreseleccionada: fechaSeleccionadaKey,
    });
  }

  function cambiarEstadoPedido(pedido, nuevoEstado) {
    try {
      actualizarEstadoPedido(pedido.id, nuevoEstado);
      cargar();
    } catch (error) {
      console.error('Error actualizando estado:', error);
      Alert.alert('Error', 'No fue posible actualizar el estado del pedido.');
    }
  }

  const tituloMes = `${capitalizar(MESES[mesVisible.getMonth()])} ${mesVisible.getFullYear()}`;
  const fechaSeleccionada = fechaDesdeKey(fechaSeleccionadaKey);

  if (cargando) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={pedidosSeleccionados}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Calendario</Text>

                <Text style={styles.subtitle}>
                  Vista de entregas y planificación de pedidos.
                </Text>
              </View>

              <Pressable style={styles.todayButtonText} onPress={volverAHoy}>
                <Ionicons name="today-outline" size={18} color="#8B5E4E" />
                <Text style={styles.todayButtonLabel}>Hoy</Text>
             </Pressable>
            </View>

            <View style={styles.monthPanel}>
              <Pressable
                style={styles.monthButton}
                onPress={() => cambiarMes(-1)}
              >
                <Ionicons name="chevron-back" size={22} color="#8B5E4E" />
              </Pressable>

              <Text style={styles.monthTitle}>{tituloMes}</Text>

              <Pressable
                style={styles.monthButton}
                onPress={() => cambiarMes(1)}
              >
                <Ionicons name="chevron-forward" size={22} color="#8B5E4E" />
              </Pressable>
            </View>

            <View style={styles.calendarCard}>
              <View style={styles.weekHeader}>
                {DIAS.map((dia, index) => (
                  <Text key={`${dia}-${index}`} style={styles.weekDay}>
                    {dia}
                  </Text>
                ))}
              </View>

              <View style={styles.daysGrid}>
                {diasCalendario.map((dia) => (
                  <DayCell
                    key={dia.key}
                    dia={dia}
                    seleccionado={dia.key === fechaSeleccionadaKey}
                    onPress={() => setFechaSeleccionadaKey(dia.key)}
                  />
                ))}
              </View>

              <View style={styles.legendRow}>
                <Legend color="#8B5E4E" label="Pendiente" />
                <Legend color="#B45309" label="Preparación" />
                <Legend color="#2F855A" label="Entregado" />
                <Legend color="#6B46C1" label="Mixto" />
              </View>
            </View>

            <View style={styles.daySummary}>
              <View>
                <Text style={styles.daySummaryLabel}>Día seleccionado</Text>

                <Text style={styles.daySummaryTitle}>
                  {formatearFechaCompleta(fechaSeleccionada)}
                </Text>
              </View>

              <Pressable
                style={styles.createButton}
                onPress={crearPedidoParaFecha}
              >
                <Ionicons name="add" size={21} color="#FFFFFF" />
              </Pressable>
            </View>

            <View style={styles.summaryRow}>
              <MiniSummary label="Pedidos" value={resumenSeleccionado.cantidad} />
              <MiniSummary label="Pendientes" value={resumenSeleccionado.pendientes} />
              <MiniSummary label="Preparación" value={resumenSeleccionado.enPreparacion} />
            </View>

            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Total del día</Text>

              <Text style={styles.totalValue}>
                {COP.format(resumenSeleccionado.total)}
              </Text>
            </View>
          </>
        }
        renderItem={({ item }) => {
          const detalle = detallesPorPedido[item.id] || [];
          const estadoColor = obtenerColorEstado(item.estado);

          return (
            <Pressable
              style={styles.orderCard}
              onPress={() =>
                navigation.navigate('FormularioPedido', {
                  pedidoId: item.id,
                })
              }
            >
              <View style={styles.orderHeader}>
                <View style={styles.orderIcon}>
                  <Ionicons
                    name="bag-handle-outline"
                    size={22}
                    color="#8B5E4E"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.orderName}>
                    {item.cliente_nombre || 'Cliente sin nombre'}
                  </Text>

                  <Text style={styles.orderMeta}>
                    Creado: {formatearFechaCorta(item.created_at)}
                    </Text>

                    <Text style={styles.orderDelivery}>
                    Entrega: {item.fecha_entrega ? formatearFechaCorta(item.fecha_entrega) : 'Sin fecha'}
                    </Text>
                </View>

                <View style={[styles.statusPill, { borderColor: estadoColor }]}>
                  <Text style={[styles.statusText, { color: estadoColor }]}>
                    {obtenerTextoEstado(item.estado)}
                  </Text>
                </View>
              </View>

              <View style={styles.productsBox}>
                {detalle.length > 0 ? (
                  detalle.slice(0, 3).map((producto) => (
                    <Text key={producto.id} style={styles.productText}>
                      {Number(producto.cantidad || 0).toLocaleString('es-CO')} ×{' '}
                      {producto.receta_nombre || 'Producto'}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.productText}>
                    Sin detalle de productos
                  </Text>
                )}

                {detalle.length > 3 && (
                  <Text style={styles.moreText}>
                    +{detalle.length - 3} producto(s) más
                  </Text>
                )}
              </View>

              <View style={styles.orderFooter}>
                <Text style={styles.orderTotal}>
                  {COP.format(item.total || 0)}
                </Text>

                <View style={styles.quickActions}>
                  {item.estado !== 'en_preparacion' && (
                    <Pressable
                      style={styles.quickButton}
                      onPress={() => cambiarEstadoPedido(item, 'en_preparacion')}
                    >
                      <Text style={styles.quickButtonText}>Preparar</Text>
                    </Pressable>
                  )}

                  {item.estado !== 'entregado' && (
                    <Pressable
                      style={styles.quickButtonSuccess}
                      onPress={() => cambiarEstadoPedido(item, 'entregado')}
                    >
                      <Text style={styles.quickButtonSuccessText}>Entregar</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="calendar-clear-outline" size={44} color="#BFAFA3" />

            <Text style={styles.emptyTitle}>No hay pedidos este día</Text>

            <Text style={styles.emptyText}>
              Puedes crear un pedido con esta fecha de entrega.
            </Text>

            <Pressable
              style={styles.emptyCreateButton}
              onPress={crearPedidoParaFecha}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />

              <Text style={styles.emptyCreateText}>Crear pedido</Text>
            </Pressable>
          </View>
        }
        contentContainerStyle={
          pedidosSeleccionados.length ? styles.content : styles.emptyContent
        }
      />
    </SafeAreaView>
  );
}

function DayCell({ dia, seleccionado, onPress }) {
  const estilo = obtenerEstiloDia(dia);

  return (
    <Pressable
      style={[
        styles.dayCell,
        !dia.esMesActual && styles.dayCellMuted,
        dia.esHoy && styles.dayCellToday,
        seleccionado && styles.dayCellSelected,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.dayNumber,
          !dia.esMesActual && styles.dayNumberMuted,
          seleccionado && styles.dayNumberSelected,
        ]}
      >
        {dia.numero}
      </Text>

      {dia.totalPedidos > 0 ? (
        <>
          <View
            style={[
              styles.dayDot,
              { backgroundColor: estilo.color },
            ]}
          />

          <Text
            style={[
              styles.dayCount,
              seleccionado && styles.dayCountSelected,
            ]}
          >
            {dia.totalPedidos}
          </Text>
        </>
      ) : (
        <View style={styles.dayEmptySpace} />
      )}
    </Pressable>
  );
}

function MiniSummary({ label, value }) {
  return (
    <View style={styles.miniSummaryCard}>
      <Text style={styles.miniSummaryValue}>{value}</Text>
      <Text style={styles.miniSummaryLabel}>{label}</Text>
    </View>
  );
}

function Legend({ color, label }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function construirDiasCalendario(mesVisible, pedidosPorFechaEntrega) {
  const year = mesVisible.getFullYear();
  const month = mesVisible.getMonth();

  const primerDiaMes = new Date(year, month, 1);
  const ultimoDiaMes = new Date(year, month + 1, 0);

  const offsetLunes = (primerDiaMes.getDay() + 6) % 7;
  const inicio = new Date(year, month, 1 - offsetLunes);

  const dias = [];

  for (let i = 0; i < 42; i += 1) {
    const fecha = new Date(
      inicio.getFullYear(),
      inicio.getMonth(),
      inicio.getDate() + i
    );

    const key = obtenerFechaKey(fecha);
    const pedidos = pedidosPorFechaEntrega[key] || [];

    dias.push({
      fecha,
      key,
      numero: fecha.getDate(),
      esMesActual: fecha.getMonth() === month,
      esHoy: key === obtenerFechaKey(new Date()),
      totalPedidos: pedidos.length,
      pedidos,
      resumenEstados: contarEstados(pedidos),
    });
  }

  return dias;
}

function contarEstados(pedidos) {
  return pedidos.reduce(
    (acc, pedido) => {
      acc[pedido.estado] = (acc[pedido.estado] || 0) + 1;
      return acc;
    },
    {}
  );
}

function obtenerEstiloDia(dia) {
  const estados = dia.resumenEstados || {};
  const estadosPresentes = Object.keys(estados).filter((key) => estados[key] > 0);

  if (estadosPresentes.length > 1) {
    return { color: '#6B46C1' };
  }

  const estado = estadosPresentes[0];

  return {
    color: obtenerColorEstado(estado),
  };
}

function obtenerFechaPedido(valor) {
  if (!valor) return null;

  const texto = String(valor).trim();

  if (texto.includes('/')) {
    const partes = texto.split('/');

    if (partes.length === 3) {
      const [dia, mes, anio] = partes;

      const fecha = new Date(
        Number(anio),
        Number(mes) - 1,
        Number(dia)
      );

      if (!Number.isNaN(fecha.getTime())) {
        return fecha;
      }
    }
  }

  const fecha = new Date(texto.replace(' ', 'T'));

  if (Number.isNaN(fecha.getTime())) return null;

  return fecha;
}

function obtenerFechaKey(valor) {
  const fecha = valor instanceof Date ? valor : obtenerFechaPedido(valor);

  if (!fecha) return '';

  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');

  return `${anio}-${mes}-${dia}`;
}

function fechaDesdeKey(key) {
  const [anio, mes, dia] = String(key).split('-');

  return new Date(
    Number(anio),
    Number(mes) - 1,
    Number(dia)
  );
}

function formatearFechaCompleta(fecha) {
  if (!fecha) return 'Sin fecha';

  return `${fecha.getDate()} de ${MESES[fecha.getMonth()]} de ${fecha.getFullYear()}`;
}

function formatearFechaCorta(valor) {
  const fecha = obtenerFechaPedido(valor);

  if (!fecha) return 'Sin fecha';

  return `${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
}

function capitalizar(texto) {
  if (!texto) return '';

  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function obtenerColorEstado(estado) {
  if (estado === 'entregado') return '#2F855A';
  if (estado === 'cancelado') return '#9B2C2C';
  if (estado === 'en_preparacion') return '#B45309';

  return '#8B5E4E';
}

function obtenerTextoEstado(estado) {
  if (estado === 'entregado') return 'Entregado';
  if (estado === 'cancelado') return 'Cancelado';
  if (estado === 'en_preparacion') return 'En preparación';

  return 'Pendiente';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F3',
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  emptyContent: {
    flexGrow: 1,
    padding: 20,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  header: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#3B2A24',
  },

  subtitle: {
    marginTop: 4,
    color: '#7A6F68',
    fontSize: 14,
  },

  todayButtonText: {
    height: 44,
    paddingHorizontal: 13,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3DA',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    },

todayButtonLabel: {
    color: '#8B5E4E',
    fontSize: 13,
    fontWeight: '900',
    },

  monthPanel: {
    marginBottom: 14,
    padding: 12,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3DA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  monthButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: '#F1E1D6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  monthTitle: {
    color: '#3B2A24',
    fontSize: 18,
    fontWeight: '900',
  },

  calendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFE3DA',
    elevation: 2,
  },

  weekHeader: {
    flexDirection: 'row',
    marginBottom: 6,
  },

  weekDay: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    color: '#8A7D75',
    fontSize: 12,
    fontWeight: '900',
  },

  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  dayCell: {
    width: `${100 / 7}%`,
    minHeight: 62,
    borderRadius: 14,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dayCellMuted: {
    opacity: 0.36,
  },

  dayCellToday: {
    borderWidth: 1,
    borderColor: '#8B5E4E',
  },

  dayCellSelected: {
    backgroundColor: '#8B5E4E',
  },

  dayNumber: {
    color: '#3B2A24',
    fontSize: 13,
    fontWeight: '900',
  },

  dayNumberMuted: {
    color: '#A79C95',
  },

  dayNumberSelected: {
    color: '#FFFFFF',
  },

  dayDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 5,
  },

  dayCount: {
    marginTop: 2,
    color: '#7A6F68',
    fontSize: 10,
    fontWeight: '900',
  },

  dayCountSelected: {
    color: '#FFFFFF',
  },

  dayEmptySpace: {
    height: 14,
  },

  legendRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  legendText: {
    color: '#7A6F68',
    fontSize: 11,
    fontWeight: '800',
  },

  daySummary: {
    marginTop: 16,
    backgroundColor: '#8B5E4E',
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  daySummaryLabel: {
    color: '#F7EDE6',
    fontSize: 12,
    fontWeight: '800',
  },

  daySummaryTitle: {
    marginTop: 4,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },

  createButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#3B2A24',
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },

  miniSummaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFE3DA',
  },

  miniSummaryValue: {
    color: '#3B2A24',
    fontSize: 21,
    fontWeight: '900',
  },

  miniSummaryLabel: {
    marginTop: 2,
    color: '#7A6F68',
    fontSize: 11,
    fontWeight: '800',
  },

  totalBox: {
    marginTop: 12,
    marginBottom: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3DA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  totalLabel: {
    color: '#7A6F68',
    fontSize: 12,
    fontWeight: '800',
  },

  totalValue: {
    color: '#3B2A24',
    fontSize: 18,
    fontWeight: '900',
  },

  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EFE3DA',
    elevation: 2,
  },

  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  orderIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#F1E1D6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  orderName: {
    color: '#3B2A24',
    fontSize: 17,
    fontWeight: '900',
  },

  orderMeta: {
    marginTop: 2,
    color: '#8A7D75',
    fontSize: 12,
  },

  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: '#FFF8F3',
    borderWidth: 1,
  },

  statusText: {
    fontSize: 11,
    fontWeight: '900',
  },

  productsBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FFF8F3',
    borderWidth: 1,
    borderColor: '#EFE3DA',
  },

  productText: {
    color: '#3B2A24',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },

  moreText: {
    marginTop: 5,
    color: '#8B5E4E',
    fontSize: 12,
    fontWeight: '900',
  },

  orderFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EFE3DA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  orderTotal: {
    color: '#3B2A24',
    fontSize: 18,
    fontWeight: '900',
  },

  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },

  quickButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#FFF8F3',
    borderWidth: 1,
    borderColor: '#E8DCD3',
  },

  quickButtonText: {
    color: '#8B5E4E',
    fontSize: 12,
    fontWeight: '900',
  },

  quickButtonSuccess: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#F0FFF4',
    borderWidth: 1,
    borderColor: '#B7E4C7',
  },

  quickButtonSuccessText: {
    color: '#2F855A',
    fontSize: 12,
    fontWeight: '900',
  },

  emptyBox: {
    marginTop: 16,
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#EFE3DA',
  },

  emptyTitle: {
    marginTop: 10,
    color: '#3B2A24',
    fontSize: 17,
    fontWeight: '900',
  },

  emptyText: {
    marginTop: 5,
    color: '#7A6F68',
    textAlign: 'center',
    fontSize: 13,
  },

  emptyCreateButton: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#8B5E4E',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  emptyCreateText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },

  orderDelivery: {
  marginTop: 2,
  color: '#8B5E4E',
  fontSize: 12,
  fontWeight: '800',
},

});