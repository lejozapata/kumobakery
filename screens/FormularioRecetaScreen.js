import { useEffect, useMemo, useRef, useState } from 'react';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';

import {
  crearReceta,
  obtenerRecetaPorId,
  actualizarReceta,
} from '../database/db';

const CONSERVACIONES = [
  {
    id: 'Ambiente',
    nombre: 'Ambiente',
    descripcion: 'Producto conservado a temperatura ambiente, protegido de humedad y calor.',
  },
  {
    id: 'Refrigerado',
    nombre: 'Refrigerado',
    descripcion: 'Producto que debe mantenerse en nevera.',
  },
  {
    id: 'Congelado',
    nombre: 'Congelado',
    descripcion: 'Producto almacenado congelado para extender conservación.',
  },
  {
    id: 'Otro',
    nombre: 'Otro',
    descripcion: 'Define una condición específica.',
  },
];

const TIPOS_VIDA_UTIL = [
  {
    id: 'galleta_seca',
    nombre: 'Galleta / alfajor seco',
    conservacion: 'Ambiente',
    dias: 7,
    descripcion:
      'Producto horneado, seco, sin fruta fresca ni crema perecedera.',
  },
  {
    id: 'brownie',
    nombre: 'Brownie / blondie',
    conservacion: 'Ambiente',
    dias: 4,
    descripcion:
      'Producto húmedo, pero sin crema o lácteos frescos.',
  },
  {
    id: 'torta_simple',
    nombre: 'Torta simple',
    conservacion: 'Ambiente',
    dias: 3,
    descripcion:
      'Bizcocho sin rellenos perecederos.',
  },
  {
    id: 'fruta_fresca',
    nombre: 'Con fruta fresca',
    conservacion: 'Refrigerado',
    dias: 2,
    descripcion:
      'Producto con fruta fresca o alta humedad.',
  },
  {
    id: 'crema_lacteo',
    nombre: 'Crema / queso / chantilly',
    conservacion: 'Refrigerado',
    dias: 3,
    descripcion:
      'Producto con ingredientes perecederos. Mantener refrigerado.',
  },
  {
    id: 'congelado',
    nombre: 'Congelado',
    conservacion: 'Congelado',
    dias: 30,
    descripcion:
      'Vida útil estimada por calidad, no por seguridad absoluta.',
  },
  {
    id: 'manual',
    nombre: 'Manual',
    conservacion: '',
    dias: 0,
    descripcion:
      'Define los días según experiencia de Sara.',
  },
];


