import React, { useEffect } from 'react';

import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as DocumentPicker from 'expo-document-picker';

import {
  initDatabase,
  obtenerRecetas,
} from '../database/db';

const DB_NAME = 'sara_reposteria.db';
const SQLITE_DIR = FileSystem.documentDirectory + 'SQLite';
const DB_PATH = `${SQLITE_DIR}/${DB_NAME}`;

function fechaArchivo() {
  const ahora = new Date();

  const yyyy = ahora.getFullYear();
  const mm = String(ahora.getMonth() + 1).padStart(2, '0');
  const dd = String(ahora.getDate()).padStart(2, '0');
  const hh = String(ahora.getHours()).padStart(2, '0');
  const mi = String(ahora.getMinutes()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}_${hh}-${mi}`;
}

function limpiarCsv(valor) {
  const texto = String(valor ?? '').replace(/"/g, '""');
  return `"${texto}"`;
}

function limpiarHtml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function parseIngredientes(valor) {
  try {
    const data = JSON.parse(valor || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default function CopiasExportacionesScreen() {
  useEffect(() => {
    initDatabase();
  }, []);

  async function compartirArchivo(uri, mimeType) {
    const disponible = await Sharing.isAvailableAsync();

    if (!disponible) {
      Alert.alert(
        'No disponible',
        'Este dispositivo no permite compartir archivos desde la app.'
      );
      return;
    }

    await Sharing.shareAsync(uri, {
      mimeType,
      dialogTitle: 'Compartir archivo',
    });
  }

  async function exportarBackupBD() {
    try {
      await FileSystem.makeDirectoryAsync(SQLITE_DIR, {
        intermediates: true,
      });

      const info = await FileSystem.getInfoAsync(DB_PATH);

      if (!info.exists) {
        Alert.alert(
          'Base de datos no encontrada',
          'Aún no existe una base de datos para exportar.'
        );
        return;
      }

      const destino = `${FileSystem.cacheDirectory}kumo_backup_${fechaArchivo()}.db`;

      await FileSystem.copyAsync({
        from: DB_PATH,
        to: destino,
      });

      await compartirArchivo(destino, 'application/octet-stream');
    } catch (error) {
      console.error('Error exportando backup:', error);
      Alert.alert('Error', 'No fue posible exportar la copia de seguridad.');
    }
  }

  async function importarBackupBD() {
    try {
      const resultado = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (resultado.canceled) return;

      const archivo = resultado.assets?.[0];

      if (!archivo?.uri) return;

      Alert.alert(
        'Importar copia de seguridad',
        'Esto reemplazará la base de datos actual. Después de importar, cierra y abre nuevamente la app para cargar la información restaurada.',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Importar',
            style: 'destructive',
            onPress: async () => {
              try {
                await FileSystem.makeDirectoryAsync(SQLITE_DIR, {
                  intermediates: true,
                });

                await FileSystem.deleteAsync(DB_PATH, {
                  idempotent: true,
                });

                await FileSystem.copyAsync({
                  from: archivo.uri,
                  to: DB_PATH,
                });

                Alert.alert(
                  'Copia importada',
                  'La base de datos fue restaurada. Cierra y abre nuevamente la app.'
                );
              } catch (error) {
                console.error('Error importando backup:', error);
                Alert.alert(
                  'Error',
                  'No fue posible importar la copia de seguridad.'
                );
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error seleccionando backup:', error);
      Alert.alert('Error', 'No fue posible seleccionar el archivo.');
    }
  }

  async function exportarRecetasCsv() {
    try {
      const recetas = obtenerRecetas();

      if (!recetas.length) {
        Alert.alert('Sin recetas', 'No hay recetas para exportar.');
        return;
      }

      const encabezados = [
        'Nombre',
        'Descripción',
        'Rendimiento',
        'Tiempo preparación',
        'Tiempo cocción',
        'Tiempo reposo',
        'Tiempo total',
        'Temperatura',
        'Vida útil días',
        'Conservación',
        'Ingredientes',
        'Instrucciones',
      ];

      const filas = recetas.map((receta) => {
        const ingredientes = parseIngredientes(receta.ingredientes)
          .map((item) => item.texto)
          .join(' | ');

        return [
          receta.nombre,
          receta.descripcion,
          receta.rendimiento,
          receta.tiempo_preparacion_min,
          receta.tiempo_coccion_min,
          receta.tiempo_reposo_min,
          receta.tiempo_total_min,
          receta.temperatura_horneado_c,
          receta.vida_util_dias,
          receta.conservacion,
          ingredientes,
          receta.instrucciones,
        ].map(limpiarCsv).join(',');
      });

      const contenido = `\uFEFF${encabezados.map(limpiarCsv).join(',')}\n${filas.join('\n')}`;

      const uri = `${FileSystem.cacheDirectory}kumo_recetas_${fechaArchivo()}.csv`;

      await FileSystem.writeAsStringAsync(
            uri,
            contenido,
            {
                encoding: 'utf8',
            }
            );
      await compartirArchivo(uri, 'text/csv');
    } catch (error) {
      console.error('Error exportando recetas CSV:', error);
      Alert.alert('Error', 'No fue posible exportar las recetas.');
    }
  }

  async function exportarRecetasPdf() {
    try {
      const recetas = obtenerRecetas();

      if (!recetas.length) {
        Alert.alert('Sin recetas', 'No hay recetas para exportar.');
        return;
      }

      const recetasHtml = recetas.map((receta) => {
        const ingredientes = parseIngredientes(receta.ingredientes)
          .map((item) => `<li>${limpiarHtml(item.texto)}</li>`)
          .join('');

        return `
          <section class="receta">
            <h2>${limpiarHtml(receta.nombre)}</h2>

            <p class="descripcion">
              ${limpiarHtml(receta.descripcion || '')}
            </p>

            <div class="meta">
              <span>Rendimiento: ${limpiarHtml(receta.rendimiento || 'Sin definir')}</span>
              <span>Tiempo total: ${Number(receta.tiempo_total_min || 0)} min</span>
              <span>Vida útil: ${Number(receta.vida_util_dias || 0)} días</span>
              <span>Conservación: ${limpiarHtml(receta.conservacion || 'Sin definir')}</span>
            </div>

            <h3>Ingredientes</h3>
            <ul>${ingredientes || '<li>Sin ingredientes registrados</li>'}</ul>

            <h3>Instrucciones</h3>
            <p>${limpiarHtml(receta.instrucciones || 'Sin instrucciones registradas.')}</p>
          </section>
        `;
      }).join('');

      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body {
                font-family: Arial, sans-serif;
                color: #3B2A24;
                padding: 28px;
              }

              h1 {
                text-align: center;
                margin-bottom: 4px;
              }

              .subtitulo {
                text-align: center;
                color: #7A6F68;
                margin-bottom: 28px;
              }

              .receta {
                page-break-inside: avoid;
                border: 1px solid #E8DCD3;
                border-radius: 14px;
                padding: 18px;
                margin-bottom: 18px;
              }

              h2 {
                margin-top: 0;
                color: #8B5E4E;
              }

              h3 {
                margin-bottom: 6px;
              }

              .descripcion {
                color: #7A6F68;
              }

              .meta {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
                margin: 12px 0;
                font-size: 13px;
              }

              li {
                margin-bottom: 4px;
              }
            </style>
          </head>

          <body>
            <h1>KUMO Bakery</h1>
            <p class="subtitulo">Recetario exportado</p>
            ${recetasHtml}
          </body>
        </html>
      `;

      const archivo = await Print.printToFileAsync({
        html,
      });

      await compartirArchivo(archivo.uri, 'application/pdf');
    } catch (error) {
      console.error('Error exportando recetas PDF:', error);
      Alert.alert('Error', 'No fue posible exportar el PDF.');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Copias y exportaciones</Text>

        <Text style={styles.subtitle}>
          Respalda la base de datos y exporta información útil del negocio.
        </Text>

        <ActionCard
          icon="cloud-upload-outline"
          title="Exportar copia de seguridad"
          description="Genera un archivo .db con toda la información local de la app."
          onPress={exportarBackupBD}
        />

        <ActionCard
          icon="cloud-download-outline"
          title="Importar copia de seguridad"
          description="Restaura una base de datos exportada previamente."
          danger
          onPress={importarBackupBD}
        />

        <View style={styles.separator} />

        <ActionCard
          icon="grid-outline"
          title="Exportar recetas a Excel"
          description="Genera un archivo CSV compatible con Excel."
          onPress={exportarRecetasCsv}
        />

        <ActionCard
          icon="document-text-outline"
          title="Exportar recetario PDF"
          description="Genera un PDF imprimible con todas las recetas."
          onPress={exportarRecetasPdf}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionCard({
  icon,
  title,
  description,
  onPress,
  danger = false,
}) {
  return (
    <Pressable
      style={[
        styles.actionCard,
        danger && styles.actionCardDanger,
      ]}
      onPress={onPress}
    >
      <View
        style={[
          styles.iconBox,
          danger && styles.iconBoxDanger,
        ]}
      >
        <Ionicons
          name={icon}
          size={25}
          color={danger ? '#9B2C2C' : '#8B5E4E'}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.actionTitle,
            danger && styles.actionTitleDanger,
          ]}
        >
          {title}
        </Text>

        <Text style={styles.actionDescription}>
          {description}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color="#A79C95"
      />
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
    paddingBottom: 50,
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
    lineHeight: 20,
  },

  actionCard: {
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

  actionCardDanger: {
    backgroundColor: '#FFF5F5',
    borderColor: '#F3B5B5',
  },

  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F1E1D6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconBoxDanger: {
    backgroundColor: '#FEE2E2',
  },

  actionTitle: {
    color: '#3B2A24',
    fontSize: 16,
    fontWeight: '900',
  },

  actionTitleDanger: {
    color: '#9B2C2C',
  },

  actionDescription: {
    marginTop: 3,
    color: '#7A6F68',
    fontSize: 12,
    lineHeight: 17,
  },

  separator: {
    height: 1,
    backgroundColor: '#E8DCD3',
    marginVertical: 8,
  },
});