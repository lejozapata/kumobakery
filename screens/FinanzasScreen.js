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

export default function FinanzasScreen({ navigation }) {
  const hoy = new Date();

  const [pedidos, setPedidos] = useState([]);
  const [detallesPorPedido, setDetallesPorPedido] = useState({});
  const [empaquesPorPedido, setEmpaquesPorPedido] = useState({});
  const [cargando, setCargando] = useState(true);

  const [mesVisible, setMesVisible] = useState(
    new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  );

  const cargar = useCallback(() => {
    try {
      setCargando(true);

      const data = obtenerPedidos();
      const detalles = {};
      const empaques = {};

      data.forEach((pedido) => {
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

      setPedidos(data);
      setDetallesPorPedido(detalles);
      setEmpaquesPorPedido(empaques);
    } catch (error) {
      console.error('Error cargando finanzas:', error);
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const pedidosDelMes = useMemo(() => {
    const year = mesVisible.getFullYear();
    const month = mesVisible.getMonth();

    return pedidos
      .filter((pedido) => pedido.estado !== 'cancelado')
      .filter((pedido) => {
        const fecha = obtenerFechaPedido(pedido.created_at);

        return (
          fecha &&
          fecha.getFullYear() === year &&
          fecha.getMonth() === month
        );
      })
      .sort((a, b) => {
        const fechaA = obtenerFechaPedido(a.created_at)?.getTime() || 0;
        const fechaB = obtenerFechaPedido(b.created_at)?.getTime() || 0;

        return fechaB - fechaA;
      });
  }, [pedidos, mesVisible]);

  const resumen = useMemo(() => {
    let ingresos = 0;
    let costoProductos = 0;
    let costoEmpaques = 0;
    let costoEnvios = 0;

    pedidosDelMes.forEach((pedido) => {
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

    const costosTotales =
      costoProductos +
      costoEmpaques +
      costoEnvios;

    const utilidad = ingresos - costosTotales;
    const margen = ingresos > 0 ? (utilidad / ingresos) * 100 : 0;

    return {
      ingresos,
      costoProductos,
      costoEmpaques,
      costoEnvios,
      costosTotales,
      utilidad,
      margen,
      pedidos: pedidosDelMes.length,
    };
  }, [pedidosDelMes, detallesPorPedido, empaquesPorPedido]);

  const resumenComercial = useMemo(() => {
    const productos = {};
    const clientes = {};
    let unidadesVendidas = 0;

    pedidosDelMes.forEach((pedido) => {
      const detalle = detallesPorPedido[pedido.id] || [];
      const clienteNombre = pedido.cliente_nombre || 'Cliente sin nombre';

      clientes[clienteNombre] = {
        nombre: clienteNombre,
        total:
          (clientes[clienteNombre]?.total || 0) +
          Number(pedido.total || 0),
        pedidos: (clientes[clienteNombre]?.pedidos || 0) + 1,
      };

      detalle.forEach((item) => {
        const nombre = item.receta_nombre || 'Producto';
        const cantidad = Number(item.cantidad || 0);
        const subtotal = Number(item.subtotal || 0);

        unidadesVendidas += cantidad;

        productos[nombre] = {
          nombre,
          cantidad: (productos[nombre]?.cantidad || 0) + cantidad,
          total: (productos[nombre]?.total || 0) + subtotal,
        };
      });
    });

    const productoTop = Object.values(productos).sort(
      (a, b) => b.cantidad - a.cantidad
    )[0];

    const clienteTop = Object.values(clientes).sort(
      (a, b) => b.total - a.total
    )[0];

    const ticketPromedio =
      pedidosDelMes.length > 0
        ? resumen.ingresos / pedidosDelMes.length
        : 0;

    return {
      productoTop,
      clienteTop,
      ticketPromedio,
      unidadesVendidas,
    };
  }, [pedidosDelMes, detallesPorPedido, resumen.ingresos]);

  function cambiarMes(valor) {
    setMesVisible(
      new Date(
        mesVisible.getFullYear(),
        mesVisible.getMonth() + valor,
        1
      )
    );
  }

  function volverAlMesActual() {
    setMesVisible(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  }

  const tituloMes = `${capitalizar(MESES[mesVisible.getMonth()])} ${mesVisible.getFullYear()}`;

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
        data={pedidosDelMes}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Finanzas</Text>

              <Text style={styles.subtitle}>
                Ingresos, costos y utilidad estimada.
              </Text>
            </View>

            <View style={styles.monthPanel}>
              <Pressable
                style={styles.monthButton}
                onPress={() => cambiarMes(-1)}
              >
                <Ionicons name="chevron-back" size={22} color="#8B5E4E" />
              </Pressable>

              <View style={styles.monthCenter}>
                <Text style={styles.monthTitle}>{tituloMes}</Text>

                <Pressable onPress={volverAlMesActual}>
                  <Text style={styles.currentMonthText}>
                    Volver al mes actual
                  </Text>
                </Pressable>
              </View>

              <Pressable
                style={styles.monthButton}
                onPress={() => cambiarMes(1)}
              >
                <Ionicons name="chevron-forward" size={22} color="#8B5E4E" />
              </Pressable>
            </View>

            <View style={styles.mainCard}>
              <Text style={styles.mainLabel}>Utilidad estimada del mes</Text>

              <Text
                style={[
                  styles.mainValue,
                  resumen.utilidad < 0 && styles.negativeText,
                ]}
              >
                {COP.format(resumen.utilidad)}
              </Text>

              <Text style={styles.mainSubtext}>
                Margen estimado: {resumen.margen.toFixed(1)}%
              </Text>
            </View>

            <View style={styles.grid}>
              <MetricCard
                icon="cash-outline"
                label="Ingresos"
                value={COP.format(resumen.ingresos)}
              />

              <MetricCard
                icon="remove-circle-outline"
                label="Costos"
                value={COP.format(resumen.costosTotales)}
              />

              <MetricCard
                icon="restaurant-outline"
                label="Productos"
                value={COP.format(resumen.costoProductos)}
              />

              <MetricCard
                icon="cube-outline"
                label="Empaques"
                value={COP.format(resumen.costoEmpaques)}
              />

              <MetricCard
                icon="bicycle-outline"
                label="Domicilios"
                value={COP.format(resumen.costoEnvios)}
              />

              <MetricCard
                icon="receipt-outline"
                label="Pedidos"
                value={resumen.pedidos}
              />
            </View>

            <Text style={styles.sectionTitle}>Resumen comercial</Text>

            <View style={styles.commercialGrid}>
              <CommercialCard
                icon="trophy-outline"
                label="Producto más vendido"
                value={
                  resumenComercial.productoTop
                    ? resumenComercial.productoTop.nombre
                    : 'Sin ventas'
                }
                detail={
                  resumenComercial.productoTop
                    ? `${resumenComercial.productoTop.cantidad.toLocaleString(
                        'es-CO'
                      )} unidades`
                    : 'Aún no hay productos vendidos'
                }
              />

              <CommercialCard
                icon="person-circle-outline"
                label="Mejor cliente"
                value={
                  resumenComercial.clienteTop
                    ? resumenComercial.clienteTop.nombre
                    : 'Sin clientes'
                }
                detail={
                  resumenComercial.clienteTop
                    ? COP.format(resumenComercial.clienteTop.total)
                    : 'Aún no hay compras'
                }
              />

              <CommercialCard
                icon="stats-chart-outline"
                label="Ticket promedio"
                value={COP.format(resumenComercial.ticketPromedio)}
                detail="Promedio por pedido"
              />

              <CommercialCard
                icon="bag-check-outline"
                label="Unidades vendidas"
                value={resumenComercial.unidadesVendidas.toLocaleString(
                  'es-CO'
                )}
                detail="Productos vendidos en el mes"
              />
            </View>

            <Text style={styles.sectionTitle}>Detalle financiero</Text>
          </>
        }
        renderItem={({ item }) => {
          const detalle = detallesPorPedido[item.id] || [];
          const empaques = empaquesPorPedido[item.id] || [];

          const costoProductos = detalle.reduce((total, producto) => {
            return (
              total +
              Number(producto.cantidad || 0) *
                Number(producto.costo_unitario || 0)
            );
          }, 0);

          const costoEmpaques = empaques.reduce((total, empaque) => {
            return (
              total +
              Number(empaque.cantidad || 0) *
                Number(empaque.costo_unitario || 0)
            );
          }, 0);

          const costoEnvio = Number(item.costo_envio || 0);

          const costos =
            costoProductos +
            costoEmpaques +
            costoEnvio;

          const total = Number(item.total || 0);
          const utilidad = total - costos;
          const margen = total > 0 ? (utilidad / total) * 100 : 0;

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
                    name="receipt-outline"
                    size={22}
                    color="#8B5E4E"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.orderName}>
                    {item.cliente_nombre || 'Cliente sin nombre'}
                  </Text>

                  <Text style={styles.orderDate}>
                    Creado: {formatearFechaFriendly(item.created_at)}
                  </Text>
                </View>

                <View style={styles.statusPill}>
                  <Text style={styles.statusText}>
                    {obtenerTextoEstado(item.estado)}
                  </Text>
                </View>
              </View>

              <View style={styles.productsBox}>
                <Text style={styles.productsLabel}>Productos vendidos</Text>

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
                  <Text style={styles.moreProducts}>
                    +{detalle.length - 3} producto(s) más
                  </Text>
                )}
              </View>

              <View style={styles.orderMetrics}>
                <SmallMetric
                  label="Ingreso"
                  value={COP.format(total)}
                />

                <SmallMetric
                  label="Costo"
                  value={COP.format(costos)}
                />
              </View>

              <View style={styles.profitBox}>
                <View>
                  <Text style={styles.profitLabel}>
                    Utilidad estimada
                  </Text>

                  <Text
                    style={[
                      styles.profitValue,
                      utilidad < 0 && styles.profitNegative,
                    ]}
                  >
                    {COP.format(utilidad)}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.marginText,
                    utilidad < 0 && styles.profitNegative,
                  ]}
                >
                  {margen.toFixed(1)}%
                </Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="cash-outline" size={44} color="#BFAFA3" />

            <Text style={styles.emptyTitle}>
              Sin datos financieros en {tituloMes}
            </Text>

            <Text style={styles.emptyText}>
              Los pedidos no cancelados aparecerán aquí.
            </Text>
          </View>
        }
        contentContainerStyle={
          pedidosDelMes.length ? styles.content : styles.emptyContent
        }
      />
    </SafeAreaView>
  );
}

function MetricCard({ icon, label, value }) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricIcon}>
        <Ionicons name={icon} size={21} color="#8B5E4E" />
      </View>

      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function CommercialCard({ icon, label, value, detail }) {
  return (
    <View style={styles.commercialCard}>
      <View style={styles.commercialIcon}>
        <Ionicons name={icon} size={20} color="#8B5E4E" />
      </View>

      <Text style={styles.commercialLabel}>{label}</Text>

      <Text style={styles.commercialValue} numberOfLines={1}>
        {value}
      </Text>

      <Text style={styles.commercialDetail} numberOfLines={1}>
        {detail}
      </Text>
    </View>
  );
}

function SmallMetric({ label, value }) {
  return (
    <View style={styles.smallMetric}>
      <Text style={styles.smallMetricLabel}>{label}</Text>
      <Text style={styles.smallMetricValue}>{value}</Text>
    </View>
  );
}

function obtenerFechaPedido(valor) {
  if (!valor) return null;

  const normalizada = String(valor).replace(' ', 'T');
  const fecha = new Date(normalizada);

  if (Number.isNaN(fecha.getTime())) return null;

  return fecha;
}

function formatearFechaFriendly(valor) {
  const fecha = obtenerFechaPedido(valor);

  if (!fecha) return 'Sin fecha';

  return `${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
}

function capitalizar(texto) {
  if (!texto) return '';

  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function obtenerTextoEstado(estado) {
  if (estado === 'entregado') return 'Entregado';
  if (estado === 'en_preparacion') return 'En preparación';
  if (estado === 'cancelado') return 'Cancelado';

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

  monthCenter: {
    alignItems: 'center',
  },

  monthTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#3B2A24',
  },

  currentMonthText: {
    marginTop: 3,
    fontSize: 11,
    color: '#8B5E4E',
    fontWeight: '900',
  },

  mainCard: {
    backgroundColor: '#8B5E4E',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
  },

  mainLabel: {
    color: '#F7EDE6',
    fontSize: 14,
    fontWeight: '800',
  },

  mainValue: {
    marginTop: 6,
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
  },

  mainSubtext: {
    marginTop: 6,
    color: '#F7EDE6',
    fontSize: 13,
    fontWeight: '700',
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

  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#F1E1D6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  metricValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#3B2A24',
  },

  metricLabel: {
    marginTop: 2,
    fontSize: 12,
    color: '#7A6F68',
    fontWeight: '700',
  },

  sectionTitle: {
    marginTop: 24,
    marginBottom: 12,
    fontSize: 22,
    fontWeight: '900',
    color: '#3B2A24',
  },

  commercialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  commercialCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFE3DA',
    elevation: 2,
  },

  commercialIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#F1E1D6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  commercialLabel: {
    color: '#8A7D75',
    fontSize: 12,
    fontWeight: '800',
  },

  commercialValue: {
    marginTop: 4,
    color: '#3B2A24',
    fontSize: 16,
    fontWeight: '900',
  },

  commercialDetail: {
    marginTop: 3,
    color: '#8B5E4E',
    fontSize: 12,
    fontWeight: '800',
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

  orderDate: {
    marginTop: 3,
    color: '#8A7D75',
    fontSize: 12,
  },

  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: '#FFF8F3',
    borderWidth: 1,
    borderColor: '#EFE3DA',
  },

  statusText: {
    color: '#8B5E4E',
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

  productsLabel: {
    color: '#8A7D75',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 5,
  },

  productText: {
    color: '#3B2A24',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },

  moreProducts: {
    marginTop: 5,
    color: '#8B5E4E',
    fontSize: 12,
    fontWeight: '900',
  },

  orderMetrics: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },

  smallMetric: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FFF8F3',
  },

  smallMetricLabel: {
    color: '#8A7D75',
    fontSize: 12,
    fontWeight: '800',
  },

  smallMetricValue: {
    marginTop: 4,
    color: '#3B2A24',
    fontSize: 15,
    fontWeight: '900',
  },

  profitBox: {
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#8B5E4E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  profitLabel: {
    color: '#F7EDE6',
    fontSize: 12,
    fontWeight: '800',
  },

  profitValue: {
    marginTop: 3,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },

  profitNegative: {
    color: '#FFE1E1',
  },

  marginText: {
    color: '#FFFFFF',
    fontSize: 18,
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
    textAlign: 'center',
  },

  emptyText: {
    marginTop: 5,
    color: '#7A6F68',
    textAlign: 'center',
    fontSize: 13,
  },
});