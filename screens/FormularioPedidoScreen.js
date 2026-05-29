import React, { useEffect, useMemo, useState } from 'react';

import {
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

import {
  actualizarPedido,
  crearCliente,
  crearPedido,
  obtenerClientes,
  obtenerDetallePedido,
  obtenerEmpaquesPedido,
  obtenerInsumos,
  obtenerPedidoPorId,
  obtenerProducciones,
} from '../database/db';

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

function formatearFecha(date) {
  const dia = String(date.getDate()).padStart(2, '0');
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const anio = date.getFullYear();

  return `${dia}/${mes}/${anio}`;
}

function fechaDesdeTexto(valor) {
  if (!valor) return new Date();

  const partes = String(valor).split('/');

  if (partes.length === 3) {
    const [dia, mes, anio] = partes;
    return new Date(Number(anio), Number(mes) - 1, Number(dia));
  }

  return new Date();
}

function normalizarNumero(valor) {
  return Number(String(valor || '').replace(',', '.')) || 0;
}

export default function FormularioPedidoScreen({ navigation, route }) {
  const pedidoId = route?.params?.pedidoId || null;
  const editando = Boolean(pedidoId);

  const [clientes, setClientes] = useState([]);
  const [producciones, setProducciones] = useState([]);
  const [empaquesDisponibles, setEmpaquesDisponibles] = useState([]);

  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [mostrarResultadosCliente, setMostrarResultadosCliente] = useState(false);
  const [produccionSeleccionada, setProduccionSeleccionada] = useState(null);

  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [clienteDireccion, setClienteDireccion] = useState('');

  const [fechaEntrega, setFechaEntrega] = useState('');
  const [mostrarPickerFecha, setMostrarPickerFecha] = useState(false);

  const [cantidad, setCantidad] = useState('1');

  const [requiereDomicilio, setRequiereDomicilio] = useState(false);
  const [direccionEntrega, setDireccionEntrega] = useState('');
  const [costoEnvio, setCostoEnvio] = useState('0');

  const [empaquesSeleccionados, setEmpaquesSeleccionados] = useState([]);

  const [notas, setNotas] = useState('');

  useEffect(() => {
    try {
      const clientesData = obtenerClientes();
      const produccionesData = obtenerProducciones();
      const insumosData = obtenerInsumos();

      const empaquesData = insumosData.filter((insumo) =>
        String(insumo.categoria || '')
          .toLowerCase()
          .includes('empaque')
      );

      setClientes(clientesData);
      setProducciones(produccionesData);
      setEmpaquesDisponibles(empaquesData);
    } catch (error) {
      console.error('Error cargando datos del pedido:', error);
      Alert.alert('Error', 'No fue posible cargar la información del pedido.');
    }
  }, []);

  useEffect(() => {
    if (!editando || producciones.length === 0) return;

    try {
      const pedido = obtenerPedidoPorId(pedidoId);

      if (!pedido) {
        Alert.alert('Error', 'No se encontró el pedido.');
        navigation.goBack();
        return;
      }

      const detalle = obtenerDetallePedido(pedidoId);
      const empaques = obtenerEmpaquesPedido(pedidoId);

      setClienteNombre(pedido.cliente_nombre || '');
      setClienteTelefono(pedido.cliente_telefono || '');
      setFechaEntrega(pedido.fecha_entrega || '');
      setRequiereDomicilio(Number(pedido.requiere_domicilio || 0) === 1);
      setDireccionEntrega(pedido.direccion_entrega || '');
      setCostoEnvio(String(pedido.costo_envio || '0'));
      setNotas(pedido.notas || '');

      if (pedido.cliente_id) {
        const cliente = clientes.find(
          (item) => item.id === pedido.cliente_id
        );

        if (cliente) {
          setClienteSeleccionado(cliente);
          setClienteDireccion(cliente.direccion || '');
        }
      }

      if (detalle.length > 0) {
        const primerProducto = detalle[0];

        const produccion = producciones.find(
          (item) => item.id === primerProducto.produccion_id
        );

        if (produccion) {
          setProduccionSeleccionada(produccion);
        }

        setCantidad(String(primerProducto.cantidad || '1'));
      }

      const empaquesFormateados = empaques.map((item) => ({
        insumo_id: item.insumo_id,
        insumo_nombre: item.insumo_nombre,
        cantidad: String(item.cantidad || '1'),
        costo_unitario: Number(item.costo_unitario || 0),
      }));

      setEmpaquesSeleccionados(empaquesFormateados);
    } catch (error) {
      console.error('Error cargando pedido:', error);
      Alert.alert('Error', 'No fue posible cargar el pedido.');
    }
  }, [editando, pedidoId, producciones, clientes, navigation]);


  const clientesFiltrados = useMemo(() => {
    const texto = busquedaCliente.trim().toLowerCase();

    if (!texto) return [];

    return clientes
      .filter((cliente) => {
        const nombre = String(cliente.nombre || '').toLowerCase();
        const telefono = String(cliente.telefono || '').toLowerCase();

        return (
          nombre.includes(texto) ||
          telefono.includes(texto)
        );
      })
      .slice(0, 5);
  }, [clientes, busquedaCliente]);


  function seleccionarCliente(cliente) {
    setClienteSeleccionado(cliente);

    setClienteNombre(cliente.nombre || '');
    setClienteTelefono(cliente.telefono || '');
    setClienteDireccion(cliente.direccion || '');

    setBusquedaCliente(cliente.nombre || '');
    setMostrarResultadosCliente(false);

    if (requiereDomicilio && !direccionEntrega) {
      setDireccionEntrega(cliente.direccion || '');
    }
  }

  function limpiarClienteSeleccionado() {
    setClienteSeleccionado(null);
    setBusquedaCliente('');
    setMostrarResultadosCliente(false);
    setClienteNombre('');
    setClienteTelefono('');
    setClienteDireccion('');
    setDireccionEntrega('');
  }

  function seleccionarProduccion(produccion) {
    setProduccionSeleccionada(produccion);
  }

  function seleccionarFecha(event, selectedDate) {
    setMostrarPickerFecha(false);

    if (!selectedDate) return;

    setFechaEntrega(formatearFecha(selectedDate));
  }

  function alternarEmpaque(insumo) {
    const existe = empaquesSeleccionados.some(
      (item) => item.insumo_id === insumo.id
    );

    if (existe) {
      setEmpaquesSeleccionados((prev) =>
        prev.filter((item) => item.insumo_id !== insumo.id)
      );

      return;
    }

    setEmpaquesSeleccionados((prev) => [
      ...prev,
      {
        insumo_id: insumo.id,
        insumo_nombre: insumo.nombre,
        cantidad: '1',
        costo_unitario: Number(insumo.costo_por_unidad || 0),
      },
    ]);
  }

  function actualizarCantidadEmpaque(insumoId, valor) {
    setEmpaquesSeleccionados((prev) =>
      prev.map((item) =>
        item.insumo_id === insumoId
          ? {
              ...item,
              cantidad: valor,
            }
          : item
      )
    );
  }

  const cantidadNumero = useMemo(() => {
    return normalizarNumero(cantidad);
  }, [cantidad]);

  const disponibles = useMemo(() => {
    if (!produccionSeleccionada) return 0;

    return Number(
      produccionSeleccionada.unidades_disponibles ||
        produccionSeleccionada.unidades_resultantes ||
        0
    );
  }, [produccionSeleccionada]);

  const precioUnitario = useMemo(() => {
    if (!produccionSeleccionada) return 0;

    return Number(
      produccionSeleccionada.precio_sugerido_personalizado ||
        produccionSeleccionada.precio_sugerido_40 ||
        0
    );
  }, [produccionSeleccionada]);

  const costoUnitario = useMemo(() => {
    if (!produccionSeleccionada) return 0;

    return Number(produccionSeleccionada.costo_por_unidad || 0);
  }, [produccionSeleccionada]);

  const subtotalProductos = useMemo(() => {
    return cantidadNumero * precioUnitario;
  }, [cantidadNumero, precioUnitario]);

  const costoEmpaques = useMemo(() => {
    return empaquesSeleccionados.reduce((total, item) => {
      const cantidadEmpaque = normalizarNumero(item.cantidad);
      const costoUnitarioEmpaque = Number(item.costo_unitario || 0);

      return total + cantidadEmpaque * costoUnitarioEmpaque;
    }, 0);
  }, [empaquesSeleccionados]);

  const costoEnvioNumero = useMemo(() => {
    if (!requiereDomicilio) return 0;

    return normalizarNumero(costoEnvio);
  }, [requiereDomicilio, costoEnvio]);

  const totalPedido = useMemo(() => {
    return subtotalProductos + costoEmpaques + costoEnvioNumero;
  }, [subtotalProductos, costoEmpaques, costoEnvioNumero]);

  function guardarPedido() {
    if (!clienteNombre.trim()) {
      Alert.alert('Falta información', 'Escribe o selecciona el cliente.');
      return;
    }

    if (!produccionSeleccionada) {
      Alert.alert('Falta información', 'Selecciona una producción.');
      return;
    }

    if (cantidadNumero <= 0) {
      Alert.alert('Cantidad inválida', 'La cantidad debe ser mayor a 0.');
      return;
    }

    if (!editando && cantidadNumero > disponibles) {
      Alert.alert(
        'Stock insuficiente',
        `Solo hay ${disponibles} unidades disponibles para venta.`
      );
      return;
    }

    if (requiereDomicilio && !direccionEntrega.trim()) {
      Alert.alert(
        'Falta dirección',
        'Escribe la dirección de entrega para el domicilio.'
      );
      return;
    }

    try {
      let clienteId = clienteSeleccionado?.id || null;

      if (!clienteId) {
        clienteId = crearCliente({
          nombre: clienteNombre.trim(),
          telefono: clienteTelefono.trim(),
          direccion: clienteDireccion.trim() || direccionEntrega.trim(),
          email: '',
          notas: '',
        });
      }

      const payloadPedido = {
        cliente_id: clienteId,
        cliente_nombre: clienteNombre.trim(),
        cliente_telefono: clienteTelefono.trim(),
        fecha_entrega: fechaEntrega,

        requiere_domicilio: requiereDomicilio,
        direccion_entrega: requiereDomicilio
          ? direccionEntrega.trim()
          : '',
        costo_envio: costoEnvioNumero,

        estado: 'pendiente',
        notas,
      };

      const productos = [
        {
          produccion_id: produccionSeleccionada.id,
          receta_nombre:
            produccionSeleccionada.receta_nombre || 'Producto',
          cantidad: cantidadNumero,
          precio_unitario: precioUnitario,
          costo_unitario: costoUnitario,
        },
      ];

      const empaques = empaquesSeleccionados.map((item) => ({
        insumo_id: item.insumo_id,
        insumo_nombre: item.insumo_nombre,
        cantidad: normalizarNumero(item.cantidad),
        costo_unitario: Number(item.costo_unitario || 0),
      }));

      if (editando) {
        actualizarPedido(
          pedidoId,
          payloadPedido,
          productos,
          empaques
        );
      } else {
        crearPedido(
          payloadPedido,
          productos,
          empaques
        );
      }

      Alert.alert(
        editando ? 'Pedido actualizado' : 'Pedido guardado',
        editando
          ? 'El pedido fue actualizado correctamente.'
          : 'El pedido fue creado correctamente.'
      );

      navigation.goBack();
    } catch (error) {
      console.error('Error guardando pedido:', error);
      Alert.alert('Error', 'No fue posible guardar el pedido.');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>
          {editando ? 'Editar pedido' : 'Nuevo pedido'}
        </Text>

        <Text style={styles.subtitle}>
          Selecciona cliente, producto, empaques y calcula el total a cobrar.
        </Text>

       <Section title="1. Cliente">
          <Input
            label="Buscar cliente registrado"
            value={busquedaCliente}
            onChangeText={(valor) => {
              setBusquedaCliente(valor);
              setMostrarResultadosCliente(true);
              setClienteSeleccionado(null);
            }}
            placeholder="Escribe nombre o teléfono"
          />

          {mostrarResultadosCliente && clientesFiltrados.length > 0 && (
            <View style={styles.searchResultsBox}>
              {clientesFiltrados.map((cliente) => (
                <Pressable
                  key={cliente.id}
                  style={styles.searchResultItem}
                  onPress={() => seleccionarCliente(cliente)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.searchResultName}>
                      {cliente.nombre}
                    </Text>

                    {!!cliente.telefono && (
                      <Text style={styles.searchResultMeta}>
                        {cliente.telefono}
                      </Text>
                    )}

                    {!!cliente.direccion && (
                      <Text style={styles.searchResultMeta}>
                        {cliente.direccion}
                      </Text>
                    )}
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="#8B5E4E"
                  />
                </Pressable>
              ))}
            </View>
          )}

          {clienteSeleccionado && (
            <View style={styles.selectedClientBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedClientLabel}>
                  Cliente seleccionado
                </Text>

                <Text style={styles.selectedClientName}>
                  {clienteSeleccionado.nombre}
                </Text>
              </View>

              <Pressable onPress={limpiarClienteSeleccionado}>
                <Ionicons
                  name="close-circle"
                  size={24}
                  color="#9B2C2C"
                />
              </Pressable>
            </View>
          )}

          {!clienteSeleccionado && (
            <Text style={styles.helperText}>
              Si no seleccionas un cliente registrado, se creará uno nuevo con los datos de abajo.
            </Text>
          )}

          <Input
            label="Nombre del cliente"
            value={clienteNombre}
            onChangeText={(valor) => {
              setClienteSeleccionado(null);
              setClienteNombre(valor);
            }}
            placeholder="Ej: Mariana Gómez"
          />

          <Input
            label="Teléfono"
            value={clienteTelefono}
            onChangeText={setClienteTelefono}
            keyboardType="phone-pad"
            placeholder="Ej: 3001234567"
          />

          <Input
            label="Dirección del cliente (opcional)"
            value={clienteDireccion}
            onChangeText={setClienteDireccion}
            placeholder="Ej: Calle 10 # 20-30"
          />

          <Text style={styles.label}>Fecha de entrega</Text>

          <Pressable
            style={styles.dateButton}
            onPress={() => setMostrarPickerFecha(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#7A6F68" />

            <Text style={styles.dateButtonText}>
              {fechaEntrega || 'Seleccionar fecha'}
            </Text>
          </Pressable>

          {mostrarPickerFecha && (
            <DateTimePicker
              value={fechaDesdeTexto(fechaEntrega)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={seleccionarFecha}
            />
          )}
        </Section>

        <Section title="2. Producto desde producción">
          {producciones.length === 0 ? (
            <Text style={styles.helperText}>
              Aún no hay producciones disponibles. Primero crea una producción.
            </Text>
          ) : (
            producciones.map((produccion) => {
              const activa =
                produccionSeleccionada?.id === produccion.id;

              const disponiblesProduccion = Number(
                produccion.unidades_disponibles ||
                  produccion.unidades_resultantes ||
                  0
              );

              const precioProduccion = Number(
                produccion.precio_sugerido_personalizado ||
                  produccion.precio_sugerido_40 ||
                  0
              );

              return (
                <Pressable
                  key={produccion.id}
                  style={[
                    styles.productCard,
                    activa && styles.productCardActive,
                  ]}
                  onPress={() => seleccionarProduccion(produccion)}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.productName,
                        activa && styles.productNameActive,
                      ]}
                    >
                      {produccion.receta_nombre || 'Producto'}
                    </Text>

                    <Text
                      style={[
                        styles.productMeta,
                        activa && styles.productMetaActive,
                      ]}
                    >
                      Disponibles: {disponiblesProduccion} unidades
                    </Text>

                    <Text
                      style={[
                        styles.productMeta,
                        activa && styles.productMetaActive,
                      ]}
                    >
                      Precio sugerido: {COP.format(precioProduccion)}
                    </Text>
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

          {produccionSeleccionada && (
            <View style={{ marginTop: 12 }}>
              <Input
                label="Cantidad a vender"
                value={cantidad}
                onChangeText={setCantidad}
                keyboardType="decimal-pad"
                placeholder="1"
              />

              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>
                  Subtotal productos
                </Text>

                <Text style={styles.summaryValue}>
                  {COP.format(subtotalProductos)}
                </Text>
              </View>
            </View>
          )}
        </Section>

        <Section title="3. Empaques">
          {empaquesDisponibles.length === 0 ? (
            <Text style={styles.helperText}>
              No tienes insumos con categoría Empaques.
            </Text>
          ) : (
            empaquesDisponibles.map((insumo) => {
              const seleccionado = empaquesSeleccionados.find(
                (item) => item.insumo_id === insumo.id
              );

              return (
                <View key={insumo.id} style={styles.packageWrap}>
                  <Pressable
                    style={[
                      styles.packageCard,
                      seleccionado && styles.packageCardActive,
                    ]}
                    onPress={() => alternarEmpaque(insumo)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.packageName,
                          seleccionado && styles.packageNameActive,
                        ]}
                      >
                        {insumo.nombre}
                      </Text>

                      <Text
                        style={[
                          styles.packageMeta,
                          seleccionado && styles.packageMetaActive,
                        ]}
                      >
                        Costo unidad: {COP.format(insumo.costo_por_unidad || 0)}
                      </Text>

                      <Text
                        style={[
                          styles.packageMeta,
                          seleccionado && styles.packageMetaActive,
                        ]}
                      >
                        Disponible: {Number(insumo.cantidad_actual || 0)}{' '}
                        {insumo.unidad_medida}
                      </Text>
                    </View>

                    {seleccionado && (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color="#FFFFFF"
                      />
                    )}
                  </Pressable>

                  {seleccionado && (
                    <Input
                      label="Cantidad de empaque"
                      value={String(seleccionado.cantidad)}
                      onChangeText={(valor) =>
                        actualizarCantidadEmpaque(insumo.id, valor)
                      }
                      keyboardType="decimal-pad"
                      placeholder="1"
                    />
                  )}
                </View>
              );
            })
          )}

          <View style={[styles.summaryCard, { marginTop: 8 }]}>
            <Text style={styles.summaryLabel}>
              Costo total de empaques
            </Text>

            <Text style={styles.summaryValue}>
              {COP.format(costoEmpaques)}
            </Text>
          </View>
        </Section>

        <Section title="4. Domicilio / entrega">
          <Pressable
            style={[
              styles.toggleCard,
              requiereDomicilio && styles.toggleCardActive,
            ]}
            onPress={() => {
              const nuevoValor = !requiereDomicilio;
              setRequiereDomicilio(nuevoValor);

              if (nuevoValor && !direccionEntrega && clienteDireccion) {
                setDireccionEntrega(clienteDireccion);
              }
            }}
          >
            <View style={styles.toggleIcon}>
              <Ionicons
                name={
                  requiereDomicilio
                    ? 'checkmark-circle'
                    : 'ellipse-outline'
                }
                size={23}
                color={requiereDomicilio ? '#FFFFFF' : '#8B5E4E'}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.toggleTitle,
                  requiereDomicilio && styles.toggleTitleActive,
                ]}
              >
                Este pedido requiere domicilio
              </Text>

              <Text
                style={[
                  styles.toggleSubtitle,
                  requiereDomicilio && styles.toggleSubtitleActive,
                ]}
              >
                Actívalo si debes sumar dirección y costo de entrega.
              </Text>
            </View>
          </Pressable>

          {requiereDomicilio && (
            <View style={{ marginTop: 12 }}>
              <Input
                label="Dirección de entrega"
                value={direccionEntrega}
                onChangeText={setDireccionEntrega}
                placeholder="Ej: Calle 10 # 20-30"
              />

              <Input
                label="Costo domicilio"
                value={costoEnvio}
                onChangeText={setCostoEnvio}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </View>
          )}
        </Section>

        <Section title="5. Resumen del pedido">
          <View style={styles.summaryGrid}>
            <SummaryCard
              label="Productos"
              value={COP.format(subtotalProductos)}
            />

            <SummaryCard
              label="Empaques"
              value={COP.format(costoEmpaques)}
            />

            <SummaryCard
              label="Domicilio"
              value={COP.format(costoEnvioNumero)}
            />

            <SummaryCard
              label="Total a cobrar"
              value={COP.format(totalPedido)}
              strong
            />
          </View>
        </Section>

        <Section title="Notas">
          <Input
            multiline
            label="Notas del pedido"
            value={notas}
            onChangeText={setNotas}
            placeholder="Ej: entregar después de las 4 p.m., pago pendiente..."
          />
        </Section>

        <Pressable style={styles.saveButton} onPress={guardarPedido}>
          <Ionicons name="save-outline" size={20} color="#FFFFFF" />

          <Text style={styles.saveButtonText}>
            {editando ? 'Actualizar pedido' : 'Guardar pedido'}
          </Text>
        </Pressable>
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

function Input({ label, multiline, ...props }) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor="#A79C95"
        style={[
          styles.input,
          multiline && styles.textArea,
        ]}
      />
    </View>
  );
}

function SummaryCard({ label, value, strong }) {
  return (
    <View style={[styles.summaryCard, strong && styles.summaryCardStrong]}>
      <Text
        style={[
          styles.summaryLabel,
          strong && styles.summaryLabelStrong,
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.summaryValue,
          strong && styles.summaryValueStrong,
        ]}
      >
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
    paddingBottom: 70,
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
    lineHeight: 20,
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

  inputWrap: {
    marginBottom: 12,
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
    marginBottom: 10,
  },

  dateButton: {
    minHeight: 46,
    borderRadius: 15,
    backgroundColor: '#FFF8F3',
    borderWidth: 1,
    borderColor: '#E8DCD3',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },

  dateButtonText: {
    color: '#3B2A24',
    fontSize: 15,
  },

  clearButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },

  clearButtonText: {
    color: '#9B2C2C',
    fontWeight: '800',
  },

  clientCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8DCD3',
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#FFF8F3',
    flexDirection: 'row',
    alignItems: 'center',
  },

  clientCardActive: {
    backgroundColor: '#8B5E4E',
    borderColor: '#8B5E4E',
  },

  clientName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#3B2A24',
  },

  clientNameActive: {
    color: '#FFFFFF',
  },

  clientMeta: {
    marginTop: 3,
    fontSize: 12,
    color: '#7A6F68',
  },

  clientMetaActive: {
    color: '#F7EDE6',
  },

  productCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8DCD3',
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#FFF8F3',
    flexDirection: 'row',
    alignItems: 'center',
  },

  productCardActive: {
    backgroundColor: '#8B5E4E',
    borderColor: '#8B5E4E',
  },

  productName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3B2A24',
  },

  productNameActive: {
    color: '#FFFFFF',
  },

  productMeta: {
    marginTop: 3,
    fontSize: 12,
    color: '#7A6F68',
  },

  productMetaActive: {
    color: '#F7EDE6',
  },

  packageWrap: {
    marginBottom: 10,
  },

  packageCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8DCD3',
    padding: 14,
    backgroundColor: '#FFF8F3',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  packageCardActive: {
    backgroundColor: '#8B5E4E',
    borderColor: '#8B5E4E',
  },

  packageName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#3B2A24',
  },

  packageNameActive: {
    color: '#FFFFFF',
  },

  packageMeta: {
    marginTop: 3,
    fontSize: 12,
    color: '#7A6F68',
  },

  packageMetaActive: {
    color: '#F7EDE6',
  },

  toggleCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#FFF8F3',
    borderWidth: 1,
    borderColor: '#E8DCD3',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  toggleCardActive: {
    backgroundColor: '#8B5E4E',
    borderColor: '#8B5E4E',
  },

  toggleIcon: {
    width: 30,
    alignItems: 'center',
  },

  toggleTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#3B2A24',
  },

  toggleTitleActive: {
    color: '#FFFFFF',
  },

  toggleSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: '#7A6F68',
    lineHeight: 17,
  },

  toggleSubtitleActive: {
    color: '#F7EDE6',
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
    backgroundColor: '#8B5E4E',
    borderColor: '#8B5E4E',
  },

  summaryLabel: {
    color: '#7A6F68',
    fontSize: 12,
    fontWeight: '700',
  },

  summaryLabelStrong: {
    color: '#F7EDE6',
    fontWeight: '800',
  },

  summaryValue: {
    marginTop: 4,
    color: '#3B2A24',
    fontSize: 20,
    fontWeight: '900',
  },

  summaryValueStrong: {
    color: '#FFFFFF',
    fontSize: 25,
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

searchResultsBox: {
  marginTop: -4,
  marginBottom: 12,
  borderRadius: 16,
  backgroundColor: '#FFF8F3',
  borderWidth: 1,
  borderColor: '#E8DCD3',
  overflow: 'hidden',
},

searchResultItem: {
  padding: 12,
  borderBottomWidth: 1,
  borderBottomColor: '#EFE3DA',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
},

searchResultName: {
  color: '#3B2A24',
  fontSize: 14,
  fontWeight: '900',
},

searchResultMeta: {
  marginTop: 2,
  color: '#7A6F68',
  fontSize: 12,
},

selectedClientBox: {
  marginBottom: 12,
  padding: 12,
  borderRadius: 16,
  backgroundColor: '#F7EDE6',
  borderWidth: 1,
  borderColor: '#E8DCD3',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
},

selectedClientLabel: {
  color: '#7A6F68',
  fontSize: 12,
  fontWeight: '700',
},

selectedClientName: {
  marginTop: 2,
  color: '#3B2A24',
  fontSize: 15,
  fontWeight: '900',
},


});