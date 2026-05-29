import React, { useCallback, useMemo, useState } from 'react';

import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import {
  actualizarCliente,
  crearCliente,
  eliminarCliente,
  obtenerClientes,
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

export default function ClientesScreen() {
  const [clientes, setClientes] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [detallesPorPedido, setDetallesPorPedido] = useState({});
  const [busqueda, setBusqueda] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);

  const [form, setForm] = useState({
    nombre: '',
    telefono: '',
    email: '',
    direccion: '',
    notas: '',
  });

  const cargar = useCallback(() => {
    try {
      const clientesData = obtenerClientes({ busqueda });
      const pedidosData = obtenerPedidos();
      const detalles = {};

      pedidosData.forEach((pedido) => {
        try {
          detalles[pedido.id] = obtenerDetallePedido(pedido.id);
        } catch {
          detalles[pedido.id] = [];
        }
      });

      setClientes(clientesData);
      setPedidos(pedidosData);
      setDetallesPorPedido(detalles);
    } catch (error) {
      console.error('Error cargando clientes:', error);
      Alert.alert('Error', 'No fue posible cargar los clientes.');
    }
  }, [busqueda]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const estadisticasClientes = useMemo(() => {
    const mapa = {};

    clientes.forEach((cliente) => {
      const pedidosCliente = pedidos.filter((pedido) => {
        if (pedido.estado === 'cancelado') return false;

        const mismoId =
          cliente.id &&
          pedido.cliente_id &&
          Number(pedido.cliente_id) === Number(cliente.id);

        const mismoNombre =
          normalizarTexto(pedido.cliente_nombre) ===
          normalizarTexto(cliente.nombre);

        const mismoTelefono =
          cliente.telefono &&
          pedido.cliente_telefono &&
          String(pedido.cliente_telefono).trim() ===
            String(cliente.telefono).trim();

        return mismoId || mismoNombre || mismoTelefono;
      });

      const totalComprado = pedidosCliente.reduce(
        (total, pedido) => total + Number(pedido.total || 0),
        0
      );

      const ultimoPedido = [...pedidosCliente].sort((a, b) => {
        const fechaA = obtenerFecha(a.created_at)?.getTime() || 0;
        const fechaB = obtenerFecha(b.created_at)?.getTime() || 0;

        return fechaB - fechaA;
      })[0];

      const productos = {};

      pedidosCliente.forEach((pedido) => {
        const detalle = detallesPorPedido[pedido.id] || [];

        detalle.forEach((item) => {
          const nombre = item.receta_nombre || 'Producto';
          const cantidad = Number(item.cantidad || 0);

          productos[nombre] = (productos[nombre] || 0) + cantidad;
        });
      });

      const productoFavorito = Object.entries(productos)
        .sort((a, b) => b[1] - a[1])
        .map(([nombre]) => nombre)[0];

      mapa[cliente.id] = {
        pedidos: pedidosCliente.length,
        totalComprado,
        ultimaCompra: ultimoPedido?.created_at || '',
        productoFavorito: productoFavorito || '',
      };
    });

    return mapa;
  }, [clientes, pedidos, detallesPorPedido]);

  function limpiarFormulario() {
    setClienteEditando(null);
    setForm({
      nombre: '',
      telefono: '',
      email: '',
      direccion: '',
      notas: '',
    });
  }

  function abrirNuevoCliente() {
    limpiarFormulario();
    setModalVisible(true);
  }

  function abrirEditarCliente(cliente) {
    setClienteEditando(cliente);

    setForm({
      nombre: cliente.nombre || '',
      telefono: cliente.telefono || '',
      email: cliente.email || '',
      direccion: cliente.direccion || '',
      notas: cliente.notas || '',
    });

    setModalVisible(true);
  }

  function cerrarModal() {
    setModalVisible(false);
    limpiarFormulario();
  }

  function guardarCliente() {
    const nombre = String(form.nombre || '').trim();

    if (!nombre) {
      Alert.alert('Nombre requerido', 'Ingresa el nombre del cliente.');
      return;
    }

    try {
      const payload = {
        nombre,
        telefono: String(form.telefono || '').trim(),
        email: String(form.email || '').trim(),
        direccion: String(form.direccion || '').trim(),
        notas: String(form.notas || '').trim(),
      };

      if (clienteEditando?.id) {
        actualizarCliente(clienteEditando.id, payload);
      } else {
        crearCliente(payload);
      }

      cerrarModal();
      cargar();
    } catch (error) {
      console.error('Error guardando cliente:', error);
      Alert.alert('Error', 'No fue posible guardar el cliente.');
    }
  }

  function confirmarEliminar(cliente) {
    Alert.alert(
      'Eliminar cliente',
      `¿Quieres eliminar a "${cliente.nombre}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            try {
              eliminarCliente(cliente.id);
              cargar();
            } catch (error) {
              console.error('Error eliminando cliente:', error);
              Alert.alert('Error', 'No fue posible eliminar el cliente.');
            }
          },
        },
      ]
    );
  }

  function renderCliente({ item }) {
    const inicial = String(item.nombre || '?').charAt(0).toUpperCase();
    const stats = estadisticasClientes[item.id] || {};

    return (
      <Pressable style={styles.card} onPress={() => abrirEditarCliente(item)}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{inicial}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.nombre}>{item.nombre}</Text>

            {!!item.telefono && (
              <Text style={styles.infoText}>{item.telefono}</Text>
            )}
          </View>

          <Pressable onPress={() => confirmarEliminar(item)} hitSlop={10}>
            <Ionicons name="trash-outline" size={21} color="#9B2C2C" />
          </Pressable>
        </View>

        <View style={styles.statsGrid}>
          <MiniStat
            icon="receipt-outline"
            label="Pedidos"
            value={stats.pedidos || 0}
          />

          <MiniStat
            icon="cash-outline"
            label="Total comprado"
            value={COP.format(stats.totalComprado || 0)}
          />
        </View>

        <View style={styles.statsGrid}>
          <MiniStat
            icon="calendar-outline"
            label="Última compra"
            value={
              stats.ultimaCompra
                ? formatearFechaFriendly(stats.ultimaCompra)
                : 'Sin compras'
            }
          />

          <MiniStat
            icon="heart-outline"
            label="Producto frecuente"
            value={stats.productoFavorito || 'Sin datos'}
          />
        </View>

        {!!item.email && (
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={16} color="#8B5E4E" />
            <Text style={styles.infoRowText}>{item.email}</Text>
          </View>
        )}

        {!!item.direccion && (
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color="#8B5E4E" />
            <Text style={styles.infoRowText}>{item.direccion}</Text>
          </View>
        )}

        {!!item.notas && (
          <View style={styles.notesBox}>
            <Text style={styles.notesText}>{item.notas}</Text>
          </View>
        )}

        <View style={styles.editHint}>
          <Ionicons name="create-outline" size={15} color="#8B5E4E" />
          <Text style={styles.editHintText}>Tocar para editar</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Clientes</Text>

          <Text style={styles.subtitle}>
            Clientes, compras e historial comercial
          </Text>
        </View>

        <Pressable style={styles.addButton} onPress={abrirNuevoCliente}>
          <Ionicons name="add" size={26} color="#FFF" />
        </Pressable>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#9A8F88" />

        <TextInput
          style={styles.searchInput}
          placeholder="Buscar cliente"
          placeholderTextColor="#AFA49D"
          value={busqueda}
          onChangeText={setBusqueda}
          returnKeyType="search"
        />
      </View>

      <FlatList
        data={clientes}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderCliente}
        contentContainerStyle={
          clientes.length ? styles.list : styles.emptyContainer
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="people-outline" size={46} color="#BFAFA3" />

            <Text style={styles.emptyTitle}>Aún no hay clientes</Text>

            <Text style={styles.emptyText}>
              Crea clientes desde esta pantalla o desde un pedido nuevo.
            </Text>
          </View>
        }
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={cerrarModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {clienteEditando ? 'Editar cliente' : 'Nuevo cliente'}
                </Text>

                <Pressable onPress={cerrarModal} hitSlop={10}>
                  <Ionicons name="close" size={26} color="#3B2A24" />
                </Pressable>
              </View>

              <InputCampo
                label="Nombre"
                value={form.nombre}
                onChangeText={(text) =>
                  setForm((prev) => ({ ...prev, nombre: text }))
                }
                placeholder="Nombre del cliente"
              />

              <InputCampo
                label="Teléfono"
                value={form.telefono}
                onChangeText={(text) =>
                  setForm((prev) => ({ ...prev, telefono: text }))
                }
                placeholder="Número de contacto"
                keyboardType="phone-pad"
              />

              <InputCampo
                label="Correo"
                value={form.email}
                onChangeText={(text) =>
                  setForm((prev) => ({ ...prev, email: text }))
                }
                placeholder="correo@ejemplo.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <InputCampo
                label="Dirección"
                value={form.direccion}
                onChangeText={(text) =>
                  setForm((prev) => ({ ...prev, direccion: text }))
                }
                placeholder="Dirección de entrega"
              />

              <InputCampo
                label="Notas"
                value={form.notas}
                onChangeText={(text) =>
                  setForm((prev) => ({ ...prev, notas: text }))
                }
                placeholder="Preferencias, observaciones o detalles"
                multiline
              />

              <View style={styles.modalActions}>
                <Pressable style={styles.cancelButton} onPress={cerrarModal}>
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </Pressable>

                <Pressable style={styles.saveButton} onPress={guardarCliente}>
                  <Text style={styles.saveButtonText}>
                    {clienteEditando ? 'Actualizar' : 'Guardar'}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function MiniStat({ icon, label, value }) {
  return (
    <View style={styles.statBox}>
      <View style={styles.statHeader}>
        <Ionicons name={icon} size={15} color="#8B5E4E" />
        <Text style={styles.statLabel}>{label}</Text>
      </View>

      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function InputCampo({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  multiline = false,
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        style={[
          styles.input,
          multiline && styles.textArea,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#AFA49D"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

function normalizarTexto(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
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

  searchContainer: {
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 10,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3DA',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#3B2A24',
    paddingVertical: 2,
  },

  list: {
    padding: 20,
    paddingTop: 8,
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

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F1E1D6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    color: '#8B5E4E',
    fontSize: 20,
    fontWeight: '900',
  },

  nombre: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3B2A24',
  },

  infoText: {
    marginTop: 2,
    fontSize: 13,
    color: '#8A7D75',
  },

  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },

  statBox: {
    flex: 1,
    backgroundColor: '#FFF8F3',
    borderRadius: 16,
    padding: 11,
    borderWidth: 1,
    borderColor: '#EFE3DA',
  },

  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  statLabel: {
    color: '#8A7D75',
    fontSize: 11,
    fontWeight: '800',
  },

  statValue: {
    marginTop: 5,
    color: '#3B2A24',
    fontSize: 14,
    fontWeight: '900',
  },

  infoRow: {
    marginTop: 12,
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#FFF8F3',
    borderWidth: 1,
    borderColor: '#EFE3DA',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  infoRowText: {
    flex: 1,
    color: '#3B2A24',
    fontSize: 13,
    fontWeight: '700',
  },

  notesBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#FFF8F3',
    borderWidth: 1,
    borderColor: '#EFE3DA',
  },

  notesText: {
    color: '#5F5149',
    fontSize: 13,
    lineHeight: 18,
  },

  editHint: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  editHintText: {
    color: '#8B5E4E',
    fontSize: 12,
    fontWeight: '900',
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
  },

  emptyText: {
    marginTop: 6,
    textAlign: 'center',
    color: '#7A6F68',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(59, 42, 36, 0.35)',
    justifyContent: 'flex-end',
  },

  modalCard: {
    maxHeight: '88%',
    backgroundColor: '#FFF8F3',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
  },

  modalHeader: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#3B2A24',
  },

  field: {
    marginBottom: 14,
  },

  label: {
    marginBottom: 6,
    color: '#3B2A24',
    fontSize: 14,
    fontWeight: '800',
  },

  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3DA',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#3B2A24',
  },

  textArea: {
    minHeight: 92,
  },

  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    paddingBottom: 8,
  },

  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: '#EFE3DA',
    alignItems: 'center',
  },

  cancelButtonText: {
    color: '#3B2A24',
    fontSize: 15,
    fontWeight: '900',
  },

  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: '#8B5E4E',
    alignItems: 'center',
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
});