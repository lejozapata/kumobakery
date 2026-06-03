import { useEffect, useLayoutEffect, useState } from 'react';

import * as Clipboard from 'expo-clipboard';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import {
  obtenerRecetaPorId,
  eliminarReceta,
} from '../database/db';

function parseIngredientes(valor) {
  try {
    const data = JSON.parse(valor || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function formatCOP(valor) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor || 0);
}

export default function DetalleRecetaScreen({ route, navigation }) {
  const { recetaId } = route.params;
  const [receta, setReceta] = useState(null);

  function cargarReceta() {
    const data = obtenerRecetaPorId(recetaId);
    setReceta(data);
  }

  function confirmarEliminar() {
    Alert.alert(
      'Eliminar receta',
      '¿Seguro que deseas eliminar esta receta? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            eliminarReceta(recetaId);
            navigation.goBack();
          },
        },
      ]
    );
  }

  function abrirMenu() {
    Alert.alert(
      'Más opciones',
      'Opciones futuras para esta receta.',
      [
        { text: 'Duplicar receta', onPress: () => {} },
        { text: 'Compartir', onPress: () => {} },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  }

  useEffect(() => {
    cargarReceta();

    const unsubscribe = navigation.addListener('focus', () => {
      cargarReceta();
    });

    return unsubscribe;
  }, [navigation, recetaId]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() =>
              navigation.navigate('FormularioReceta', {
                recetaId,
              })
            }
          >
            <Ionicons
              name="create-outline"
              size={24}
              color="#4a2f27"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={confirmarEliminar}
          >
            <Ionicons
              name="trash-outline"
              size={23}
              color="#b23b2a"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={abrirMenu}
          >
            <Ionicons
              name="ellipsis-vertical"
              size={22}
              color="#4a2f27"
            />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, recetaId]);

  if (!receta) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando receta...</Text>
      </View>
    );
  }

  const ingredientes = parseIngredientes(receta.ingredientes);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        {receta.foto_uri ? (
          <Image source={{ uri: receta.foto_uri }} style={styles.heroImage} />
        ) : (
          <View style={styles.heroPlaceholder}>
            <Text style={styles.heroLetter}>
              {receta.nombre.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.title}>{receta.nombre}</Text>

      {receta.descripcion ? (
        <Text style={styles.description}>{receta.descripcion}</Text>
      ) : null}

      <View style={styles.quickGrid}>
        <View style={styles.quickCard}>
          <Ionicons
            name="time-outline"
            size={28}
            color="#7a4a3a"
            style={styles.quickCardIcon}
          />

          <Text style={styles.quickValue}>
            {receta.tiempo_total_min || 0} min
          </Text>

          <Text style={styles.quickLabel}>Total</Text>
        </View>

        <View style={styles.quickCard}>
          <Ionicons
            name="flame-outline"
            size={28}
            color="#d96b2b"
            style={styles.quickCardIcon}
          />

          <Text style={styles.quickValue}>
            {receta.temperatura_horneado_c || 0} °C
          </Text>

          <Text style={styles.quickLabel}>Horno</Text>
        </View>

        <View style={styles.quickCard}>
          <Ionicons
            name="restaurant-outline"
            size={28}
            color="#9b5d30"
            style={styles.quickCardIcon}
          />

          <Text style={styles.quickValueSmall}>
            {receta.rendimiento || 'Sin definir'}
          </Text>

          <Text style={styles.quickLabel}>Rinde</Text>
        </View>
      </View>

      <View style={styles.timeDetailCard}>
        <Text style={styles.sectionTitleDark}>Tiempos</Text>

        <View style={styles.timeRow}>
          <Text style={styles.timeText}>Preparación</Text>

          <Text style={styles.timeValue}>
            {receta.tiempo_preparacion_min || 0} min
          </Text>
        </View>

        <View style={styles.timeRow}>
          <Text style={styles.timeText}>Cocción / horneado</Text>

          <Text style={styles.timeValue}>
            {receta.tiempo_coccion_min || 0} min
          </Text>
        </View>

        <View style={styles.timeRow}>
          <Text style={styles.timeText}>Reposo</Text>

          <Text style={styles.timeValue}>
            {receta.tiempo_reposo_min || 0} min
          </Text>
        </View>
      </View>

      <View style={styles.lifeCard}>
        <View style={styles.lifeHeader}>
          <Ionicons
            name="leaf-outline"
            size={24}
            color="#7a4a3a"
          />

          <Text style={styles.lifeTitle}>
            Vida útil sugerida
          </Text>
        </View>

        <Text style={styles.lifeValue}>
          {receta.vida_util_dias || 0} días
        </Text>

        <Text style={styles.lifeSubtitle}>
          Conservación: {receta.conservacion || 'Sin definir'}
        </Text>

        <Text style={styles.lifeHint}>
          Esta vida útil será usada como referencia al crear producciones y calcular su fecha de vencimiento.
        </Text>
      </View>

      <View style={styles.energyCard}>
        <View style={styles.energyHeader}>
          <Ionicons
            name="flash-outline"
            size={24}
            color="#f5b642"
          />

          <Text style={styles.energyTitle}>
            Energía estimada
          </Text>
        </View>

        <Text style={styles.energyValue}>
          {formatCOP(receta.costo_energia)}
        </Text>

        <Text style={styles.energySubtitle}>
          Basado en horno eléctrico de 1.8 kW
        </Text>

        <Text style={styles.energyTariff}>
          Tarifa usada: {formatCOP(receta.tarifa_kwh)} / kWh
        </Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Ingredientes</Text>

        {ingredientes.length === 0 ? (
          <Text style={styles.emptyText}>
            No hay ingredientes registrados.
          </Text>
        ) : (
          ingredientes.map((ingrediente) => (
            <View key={ingrediente.id} style={styles.ingredientRow}>
              <Ionicons
                name="ellipse"
                size={10}
                color="#d9a58b"
                style={styles.bulletIcon}
              />

              <Text style={styles.ingredientText}>
                {ingrediente.texto}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Instrucciones</Text>

        {receta.instrucciones ? (
          <Text style={styles.instructionsText}>
            {receta.instrucciones}
          </Text>
        ) : (
          <Text style={styles.emptyText}>
            No hay instrucciones registradas.
          </Text>
        )}
      </View>

      {receta.equipo_cocina ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Equipo de cocina</Text>

          <Text style={styles.bodyText}>
            {receta.equipo_cocina}
          </Text>
        </View>
      ) : null}

      {receta.video_url ? (
        <View style={styles.videoActionsContainer}>
            <TouchableOpacity
            style={styles.videoButton}
            onPress={() => Linking.openURL(receta.video_url)}
            >
            <Ionicons
                name="play-circle-outline"
                size={22}
                color="white"
                style={{ marginRight: 8 }}
            />

            <Text style={styles.videoButtonText}>
                Abrir video
            </Text>
            </TouchableOpacity>

            <TouchableOpacity
            style={styles.copyButton}
            onPress={async () => {
                await Clipboard.setStringAsync(receta.video_url);
                Alert.alert('Link copiado', 'El enlace del video fue copiado.');
            }}
            >
            <Ionicons
                name="copy-outline"
                size={21}
                color="#7a4a3a"
                style={{ marginRight: 8 }}
            />

            <Text style={styles.copyButtonText}>
                Copiar link
            </Text>
            </TouchableOpacity>
        </View>
        ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  container: {
    flex: 1,
    backgroundColor: '#fff7f5',
  },

  content: {
    padding: 20,
    paddingBottom: 50,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff7f5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    color: '#7a4a3a',
    fontSize: 16,
    fontWeight: '700',
  },

  heroCard: {
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ead0c3',
    elevation: 5,
    marginBottom: 20,
  },

  heroImage: {
    width: '100%',
    height: 260,
  },

  heroPlaceholder: {
    height: 260,
    backgroundColor: '#d9a58b',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroLetter: {
    color: 'white',
    fontSize: 80,
    fontWeight: '900',
  },

  title: {
    fontSize: 34,
    fontWeight: '900',
    color: '#4a2f27',
    marginBottom: 10,
  },

  description: {
    fontSize: 16,
    color: '#7a5a50',
    lineHeight: 24,
    marginBottom: 18,
  },

  quickGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },

  quickCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ead0c3',
    elevation: 3,
  },

  quickCardIcon: {
    marginBottom: 8,
  },

  quickValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#4a2f27',
    textAlign: 'center',
  },

  quickValueSmall: {
    fontSize: 14,
    fontWeight: '900',
    color: '#4a2f27',
    textAlign: 'center',
  },

  quickLabel: {
    fontSize: 12,
    color: '#9b7b70',
    marginTop: 4,
    fontWeight: '700',
  },

  timeDetailCard: {
    backgroundColor: '#7a4a3a',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
  },

  sectionTitleDark: {
    fontSize: 22,
    fontWeight: '900',
    color: 'white',
    marginBottom: 12,
  },

  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
  },

  timeText: {
    color: '#f8e9e2',
    fontSize: 15,
    fontWeight: '700',
  },

  timeValue: {
    color: 'white',
    fontSize: 15,
    fontWeight: '900',
  },

  energyCard: {
    backgroundColor: '#fff8e8',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f0d48b',
  },

  energyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  energyTitle: {
    marginLeft: 10,
    fontSize: 20,
    fontWeight: '900',
    color: '#8b5a12',
  },

  energyValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#4a2f27',
    marginBottom: 8,
  },

  energySubtitle: {
    color: '#7a5f2f',
    fontSize: 14,
    marginBottom: 4,
  },

  energyTariff: {
    color: '#9b7b70',
    fontSize: 13,
  },

  sectionCard: {
    backgroundColor: 'white',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ead0c3',
    elevation: 3,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#7a4a3a',
    marginBottom: 12,
  },

  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  bulletIcon: {
    marginTop: 7,
    marginRight: 10,
  },

  ingredientText: {
    flex: 1,
    fontSize: 16,
    color: '#4a2f27',
    lineHeight: 24,
  },

  instructionsText: {
    fontSize: 16,
    color: '#4a2f27',
    lineHeight: 25,
  },

  bodyText: {
    fontSize: 16,
    color: '#4a2f27',
    lineHeight: 24,
  },

  emptyText: {
    color: '#9b7b70',
    fontSize: 15,
  },

  videoButton: {
    backgroundColor: '#d9a58b',
    padding: 18,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 4,
  },

  videoButtonText: {
    color: 'white',
    fontWeight: '900',
    fontSize: 16,
  },

  videoActionsContainer: {
    marginTop: 4,
    },

    copyButton: {
    backgroundColor: '#f1ddd4',
    padding: 16,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 10,
    },

    copyButtonText: {
    color: '#7a4a3a',
    fontWeight: '900',
    fontSize: 16,
    },

    lifeCard: {
  backgroundColor: '#fffaf0',
  borderRadius: 22,
  padding: 18,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: '#ead0c3',
},

lifeHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  marginBottom: 10,
},

lifeTitle: {
  fontSize: 18,
  fontWeight: '900',
  color: '#4a2f27',
},

lifeValue: {
  fontSize: 28,
  fontWeight: '900',
  color: '#7a4a3a',
  marginBottom: 6,
},

lifeSubtitle: {
  fontSize: 14,
  fontWeight: '700',
  color: '#7a5a50',
},

lifeHint: {
  fontSize: 12,
  color: '#9b7b70',
  marginTop: 8,
  lineHeight: 17,
},

});