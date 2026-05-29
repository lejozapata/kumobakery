import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Alert,
  Image,
  KeyboardAvoidingView,
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
import * as ImagePicker from 'expo-image-picker';

import {
  actualizarInsumo,
  crearInsumo,
  obtenerInsumoPorId,
} from '../database/db';

const UNIDADES = ['g', 'kg', 'ml', 'L', 'unidad', 'docena'];
const CATEGORIAS = ['Secos', 'Refrigerados', 'Saborizantes', 'Empaques', 'Otro'];

const inicial = {
  nombre: '',
  categoria: 'Secos',
  unidad_medida: 'g',
  cantidad_actual: '',
  cantidad_minima: '',
  costo_total_compra: '',
  cantidad_compra: '',
  proveedor: '',
  fecha_vencimiento: '',
  notas: '',
  foto_uri: '',
};

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

  const partes = valor.split('/');

  if (partes.length === 3) {
    const [dia, mes, anio] = partes;
    return new Date(Number(anio), Number(mes) - 1, Number(dia));
  }

  return new Date();
}

export default function FormularioInsumoScreen({ navigation, route }) {
  const insumoId = route?.params?.insumoId;
  const editando = Boolean(insumoId);

  const [form, setForm] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  const [hayCambios, setHayCambios] = useState(false);
  const [guardandoRef, setGuardandoRef] = useState(false);
  const [mostrarPickerFecha, setMostrarPickerFecha] = useState(false);

  const costoPorUnidad = useMemo(() => {
    const total = Number(String(form.costo_total_compra).replace(',', '.')) || 0;
    const cantidad = Number(String(form.cantidad_compra).replace(',', '.')) || 0;

    if (!total || !cantidad || cantidad <= 0) return 0;

    return total / cantidad;
  }, [form.costo_total_compra, form.cantidad_compra]);

  const setCampo = (campo, valor) => {
    setForm((prev) => ({
      ...prev,
      [campo]: valor,
    }));

    setHayCambios(true);
  };

  useEffect(() => {
    async function cargar() {
      if (!insumoId) return;

      const data = await obtenerInsumoPorId(insumoId);

      if (!data) return;

      setForm({
        nombre: data.nombre || '',
        categoria: data.categoria || 'Secos',
        unidad_medida: data.unidad_medida || 'g',
        cantidad_actual: String(data.cantidad_actual ?? ''),
        cantidad_minima: String(data.cantidad_minima ?? ''),
        costo_total_compra: String(data.costo_total_compra ?? ''),
        cantidad_compra: String(data.cantidad_compra ?? ''),
        proveedor: data.proveedor || '',
        fecha_vencimiento: data.fecha_vencimiento || '',
        notas: data.notas || '',
        foto_uri: data.foto_uri || '',
      });

      setHayCambios(false);
    }

    cargar();
  }, [insumoId]);

  useEffect(() => {
    const sub = navigation.addListener('beforeRemove', (e) => {
      if (!hayCambios || guardandoRef) return;

      e.preventDefault();

      Alert.alert(
        'Salir sin guardar',
        'Tienes cambios sin guardar. ¿Quieres salir y descartarlos?',
        [
          { text: 'Seguir editando', style: 'cancel' },
          {
            text: 'Salir',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });

    return sub;
  }, [navigation, hayCambios, guardandoRef]);

  async function seleccionarFoto() {
    const permisoGaleria =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    const permisoCamara =
      await ImagePicker.requestCameraPermissionsAsync();

    if (!permisoGaleria.granted || !permisoCamara.granted) {
      Alert.alert(
        'Permisos requeridos',
        'Necesitamos acceso a la galería y a la cámara.'
      );
      return;
    }

    Alert.alert(
      'Foto del insumo',
      '¿Qué deseas hacer?',
      [
        {
          text: 'Tomar foto',
          onPress: async () => {
            const resultado = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.85,
            });

            if (!resultado.canceled) {
              setCampo('foto_uri', resultado.assets[0].uri);
            }
          },
        },
        {
          text: 'Elegir de galería',
          onPress: async () => {
            const resultado = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.85,
            });

            if (!resultado.canceled) {
              setCampo('foto_uri', resultado.assets[0].uri);
            }
          },
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]
    );
  }

  const validar = () => {
    if (!form.nombre.trim()) {
      Alert.alert('Falta información', 'El nombre del insumo es obligatorio.');
      return false;
    }

    return true;
  };

  const guardar = useCallback(async () => {
    if (!validar()) return;

    try {
      setGuardando(true);
      setGuardandoRef(true);

      const payload = {
        ...form,
        cantidad_actual: normalizarNumero(form.cantidad_actual),
        cantidad_minima: normalizarNumero(form.cantidad_minima),
        costo_total_compra: normalizarNumero(form.costo_total_compra),
        cantidad_compra: normalizarNumero(form.cantidad_compra),
      };

      if (editando) {
        await actualizarInsumo(insumoId, payload);
      } else {
        await crearInsumo(payload);
      }

      setHayCambios(false);
      navigation.goBack();
    } catch (error) {
      console.error('Error guardando insumo:', error);
      Alert.alert('Error', 'No fue posible guardar el insumo.');
    } finally {
      setGuardando(false);
      setGuardandoRef(false);
    }
  }, [editando, form, insumoId, navigation]);

  const seleccionarFecha = (event, selectedDate) => {
    setMostrarPickerFecha(false);

    if (!selectedDate) return;

    setCampo('fecha_vencimiento', formatearFecha(selectedDate));
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.iconButton}
          >
            <Ionicons name="chevron-back" size={26} color="#3B2A24" />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>
              {editando ? 'Editar insumo' : 'Nuevo insumo'}
            </Text>

            <Text style={styles.subtitle}>
              Define inventario y costo base
            </Text>
          </View>

          <Pressable
            style={styles.saveButton}
            onPress={guardar}
            disabled={guardando}
          >
            <Text style={styles.saveButtonText}>
              {guardando ? '...' : 'Guardar'}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <Section title="Foto del insumo">
            <View style={styles.photoRow}>
              {form.foto_uri ? (
                <Image
                  source={{ uri: form.foto_uri }}
                  style={styles.photoPreview}
                />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons
                    name="image-outline"
                    size={34}
                    color="#8B5E4E"
                  />
                </View>
              )}

              <View style={{ flex: 1 }}>
                <Pressable
                  style={styles.photoButton}
                  onPress={seleccionarFoto}
                >
                  <Ionicons
                    name="camera-outline"
                    size={18}
                    color="#FFFFFF"
                  />

                  <Text style={styles.photoButtonText}>
                    {form.foto_uri ? 'Cambiar foto' : 'Tomar o subir foto'}
                  </Text>
                </Pressable>

                {form.foto_uri ? (
                  <Pressable
                    style={styles.removePhotoButton}
                    onPress={() => setCampo('foto_uri', '')}
                  >
                    <Text style={styles.removePhotoText}>
                      Quitar foto
                    </Text>
                  </Pressable>
                ) : null}

                <Text style={styles.photoHint}>
                  Opcional. Ayuda a identificar rápido el ingrediente.
                </Text>
              </View>
            </View>
          </Section>

          <Section title="Información general">
            <Input
              label="Nombre del insumo"
              value={form.nombre}
              onChangeText={(v) => setCampo('nombre', v)}
              placeholder="Harina de trigo"
            />

            <Text style={styles.label}>Categoría</Text>

            <View style={styles.chipsGrid}>
              {CATEGORIAS.map((categoria) => {
                const activo =
                  form.categoria === categoria ||
                  (
                    categoria === 'Otro' &&
                    !CATEGORIAS.includes(form.categoria)
                  );

                return (
                  <Pressable
                    key={categoria}
                    style={[
                      styles.chip,
                      activo && styles.chipActive,
                    ]}
                    onPress={() => {
                      if (categoria === 'Otro') {
                        setCampo('categoria', '');
                      } else {
                        setCampo('categoria', categoria);
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        activo && styles.chipTextActive,
                      ]}
                    >
                      {categoria}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {!CATEGORIAS.includes(form.categoria) && (
              <Input
                label="Escribe la categoría"
                value={form.categoria}
                onChangeText={(v) => setCampo('categoria', v)}
                placeholder="Ej: Decoración"
              />
            )}

            <Input
              label="Proveedor"
              value={form.proveedor}
              onChangeText={(v) => setCampo('proveedor', v)}
              placeholder="Opcional"
            />
          </Section>

          <Section title="Unidad de medida">
            <View style={styles.chipsGrid}>
              {UNIDADES.map((unidad) => {
                const activo = form.unidad_medida === unidad;

                return (
                  <Pressable
                    key={unidad}
                    style={[
                      styles.chip,
                      activo && styles.chipActive,
                    ]}
                    onPress={() => setCampo('unidad_medida', unidad)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        activo && styles.chipTextActive,
                      ]}
                    >
                      {unidad}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Section>

          <Section title="Inventario">
            <View style={styles.row}>
              <Input
                half
                label="Cantidad actual"
                value={form.cantidad_actual}
                onChangeText={(v) => setCampo('cantidad_actual', v)}
                keyboardType="decimal-pad"
              />

              <Input
                half
                label="Cantidad mínima"
                value={form.cantidad_minima}
                onChangeText={(v) => setCampo('cantidad_minima', v)}
                keyboardType="decimal-pad"
              />
            </View>

            <Text style={styles.helperText}>
              La cantidad mínima sirve para avisarte cuando el insumo esté bajo.
            </Text>

            <Text style={styles.label}>Fecha de vencimiento</Text>

            <Pressable
              style={styles.dateButton}
              onPress={() => setMostrarPickerFecha(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#7A6F68" />

              <Text style={styles.dateButtonText}>
                {form.fecha_vencimiento || 'Seleccionar fecha'}
              </Text>
            </Pressable>

            {mostrarPickerFecha && (
              <DateTimePicker
                value={fechaDesdeTexto(form.fecha_vencimiento)}
                mode="date"
                display="default"
                onChange={seleccionarFecha}
              />
            )}
          </Section>

          <Section title="Costo de compra">
            <Input
              label="Costo total de compra"
              value={form.costo_total_compra}
              onChangeText={(v) => setCampo('costo_total_compra', v)}
              keyboardType="decimal-pad"
              placeholder="Ej: 8500"
            />

            <Input
              label={`Cantidad comprada (${form.unidad_medida})`}
              value={form.cantidad_compra}
              onChangeText={(v) => setCampo('cantidad_compra', v)}
              keyboardType="decimal-pad"
              placeholder="Ej: 1000"
            />

            <View style={styles.costCard}>
              <Text style={styles.costLabel}>
                Costo calculado por {form.unidad_medida}
              </Text>

              <Text style={styles.costValue}>
                {COP.format(costoPorUnidad || 0)}
              </Text>
            </View>
          </Section>

          <Section title="Notas">
            <Input
              multiline
              label="Notas internas"
              value={form.notas}
              onChangeText={(v) => setCampo('notas', v)}
              placeholder="Marca, observaciones, calidad, equivalencias..."
            />
          </Section>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function normalizarNumero(valor) {
  if (valor === undefined || valor === null || valor === '') return 0;

  return Number(String(valor).replace(',', '.')) || 0;
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F3',
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EFE3DA',
  },

  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#3B2A24',
  },

  subtitle: {
    fontSize: 13,
    color: '#7A6F68',
    marginTop: 2,
  },

  saveButton: {
    paddingHorizontal: 16,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#8B5E4E',
    alignItems: 'center',
    justifyContent: 'center',
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  content: {
    padding: 18,
    paddingBottom: 50,
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
    fontWeight: '800',
    color: '#3B2A24',
    marginBottom: 12,
  },

  photoRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },

  photoPreview: {
    width: 82,
    height: 82,
    borderRadius: 22,
    backgroundColor: '#F1E1D6',
  },

  photoPlaceholder: {
    width: 82,
    height: 82,
    borderRadius: 22,
    backgroundColor: '#F1E1D6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  photoButton: {
    minHeight: 44,
    borderRadius: 18,
    backgroundColor: '#8B5E4E',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
  },

  photoButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  removePhotoButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },

  removePhotoText: {
    color: '#9B2C2C',
    fontWeight: '700',
  },

  photoHint: {
    marginTop: 6,
    color: '#8A7D75',
    fontSize: 12,
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
    fontWeight: '600',
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

  row: {
    flexDirection: 'row',
    gap: 10,
  },

  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },

  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: '#FFF8F3',
    borderWidth: 1,
    borderColor: '#E8DCD3',
  },

  chipActive: {
    backgroundColor: '#8B5E4E',
    borderColor: '#8B5E4E',
  },

  chipText: {
    color: '#7A6F68',
    fontWeight: '800',
  },

  chipTextActive: {
    color: '#FFFFFF',
  },

  helperText: {
    marginTop: -2,
    marginBottom: 12,
    fontSize: 12,
    color: '#8A7D75',
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
  },

  dateButtonText: {
    color: '#3B2A24',
    fontSize: 15,
  },

  costCard: {
    marginTop: 4,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#F7EDE6',
  },

  costLabel: {
    color: '#7A6F68',
    fontSize: 13,
    fontWeight: '600',
  },

  costValue: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: '900',
    color: '#3B2A24',
  },
});