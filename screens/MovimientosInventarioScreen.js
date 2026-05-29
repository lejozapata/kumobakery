import React, { useCallback, useMemo, useState } from 'react';

import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { obtenerMovimientosInventario } from '../database/db';

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

export default function MovimientosInventarioScreen() {
  const [movimientos, setMovimientos] = useState([]);
  const [filtro, setFiltro] = useState('todos');
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(() => {
    try {
      setCargando(true);
      setMovimientos(obtenerMovimientosInventario());
    } catch (error) {
      console.error('Error cargando movimientos:', error);
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const movimientosFiltrados = useMemo(() => {
    let data = movimientos;

    if (filtro !== 'todos') {
      data = data.filter((item) => item.referencia_tipo === filtro);
    }

    return data;
  }, [movimientos, filtro]);

  const movimientosAgrupados = useMemo(() => {
    const grupos = [];

    movimientosFiltrados.forEach((movimiento) => {
      const fechaKey = obtenerFechaKey(movimiento.created_at);
      const titulo = formatearGrupoFecha(movimiento.created_at);

      let grupo = grupos.find((item) => item.fechaKey === fechaKey);

      if (!grupo) {
        grupo = {
          tipo: 'header',
          fechaKey,
          titulo,
        };

        grupos.push(grupo);
      }

      grupos.push({
        tipo: 'movimiento',
        ...movimiento,
      });
    });

    return grupos;
  }, [movimientosFiltrados]);

  const resumen = useMemo(() => {
    const salidas = movimientosFiltrados.filter(
      (item) => item.tipo_movimiento === 'salida'
    );

    const totalMovimientos = movimientosFiltrados.length;

    const totalInsumos = movimientosFiltrados.filter(
      (item) => item.referencia_tipo === 'insumo'
    ).length;

    const totalProduccion = movimientosFiltrados.filter(
      (item) => item.referencia_tipo === 'produccion'
    ).length;

    const valorEstimado = salidas.reduce((total, item) => {
      const cantidad = Number(item.cantidad || 0);
      const costoUnitario = Number(item.costo_unitario || 0);

      return total + cantidad * costoUnitario;
    }, 0);

    return {
      totalMovimientos,
      totalInsumos,
      totalProduccion,
      valorEstimado,
    };
  }, [movimientosFiltrados]);

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
        data={movimientosAgrupados}
        keyExtractor={(item, index) =>
          item.tipo === 'header'
            ? `header-${item.fechaKey}`
            : `mov-${item.id}-${index}`
        }
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Movimientos</Text>

              <Text style={styles.subtitle}>
                Trazabilidad clara de inventario
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>
                Valor estimado descontado
              </Text>

              <Text style={styles.summaryValue}>
                {COP.format(resumen.valorEstimado)}
              </Text>

              <Text style={styles.summarySubtext}>
                Salidas registradas en inventario según el filtro actual.
              </Text>
            </View>

            <View style={styles.grid}>
              <MetricCard
                icon="swap-horizontal-outline"
                label="Movimientos"
                value={resumen.totalMovimientos}
              />

              <MetricCard
                icon="cube-outline"
                label="Insumos"
                value={resumen.totalInsumos}
              />

              <MetricCard
                icon="restaurant-outline"
                label="Producción"
                value={resumen.totalProduccion}
              />
            </View>

            <View style={styles.filters}>
              <FiltroButton
                label="Todos"
                activo={filtro === 'todos'}
                onPress={() => setFiltro('todos')}
              />

              <FiltroButton
                label="Insumos"
                activo={filtro === 'insumo'}
                onPress={() => setFiltro('insumo')}
              />

              <FiltroButton
                label="Producción"
                activo={filtro === 'produccion'}
                onPress={() => setFiltro('produccion')}
              />
            </View>

            <Text style={styles.sectionTitle}>Historial de movimientos</Text>
          </>
        }
        renderItem={({ item }) => {
          if (item.tipo === 'header') {
            return (
              <View style={styles.dateHeader}>
                <Text style={styles.dateHeaderText}>{item.titulo}</Text>
              </View>
            );
          }

          return <MovimientoCard item={item} />;
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="file-tray-outline" size={44} color="#BFAFA3" />

            <Text style={styles.emptyTitle}>Sin movimientos</Text>

            <Text style={styles.emptyText}>
              Cuando produzcas o crees pedidos, aparecerá aquí la trazabilidad.
            </Text>
          </View>
        }
        contentContainerStyle={
          movimientosAgrupados.length ? styles.content : styles.emptyContent
        }
      />
    </SafeAreaView>
  );
}

function MovimientoCard({ item }) {
  const esInsumo = item.referencia_tipo === 'insumo';
  const esPedido = item.tipo_origen === 'pedido';
  const esProduccion = item.tipo_origen === 'produccion';

  const cantidad = Number(item.cantidad || 0);
  const costoUnitario = Number(item.costo_unitario || 0);
  const valor = cantidad * costoUnitario;

  const titulo = obtenerTituloMovimiento(item);
  const subtitulo = esPedido
    ? 'Descontado por pedido'
    : esProduccion
      ? 'Usado en producción'
      : 'Movimiento de inventario';

  return (
    <View style={styles.card}>
      <View style={styles.timelineDot} />

      <View style={styles.cardHeader}>
        <View style={styles.iconBox}>
          <Ionicons
            name={esInsumo ? 'cube-outline' : 'restaurant-outline'}
            size={23}
            color="#8B5E4E"
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{titulo}</Text>
          <Text style={styles.cardSubtitle}>{subtitulo}</Text>
        </View>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>Salida</Text>
        </View>
      </View>

      {!!item.descripcion && (
        <Text style={styles.description}>{item.descripcion}</Text>
      )}

      <View style={styles.detailRow}>
        <View style={styles.detailBox}>
          <Text style={styles.detailLabel}>Cantidad</Text>
          <Text style={styles.detailValue}>
            {cantidad.toLocaleString('es-CO')}
          </Text>
        </View>

        <View style={styles.detailBox}>
          <Text style={styles.detailLabel}>Costo unitario</Text>
          <Text style={styles.detailValue}>{COP.format(costoUnitario)}</Text>
        </View>
      </View>

      <View style={styles.totalBox}>
        <View>
          <Text style={styles.totalLabel}>Valor estimado</Text>
          <Text style={styles.totalValue}>{COP.format(valor)}</Text>
        </View>

        <Text style={styles.timeText}>{formatearHora(item.created_at)}</Text>
      </View>
    </View>
  );
}

function MetricCard({ icon, label, value }) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricIcon}>
        <Ionicons name={icon} size={21} color="#8B5E4E" />
      </View>

      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
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

function obtenerTituloMovimiento(item) {
  if (item.referencia_nombre) {
    return item.referencia_nombre;
  }

  if (item.referencia_tipo === 'insumo') return 'Salida de insumo';
  if (item.referencia_tipo === 'produccion') return 'Salida de producción';

  return 'Movimiento';
}

function obtenerFecha(valor) {
  if (!valor) return null;

  const fecha = new Date(String(valor).replace(' ', 'T'));

  if (Number.isNaN(fecha.getTime())) return null;

  return fecha;
}

function obtenerFechaKey(valor) {
  const fecha = obtenerFecha(valor);

  if (!fecha) return 'sin-fecha';

  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');

  return `${anio}-${mes}-${dia}`;
}

function formatearGrupoFecha(valor) {
  const fecha = obtenerFecha(valor);

  if (!fecha) return 'Sin fecha';

  const hoy = new Date();
  const ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);

  const keyFecha = obtenerFechaKey(valor);
  const keyHoy = obtenerFechaKey(hoy);
  const keyAyer = obtenerFechaKey(ayer);

  if (keyFecha === keyHoy) return 'Hoy';
  if (keyFecha === keyAyer) return 'Ayer';

  return `${fecha.getDate()} de ${MESES[fecha.getMonth()]} de ${fecha.getFullYear()}`;
}

