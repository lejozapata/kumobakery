import React from 'react';

import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

export default function MasOpcionesScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Más opciones</Text>

        <Text style={styles.subtitle}>
          Herramientas administrativas y reportes del negocio.
        </Text>

        <MenuItem
          icon="analytics-outline"
          title="Resumen del negocio"
          description="Indicadores, ventas, pedidos activos y alertas."
          onPress={() => navigation.navigate('Dashboard')}
        />

        <MenuItem
          icon="people-outline"
          title="Clientes"
          description="Consulta y administra clientes registrados."
          onPress={() => navigation.navigate('Clientes')}
        />

        <MenuItem
          icon="document-text-outline"
          title="Comprobantes"
          description="Generación y control de comprobantes de pedidos."
          onPress={() => navigation.navigate('Comprobantes')}
        />

        <MenuItem
          icon="time-outline"
          title="Histórico de pedidos"
          description="Pedidos entregados, cancelados y antiguos."
          onPress={() => navigation.navigate('HistoricoPedidos')}
        />

        <MenuItem
          icon="cash-outline"
          title="Finanzas"
          description="Ingresos, costos y utilidad estimada."
          onPress={() => navigation.navigate('Finanzas')}
        />

        <MenuItem
          icon="swap-horizontal-outline"
          title="Movimientos de inventario"
          description="Entradas y salidas de insumos y producción."
          onPress={() => navigation.navigate('MovimientosInventario')}
        />

        <MenuItem
          icon="cloud-upload-outline"
          title="Copias y exportaciones"
          description="Respaldos de base de datos y exportación de recetas."
          onPress={() => navigation.navigate('CopiasExportaciones')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({ icon, title, description, onPress }) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={24} color="#8B5E4E" />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuDescription}>{description}</Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#A79C95" />
    </Pressable>
  );
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

  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#3B2A24',
  },

  subtitle: {
    marginTop: 4,
    marginBottom: 18,
    color: '#7A6F68',
    fontSize: 14,
  },

  menuItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EFE3DA',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    elevation: 2,
  },

  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F1E1D6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  menuTitle: {
    color: '#3B2A24',
    fontSize: 16,
    fontWeight: '900',
  },

  menuDescription: {
    marginTop: 3,
    color: '#7A6F68',
    fontSize: 12,
    lineHeight: 17,
  },
});