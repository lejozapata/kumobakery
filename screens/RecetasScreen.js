import { useEffect, useState } from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
} from 'react-native';

import {
  obtenerRecetas,
  alternarFavoritaReceta,
} from '../database/db';

export default function RecetasScreen({ navigation }) {
  const [recetas, setRecetas] = useState([]);

  useEffect(() => {
    cargarRecetas();

    const unsubscribe = navigation.addListener('focus', () => {
      cargarRecetas();
    });

    return unsubscribe;
  }, []);

  function cargarRecetas() {
    const data = obtenerRecetas();
    setRecetas(data);
  }

  function toggleFavorita(item) {
    alternarFavoritaReceta(item.id, item.favorita);
    cargarRecetas();
    }   

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recetas</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('FormularioReceta')}
      >
        <Text style={styles.buttonText}>Nueva receta</Text>
      </TouchableOpacity>

      <FlatList
        data={recetas}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.85}
            onPress={() =>
              navigation.navigate('DetalleReceta', {
                recetaId: item.id,
              })
            }
          >
            <View style={styles.imagePlaceholder}>
              {item.foto_uri ? (
                <Image
                  source={{ uri: item.foto_uri }}
                  style={styles.cardImage}
                />
              ) : (
                <Text style={styles.imageLetter}>
                  {item.nombre.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>

            <View style={styles.infoContainer}>
              <Text style={styles.cardTitle}>{item.nombre}</Text>

              <Text style={styles.cardSubtitle}>
                ⏱ {item.tiempo_total_min || 0} min · 🔥 {item.temperatura_horneado_c || 0} °C
              </Text>

              <Text style={styles.cardSubtitle}>
                🍰 {item.rendimiento || 'Sin definir'}
              </Text>
            </View>

            <TouchableOpacity
                onPress={() => toggleFavorita(item)}
                >
                <Text style={styles.favorite}>
                    {item.favorita === 1 ? '♥' : '♡'}
                </Text>
                </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            Aún no tienes recetas guardadas.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff7f5',
  },

  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#7a4a3a',
    marginBottom: 20,
  },

  button: {
    backgroundColor: '#d9a58b',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
  },

  buttonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },

  card: {
    backgroundColor: 'white',
    padding: 14,
    borderRadius: 20,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0ddd5',
    elevation: 4,
  },

  imagePlaceholder: {
    width: 82,
    height: 82,
    borderRadius: 18,
    backgroundColor: '#d9a58b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    overflow: 'hidden',
  },

  cardImage: {
    width: '100%',
    height: '100%',
  },

  imageLetter: {
    color: 'white',
    fontSize: 34,
    fontWeight: 'bold',
  },

  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#4a2f27',
    marginBottom: 4,
  },

  cardSubtitle: {
    fontSize: 14,
    color: '#8d6e63',
    marginTop: 2,
  },

  favorite: {
    fontSize: 30,
    color: '#b58b7a',
    paddingLeft: 10,
  },

  emptyText: {
    textAlign: 'center',
    color: '#9b7b70',
    marginTop: 30,
    fontSize: 16,
  },
});