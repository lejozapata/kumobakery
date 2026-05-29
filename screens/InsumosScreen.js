import React, { useCallback, useMemo, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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
  eliminarInsumo,
  obtenerInsumos,
} from '../database/db';

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

function obtenerEstadoStock(item) {
  const cantidadActual = Number(item.cantidad_actual || 0);
  const cantidadMinima = Number(item.cantidad_minima || 0);

  if (cantidadActual <= 0) {
    return {
      tipo: 'agotado',
      texto: 'Agotado',
      icono: 'close-circle-outline',
    };
  }

  if (cantidadMinima > 0 && cantidadActual <= cantidadMinima) {
    return {
      tipo: 'bajo',
      texto: 'Bajo stock',
      icono: 'warning-outline',
    };
  }

  return {
    tipo: 'disponible',
    texto: 'Disponible',
    icono: 'checkmark-circle-outline',
  };
}

export default function InsumosScreen({ navigation }) {
  const [insumos, setInsumos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    try {
      setCargando(true);
      const data = await obtenerInsumos({ busqueda });
      setInsumos(data);
    } catch (error) {
      console.error('Error cargando insumos:', error);
      Alert.alert('Error', 'No fue posible cargar los insumos.');
    } finally {
      setCargando(false);
    }
  }, [busqueda]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const resumenStock = useMemo(() => {
    return insumos.reduce(
      (total, item) => {
        const estado = obtenerEstadoStock(item);

        if (estado.tipo === 'agotado') total.agotados += 1;
        if (estado.tipo === 'bajo') total.bajos += 1;
        if (estado.tipo === 'disponible') total.disponibles += 1;

        return total;
      },
      {
        disponibles: 0,
        bajos: 0,
        agotados: 0,
      }
    );
  }, [insumos]);

  const confirmarEliminar = (insumo) => {
    Alert.alert(
      'Eliminar insumo',
      `¿Quieres eliminar "${insumo.nombre}"? Se ocultará del listado, pero se conservará para futuros históricos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await eliminarInsumo(insumo.id);
            cargar();
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => {
    const estado = obtenerEstadoStock(item);

    const cantidadActual = Number(item.cantidad_actual || 0);
    const cantidadCompra = Number(item.cantidad_compra || 0);
    const consumido = Math.max(cantidadCompra - cantidadActual, 0);

    return (
      <Pressable
        style={[
          styles.card,
          estado.tipo === 'agotado' && styles.cardAgotado,
          estado.tipo === 'bajo' && styles.cardBajo,
        ]}
        onPress={() =>
          navigation.navigate('FormularioInsumo', {
            insumoId: item.id,
          })
        }
      >
        <View style={styles.cardHeader}>
          {item.foto_uri ? (
            <Image
              source={{ uri: item.foto_uri }}
              style={[
                styles.avatarImage,
                estado.tipo === 'agotado' && styles.avatarMuted,
              ]}
            />
          ) : (
            <View
              style={[
                styles.avatar,
                estado.tipo === 'agotado' && styles.avatarAgotado,
                estado.tipo === 'bajo' && styles.avatarBajo,
              ]}
            >
              <Text
                style={[
                  styles.avatarText,
                  estado.tipo === 'agotado' && styles.avatarTextAgotado,
                  estado.tipo === 'bajo' && styles.avatarTextBajo,
                ]}
              >
                {item.nombre?.charAt(0)?.toUpperCase() || 'I'}
              </Text>
            </View>
          )}

          <View style={styles.cardTitleArea}>
            <Text
              style={[
                styles.nombre,
                estado.tipo === 'agotado' && styles.nombreAgotado,
              ]}
            >
              {item.nombre}
            </Text>

            {!!item.categoria && (
              <Text style={styles.categoria}>{item.categoria}</Text>
            )}
          </View>

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

        <View
          style={[
            styles.statusBadge,
            estado.tipo === 'disponible' && styles.statusDisponible,
            estado.tipo === 'bajo' && styles.statusBajo,
            estado.tipo === 'agotado' && styles.statusAgotado,
          ]}
        >
          <Ionicons
            name={estado.icono}
            size={15}
            color={
              estado.tipo === 'disponible'
                ? '#2F855A'
                : estado.tipo === 'bajo'
                  ? '#B45309'
                  : '#9B2C2C'
            }
          />

          <Text
            style={[
              styles.statusText,
              estado.tipo === 'disponible' && styles.statusTextDisponible,
              estado.tipo === 'bajo' && styles.statusTextBajo,
              estado.tipo === 'agotado' && styles.statusTextAgotado,
            ]}
          >
            {estado.texto}
          </Text>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Stock disponible</Text>

            <Text
              style={[
                styles.metricValue,
                estado.tipo === 'agotado' && styles.stockAgotado,
                estado.tipo === 'bajo' && styles.stockBajo,
              ]}
            >
              {cantidadActual.toLocaleString('es-CO')}{' '}
              {item.unidad_medida}
            </Text>
          </View>

          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Costo unitario</Text>

            <Text style={styles.metricValue}>
              {COP.format(item.costo_por_unidad || 0)}
            </Text>
          </View>
        </View>

        {cantidadCompra > 0 && (
          <View style={styles.historyBox}>
            <Text style={styles.historyText}>
              Comprado:{' '}
              <Text style={styles.historyStrong}>
                {cantidadCompra.toLocaleString('es-CO')} {item.unidad_medida}
              </Text>
            </Text>

            <Text style={styles.historyText}>
              Consumido:{' '}
              <Text style={styles.historyStrong}>
                {consumido.toLocaleString('es-CO')} {item.unidad_medida}
              </Text>
            </Text>
          </View>
        )}

        {estado.tipo === 'agotado' && (
          <View style={styles.alertaAgotado}>
            <Ionicons
              name="alert-circle-outline"
              size={16}
              color="#9B2C2C"
            />

            <Text style={styles.alertaAgotadoText}>
              Este insumo está agotado. Puedes reponerlo editando el stock o eliminarlo manualmente si ya no se usa.
            </Text>
          </View>
        )}

        {estado.tipo === 'bajo' && (
          <View style={styles.alertaStock}>
            <Ionicons
              name="warning-outline"
              size={16}
              color="#B45309"
            />

            <Text style={styles.alertaStockText}>
              Stock bajo o en mínimo definido
            </Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Insumos</Text>

          <Text style={styles.subtitle}>
            Costos base e inventario de repostería
          </Text>
        </View>

        <Pressable
          style={styles.addButton}
          onPress={() => navigation.navigate('FormularioInsumo')}
        >
          <Ionicons name="add" size={26} color="#FFF" />
        </Pressable>
      </View>

      <View style={styles.searchBox}>
        <Ionicons
          name="search-outline"
          size={20}
          color="#7A6F68"
        />

        <TextInput
          value={busqueda}
          onChangeText={setBusqueda}
          onSubmitEditing={cargar}
          placeholder="Buscar por nombre, categoría o proveedor"
          placeholderTextColor="#A79C95"
          style={styles.searchInput}
          returnKeyType="search"
        />
      </View>

      <View style={styles.stockSummaryRow}>
        <View style={styles.stockSummaryItem}>
          <Text style={styles.stockSummaryNumber}>
            {resumenStock.disponibles}
          </Text>
          <Text style={styles.stockSummaryLabel}>Disponibles</Text>
        </View>

        <View style={styles.stockSummaryItem}>
          <Text style={styles.stockSummaryNumberBajo}>
            {resumenStock.bajos}
          </Text>
          <Text style={styles.stockSummaryLabel}>Bajo stock</Text>
        </View>

        <View style={styles.stockSummaryItem}>
          <Text style={styles.stockSummaryNumberAgotado}>
            {resumenStock.agotados}
          </Text>
          <Text style={styles.stockSummaryLabel}>Agotados</Text>
        </View>
      </View>

      {cargando ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={insumos}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={
            insumos.length ? styles.list : styles.emptyContainer
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons
                name="cube-outline"
                size={44}
                color="#BFAFA3"
              />

              <Text style={styles.emptyTitle}>
                Aún no hay insumos
              </Text>

              <Text style={styles.emptyText}>
                Crea el primer insumo para empezar a calcular costos reales.
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

  searchBox: {
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8DCD3',
    flexDirection: 'row',
    alignItems: 'center',
  },

  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#3B2A24',
  },

  stockSummaryRow: {
    marginHorizontal: 20,
    marginBottom: 10,
    flexDirection: 'row',
    gap: 8,
  },

  stockSummaryItem: {
    flex: 1,
    padding: 10,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3DA',
  },

  stockSummaryNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2F855A',
  },

  stockSummaryNumberBajo: {
    fontSize: 18,
    fontWeight: '900',
    color: '#B45309',
  },

  stockSummaryNumberAgotado: {
    fontSize: 18,
    fontWeight: '900',
    color: '#9B2C2C',
  },

  stockSummaryLabel: {
    marginTop: 2,
    fontSize: 11,
    color: '#7A6F68',
    fontWeight: '700',
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
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 2,
  },

  cardBajo: {
    borderColor: '#F6C177',
  },

  cardAgotado: {
    borderColor: '#F3B5B5',
    backgroundColor: '#FFF5F5',
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#F1E1D6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarBajo: {
    backgroundColor: '#FFF7ED',
  },

  avatarAgotado: {
    backgroundColor: '#FEE2E2',
  },

  avatarMuted: {
    opacity: 0.45,
  },

  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#F1E1D6',
  },

  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#8B5E4E',
  },

  avatarTextBajo: {
    color: '#B45309',
  },

  avatarTextAgotado: {
    color: '#9B2C2C',
  },

  cardTitleArea: {
    flex: 1,
    marginLeft: 12,
  },

  nombre: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3B2A24',
  },

  nombreAgotado: {
    color: '#7F1D1D',
  },

  categoria: {
    marginTop: 2,
    fontSize: 13,
    color: '#8A7D75',
  },

  statusBadge: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
  },

  statusDisponible: {
    backgroundColor: '#F0FFF4',
    borderColor: '#B7E4C7',
  },

  statusBajo: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },

  statusAgotado: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },

  statusText: {
    fontSize: 12,
    fontWeight: '900',
  },

  statusTextDisponible: {
    color: '#2F855A',
  },

  statusTextBajo: {
    color: '#B45309',
  },

  statusTextAgotado: {
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

  stockBajo: {
    color: '#B45309',
  },

  stockAgotado: {
    color: '#9B2C2C',
  },

  historyBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3DA',
  },

  historyText: {
    color: '#7A6F68',
    fontSize: 12,
    marginBottom: 2,
  },

  historyStrong: {
    color: '#3B2A24',
    fontWeight: '800',
  },

  alertaStock: {
    marginTop: 12,
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#FFF7ED',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  alertaStockText: {
    color: '#B45309',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },

  alertaAgotado: {
    marginTop: 12,
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  alertaAgotadoText: {
    color: '#9B2C2C',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
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