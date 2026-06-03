import React, { useCallback, useMemo, useState } from 'react';

import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import {
  obtenerDetallePedido,
  obtenerEmpaquesPedido,
  obtenerMovimientosInventario,
  obtenerPedidos,
  obtenerPedidosActivosDashboard,
  obtenerResumenDashboard,
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

export default function DashboardScreen({ navigation }) {
  const [resumen, setResumen] = useState(null);
  const [pedidosActivos, setPedidosActivos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [detallesPorPedido, setDetallesPorPedido] = useState({});
  const [empaquesPorPedido, setEmpaquesPorPedido] = useState({});
  const [movimientos, setMovimientos] = useState([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(() => {
    try {
      setCargando(true);

      const pedidosData = obtenerPedidos();
      const detalles = {};
      const empaques = {};

      pedidosData.forEach((pedido) => {
        try {
          detalles[pedido.id] = obtenerDetallePedido(pedido.id);
        } catch {
          detalles[pedido.id] = [];
        }

        try {
          empaques[pedido.id] = obtenerEmpaquesPedido(pedido.id);
        } catch {
          empaques[pedido.id] = [];
        }
      });

      setResumen(obtenerResumenDashboard());
      setPedidosActivos(obtenerPedidosActivosDashboard());
      setPedidos(pedidosData);
      setDetallesPorPedido(detalles);
      setEmpaquesPorPedido(empaques);
      setMovimientos(obtenerMovimientosInventario());
    } catch (error) {
      console.error('Error cargando dashboard:', error);
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const resumenOperativo = useMemo(() => {
    const hoyKey = obtenerFechaKey(new Date());
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const mananaKey = obtenerFechaKey(manana);

    const activos = pedidos.filter((pedido) =>
      ['pendiente', 'en_preparacion'].includes(pedido.estado)
    );

    const entregasHoy = activos.filter((pedido) => {
      const fecha = obtenerFecha(pedido.fecha_entrega);
      return fecha && obtenerFechaKey(fecha) === hoyKey;
    });

    const entregasManana = activos.filter((pedido) => {
      const fecha = obtenerFecha(pedido.fecha_entrega);
      return fecha && obtenerFechaKey(fecha) === mananaKey;
    });

    const atrasados = activos.filter((pedido) => {
      const fecha = obtenerFecha(pedido.fecha_entrega);
      return fecha && obtenerFechaKey(fecha) < hoyKey;
    });

    const enPreparacion = activos.filter(
      (pedido) => pedido.estado === 'en_preparacion'
    );

    const valorHoy = entregasHoy.reduce(
      (total, pedido) => total + Number(pedido.total || 0),
      0
    );

    return {
      entregasHoy,
      entregasManana,
      atrasados,
      enPreparacion,
      valorHoy,
    };
  }, [pedidos]);

  const resumenFinanciero = useMemo(() => {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = hoy.getMonth();

    let ingresos = 0;
    let costoProductos = 0;
    let costoEmpaques = 0;
    let costoEnvios = 0;

    pedidos
      .filter((pedido) => pedido.estado !== 'cancelado')
      .filter((pedido) => {
        const fecha = obtenerFecha(pedido.created_at);

        return (
          fecha &&
          fecha.getFullYear() === year &&
          fecha.getMonth() === month
        );
      })
      .forEach((pedido) => {
        const detalle = detallesPorPedido[pedido.id] || [];
        const empaques = empaquesPorPedido[pedido.id] || [];

        ingresos += Number(pedido.total || 0);
        costoEnvios += Number(pedido.costo_envio || 0);

        detalle.forEach((item) => {
          costoProductos +=
            Number(item.cantidad || 0) *
            Number(item.costo_unitario || 0);
        });

        empaques.forEach((item) => {
          costoEmpaques +=
            Number(item.cantidad || 0) *
            Number(item.costo_unitario || 0);
        });
      });

    const costos = costoProductos + costoEmpaques + costoEnvios;
    const utilidad = ingresos - costos;
    const margen = ingresos > 0 ? (utilidad / ingresos) * 100 : 0;

    return {
      ingresos,
      costos,
      utilidad,
      margen,
    };
  }, [pedidos, detallesPorPedido, empaquesPorPedido]);

  const ultimosMovimientos = useMemo(() => {
    return movimientos.slice(0, 4);
  }, [movimientos]);

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
        data={pedidosActivos}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.title}>KUMO Bakery</Text>

              <Text style={styles.subtitle}>
                Centro operativo y resumen del negocio.
              </Text>
            </View>

            <View style={styles.todayCard}>
              <View style={styles.todayHeader}>
                <View>
                  <Text style={styles.todayLabel}>Hoy</Text>

                  <Text style={styles.todayTitle}>
                    {formatearFechaCompleta(new Date())}
                  </Text>
                </View>

                <View style={styles.todayIcon}>
                  <Ionicons name="calendar-clear-outline" size={27} color="#FFF" />
                </View>
              </View>

              <View style={styles.todayGrid}>
                <TodayMetric
                  icon="bag-handle-outline"
                  label="Entregas hoy"
                  value={resumenOperativo.entregasHoy.length}
                />

                <TodayMetric
                  icon="warning-outline"
                  label="Atrasados"
                  value={resumenOperativo.atrasados.length}
                  danger={resumenOperativo.atrasados.length > 0}
                />

                <TodayMetric
                  icon="flame-outline"
                  label="Preparación"
                  value={resumenOperativo.enPreparacion.length}
                />

                <TodayMetric
                  icon="cash-outline"
                  label="Valor hoy"
                  value={COP.format(resumenOperativo.valorHoy)}
                  wide
                />
              </View>

              <View style={styles.todayActions}>
                <Pressable
                  style={styles.todayActionPrimary}
                  onPress={() => navigation.navigate('Pedidos')}
                >
                  <Ionicons name="receipt-outline" size={18} color="#FFFFFF" />

                  <Text style={styles.todayActionPrimaryText}>
                    Ver pedidos
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.todayActionSecondary}
                  onPress={() => navigation.navigate('PedidosCalendario')}
                >
                  <Ionicons name="calendar-outline" size={18} color="#8B5E4E" />

                  <Text style={styles.todayActionSecondaryText}>
                    Ver calendario
                  </Text>
                </Pressable>
              </View>

              {resumenOperativo.entregasManana.length > 0 && (
                <Text style={styles.tomorrowText}>
                  Mañana tienes {resumenOperativo.entregasManana.length} entrega(s) programada(s).
                </Text>
              )}
            </View>

            <View style={styles.heroCard}>
              <View>
                <Text style={styles.heroLabel}>Utilidad estimada del mes</Text>

                <Text
                  style={[
                    styles.heroValue,
                    resumenFinanciero.utilidad < 0 && styles.negativeText,
                  ]}
                >
                  {COP.format(resumenFinanciero.utilidad)}
                </Text>

                <Text style={styles.heroSubtext}>
                  Margen estimado: {resumenFinanciero.margen.toFixed(1)}%
                </Text>
              </View>

              <View style={styles.heroIcon}>
                <Ionicons name="trending-up-outline" size={30} color="#FFF" />
              </View>
            </View>

            <View style={styles.grid}>
              <MetricCard
                icon="cash-outline"
                label="Ingresos"
                value={COP.format(resumenFinanciero.ingresos)}
              />

              <MetricCard
                icon="remove-circle-outline"
                label="Costos"
                value={COP.format(resumenFinanciero.costos)}
              />

              <MetricCard
                icon="receipt-outline"
                label="Pedidos activos"
                value={resumen?.pedidos_activos || 0}
              />

              <MetricCard
                icon="restaurant-outline"
                label="Producciones"
                value={resumen?.producciones_activas || 0}
              />

              <MetricCard
                icon="warning-outline"
                label="Bajo stock"
                value={resumen?.insumos_bajo_stock || 0}
                danger={Number(resumen?.insumos_bajo_stock || 0) > 0}
              />

              <MetricCard
                icon="alert-circle-outline"
                label="Agotados"
                value={resumen?.insumos_agotados || 0}
                danger={Number(resumen?.insumos_agotados || 0) > 0}
              />
            </View>

            <View style={styles.quickActions}>
              <QuickAction
                icon="receipt-outline"
                label="Pedidos"
                onPress={() => navigation.navigate('Pedidos')}
              />

              <QuickAction
                icon="calendar-outline"
                label="Calendario"
                onPress={() => navigation.navigate('PedidosCalendario')}
              />

              <QuickAction
                icon="cash-outline"
                label="Finanzas"
                onPress={() => navigation.navigate('Finanzas')}
              />

              <QuickAction
                icon="people-outline"
                label="Clientes"
                onPress={() => navigation.navigate('Clientes')}
              />
            </View>

            {ultimosMovimientos.length > 0 && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    Últimos movimientos
                  </Text>

                  <Pressable
                    onPress={() =>
                      navigation.navigate('MovimientosInventario')
                    }
                  >
                    <Text style={styles.sectionAction}>Ver todos</Text>
                  </Pressable>
                </View>

                {ultimosMovimientos.map((item) => (
                  <MovementMiniCard key={String(item.id)} item={item} />
                ))}
              </View>
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pedidos activos</Text>

              <Pressable onPress={() => navigation.navigate('Pedidos')}>
                <Text style={styles.sectionAction}>Ver todos</Text>
              </Pressable>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.orderCard}
            onPress={() =>
              navigation.navigate('FormularioPedido', {
                pedidoId: item.id,
              })
            }
          >
            <View style={styles.orderIcon}>
              <Ionicons name="bag-handle-outline" size={22} color="#8B5E4E" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.orderName}>
                {item.cliente_nombre || 'Cliente sin nombre'}
              </Text>

              <Text style={styles.orderDate}>
                Creado: {formatearFechaFriendly(item.created_at)}
              </Text>

              {!!item.fecha_entrega && (
                <Text style={styles.orderDelivery}>
                  Entrega: {formatearFechaFriendly(item.fecha_entrega)}
                </Text>
              )}
            </View>

            <View style={styles.orderRight}>
              <Text style={styles.orderTotal}>
                {COP.format(item.total || 0)}
              </Text>

              <Text style={styles.orderStatus}>
                {item.estado === 'en_preparacion'
                  ? 'En preparación'
                  : 'Pendiente'}
              </Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="checkmark-circle-outline" size={42} color="#BFAFA3" />

            <Text style={styles.emptyTitle}>Sin pedidos activos</Text>

            <Text style={styles.emptyText}>
              No hay pedidos pendientes o en preparación.
            </Text>
          </View>
        }
        contentContainerStyle={styles.content}
      />
    </SafeAreaView>
  );
}

function TodayMetric({ icon, label, value, danger = false, wide = false }) {
  return (
    <View style={[styles.todayMetric, wide && styles.todayMetricWide]}>
      <View style={[styles.todayMetricIcon, danger && styles.todayMetricIconDanger]}>
        <Ionicons
          name={icon}
          size={18}
          color={danger ? '#9B2C2C' : '#8B5E4E'}
        />
      </View>

      <Text style={styles.todayMetricValue} numberOfLines={1}>
        {value}
      </Text>

      <Text style={styles.todayMetricLabel}>{label}</Text>
    </View>
  );
}

function MetricCard({ icon, label, value, danger = false }) {
  return (
    <View style={[styles.metricCard, danger && styles.metricCardDanger]}>
      <View style={[styles.metricIcon, danger && styles.metricIconDanger]}>
        <Ionicons
          name={icon}
          size={21}
          color={danger ? '#9B2C2C' : '#8B5E4E'}
        />
      </View>

      <Text style={styles.metricValue} numberOfLines={1}>
        {value}
      </Text>

      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function QuickAction({ icon, label, onPress }) {
  return (
    <Pressable style={styles.quickAction} onPress={onPress}>
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={21} color="#8B5E4E" />
      </View>

      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

function MovementMiniCard({ item }) {
  const nombre = item.referencia_nombre || obtenerNombreDesdeDescripcion(item);

  return (
    <View style={styles.movementCard}>
      <View style={styles.movementIcon}>
        <Ionicons
          name={
            item.referencia_tipo === 'insumo'
              ? 'cube-outline'
              : 'restaurant-outline'
          }
          size={18}
          color="#8B5E4E"
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.movementTitle}>{nombre}</Text>

        <Text style={styles.movementSubtitle}>
          {item.tipo_origen === 'pedido'
            ? 'Salida por pedido'
            : 'Uso en producción'}
        </Text>
      </View>

      <Text style={styles.movementQty}>
        -{Number(item.cantidad || 0).toLocaleString('es-CO')}
      </Text>
    </View>
  );
}

function obtenerNombreDesdeDescripcion(item) {
  const descripcion = String(item.descripcion || '');

  if (descripcion.includes(':')) {
    return descripcion.split(':')[1].trim();
  }

  return item.referencia_tipo === 'insumo'
    ? 'Insumo'
    : 'Producción';
}

function obtenerFecha(valor) {
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
  const fecha = valor instanceof Date ? valor : obtenerFecha(valor);

  if (!fecha) return '';

  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');

  return `${anio}-${mes}-${dia}`;
}

function formatearFechaFriendly(valor) {
  const fecha = obtenerFecha(valor);

  if (!fecha) return 'Sin fecha';

  return `${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
}

function formatearFechaCompleta(valor) {
  const fecha = valor instanceof Date ? valor : obtenerFecha(valor);

  if (!fecha) return 'Sin fecha';

  return `${fecha.getDate()} de ${MESES[fecha.getMonth()]} de ${fecha.getFullYear()}`;
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

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  header: {
    marginBottom: 16,
  },

  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#3B2A24',
  },

  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#7A6F68',
  },

  todayCard: {
    backgroundColor: '#3B2A24',
    borderRadius: 26,
    padding: 18,
    marginBottom: 16,
  },

  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  todayLabel: {
    color: '#F7EDE6',
    fontSize: 13,
    fontWeight: '800',
  },

  todayTitle: {
    marginTop: 4,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },

  todayIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  todayGrid: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  todayMetric: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 11,
  },

  todayMetricWide: {
    width: '100%',
  },

  todayMetricIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: '#F1E1D6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  todayMetricIconDanger: {
    backgroundColor: '#FEE2E2',
  },

  todayMetricValue: {
    color: '#3B2A24',
    fontSize: 19,
    fontWeight: '900',
  },

  todayMetricLabel: {
    marginTop: 2,
    color: '#7A6F68',
    fontSize: 11,
    fontWeight: '800',
  },

  todayActions: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },

  todayActionPrimary: {
    flex: 1,
    backgroundColor: '#8B5E4E',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },

  todayActionPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },

  todayActionSecondary: {
    flex: 1,
    backgroundColor: '#FFF8F3',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },

  todayActionSecondaryText: {
    color: '#8B5E4E',
    fontSize: 13,
    fontWeight: '900',
  },

  tomorrowText: {
    marginTop: 12,
    color: '#F7EDE6',
    fontSize: 12,
    fontWeight: '700',
  },

  heroCard: {
    backgroundColor: '#8B5E4E',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  heroLabel: {
    color: '#F7EDE6',
    fontSize: 14,
    fontWeight: '800',
  },

  heroValue: {
    marginTop: 6,
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
  },

  heroSubtext: {
    marginTop: 6,
    color: '#F7EDE6',
    fontSize: 13,
    fontWeight: '700',
  },

  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  negativeText: {
    color: '#FFE1E1',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  metricCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFE3DA',
    elevation: 2,
  },

  metricCardDanger: {
    backgroundColor: '#FFF5F5',
    borderColor: '#F3B5B5',
  },

  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#F1E1D6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  metricIconDanger: {
    backgroundColor: '#FEE2E2',
  },

  metricValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#3B2A24',
  },

  metricLabel: {
    marginTop: 2,
    fontSize: 12,
    color: '#7A6F68',
    fontWeight: '700',
  },

  quickActions: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  quickAction: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 13,
    borderWidth: 1,
    borderColor: '#EFE3DA',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    elevation: 1,
  },

  quickIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    backgroundColor: '#F1E1D6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickLabel: {
    color: '#3B2A24',
    fontSize: 13,
    fontWeight: '900',
  },

  sectionBlock: {
    marginTop: 24,
  },

  sectionHeader: {
    marginTop: 24,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#3B2A24',
  },

  sectionAction: {
    color: '#8B5E4E',
    fontWeight: '900',
    fontSize: 13,
  },

  movementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EFE3DA',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  movementIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#F1E1D6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  movementTitle: {
    color: '#3B2A24',
    fontSize: 14,
    fontWeight: '900',
  },

  movementSubtitle: {
    marginTop: 2,
    color: '#8A7D75',
    fontSize: 12,
  },

  movementQty: {
    color: '#9B2C2C',
    fontSize: 14,
    fontWeight: '900',
  },

  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EFE3DA',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    elevation: 2,
  },

  orderIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#F1E1D6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  orderName: {
    color: '#3B2A24',
    fontSize: 16,
    fontWeight: '900',
  },

  orderDate: {
    marginTop: 3,
    color: '#8A7D75',
    fontSize: 12,
  },

  orderDelivery: {
    marginTop: 2,
    color: '#8B5E4E',
    fontSize: 12,
    fontWeight: '800',
  },

  orderRight: {
    alignItems: 'flex-end',
  },

  orderTotal: {
    color: '#3B2A24',
    fontSize: 14,
    fontWeight: '900',
  },

  orderStatus: {
    marginTop: 3,
    color: '#8B5E4E',
    fontSize: 11,
    fontWeight: '900',
  },

  emptyBox: {
    marginTop: 20,
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
});