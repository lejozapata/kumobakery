import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './screens/HomeScreen';

import RecetasScreen from './screens/RecetasScreen';
import FormularioRecetaScreen from './screens/FormularioRecetaScreen';
import DetalleRecetaScreen from './screens/DetalleRecetaScreen';

import InsumosScreen from './screens/InsumosScreen';
import FormularioInsumoScreen from './screens/FormularioInsumoScreen';

import ProduccionScreen from './screens/ProduccionScreen';
import FormularioProduccionScreen from './screens/FormularioProduccionScreen';

import PedidosScreen from './screens/PedidosScreen';
import FormularioPedidoScreen from './screens/FormularioPedidoScreen';

import MasOpcionesScreen from './screens/MasOpcionesScreen';
import DashboardScreen from './screens/DashboardScreen';
import ClientesScreen from './screens/ClientesScreen';
import HistoricoPedidosScreen from './screens/HistoricoPedidosScreen';
import FinanzasScreen from './screens/FinanzasScreen';
import MovimientosInventarioScreen from './screens/MovimientosInventarioScreen';
import ComprobantesScreen from './screens/ComprobantesScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Inicio"
          component={HomeScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen name="Recetas" component={RecetasScreen} />

        <Stack.Screen
          name="FormularioReceta"
          component={FormularioRecetaScreen}
          options={{ title: 'Nueva receta' }}
        />

        <Stack.Screen
          name="DetalleReceta"
          component={DetalleRecetaScreen}
          options={{ title: 'Detalle de receta' }}
        />

        <Stack.Screen name="Insumos" component={InsumosScreen} />

        <Stack.Screen
          name="FormularioInsumo"
          component={FormularioInsumoScreen}
          options={{ title: 'Insumo' }}
        />

        <Stack.Screen
          name="Produccion"
          component={ProduccionScreen}
          options={{ title: 'Producción' }}
        />

        <Stack.Screen
          name="FormularioProduccion"
          component={FormularioProduccionScreen}
          options={{ title: 'Nueva producción' }}
        />

        <Stack.Screen name="Pedidos" component={PedidosScreen} />

        <Stack.Screen
          name="FormularioPedido"
          component={FormularioPedidoScreen}
          options={{ title: 'Pedido' }}
        />

        <Stack.Screen
          name="MasOpciones"
          component={MasOpcionesScreen}
          options={{ title: 'Más opciones' }}
        />

        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ title: 'Resumen del negocio' }}
        />

        <Stack.Screen
          name="Clientes"
          component={ClientesScreen}
          options={{ title: 'Clientes' }}
        />

        <Stack.Screen
          name="Comprobantes"
          component={ComprobantesScreen}
          options={{ title: 'Comprobantes' }}
        />

        <Stack.Screen
          name="HistoricoPedidos"
          component={HistoricoPedidosScreen}
          options={{ title: 'Histórico de pedidos' }}
        />

        <Stack.Screen
          name="Finanzas"
          component={FinanzasScreen}
          options={{ title: 'Finanzas' }}
        />

        <Stack.Screen
          name="MovimientosInventario"
          component={MovimientosInventarioScreen}
          options={{ title: 'Movimientos de inventario' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}