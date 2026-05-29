import React, { useCallback, useMemo, useState } from 'react';

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

export default function HistoricoPedidosScreen({ navigation }) {
  const hoy = new Date();

  const [pedidos, setPedidos] = useState([]);
  const [detallesPorPedido, setDetallesPorPedido] = useState({});
  const [filtro, setFiltro] = useState('todos');
  const [cargando, setCargando] = useState(true);
  const [mesVisible, setMesVisible] = useState(
    new Date(hoy.getFullYear(), hoy.getMonth(), 1)
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
      console.error('Error cargando histórico de pedidos:', error);
      Alert.alert('Error', 'No fue posible cargar el histórico de pedidos.');
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const pedidosHistoricos = useMemo(() => {
    const year = mesVisible.getFullYear();
    const month = mesVisible.getMonth();

    let data = pedidos
      .filter((pedido) => ['entregado', 'cancelado'].includes(pedido.estado))
      .filter((pedido) => {
        const fecha = obtenerFechaPedido(pedido.created_at);

        return (
          fecha &&
          fecha.getFullYear() === year &&
          fecha.getMonth() === month
        );
      });

    if (filtro !== 'todos') {
      data = data.filter((pedido) => pedido.estado === filtro);
    }

    return data.sort((a, b) => {
      const fechaA = obtenerFechaPedido(a.created_at)?.getTime() || 0;
      const fechaB = obtenerFechaPedido(b.created_at)?.getTime() || 0;

      return fechaB - fechaA;
    });
  }, [pedidos, filtro, mesVisible]);

  const resumen = useMemo(() => {
    const entregados = pedidosHistoricos.filter(
      (pedido) => pedido.estado === 'entregado'
    );

    const cancelados = pedidosHistoricos.filter(
      (pedido) => pedido.estado === 'cancelado'
    );

    const totalEntregado = entregados.reduce(
      (total, pedido) => total + Number(pedido.total || 0),
      0
    );

    return {
      entregados: entregados.length,
      cancelados: cancelados.length,
      totalEntregado,
      totalPedidos: pedidosHistoricos.length,
    };
  }, [pedidosHistoricos]);

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

  function cambiarEstadoPedido(pedido, nuevoEstado) {
    const textoEstado = obtenerTextoEstado(nuevoEstado);

    Alert.alert(
      'Cambiar estado',
      `¿Quieres mover este pedido a "${textoEstado}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () => {
            try {
              actualizarEstadoPedido(pedido.id, nuevoEstado);
              cargar();
            } catch (error) {
              console.error('Error actualizando estado:', error);
              Alert.alert(
                'Error',
                'No fue posible actualizar el estado del pedido.'
              );
            }
          },
        },
      ]
    );
  }

  function renderItem({ item }) {
    const detalle = detallesPorPedido[item.id] || [];
    const cancelado = item.estado === 'cancelado';

    return (
      <Pressable
        style={[
          styles.card,
          cancelado && styles.cardCancelado,
        ]}
        onPress={() =>
          navigation.navigate('FormularioPedido', {
            pedidoId: item.id,
          })
        }
      >
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.iconBox,
              cancelado && styles.iconBoxCancelado,
            ]}
          >
            <Ionicons
              name={
                cancelado
                  ? 'close-circle-outline'
                  : 'checkmark-circle-outline'
              }
              size={24}
              color={cancelado ? '#9B2C2C' : '#2F855A'}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.nombre}>
              {item.cliente_nombre || 'Cliente sin nombre'}
            </Text>

            <Text style={styles.fecha}>
              Creado: {formatearFechaFriendly(item.created_at)}
            </Text>

            {!!item.fecha_entrega && (
              <Text style={styles.fechaEntrega}>
                Entrega: {formatearFechaFriendly(item.fecha_entrega)}
              </Text>
            )}
          </View>

          <View
            style={[
              styles.estadoPill,
              cancelado && styles.estadoPillCancelado,
            ]}
          >
            <Text
              style={[
                styles.estadoPillText,
                cancelado && styles.estadoPillTextCancelado,
              ]}
            >
              {cancelado ? 'Cancelado' : 'Entregado'}
            </Text>
          </View>
        </View>

        <View style={styles.productosBox}>
          <Text style={styles.productosLabel}>Productos</Text>

          {detalle.length > 0 ? (
            detalle.slice(0, 4).map((producto) => (
              <Text key={producto.id} style={styles.productoText}>
                {Number(producto.cantidad || 0).toLocaleString('es-CO')} ×{' '}
                {producto.receta_nombre || 'Producto'}
              </Text>
            ))
          ) : (
            <Text style={styles.productoText}>
              Sin detalle de productos
            </Text>
          )}

          {detalle.length > 4 && (
            <Text style={styles.masProductos}>
              +{detalle.length - 4} producto(s) más
            </Text>
          )}
        </View>

        <View style={styles.totalBox}>
          <View>
            <Text style={styles.totalLabel}>Total pedido</Text>

            <Text
              style={[
                styles.totalValue,
                cancelado && styles.totalValueCancelado,
              ]}
            >
              {COP.format(item.total || 0)}
            </Text>
          </View>

          {!!item.cliente_telefono && (
            <View style={styles.phoneMiniBox}>
              <Ionicons name="call-outline" size={15} color="#8B5E4E" />
              <Text style={styles.phoneMiniText}>
                {item.cliente_telefono}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.estadoActions}>
          {item.estado === 'entregado' && (
            <>
              <Pressable
                style={styles.estadoActionButton}
                onPress={() => cambiarEstadoPedido(item, 'pendiente')}
              >
                <Text style={styles.estadoActionText}>
                  Volver a pendiente
                </Text>
              </Pressable>

              <Pressable
                style={styles.estadoActionButton}
                onPress={() => cambiarEstadoPedido(item, 'en_preparacion')}
              >
                <Text style={styles.estadoActionText}>
                  Volver a preparación
                </Text>
              </Pressable>
            </>
          )}

          {item.estado === 'cancelado' && (
            <Pressable
              style={styles.estadoActionButton}
              onPress={() => cambiarEstadoPedido(item, 'pendiente')}
            >
              <Text style={styles.estadoActionText}>Reactivar pedido</Text>
            </Pressable>
          )}
        </View>
      </Pressable>
    );
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
        data={pedidosHistoricos}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Histórico</Text>

              <Text style={styles.subtitle}>
                Pedidos cerrados por mes de creación.
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

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>
                Ventas entregadas del mes
              </Text>

              <Text style={styles.summaryValue}>
                {COP.format(resumen.totalEntregado)}
              </Text>

              <View style={styles.summaryRow}>
                <View style={styles.summaryPill}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={16}
                    color="#2F855A"
                  />

                  <Text style={styles.summaryPillText}>
                    {resumen.entregados} entregados
                  </Text>
                </View>

                <View style={styles.summaryPillDanger}>
                  <Ionicons
                    name="close-circle-outline"
                    size={16}
                    color="#9B2C2C"
                  />

                  <Text style={styles.summaryPillDangerText}>
                    {resumen.cancelados} cancelados
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.filters}>
              <FiltroButton
                label="Todos"
                activo={filtro === 'todos'}
                onPress={() => setFiltro('todos')}
              />

              <FiltroButton
                label="Entregados"
                activo={filtro === 'entregado'}
                onPress={() => setFiltro('entregado')}
              />

              <FiltroButton
                label="Cancelados"
                activo={filtro === 'cancelado'}
                onPress={() => setFiltro('cancelado')}
              />
            </View>
          </>
        }
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="archive-outline" size={44} color="#BFAFA3" />

            <Text style={styles.emptyTitle}>
              Sin pedidos históricos en {tituloMes}
            </Text>

            <Text style={styles.emptyText}>
              Cambia de mes o revisa pedidos activos.
            </Text>
          </View>
        }
        contentContainerStyle={
          pedidosHistoricos.length ? styles.content : styles.emptyContent
        }
      />
    </SafeAreaView>
  );
}

function FiltroButton({ label, activo, onPress }) {
  return (
    <Pressable
      style={[
        styles.filterButton,
        activo && styles.filterButtonActive,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterText,
          activo && styles.filterTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
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

function formatearFechaFriendly(valor) {
  const fecha = obtenerFechaPedido(valor);

  if (!fecha) return 'Sin fecha';

  const dia = fecha.getDate();
  const mes = MESES[fecha.getMonth()];

  return `${dia} de ${mes}`;
}

function capitalizar(texto) {
  if (!texto) return '';

  return texto.charAt(0).toUpperCase() + texto.slice(1);
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

  summaryCard: {
    backgroundColor: '#8B5E4E',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
  },

  summaryLabel: {
    color: '#F7EDE6',
    fontSize: 14,
    fontWeight: '800',
  },

  summaryValue: {
    marginTop: 6,
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
  },

  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },

  summaryPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F0FFF4',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  summaryPillText: {
    color: '#2F855A',
    fontSize: 12,
    fontWeight: '900',
  },

  summaryPillDanger: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFF5F5',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  summaryPillDangerText: {
    color: '#9B2C2C',
    fontSize: 12,
    fontWeight: '900',
  },

  filters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },

  filterButton: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3DA',
  },

  filterButtonActive: {
    backgroundColor: '#8B5E4E',
    borderColor: '#8B5E4E',
  },

  filterText: {
    color: '#8B5E4E',
    fontSize: 12,
    fontWeight: '900',
  },

  filterTextActive: {
    color: '#FFFFFF',
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

  cardCancelado: {
    backgroundColor: '#FFF5F5',
    borderColor: '#F3B5B5',
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
    backgroundColor: '#F0FFF4',
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconBoxCancelado: {
    backgroundColor: '#FEE2E2',
  },

  nombre: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3B2A24',
  },

  fecha: {
    marginTop: 2,
    fontSize: 12,
    color: '#8A7D75',
  },

  fechaEntrega: {
    marginTop: 2,
    fontSize: 12,
    color: '#8B5E4E',
    fontWeight: '800',
  },

  estadoPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F0FFF4',
    borderWidth: 1,
    borderColor: '#B7E4C7',
  },

  estadoPillCancelado: {
    backgroundColor: '#FFF5F5',
    borderColor: '#F3B5B5',
  },

  estadoPillText: {
    color: '#2F855A',
    fontSize: 11,
    fontWeight: '900',
  },

  estadoPillTextCancelado: {
    color: '#9B2C2C',
  },

  productosBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FFF8F3',
    borderWidth: 1,
    borderColor: '#EFE3DA',
  },

  productosLabel: {
    color: '#8A7D75',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 5,
  },

  productoText: {
    color: '#3B2A24',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },

  masProductos: {
    marginTop: 5,
    color: '#8B5E4E',
    fontSize: 12,
    fontWeight: '900',
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
    fontSize: 21,
    fontWeight: '900',
  },

  totalValueCancelado: {
    color: '#FFE1E1',
    textDecorationLine: 'line-through',
  },

  phoneMiniBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F7EDE6',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
  },

  phoneMiniText: {
    color: '#8B5E4E',
    fontSize: 11,
    fontWeight: '900',
  },

  estadoActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },

  estadoActionButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#FFF8F3',
    borderWidth: 1,
    borderColor: '#E8DCD3',
  },

  estadoActionText: {
    color: '#8B5E4E',
    fontSize: 12,
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