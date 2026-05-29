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
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';

import {
  crearReceta,
  obtenerRecetaPorId,
  actualizarReceta,
} from '../database/db';

function parseIngredientes(valor) {
  try {
    const data = JSON.parse(valor || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
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

  function marcarCambio() {
    setHayCambios(true);
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

    setHayCambios(false);
  }, [modoEdicion, recetaId]);

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

  function guardarReceta() {
    if (nombre.trim() === '') {
      Alert.alert('Campo requerido', 'Ingresa el nombre de la receta.');
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
});