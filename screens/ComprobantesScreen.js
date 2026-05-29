import React, { useCallback, useMemo, useState } from 'react';

import * as Sharing from 'expo-sharing';

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { generarComprobantePedidoPDF } from '../utils/generarComprobantePedidoPDF';

import {
  obtenerComprobantesPedido,
  obtenerDetallePedido,
  obtenerPedidos,
  registrarComprobantePedido,
} from '../database/db';

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export default function ComprobantesScreen({ navigation }) {
  const hoy = new Date();

  const [pedidos, setPedidos] = useState([]);
  const [detallesPorPedido, setDetallesPorPedido] = useState({});
  const [comprobantes, setComprobantes] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [mesVisible, setMesVisible] = useState(
    new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  );

  const cargar = useCallback(() => {
    try {
      setCargando(true);

      const pedidosData = obtenerPedidos();
      const comprobantesData = obtenerComprobantesPedido();
      const detalles = {};

      pedidosData.forEach((pedido) => {
        try {
          detalles[pedido.id] = obtenerDetallePedido(pedido.id);
        } catch {
          detalles[pedido.id] = [];
        }
      });

      setPedidos(pedidosData);
      setComprobantes(comprobantesData);
      setDetallesPorPedido(detalles);
    } catch (error) {
      console.error('Error cargando comprobantes:', error);
      Alert.alert('Error', 'No fue posible cargar los comprobantes.');
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
        const fecha = obtenerFecha(pedido.created_at);
        return fecha && fecha.getFullYear() === year && fecha.getMonth() === month;
      })
      .sort((a, b) => {
        const generadoA = tieneComprobante(a.id, comprobantes) ? 1 : 0;
        const generadoB = tieneComprobante(b.id, comprobantes) ? 1 : 0;

        if (generadoA !== generadoB) return generadoA - generadoB;

        const fechaA = obtenerFecha(a.created_at)?.getTime() || 0;
        const fechaB = obtenerFecha(b.created_at)?.getTime() || 0;

        return fechaB - fechaA;
      });
  }, [pedidos, comprobantes, mesVisible]);

  const resumen = useMemo(() => {
    const generados = pedidosDelMes.filter((pedido) =>
      tieneComprobante(pedido.id, comprobantes)
    ).length;

    return {
      total: pedidosDelMes.length,
      generados,
      pendientes: pedidosDelMes.length - generados,
    };
  }, [pedidosDelMes, comprobantes]);

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

  async function generarComprobante(pedido) {
    try {
      const detalle = detallesPorPedido[pedido.id] || [];

      const rutaTemporal = await generarComprobantePedidoPDF({
        pedido,
        detalle,
      });

      registrarComprobantePedido(pedido.id, rutaTemporal);
      cargar();

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(rutaTemporal);
      }
    } catch (error) {
      console.error('Error generando comprobante:', error);

      Alert.alert(
        'Error PDF',
        String(error?.message || error)
      );
    }
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
              <Text style={styles.title}>Comprobantes</Text>

              <Text style={styles.subtitle}>
                Genera y controla comprobantes de pedidos.
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

            <View style={styles.summaryRow}>
              <SummaryCard
                label="Pedidos"
                value={resumen.total}
                icon="receipt-outline"
              />

              <SummaryCard
                label="Generados"
                value={resumen.generados}
                icon="checkmark-circle-outline"
              />

              <SummaryCard
                label="Pendientes"
                value={resumen.pendientes}
                icon="time-outline"
              />
            </View>

            <Text style={styles.sectionTitle}>Pedidos del mes</Text>
          </>
        }
        renderItem={({ item }) => {
          const generado = tieneComprobante(item.id, comprobantes);
          const detalle = detallesPorPedido[item.id] || [];

          return (
            <Pressable
              style={styles.card}
              onPress={() =>
                navigation.navigate('FormularioPedido', {
                  pedidoId: item.id,
                })
              }
            >
              <View style={styles.cardHeader}>
                <View style={styles.iconBox}>
                  <Ionicons
                    name="document-text-outline"
                    size={23}
                    color="#8B5E4E"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.clientName}>
                    {item.cliente_nombre || 'Cliente sin nombre'}
                  </Text>

                  <Text style={styles.dateText}>
                    Creado: {formatearFechaFriendly(item.created_at)}
                  </Text>
                </View>

                <View
                  style={[
                    styles.badge,
                    generado && styles.badgeSuccess,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      generado && styles.badgeTextSuccess,
                    ]}
                  >
                    {generado ? 'Generado' : 'Pendiente'}
                  </Text>
                </View>
              </View>

              <View style={styles.productsBox}>
                <Text style={styles.productsLabel}>Productos</Text>

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
              </View>

              <View style={styles.totalBox}>
                <View>
                  <Text style={styles.totalLabel}>Total pedido</Text>

                  <Text style={styles.totalValue}>
                    {COP.format(item.total || 0)}
                  </Text>
                </View>

                <Text style={styles.statusText}>
                  {obtenerTextoEstado(item.estado)}
                </Text>
              </View>

              <Pressable
                style={[
                  styles.generateButton,
                  generado && styles.regenerateButton,
                ]}
                onPress={() => generarComprobante(item)}
              >
                <Ionicons
                  name={generado ? 'refresh-outline' : 'document-text-outline'}
                  size={18}
                  color="#FFFFFF"
                />

                <Text style={styles.generateButtonText}>
                  {generado ? 'Generar nuevamente' : 'Generar comprobante'}
                </Text>
              </Pressable>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="document-outline" size={44} color="#BFAFA3" />

            <Text style={styles.emptyTitle}>
              Sin pedidos para comprobantes
            </Text>

            <Text style={styles.emptyText}>
              Cuando existan pedidos en este mes aparecerán aquí.
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

function SummaryCard({ icon, label, value }) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryIcon}>
        <Ionicons name={icon} size={20} color="#8B5E4E" />
      </View>

      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function tieneComprobante(pedidoId, comprobantes) {
  return comprobantes.some(
    (item) => Number(item.pedido_id) === Number(pedidoId)
  );
}

function obtenerFecha(valor) {
  if (!valor) return null;

  const fecha = new Date(String(valor).replace(' ', 'T'));

  if (Number.isNaN(fecha.getTime())) return null;

  return fecha;
}

function formatearFechaFriendly(valor) {
  const fecha = obtenerFecha(valor);

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

  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFE3DA',
    elevation: 2,
  },

  summaryIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    backgroundColor: '#F1E1D6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  summaryValue: {
    color: '#3B2A24',
    fontSize: 22,
    fontWeight: '900',
  },

  summaryLabel: {
    marginTop: 2,
    color: '#7A6F68',
    fontSize: 11,
    fontWeight: '800',
  },

  sectionTitle: {
    marginBottom: 12,
    fontSize: 22,
    fontWeight: '900',
    color: '#3B2A24',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EFE3DA',
    elevation: 2,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F1E1D6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  clientName: {
    color: '#3B2A24',
    fontSize: 18,
    fontWeight: '900',
  },

  dateText: {
    marginTop: 3,
    color: '#8A7D75',
    fontSize: 12,
  },

  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFF8F3',
    borderWidth: 1,
    borderColor: '#EFE3DA',
  },

  badgeSuccess: {
    backgroundColor: '#F0FFF4',
    borderColor: '#B7E4C7',
  },

  badgeText: {
    color: '#8B5E4E',
    fontSize: 11,
    fontWeight: '900',
  },

  badgeTextSuccess: {
    color: '#2F855A',
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

  totalBox: {
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#8B5E4E',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  totalLabel: {
    color: '#F7EDE6',
    fontSize: 12,
    fontWeight: '800',
  },

  totalValue: {
    marginTop: 3,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },

  statusText: {
    color: '#F7EDE6',
    fontSize: 12,
    fontWeight: '900',
  },

  generateButton: {
    marginTop: 12,
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: '#3B2A24',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },

  regenerateButton: {
    backgroundColor: '#8B5E4E',
  },

  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
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