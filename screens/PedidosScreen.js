import React, { useCallback, useMemo, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import {
  actualizarEstadoPedido,
  eliminarPedido,
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

export default function PedidosScreen({ navigation }) {
  const hoy = new Date();

  const [pedidos, setPedidos] = useState([]);
  const [detallesPorPedido, setDetallesPorPedido] = useState({});
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEntrega, setFiltroEntrega] = useState('todos');

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
      console.error('Error cargando pedidos:', error);
      Alert.alert('Error', 'No fue posible cargar los pedidos.');
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const pedidosActivosDelMes = useMemo(() => {
    const year = mesVisible.getFullYear();
    const month = mesVisible.getMonth();

    return pedidos
      .filter((pedido) => ['pendiente', 'en_preparacion'].includes(pedido.estado))
      .filter((pedido) => {
        const fecha = obtenerFechaPedido(pedido.created_at);

        return (
          fecha &&
          fecha.getFullYear() === year &&
          fecha.getMonth() === month
        );
      });
  }, [pedidos, mesVisible]);

  const pedidosFiltrados = useMemo(() => {
    const texto = normalizarTexto(busqueda);
    const hoyKey = obtenerFechaKey(new Date());
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const mananaKey = obtenerFechaKey(manana);

    let data = pedidosActivosDelMes;

    if (texto) {
      data = data.filter((pedido) => {
        const detalle = detallesPorPedido[pedido.id] || [];

        const coincideCliente =
          normalizarTexto(pedido.cliente_nombre).includes(texto) ||
          normalizarTexto(pedido.cliente_telefono).includes(texto);

        const coincideProducto = detalle.some((producto) =>
          normalizarTexto(producto.receta_nombre).includes(texto)
        );

        return coincideCliente || coincideProducto;
      });
    }

    if (filtroEntrega !== 'todos') {
      data = data.filter((pedido) => {
        const fechaEntrega = obtenerFechaPedido(pedido.fecha_entrega);

        if (filtroEntrega === 'sin_fecha') {
          return !fechaEntrega;
        }

        if (!fechaEntrega) return false;

        const key = obtenerFechaKey(fechaEntrega);

        if (filtroEntrega === 'hoy') return key === hoyKey;
        if (filtroEntrega === 'manana') return key === mananaKey;
        if (filtroEntrega === 'atrasados') return key < hoyKey;

        return true;
      });
    }

    return [...data].sort((a, b) => {
      const estadoA = prioridadEstado(a.estado);
      const estadoB = prioridadEstado(b.estado);

      if (estadoA !== estadoB) return estadoA - estadoB;

      const entregaA = obtenerFechaPedido(a.fecha_entrega)?.getTime();
      const entregaB = obtenerFechaPedido(b.fecha_entrega)?.getTime();

      if (entregaA && entregaB) return entregaA - entregaB;
      if (entregaA && !entregaB) return -1;
      if (!entregaA && entregaB) return 1;

      const fechaA = obtenerFechaPedido(a.created_at)?.getTime() || 0;
      const fechaB = obtenerFechaPedido(b.created_at)?.getTime() || 0;

      return fechaB - fechaA;
    });
  }, [
    pedidosActivosDelMes,
    detallesPorPedido,
    busqueda,
    filtroEntrega,
  ]);

  const resumenMes = useMemo(() => {
    const hoyKey = obtenerFechaKey(new Date());
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const mananaKey = obtenerFechaKey(manana);

    const total = pedidosActivosDelMes.reduce(
      (acc, pedido) => acc + Number(pedido.total || 0),
      0
    );

    const pendientes = pedidosActivosDelMes.filter(
      (pedido) => pedido.estado === 'pendiente'
    ).length;

    const enPreparacion = pedidosActivosDelMes.filter(
      (pedido) => pedido.estado === 'en_preparacion'
    ).length;

    const entregasHoy = pedidosActivosDelMes.filter((pedido) => {
      const fecha = obtenerFechaPedido(pedido.fecha_entrega);
      return fecha && obtenerFechaKey(fecha) === hoyKey;
    }).length;

    const entregasManana = pedidosActivosDelMes.filter((pedido) => {
      const fecha = obtenerFechaPedido(pedido.fecha_entrega);
      return fecha && obtenerFechaKey(fecha) === mananaKey;
    }).length;

    const atrasados = pedidosActivosDelMes.filter((pedido) => {
      const fecha = obtenerFechaPedido(pedido.fecha_entrega);
      return fecha && obtenerFechaKey(fecha) < hoyKey;
    }).length;

    return {
      total,
      pendientes,
      enPreparacion,
      cantidad: pedidosActivosDelMes.length,
      entregasHoy,
      entregasManana,
      atrasados,
    };
  }, [pedidosActivosDelMes]);

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

  function confirmarEliminar(pedido) {
    Alert.alert(
      'Eliminar pedido',
      `¿Quieres eliminar el pedido de "${
        pedido.cliente_nombre || 'cliente sin nombre'
      }"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            eliminarPedido(pedido.id);
            cargar();
          },
        },
      ]
    );
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

async function abrirWhatsApp(pedido) {
  const telefono = normalizarTelefonoWhatsApp(pedido.cliente_telefono);

  if (!telefono) {
    Alert.alert(
      'Sin teléfono',
      'Este pedido no tiene un teléfono válido para WhatsApp.'
    );
    return;
  }

  const mensaje = encodeURIComponent(
    `Hola ${pedido.cliente_nombre || ''}, te escribimos de KUMO Bakery sobre tu pedido.`
  );

  const urlApp = `whatsapp://send?phone=${telefono}&text=${mensaje}`;
  const urlWeb = `https://wa.me/${telefono}?text=${mensaje}`;

  try {
    const puedeAbrirApp = await Linking.canOpenURL(urlApp);

    if (puedeAbrirApp) {
      await Linking.openURL(urlApp);
    } else {
      await Linking.openURL(urlWeb);
    }
  } catch (error) {
    console.error('Error abriendo WhatsApp:', error);

    Alert.alert(
      'Error',
      'No fue posible abrir WhatsApp.'
    );
  }
}


  function renderItem({ item }) {
    const detalle = detallesPorPedido[item.id] || [];
    const estadoColor = obtenerColorEstado(item.estado);
    const entregaInfo = obtenerInfoEntrega(item.fecha_entrega);

    return (
      <Pressable
        style={[
          styles.card,
          entregaInfo.tipo === 'atrasado' && styles.cardAtrasado,
        ]}
        onPress={() =>
          navigation.navigate('FormularioPedido', {
            pedidoId: item.id,
          })
        }
      >
        <View style={styles.cardHeader}>
          <View style={styles.iconBox}>
            <Ionicons name="receipt-outline" size={24} color="#8B5E4E" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.nombre}>
              {item.cliente_nombre || 'Cliente sin nombre'}
            </Text>

            <Text style={styles.fecha}>
              Creado: {formatearFechaFriendly(item.created_at)}
            </Text>

            <Text
              style={[
                styles.fechaEntrega,
                entregaInfo.tipo === 'atrasado' && styles.fechaEntregaAtrasada,
              ]}
            >
              {entregaInfo.texto}
            </Text>
          </View>

          <Pressable onPress={() => confirmarEliminar(item)} hitSlop={10}>
            <Ionicons name="trash-outline" size={21} color="#9B2C2C" />
          </Pressable>
        </View>

        <View style={styles.metaRow}>
          <View style={[styles.estadoBox, { borderColor: estadoColor }]}>
            <View style={[styles.estadoDot, { backgroundColor: estadoColor }]} />

            <Text style={[styles.estadoText, { color: estadoColor }]}>
              {obtenerTextoEstado(item.estado)}
            </Text>
          </View>

          {entregaInfo.tipo !== 'sin_fecha' && (
            <View
              style={[
                styles.entregaPill,
                entregaInfo.tipo === 'hoy' && styles.entregaPillHoy,
                entregaInfo.tipo === 'manana' && styles.entregaPillManana,
                entregaInfo.tipo === 'atrasado' && styles.entregaPillAtrasada,
              ]}
            >
              <Ionicons
                name={entregaInfo.icono}
                size={14}
                color={entregaInfo.color}
              />

              <Text style={[styles.entregaPillText, { color: entregaInfo.color }]}>
                {entregaInfo.label}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.productosBox}>
          <Text style={styles.productosLabel}>Productos</Text>

          {detalle.length > 0 ? (
            detalle.slice(0, 3).map((producto) => (
              <Text key={producto.id} style={styles.productoText}>
                {Number(producto.cantidad || 0).toLocaleString('es-CO')} ×{' '}
                {producto.receta_nombre || 'Producto'}
              </Text>
            ))
          ) : (
            <Text style={styles.productoText}>Sin detalle de productos</Text>
          )}

          {detalle.length > 3 && (
            <Text style={styles.masProductos}>
              +{detalle.length - 3} producto(s) más
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

          {!!item.cliente_telefono && (
            <Pressable
              style={styles.whatsappMiniBox}
              onPress={() => abrirWhatsApp(item)}
            >
              <Ionicons name="logo-whatsapp" size={16} color="#2F855A" />
              <Text style={styles.whatsappMiniText}>WhatsApp</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.estadoActions}>
          {item.estado !== 'pendiente' && (
            <Pressable
              style={styles.estadoActionButton}
              onPress={() => cambiarEstadoPedido(item, 'pendiente')}
            >
              <Text style={styles.estadoActionText}>Pendiente</Text>
            </Pressable>
          )}

          {item.estado !== 'en_preparacion' && (
            <Pressable
              style={styles.estadoActionButton}
              onPress={() => cambiarEstadoPedido(item, 'en_preparacion')}
            >
              <Text style={styles.estadoActionText}>Preparar</Text>
            </Pressable>
          )}

          <Pressable
            style={styles.estadoActionButtonSuccess}
            onPress={() => cambiarEstadoPedido(item, 'entregado')}
          >
            <Text style={styles.estadoActionTextSuccess}>Entregado</Text>
          </Pressable>

          <Pressable
            style={styles.estadoActionButtonDanger}
            onPress={() => cambiarEstadoPedido(item, 'cancelado')}
          >
            <Text style={styles.estadoActionTextDanger}>Cancelar</Text>
          </Pressable>
        </View>
      </Pressable>
    );
  }

  const tituloMes = `${capitalizar(MESES[mesVisible.getMonth()])} ${mesVisible.getFullYear()}`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Pedidos</Text>

          <Text style={styles.subtitle}>
            Pedidos activos por mes de creación
          </Text>
        </View>

        <Pressable
          style={styles.calendarButton}
          onPress={() => navigation.navigate('PedidosCalendario')}
        >
          <Ionicons
            name="calendar-outline"
            size={22}
            color="#8B5E4E"
          />
        </Pressable>

        <Pressable
          style={styles.addButton}
          onPress={() => navigation.navigate('FormularioPedido')}
        >
          <Ionicons
            name="add"
            size={26}
            color="#FFFFFF"
          />
        </Pressable>
      </View>

      <View style={styles.monthPanel}>
        <Pressable style={styles.monthButton} onPress={() => cambiarMes(-1)}>
          <Ionicons name="chevron-back" size={22} color="#8B5E4E" />
        </Pressable>

        <View style={styles.monthCenter}>
          <Text style={styles.monthTitle}>{tituloMes}</Text>

          <Pressable onPress={volverAlMesActual}>
            <Text style={styles.currentMonthText}>Volver al mes actual</Text>
          </Pressable>
        </View>

        <Pressable style={styles.monthButton} onPress={() => cambiarMes(1)}>
          <Ionicons name="chevron-forward" size={22} color="#8B5E4E" />
        </Pressable>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{resumenMes.cantidad}</Text>
          <Text style={styles.summaryLabel}>Activos</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{resumenMes.entregasHoy}</Text>
          <Text style={styles.summaryLabel}>Hoy</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{resumenMes.entregasManana}</Text>
          <Text style={styles.summaryLabel}>Mañana</Text>
        </View>
      </View>

      <View style={styles.totalMesBox}>
        <View>
          <Text style={styles.totalMesLabel}>Total activo del mes</Text>
          <Text style={styles.totalMesValue}>{COP.format(resumenMes.total)}</Text>
        </View>

        {resumenMes.atrasados > 0 && (
          <View style={styles.alertMiniBox}>
            <Ionicons name="warning-outline" size={15} color="#9B2C2C" />
            <Text style={styles.alertMiniText}>
              {resumenMes.atrasados} atrasado(s)
            </Text>
          </View>
        )}
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={19} color="#8A7D75" />

        <TextInput
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar cliente, teléfono o producto"
          placeholderTextColor="#A79C95"
          style={styles.searchInput}
        />

        {!!busqueda && (
          <Pressable onPress={() => setBusqueda('')}>
            <Ionicons name="close-circle" size={20} color="#A79C95" />
          </Pressable>
        )}
      </View>

      <View style={styles.filters}>
        <FiltroButton
          label="Todos"
          activo={filtroEntrega === 'todos'}
          onPress={() => setFiltroEntrega('todos')}
        />

        <FiltroButton
          label="Hoy"
          activo={filtroEntrega === 'hoy'}
          onPress={() => setFiltroEntrega('hoy')}
        />

        <FiltroButton
          label="Mañana"
          activo={filtroEntrega === 'manana'}
          onPress={() => setFiltroEntrega('manana')}
        />

        <FiltroButton
          label="Atrasados"
          activo={filtroEntrega === 'atrasados'}
          onPress={() => setFiltroEntrega('atrasados')}
        />

        <FiltroButton
          label="Sin fecha"
          activo={filtroEntrega === 'sin_fecha'}
          onPress={() => setFiltroEntrega('sin_fecha')}
        />
      </View>

      {cargando ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={pedidosFiltrados}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={
            pedidosFiltrados.length ? styles.list : styles.emptyContainer
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="calendar-outline" size={46} color="#BFAFA3" />

              <Text style={styles.emptyTitle}>
                Sin pedidos activos en {tituloMes}
              </Text>

              <Text style={styles.emptyText}>
                Cambia de mes, limpia los filtros o crea un nuevo pedido.
              </Text>
            </View>
          }
        />
      )}
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

function normalizarTexto(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizarTelefonoWhatsApp(valor) {
  const digitos = String(valor || '').replace(/\D/g, '');

  if (!digitos) return '';

  if (digitos.startsWith('57') && digitos.length >= 12) {
    return digitos;
  }

  if (digitos.length === 10) {
    return `57${digitos}`;
  }

  return digitos;
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

function formatearFechaFriendly(valor) {
  const fecha = obtenerFechaPedido(valor);

  if (!fecha) return 'Sin fecha';

  const dia = fecha.getDate();
  const mes = MESES[fecha.getMonth()];

  return `${dia} de ${mes}`;
}

function obtenerInfoEntrega(valor) {
  const fecha = obtenerFechaPedido(valor);

  if (!fecha) {
    return {
      tipo: 'sin_fecha',
      texto: 'Entrega pendiente de definir',
      label: 'Sin fecha',
      icono: 'calendar-outline',
      color: '#8A7D75',
    };
  }

  const hoyKey = obtenerFechaKey(new Date());
  const manana = new Date();
  manana.setDate(manana.getDate() + 1);

  const key = obtenerFechaKey(fecha);
  const mananaKey = obtenerFechaKey(manana);

  if (key < hoyKey) {
    return {
      tipo: 'atrasado',
      texto: `Entrega: ${formatearFechaFriendly(valor)}`,
      label: 'Atrasado',
      icono: 'warning-outline',
      color: '#9B2C2C',
    };
  }

  if (key === hoyKey) {
    return {
      tipo: 'hoy',
      texto: `Entrega: ${formatearFechaFriendly(valor)}`,
      label: 'Hoy',
      icono: 'calendar-clear-outline',
      color: '#B45309',
    };
  }

  if (key === mananaKey) {
    return {
      tipo: 'manana',
      texto: `Entrega: ${formatearFechaFriendly(valor)}`,
      label: 'Mañana',
      icono: 'calendar-outline',
      color: '#2B6CB0',
    };
  }

  return {
    tipo: 'programado',
    texto: `Entrega: ${formatearFechaFriendly(valor)}`,
    label: 'Programado',
    icono: 'calendar-outline',
    color: '#8B5E4E',
  };
}

function capitalizar(texto) {
  if (!texto) return '';

  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function prioridadEstado(estado) {
  if (estado === 'en_preparacion') return 1;
  if (estado === 'pendiente') return 2;

  return 3;
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

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
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

  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#8B5E4E',
    alignItems: 'center',
    justifyContent: 'center',
  },

  monthPanel: {
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 12,
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
    paddingHorizontal: 20,
    marginBottom: 10,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFE3DA',
    elevation: 1,
  },

  summaryValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#3B2A24',
  },

  summaryLabel: {
    marginTop: 2,
    fontSize: 11,
    color: '#7A6F68',
    fontWeight: '800',
  },

  totalMesBox: {
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#8B5E4E',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  totalMesLabel: {
    color: '#F7EDE6',
    fontSize: 13,
    fontWeight: '800',
  },

  totalMesValue: {
    marginTop: 2,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },

  alertMiniBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
  },

  alertMiniText: {
    color: '#9B2C2C',
    fontSize: 11,
    fontWeight: '900',
  },

  searchBox: {
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3DA',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  searchInput: {
    flex: 1,
    color: '#3B2A24',
    fontSize: 14,
    paddingVertical: 2,
  },

  filters: {
    paddingHorizontal: 20,
    marginBottom: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
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

  list: {
    padding: 20,
    paddingTop: 6,
    paddingBottom: 40,
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

  cardAtrasado: {
    borderColor: '#F3B5B5',
    backgroundColor: '#FFFafa',
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

  fechaEntregaAtrasada: {
    color: '#9B2C2C',
  },

  metaRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  estadoBox: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFF8F3',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  estadoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  estadoText: {
    fontSize: 12,
    fontWeight: '900',
  },

  entregaPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFF8F3',
    borderWidth: 1,
    borderColor: '#EFE3DA',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  entregaPillHoy: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FDBA74',
  },

  entregaPillManana: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },

  entregaPillAtrasada: {
    backgroundColor: '#FFF5F5',
    borderColor: '#F3B5B5',
  },

  entregaPillText: {
    fontSize: 12,
    fontWeight: '900',
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
    paddingVertical: 6,
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

  estadoActionButtonSuccess: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F0FFF4',
    borderWidth: 1,
    borderColor: '#B7E4C7',
  },

  estadoActionTextSuccess: {
    color: '#2F855A',
    fontSize: 12,
    fontWeight: '900',
  },

  estadoActionButtonDanger: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#F3B5B5',
  },

  estadoActionTextDanger: {
    color: '#9B2C2C',
    fontSize: 12,
    fontWeight: '900',
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },

  emptyBox: {
    alignItems: 'center',
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '800',
    color: '#3B2A24',
    textAlign: 'center',
  },

  emptyText: {
    marginTop: 6,
    textAlign: 'center',
    color: '#7A6F68',
  },

  calendarButton: {
  width: 46,
  height: 46,
  borderRadius: 16,
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: '#EFE3DA',
  alignItems: 'center',
  justifyContent: 'center',
},

whatsappMiniBox: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 5,
  backgroundColor: '#F0FFF4',
  paddingHorizontal: 10,
  paddingVertical: 7,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: '#B7E4C7',
},

whatsappMiniText: {
  color: '#2F855A',
  fontSize: 11,
  fontWeight: '900',
},

});