function formatearHora(valor) {
  const fecha = obtenerFecha(valor);

  if (!fecha) return '';

  const horas = String(fecha.getHours()).padStart(2, '0');
  const minutos = String(fecha.getMinutes()).padStart(2, '0');

  return `${horas}:${minutos}`;
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

  summarySubtext: {
    marginTop: 6,
    color: '#F7EDE6',
    fontSize: 12,
    lineHeight: 17,
  },

  grid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },

  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFE3DA',
    elevation: 2,
  },

  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#F1E1D6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  metricValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#3B2A24',
  },

  metricLabel: {
    marginTop: 2,
    fontSize: 12,
    color: '#7A6F68',
    fontWeight: '700',
  },

  filters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
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

  sectionTitle: {
    marginBottom: 12,
    fontSize: 22,
    fontWeight: '900',
    color: '#3B2A24',
  },

  dateHeader: {
    marginTop: 8,
    marginBottom: 8,
  },

  dateHeaderText: {
    color: '#8B5E4E',
    fontSize: 15,
    fontWeight: '900',
  },

  card: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EFE3DA',
    elevation: 2,
  },

  timelineDot: {
    position: 'absolute',
    left: -8,
    top: 28,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#8B5E4E',
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

  cardTitle: {
    color: '#3B2A24',
    fontSize: 17,
    fontWeight: '900',
  },

  cardSubtitle: {
    marginTop: 2,
    color: '#8A7D75',
    fontSize: 12,
  },

  badge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#F3B5B5',
  },

  badgeText: {
    color: '#9B2C2C',
    fontSize: 11,
    fontWeight: '900',
  },

  description: {
    marginTop: 12,
    color: '#5F5149',
    fontSize: 13,
    lineHeight: 18,
  },

  detailRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },

  detailBox: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FFF8F3',
  },

  detailLabel: {
    color: '#8A7D75',
    fontSize: 12,
    fontWeight: '700',
  },

  detailValue: {
    marginTop: 4,
    color: '#3B2A24',
    fontSize: 15,
    fontWeight: '900',
  },

  totalBox: {
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#8B5E4E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  totalLabel: {
    color: '#F7EDE6',
    fontSize: 12,
    fontWeight: '800',
  },

  totalValue: {
    marginTop: 4,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },

  timeText: {
    color: '#F7EDE6',
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
  },

  emptyText: {
    marginTop: 5,
    color: '#7A6F68',
    textAlign: 'center',
    fontSize: 13,
  },
});