import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/kumo_logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.subtitle}>
        Gestión de recetas, costos y producción
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Recetas')}
      >
        <View style={styles.buttonContent}>
          <Ionicons name="book-outline" size={22} color="#FFF" />
          <Text style={styles.buttonText}>Recetas</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Insumos')}
      >
        <View style={styles.buttonContent}>
          <Ionicons name="cube-outline" size={22} color="#FFF" />
          <Text style={styles.buttonText}>Insumos</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Produccion')}
      >
        <View style={styles.buttonContent}>
          <Ionicons name="flask-outline" size={22} color="#FFF" />
          <Text style={styles.buttonText}>Producción</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Pedidos')}
      >
        <View style={styles.buttonContent}>
          <Ionicons name="receipt-outline" size={22} color="#FFF" />
          <Text style={styles.buttonText}>Pedidos</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('MasOpciones')}
      >
        <View style={styles.buttonContent}>
          <Ionicons name="grid-outline" size={21} color="#8B5E4E" />
          <Text style={styles.secondaryButtonText}>Más opciones</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F3',
    justifyContent: 'center',
    padding: 24,
  },

  logo: {
    width: 420,
    height: 420,
    alignSelf: 'center',
    marginTop: -70,
    marginBottom: -100,
  },

  subtitle: {
    marginBottom: 40,
    textAlign: 'center',
    color: '#7A6F68',
    fontSize: 15,
  },

  button: {
    backgroundColor: '#9C6B58',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 22,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 3,
  },

  secondaryButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#E8DCD3',
  },

  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },

  secondaryButtonText: {
    color: '#8B5E4E',
    fontSize: 16,
    fontWeight: '900',
  },
});