function parseIngredientes(valor) {
  try {
    const data = JSON.parse(valor || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function obtenerTipoVidaUtil(id) {
  return (
    TIPOS_VIDA_UTIL.find((item) => item.id === id) ||
    TIPOS_VIDA_UTIL[0]
  );
}

export default function FormularioRecetaScreen({ navigation, route }) {
  const recetaId = route?.params?.recetaId || null;
  const modoEdicion = Boolean(recetaId);

  const guardandoRef = useRef(false);

  const [hayCambios, setHayCambios] = useState(false);

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');

  const [tiempoPreparacion, setTiempoPreparacion] = useState('');
  const [tiempoCoccion, setTiempoCoccion] = useState('');
  const [tiempoReposo, setTiempoReposo] = useState('');
  const [temperaturaHorneado, setTemperaturaHorneado] = useState('');

  const [rendimiento, setRendimiento] = useState('');
  const [equipoCocina, setEquipoCocina] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  const [fotoUri, setFotoUri] = useState('');

  const [nuevoIngrediente, setNuevoIngrediente] = useState('');
  const [ingredientes, setIngredientes] = useState([]);

  const [instrucciones, setInstrucciones] = useState('');

  const [tipoVidaUtil, setTipoVidaUtil] = useState('galleta_seca');
  const [conservacion, setConservacion] = useState('Ambiente');
  const [vidaUtilDias, setVidaUtilDias] = useState('7');
  const [mostrarSelectorVidaUtil, setMostrarSelectorVidaUtil] = useState(false);
  const [mostrarSelectorConservacion, setMostrarSelectorConservacion] = useState(false);
  const [conservacionPersonalizada, setConservacionPersonalizada] = useState('');

  function marcarCambio() {
    setHayCambios(true);
  }

  function seleccionarTipoVidaUtil(tipo) {
    setTipoVidaUtil(tipo.id);

    if (tipo.conservacion) {
      setConservacion(tipo.conservacion);
      setConservacionPersonalizada('');
    }

    setVidaUtilDias(String(tipo.dias || ''));
    marcarCambio();
  }

  useEffect(() => {
    if (!modoEdicion) return;

    const receta = obtenerRecetaPorId(recetaId);

    if (!receta) {
      Alert.alert('Error', 'No se encontró la receta.');
      navigation.goBack();
      return;
    }

    setNombre(receta.nombre || '');
    setDescripcion(receta.descripcion || '');
    setTiempoPreparacion(String(receta.tiempo_preparacion_min || ''));
    setTiempoCoccion(String(receta.tiempo_coccion_min || ''));
    setTiempoReposo(String(receta.tiempo_reposo_min || ''));
    setTemperaturaHorneado(String(receta.temperatura_horneado_c || ''));
    setRendimiento(receta.rendimiento || '');
    setEquipoCocina(receta.equipo_cocina || '');
    setVideoUrl(receta.video_url || '');
    setFotoUri(receta.foto_uri || '');
    setIngredientes(parseIngredientes(receta.ingredientes));
    setInstrucciones(receta.instrucciones || '');

    const tipoGuardado =
      receta.tipo_vida_util || 'manual';

    const conservacionFinal =
      conservacion === 'Otro'
        ? conservacionPersonalizada.trim()
        : conservacion;

    const tipo = obtenerTipoVidaUtil(tipoGuardado);

    setTipoVidaUtil(tipoGuardado);
    const conservacionGuardada = receta.conservacion || tipo.conservacion || 'Ambiente';

      if (
        conservacionGuardada === 'Ambiente' ||
        conservacionGuardada === 'Refrigerado' ||
        conservacionGuardada === 'Congelado'
      ) {
        setConservacion(conservacionGuardada);
        setConservacionPersonalizada('');
      } else {
        setConservacion('Otro');
        setConservacionPersonalizada(conservacionGuardada);
      }
    setVidaUtilDias(
      String(
        receta.vida_util_dias ??
          tipo.dias ??
          ''
      )
    );

    setHayCambios(false);
  }, [modoEdicion, recetaId, navigation]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (!hayCambios || guardandoRef.current) {
        return;
      }

      event.preventDefault();

      Alert.alert(
        'Salir sin guardar',
        'Tienes cambios sin guardar. ¿Seguro que deseas salir?',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Salir',
            style: 'destructive',
            onPress: () => {
              guardandoRef.current = true;
              navigation.dispatch(event.data.action);
            },
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation, hayCambios]);

  const tiempoTotal = useMemo(() => {
    const preparacion = Number(tiempoPreparacion) || 0;
    const coccion = Number(tiempoCoccion) || 0;
    const reposo = Number(tiempoReposo) || 0;

    return preparacion + coccion + reposo;
  }, [tiempoPreparacion, tiempoCoccion, tiempoReposo]);

  const tipoSeleccionado = useMemo(() => {
    return obtenerTipoVidaUtil(tipoVidaUtil);
  }, [tipoVidaUtil]);

  async function seleccionarFoto() {
    const permisoGaleria =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    const permisoCamara =
      await ImagePicker.requestCameraPermissionsAsync();

    if (!permisoGaleria.granted || !permisoCamara.granted) {
      Alert.alert(
        'Permisos requeridos',
        'Necesitamos acceso a galería y cámara.'
      );
      return;
    }

    Alert.alert(
      'Foto de receta',
      '¿Qué deseas hacer?',
      [
        {
          text: 'Tomar foto',
          onPress: async () => {
            const resultado = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.85,
            });

            if (!resultado.canceled) {
              setFotoUri(resultado.assets[0].uri);
              marcarCambio();
            }
          },
        },
        {
          text: 'Elegir de galería',
          onPress: async () => {
            const resultado = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.85,
            });

            if (!resultado.canceled) {
              setFotoUri(resultado.assets[0].uri);
              marcarCambio();
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

  function agregarIngrediente() {
    const texto = nuevoIngrediente.trim();

    if (texto === '') return;

    const ingrediente = {
      id: Date.now().toString(),
      texto,
    };

    setIngredientes([...ingredientes, ingrediente]);
    setNuevoIngrediente('');
    marcarCambio();
  }

  function eliminarIngrediente(id) {
    setIngredientes(
      ingredientes.filter((ingrediente) => ingrediente.id !== id)
    );
    marcarCambio();
  }


  function obtenerConservacionFinal() {
  if (conservacion === 'Otro') {
    return conservacionPersonalizada.trim();
  }

  return conservacion;
}

  function guardarReceta() {
    if (nombre.trim() === '') {
      Alert.alert('Campo requerido', 'Ingresa el nombre de la receta.');
      return;
    }

    const diasVidaUtil = Number(String(vidaUtilDias).replace(',', '.')) || 0;
    const conservacionFinal = obtenerConservacionFinal();

    if (diasVidaUtil <= 0) {
      Alert.alert(
        'Vida útil requerida',
        'Define los días de vida útil sugerida para esta receta.'
      );
      return;
    }

    if (!conservacionFinal) {
      Alert.alert(
        'Conservación requerida',
        'Selecciona o escribe la forma de conservación de esta receta.'
      );
      return;
    }

    const receta = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      tiempo_preparacion_min: Number(tiempoPreparacion) || 0,
      tiempo_coccion_min: Number(tiempoCoccion) || 0,
      tiempo_reposo_min: Number(tiempoReposo) || 0,
      tiempo_total_min: tiempoTotal,
      temperatura_horneado_c: Number(temperaturaHorneado) || 0,
      rendimiento: rendimiento.trim(),
      ingredientes: JSON.stringify(ingredientes),
      instrucciones: instrucciones.trim(),
      equipo_cocina: equipoCocina.trim(),
      foto_uri: fotoUri,
      video_url: videoUrl.trim(),
      vida_util_dias: diasVidaUtil,
      conservacion: conservacionFinal,
      tipo_vida_util: tipoVidaUtil,
    };

    guardandoRef.current = true;

    if (modoEdicion) {
      actualizarReceta(recetaId, receta);

      Alert.alert(
        'Receta actualizada',
        'Los cambios fueron guardados correctamente.'
      );
    } else {
      crearReceta(receta);

      Alert.alert(
        'Receta guardada',
        'La receta fue creada correctamente.'
      );
    }

    setHayCambios(false);
    navigation.goBack();
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionTitle}>Foto principal</Text>

        <TouchableOpacity
          style={styles.photoBox}
          onPress={seleccionarFoto}
          activeOpacity={0.85}
        >
          {fotoUri ? (
            <Image source={{ uri: fotoUri }} style={styles.photoPreview} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoIcon}>📷</Text>
              <Text style={styles.photoText}>Elegir foto de la receta</Text>
              <Text style={styles.photoHint}>
                Ideal para identificarla rápido en el catálogo
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {fotoUri ? (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={seleccionarFoto}
          >
            <Text style={styles.secondaryButtonText}>Cambiar foto</Text>
          </TouchableOpacity>
        ) : null}

        <Text style={styles.sectionTitle}>Información general</Text>

        <Text style={styles.label}>Nombre de la receta</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Cheesecake de Oreo"
          value={nombre}
          onChangeText={(texto) => {
            setNombre(texto);
            marcarCambio();
          }}
        />

        <Text style={styles.label}>Descripción</Text>
        <TextInput
          style={styles.textAreaSmall}
          multiline
          placeholder="Una descripción breve de la receta"
          value={descripcion}
          onChangeText={(texto) => {
            setDescripcion(texto);
            marcarCambio();
          }}
        />

        <Text style={styles.sectionTitle}>Tiempos y horneado</Text>

        <View style={styles.timeGrid}>
          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>Preparación</Text>
            <TextInput
              style={styles.timeInput}
              placeholder="0"
              keyboardType="numeric"
              value={tiempoPreparacion}
              onChangeText={(texto) => {
                setTiempoPreparacion(texto);
                marcarCambio();
              }}
            />
            <Text style={styles.timeUnit}>min</Text>
          </View>

          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>Cocción</Text>
            <TextInput
              style={styles.timeInput}
              placeholder="0"
              keyboardType="numeric"
              value={tiempoCoccion}
              onChangeText={(texto) => {
                setTiempoCoccion(texto);
                marcarCambio();
              }}
            />
            <Text style={styles.timeUnit}>min</Text>
          </View>

          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>Reposo</Text>
            <TextInput
              style={styles.timeInput}
              placeholder="0"
              keyboardType="numeric"
              value={tiempoReposo}
              onChangeText={(texto) => {
                setTiempoReposo(texto);
                marcarCambio();
              }}
            />
            <Text style={styles.timeUnit}>min</Text>
          </View>
        </View>

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Tiempo total</Text>
          <Text style={styles.totalValue}>{tiempoTotal} min</Text>
        </View>

        <Text style={styles.label}>Temperatura de horneado</Text>
        <View style={styles.temperatureCard}>
          <TextInput
            style={styles.temperatureInput}
            placeholder="180"
            keyboardType="numeric"
            value={temperaturaHorneado}
            onChangeText={(texto) => {
              setTemperaturaHorneado(texto);
              marcarCambio();
            }}
          />
          <Text style={styles.temperatureUnit}>°C</Text>
        </View>

        <Text style={styles.sectionTitle}>Rendimiento</Text>

        <Text style={styles.label}>Porciones o unidades</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: 12 alfajores / 8 porciones"
          value={rendimiento}
          onChangeText={(texto) => {
            setRendimiento(texto);
            marcarCambio();
          }}
        />

        <Text style={styles.sectionTitle}>Vida útil sugerida</Text>

        <View style={styles.lifeInfoCard}>
          <Text style={styles.lifeInfoTitle}>
            Estimación conservadora
          </Text>

          <Text style={styles.lifeInfoText}>
            Esta vida útil es una guía operativa para producción casera. Puede ajustarse con la experiencia de Sara y no reemplaza pruebas técnicas de laboratorio.
          </Text>
        </View>

        <TouchableOpacity
  style={styles.lifeDropdown}
  activeOpacity={0.85}
  onPress={() => setMostrarSelectorVidaUtil(true)}
>
  <View style={{ flex: 1 }}>
    <Text style={styles.lifeDropdownLabel}>Tipo de producto</Text>

    <Text style={styles.lifeDropdownTitle}>
      {tipoSeleccionado.nombre}
    </Text>

    <Text style={styles.lifeDropdownMeta}>
      {conservacion || 'Sin conservación'} · {vidaUtilDias || 0} días
    </Text>
  </View>

  <Text style={styles.lifeDropdownIcon}>⌄</Text>
</TouchableOpacity>

<Modal
  visible={mostrarSelectorVidaUtil}
  transparent
  animationType="fade"
  onRequestClose={() => setMostrarSelectorVidaUtil(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalCard}>
      <Text style={styles.modalTitle}>Tipo de vida útil</Text>

      <Text style={styles.modalSubtitle}>
        Selecciona una base y luego ajusta los días si lo necesitas.
      </Text>

      <ScrollView style={{ maxHeight: 420 }}>
        {TIPOS_VIDA_UTIL.map((tipo) => {
          const activo = tipoVidaUtil === tipo.id;

          return (
            <TouchableOpacity
              key={tipo.id}
              style={[
                styles.modalOption,
                activo && styles.modalOptionActive,
              ]}
              activeOpacity={0.85}
              onPress={() => {
                seleccionarTipoVidaUtil(tipo);
                setMostrarSelectorVidaUtil(false);
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.modalOptionTitle,
                    activo && styles.modalOptionTitleActive,
                  ]}
                >
                  {tipo.nombre}
                </Text>

                <Text
                  style={[
                    styles.modalOptionMeta,
                    activo && styles.modalOptionMetaActive,
                  ]}
                >
                  {tipo.conservacion || 'Conservación manual'} · {tipo.dias || 'Manual'} días sugeridos
                </Text>

                <Text
                  style={[
                    styles.modalOptionDescription,
                    activo && styles.modalOptionDescriptionActive,
                  ]}
                >
                  {tipo.descripcion}
                </Text>
              </View>

              {activo && (
                <Text style={styles.modalCheck}>✓</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity
        style={styles.modalCloseButton}
        onPress={() => setMostrarSelectorVidaUtil(false)}
      >
        <Text style={styles.modalCloseText}>Cerrar</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>

    <Modal
      visible={mostrarSelectorConservacion}
      transparent
      animationType="fade"
      onRequestClose={() => setMostrarSelectorConservacion(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Conservación</Text>

          <Text style={styles.modalSubtitle}>
            Selecciona cómo debe conservarse este producto.
          </Text>

          {CONSERVACIONES.map((item) => {
            const activo = conservacion === item.id;

            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.modalOption,
                  activo && styles.modalOptionActive,
                ]}
                activeOpacity={0.85}
                onPress={() => {
                  setConservacion(item.id);

                  if (item.id !== 'Otro') {
                    setConservacionPersonalizada('');
                  }

                  setMostrarSelectorConservacion(false);
                  marcarCambio();
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.modalOptionTitle,
                      activo && styles.modalOptionTitleActive,
                    ]}
                  >
                    {item.nombre}
                  </Text>

                  <Text
                    style={[
                      styles.modalOptionDescription,
                      activo && styles.modalOptionDescriptionActive,
                    ]}
                  >
                    {item.descripcion}
                  </Text>
                </View>

                {activo && (
                  <Text style={styles.modalCheck}>✓</Text>
                )}
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setMostrarSelectorConservacion(false)}
          >
            <Text style={styles.modalCloseText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

        <Text style={styles.label}>Conservación</Text>

          <TouchableOpacity
            style={styles.lifeDropdown}
            activeOpacity={0.85}
            onPress={() => setMostrarSelectorConservacion(true)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.lifeDropdownLabel}>Tipo de conservación</Text>

              <Text style={styles.lifeDropdownTitle}>
                {conservacion === 'Otro'
                  ? conservacionPersonalizada || 'Otro'
                  : conservacion}
              </Text>
            </View>

            <Text style={styles.lifeDropdownIcon}>⌄</Text>
          </TouchableOpacity>

          {conservacion === 'Otro' && (
            <>
              <Text style={styles.label}>Especificar conservación</Text>

              <TextInput
                style={styles.input}
                placeholder="Ej: ambiente en recipiente hermético"
                value={conservacionPersonalizada}
                onChangeText={(texto) => {
                  setConservacionPersonalizada(texto);
                  marcarCambio();
                }}
              />
            </>
          )}

        <Text style={styles.label}>Días de vida útil sugerida</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: 7"
          keyboardType="numeric"
          value={vidaUtilDias}
          onChangeText={(texto) => {
            setVidaUtilDias(texto);
            marcarCambio();
          }}
        />

        <View style={styles.lifeSummaryCard}>
          <Text style={styles.lifeSummaryLabel}>
            Configuración actual
          </Text>

          <Text style={styles.lifeSummaryValue}>
            {conservacion || 'Sin conservación'} · {vidaUtilDias || 0} días
          </Text>

          <Text style={styles.lifeSummaryHint}>
            Tipo: {tipoSeleccionado.nombre}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Ingredientes</Text>

        <View style={styles.addRow}>
          <TextInput
            style={styles.ingredientInput}
            placeholder="Ej: 250 g de harina"
            value={nuevoIngrediente}
            onChangeText={setNuevoIngrediente}
            onSubmitEditing={agregarIngrediente}
          />

          <TouchableOpacity
            style={styles.addSmallButton}
            onPress={agregarIngrediente}
          >
            <Text style={styles.addSmallButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        {ingredientes.length === 0 ? (
          <Text style={styles.helperText}>
            Agrega los ingredientes uno por uno.
          </Text>
        ) : (
          <View style={styles.ingredientsList}>
            {ingredientes.map((ingrediente) => (
              <View key={ingrediente.id} style={styles.ingredientChip}>
                <Text style={styles.ingredientText}>
                  {ingrediente.texto}
                </Text>

                <TouchableOpacity
                  onPress={() => eliminarIngrediente(ingrediente.id)}
                >
                  <Text style={styles.removeText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Instrucciones</Text>

        <TextInput
          style={styles.textAreaLarge}
          multiline
          placeholder="Describe los pasos de preparación"
          value={instrucciones}
          onChangeText={(texto) => {
            setInstrucciones(texto);
            marcarCambio();
          }}
        />

        <Text style={styles.sectionTitle}>Apoyo en cocina</Text>

        <Text style={styles.label}>Equipo de cocina</Text>
        <TextInput
          style={styles.textAreaSmall}
          multiline
          placeholder="Ej: Batidora, horno, molde redondo, espátula..."
          value={equipoCocina}
          onChangeText={(texto) => {
            setEquipoCocina(texto);
            marcarCambio();
          }}
        />

        <Text style={styles.label}>Video de referencia</Text>
        <TextInput
          style={styles.input}
          placeholder="Link de Instagram, TikTok o YouTube"
          value={videoUrl}
          onChangeText={(texto) => {
            setVideoUrl(texto);
            marcarCambio();
          }}
          autoCapitalize="none"
        />

        <TouchableOpacity style={styles.button} onPress={guardarReceta}>
          <Text style={styles.buttonText}>
            {modoEdicion ? 'Actualizar receta' : 'Guardar receta'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },

  container: {
    flex: 1,
    backgroundColor: '#fff7f5',
  },

  content: {
    padding: 20,
    paddingBottom: 140,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#7a4a3a',
    marginTop: 14,
    marginBottom: 14,
  },

  photoBox: {
    backgroundColor: 'white',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#ead0c3',
    overflow: 'hidden',
    minHeight: 210,
    marginBottom: 12,
    elevation: 3,
  },

  photoPreview: {
    width: '100%',
    height: 230,
  },

  photoPlaceholder: {
    minHeight: 210,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  photoIcon: {
    fontSize: 42,
    marginBottom: 10,
  },

  photoText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#7a4a3a',
    marginBottom: 6,
  },

  photoHint: {
    fontSize: 14,
    color: '#9b7b70',
    textAlign: 'center',
  },

  secondaryButton: {
    backgroundColor: '#f1ddd4',
    padding: 13,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 8,
  },

  secondaryButtonText: {
    color: '#7a4a3a',
    fontWeight: '800',
    fontSize: 15,
  },

  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4a2f27',
    marginBottom: 8,
  },

  input: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ead0c3',
    marginBottom: 14,
    fontSize: 16,
  },

  textAreaSmall: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ead0c3',
    marginBottom: 14,
    minHeight: 95,
    textAlignVertical: 'top',
    fontSize: 16,
  },

  textAreaLarge: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ead0c3',
    marginBottom: 14,
    minHeight: 180,
    textAlignVertical: 'top',
    fontSize: 16,
  },

  timeGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },

  timeBox: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ead0c3',
    padding: 12,
    alignItems: 'center',
  },

  timeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7a4a3a',
    marginBottom: 6,
    textAlign: 'center',
  },

  timeInput: {
    fontSize: 22,
    fontWeight: '800',
    color: '#4a2f27',
    textAlign: 'center',
    width: '100%',
    paddingVertical: 4,
  },

  timeUnit: {
    fontSize: 12,
    color: '#9b7b70',
  },

  totalCard: {
    backgroundColor: '#7a4a3a',
    padding: 18,
    borderRadius: 18,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  totalLabel: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },

  totalValue: {
    color: 'white',
    fontSize: 24,
    fontWeight: '900',
  },

  temperatureCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ead0c3',
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  temperatureInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '900',
    color: '#4a2f27',
  },

  temperatureUnit: {
    fontSize: 22,
    fontWeight: '800',
    color: '#7a4a3a',
  },

  lifeInfoCard: {
    backgroundColor: '#FFF8F3',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ead0c3',
    padding: 14,
    marginBottom: 12,
  },

  lifeInfoTitle: {
    color: '#7a4a3a',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 5,
  },

  lifeInfoText: {
    color: '#8d6e63',
    fontSize: 13,
    lineHeight: 18,
  },

  lifeSummaryCard: {
    backgroundColor: '#7a4a3a',
    borderRadius: 18,
    padding: 15,
    marginBottom: 10,
  },

  lifeSummaryLabel: {
    color: '#f7e8e0',
    fontSize: 12,
    fontWeight: '800',
  },

  lifeSummaryValue: {
    color: 'white',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },

  lifeSummaryHint: {
    color: '#f7e8e0',
    fontSize: 12,
    marginTop: 4,
  },

  addRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },

  ingredientInput: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ead0c3',
    fontSize: 16,
  },

  addSmallButton: {
    width: 56,
    borderRadius: 16,
    backgroundColor: '#d9a58b',
    justifyContent: 'center',
    alignItems: 'center',
  },

  addSmallButtonText: {
    color: 'white',
    fontSize: 30,
    fontWeight: '800',
  },

  helperText: {
    color: '#9b7b70',
    marginBottom: 10,
    fontSize: 14,
  },

  ingredientsList: {
    marginBottom: 10,
  },

  ingredientChip: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ead0c3',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  ingredientText: {
    flex: 1,
    color: '#4a2f27',
    fontSize: 16,
  },

  removeText: {
    color: '#9b3c2f',
    fontSize: 26,
    fontWeight: '800',
    paddingLeft: 12,
  },

  button: {
    backgroundColor: '#d9a58b',
    padding: 18,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: 24,
  },

  buttonText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 16,
  },

  lifeDropdown: {
  backgroundColor: 'white',
  borderRadius: 18,
  borderWidth: 1,
  borderColor: '#ead0c3',
  padding: 15,
  marginBottom: 14,
  flexDirection: 'row',
  alignItems: 'center',
},

lifeDropdownLabel: {
  color: '#9b7b70',
  fontSize: 12,
  fontWeight: '800',
  marginBottom: 4,
},

lifeDropdownTitle: {
  color: '#4a2f27',
  fontSize: 17,
  fontWeight: '900',
},

lifeDropdownMeta: {
  color: '#7a4a3a',
  fontSize: 13,
  fontWeight: '800',
  marginTop: 4,
},

lifeDropdownIcon: {
  color: '#7a4a3a',
  fontSize: 28,
  fontWeight: '900',
  marginLeft: 12,
},

modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.35)',
  justifyContent: 'center',
  padding: 20,
},

modalCard: {
  backgroundColor: '#fff7f5',
  borderRadius: 24,
  padding: 18,
  maxHeight: '85%',
},

modalTitle: {
  color: '#4a2f27',
  fontSize: 22,
  fontWeight: '900',
},

modalSubtitle: {
  color: '#8d6e63',
  fontSize: 13,
  lineHeight: 18,
  marginTop: 4,
  marginBottom: 14,
},

modalOption: {
  backgroundColor: 'white',
  borderRadius: 18,
  borderWidth: 1,
  borderColor: '#ead0c3',
  padding: 14,
  marginBottom: 10,
  flexDirection: 'row',
  alignItems: 'center',
},

modalOptionActive: {
  backgroundColor: '#7a4a3a',
  borderColor: '#7a4a3a',
},

modalOptionTitle: {
  color: '#4a2f27',
  fontSize: 15,
  fontWeight: '900',
},

modalOptionTitleActive: {
  color: 'white',
},

modalOptionMeta: {
  color: '#8d6e63',
  fontSize: 12,
  fontWeight: '800',
  marginTop: 3,
},

modalOptionMetaActive: {
  color: '#f7e8e0',
},

modalOptionDescription: {
  color: '#9b7b70',
  fontSize: 12,
  marginTop: 5,
  lineHeight: 17,
},

modalOptionDescriptionActive: {
  color: '#f7e8e0',
},

modalCheck: {
  color: 'white',
  fontSize: 24,
  fontWeight: '900',
  marginLeft: 10,
},

modalCloseButton: {
  backgroundColor: '#d9a58b',
  padding: 14,
  borderRadius: 16,
  alignItems: 'center',
  marginTop: 8,
},

modalCloseText: {
  color: 'white',
  fontSize: 15,
  fontWeight: '900',
},

});