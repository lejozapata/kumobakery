import React, { useCallback, useState } from 'react';

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
  depurarProduccionesAgotadas,
  eliminarProduccion,
  obtenerProducciones,
  obtenerProduccionesAgotadasVisibles,
  ocultarProduccion,
} from '../database/db';

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export default function ProduccionScreen({ navigation }) {
  const [producciones, setProducciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [hayAgotadas, setHayAgotadas] = useState(false);

  const cargar = useCallback(() => {
    try {
      setCargando(true);

      const data = obtenerProducciones();
      const agotadas = obtenerProduccionesAgotadasVisibles();

      setProducciones(data);
      setHayAgotadas(agotadas.length > 0);
    } catch (error) {
      console.error('Error cargando producciones:', error);
      Alert.alert('Error', 'No fue posible cargar las producciones.');
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const confirmarEliminar = (produccion) => {
    Alert.alert(
      'Eliminar producción',
      `¿Quieres eliminar definitivamente la producción de "${produccion.receta_nombre}"? Usa esto solo si fue creada por error.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            eliminarProduccion(produccion.id);
            cargar();
          },
        },
      ]
    );
  };

  const confirmarOcultar = (produccion) => {
    Alert.alert(
      'Ocultar producción',
      `¿Quieres ocultar la producción de "${produccion.receta_nombre}" del listado principal?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Ocultar',
          style: 'destructive',
          onPress: () => {
            ocultarProduccion(produccion.id);
            cargar();
          },
        },
      ]
    );
  };

  const confirmarDepuracion = () => {
    Alert.alert(
      'Depurar producciones agotadas',
      'Se ocultarán todas las producciones que ya no tienen stock disponible. No se eliminarán de la base de datos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Depurar',
          style: 'destructive',
          onPress: () => {
            depurarProduccionesAgotadas();
            cargar();
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => {
    const disponibles = Number(
      item.unidades_disponibles ||
        item.unidades_resultantes ||
        0
    );

    const agotada = disponibles <= 0;

    const utilidadDeseada = Number(item.margen_porcentaje || 40);

    const precioSugerido =
      Number(item.precio_sugerido_personalizado || 0) ||
      Number(item.precio_sugerido_40 || 0);

    const costoUnidad = Number(item.costo_por_unidad || 0);
    const utilidadEstimada = Math.max(precioSugerido - costoUnidad, 0);

    return (
      <Pressable
        style={[
          styles.card,
          agotada && styles.cardAgotada,
        ]}
        onPress={() =>
          navigation.navigate('FormularioProduccion', {
            produccionId: item.id,
          })
        }
      >
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.iconBox,
              agotada && styles.iconBoxAgotada,
            ]}
          >
            <Ionicons
              name="restaurant-outline"
              size={24}
              color={agotada ? '#9B2C2C' : '#8B5E4E'}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.nombre}>
              {item.receta_nombre || 'Producción'}
            </Text>

            <Text style={styles.fecha}>{item.fecha}</Text>

            {agotada && (
              <View style={styles.badgeAgotada}>
                <Ionicons
                  name="alert-circle-outline"
                  size={14}
                  color="#9B2C2C"
                />

                <Text style={styles.badgeAgotadaText}>
                  Agotada
                </Text>
              </View>
            )}
          </View>

          <View style={styles.actionsColumn}>
            {agotada && (
              <Pressable
                onPress={() => confirmarOcultar(item)}
                hitSlop={10}
              >
                <Ionicons
                  name="eye-off-outline"
                  size={21}
                  color="#8B5E4E"
                />
              </Pressable>
            )}

            <Pressable
              onPress={() => confirmarEliminar(item)}
              hitSlop={10}
            >
              <Ionicons
                name="trash-outline"
                size={21}
                color="#9B2C2C"
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.unitsBox}>
          <Ionicons
            name="cube-outline"
            size={17}
            color={agotada ? '#9B2C2C' : '#8B5E4E'}
          />

          <Text
            style={[
              styles.unitsText,
              agotada && styles.unitsTextAgotada,
            ]}
          >
            Disponibles para venta:{' '}
            {disponibles.toLocaleString('es-CO')} unidades
          </Text>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Costo total</Text>

            <Text style={styles.metricValue}>
              {COP.format(item.costo_total || 0)}
            </Text>
          </View>

          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Costo unidad</Text>

            <Text style={styles.metricValue}>
              {COP.format(costoUnidad)}
            </Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Utilidad deseada</Text>

            <Text style={styles.metricValue}>
              {utilidadDeseada}%
            </Text>
          </View>

          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Utilidad unidad</Text>

            <Text style={styles.metricValue}>
              {COP.format(utilidadEstimada)}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.priceBox,
            agotada && styles.priceBoxAgotada,
          ]}
        >
          <Text style={styles.priceLabel}>
            Precio sugerido de venta
          </Text>

          <Text style={styles.priceValue}>
            {COP.format(precioSugerido)}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Producción</Text>

          <Text style={styles.subtitle}>
            Costea lotes y calcula precios de venta
          </Text>
        </View>

        <Pressable
          style={styles.addButton}
          onPress={() => navigation.navigate('FormularioProduccion')}
        >
          <Ionicons name="add" size={26} color="#FFF" />
        </Pressable>
      </View>

      {hayAgotadas && (
        <Pressable
          style={styles.cleanupButton}
          onPress={confirmarDepuracion}
        >
          <Ionicons
            name="sparkles-outline"
            size={18}
            color="#9B2C2C"
          />

          <Text style={styles.cleanupButtonText}>
            Depurar producciones agotadas
          </Text>
        </Pressable>
      )}

      {cargando ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={producciones}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={
            producciones.length ? styles.list : styles.emptyContainer
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="flask-outline" size={44} color="#BFAFA3" />

              <Text style={styles.emptyTitle}>
                Aún no hay producciones
              </Text>

              <Text style={styles.emptyText}>
                Crea una producción para calcular costos reales por lote.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
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

  cleanupButton: {
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#F3B5B5',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  cleanupButtonText: {
    color: '#9B2C2C',
    fontWeight: '800',
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

  cardAgotada: {
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
    backgroundColor: '#F1E1D6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconBoxAgotada: {
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

  badgeAgotada: {
    marginTop: 6,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  badgeAgotadaText: {
    color: '#9B2C2C',
    fontSize: 12,
    fontWeight: '900',
  },

  actionsColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  unitsBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#FFF8F3',
    borderWidth: 1,
    borderColor: '#EFE3DA',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  unitsText: {
    color: '#3B2A24',
    fontSize: 13,
    fontWeight: '800',
  },

  unitsTextAgotada: {
    color: '#9B2C2C',
  },

  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },

  metricBox: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FFF8F3',
  },

  metricLabel: {
    fontSize: 12,
    color: '#8A7D75',
    marginBottom: 4,
  },

  metricValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#3B2A24',
  },

  priceBox: {
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#8B5E4E',
  },

  priceBoxAgotada: {
    backgroundColor: '#9B2C2C',
  },

  priceLabel: {
    fontSize: 12,
    color: '#F7EDE6',
    fontWeight: '800',
  },

  priceValue: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
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
  },

  emptyText: {
    marginTop: 6,
    textAlign: 'center',
    color: '#7A6F68',
  },
});