import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

function escapar(texto) {
  return String(texto || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function assetToBase64(assetModule) {
  const asset = Asset.fromModule(assetModule);
  await asset.downloadAsync();

  const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
    encoding: 'base64',
  });

  const extension = asset.localUri.toLowerCase().endsWith('.jpeg')
    ? 'jpeg'
    : 'png';

  return `data:image/${extension};base64,${base64}`;
}

function normalizarNombre(valor) {
  return String(valor || 'cliente')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function fechaArchivoDesdePedido(pedido) {
  const base = pedido.created_at || new Date().toISOString();
  const fecha = new Date(String(base).replace(' ', 'T'));

  if (Number.isNaN(fecha.getTime())) {
    return new Date()
      .toISOString()
      .slice(0, 16)
      .replace('T', '_')
      .replace(':', '');
  }

  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  const hora = String(fecha.getHours()).padStart(2, '0');
  const minuto = String(fecha.getMinutes()).padStart(2, '0');

  return `${anio}-${mes}-${dia}_${hora}${minuto}`;
}

function nombreArchivoFriendly(pedido) {
  const cliente = normalizarNombre(pedido.cliente_nombre);
  const fecha = fechaArchivoDesdePedido(pedido);

  return `Comprobante_KUMO_${cliente}_${fecha}.pdf`;
}

export async function generarComprobantePedidoPDF({
  pedido,
  detalle = [],
}) {
  const logoBase64 = await assetToBase64(require('../assets/kumo_logo.png'));

  const fechaComprobante = new Date().toLocaleDateString('es-CO');

  const subtotalProductos = detalle.reduce((total, item) => {
    return total + Number(item.subtotal || 0);
  }, 0);

  const domicilio = Number(pedido.costo_envio || 0);
  const totalPedido = Number(pedido.total || 0);

  const productosHtml = detalle
    .map(
      (item) => `
      <tr>
        <td>${escapar(item.receta_nombre || 'Producto')}</td>
        <td class="center">${Number(item.cantidad || 0)}</td>
        <td class="right">${COP.format(item.precio_unitario || 0)}</td>
        <td class="right">${COP.format(item.subtotal || 0)}</td>
      </tr>
    `
    )
    .join('');

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />

        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 24px;
            color: #3B2A24;
          }

          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #EFE3DA;
            padding-bottom: 14px;
            margin-bottom: 18px;
          }

          .logo {
            width: 160px;
          }

          .doc-title {
            text-align: right;
          }

          .doc-title h1 {
            margin: 0;
            font-size: 22px;
            color: #8B5E4E;
          }

          .doc-title p {
            margin: 4px 0 0;
            font-size: 12px;
            color: #7A6F68;
          }

          .grid {
            display: flex;
            gap: 14px;
            margin-bottom: 14px;
          }

          .box {
            flex: 1;
            border: 1px solid #EFE3DA;
            border-radius: 12px;
            padding: 12px;
          }

          .section-title {
            font-size: 14px;
            font-weight: 800;
            margin-bottom: 8px;
            color: #8B5E4E;
          }

          .row {
            margin-bottom: 5px;
            font-size: 12px;
          }

          .label {
            font-weight: 700;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-top: 8px;
          }

          th {
            background: #F1E1D6;
            padding: 8px;
            text-align: left;
          }

          td {
            border-bottom: 1px solid #EFE3DA;
            padding: 8px;
          }

          .right {
            text-align: right;
          }

          .center {
            text-align: center;
          }

          .totals-payment {
            display: flex;
            gap: 14px;
            margin-top: 16px;
          }

          .totals {
            flex: 1;
            border: 1px solid #EFE3DA;
            border-radius: 12px;
            padding: 12px;
          }

          .payment {
            flex: 1;
            border: 1px solid #EFE3DA;
            border-radius: 12px;
            padding: 12px;
            background: #FFF8F3;
          }

          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 7px;
            font-size: 13px;
          }

          .grand-total {
            margin-top: 10px;
            padding-top: 10px;
            border-top: 2px solid #8B5E4E;
            font-size: 19px;
            font-weight: 900;
            color: #8B5E4E;
          }

          .payment-note {
            margin-top: 12px;
            padding: 10px;
            border-radius: 10px;
            background: #FFFFFF;
            font-size: 11px;
            color: #7A6F68;
            line-height: 15px;
          }

          .footer {
            margin-top: 18px;
            font-size: 10px;
            color: #7A6F68;
            text-align: center;
          }
        </style>
      </head>

      <body>
        <div class="header">
          <img class="logo" src="${logoBase64}" />

          <div class="doc-title">
            <h1>Comprobante de pedido</h1>
            <p>KUMO Bakery</p>
          </div>
        </div>

        <div class="grid">
          <div class="box">
            <div class="section-title">Datos del cliente</div>
            <div class="row"><span class="label">Cliente:</span> ${escapar(pedido.cliente_nombre)}</div>
            <div class="row"><span class="label">Teléfono:</span> ${escapar(pedido.cliente_telefono)}</div>
          </div>

          <div class="box">
            <div class="section-title">Datos del pedido</div>
            <div class="row"><span class="label">Fecha comprobante:</span> ${fechaComprobante}</div>
            <div class="row"><span class="label">Fecha pedido:</span> ${escapar(pedido.created_at || '')}</div>
            <div class="row"><span class="label">Fecha entrega:</span> ${escapar(pedido.fecha_entrega || 'No definida')}</div>
            <div class="row"><span class="label">Estado:</span> ${escapar(pedido.estado || 'pendiente')}</div>
          </div>
        </div>

        <div class="box">
          <div class="section-title">Detalle del pedido</div>

          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th class="center">Cant.</th>
                <th class="right">Vr. unitario</th>
                <th class="right">Subtotal</th>
              </tr>
            </thead>

            <tbody>
              ${productosHtml || '<tr><td colspan="4">Sin productos registrados</td></tr>'}
            </tbody>
          </table>
        </div>

        <div class="totals-payment">
          <div class="totals">
            <div class="section-title">Resumen</div>

            <div class="total-row">
              <span>Productos</span>
              <strong>${COP.format(subtotalProductos)}</strong>
            </div>

            <div class="total-row">
              <span>Domicilio</span>
              <strong>${COP.format(domicilio)}</strong>
            </div>

            <div class="total-row grand-total">
              <span>Total</span>
              <span>${COP.format(totalPedido)}</span>
            </div>
          </div>

          <div class="payment">
            <div class="section-title">Datos de pago</div>

            <div class="row"><span class="label">Banco:</span> Bancolombia</div>
            <div class="row"><span class="label">Tipo de cuenta:</span> Cuenta de ahorros</div>
            <div class="row"><span class="label">Número de cuenta:</span> 23679141929</div>

            <div class="payment-note">
              Una vez realizado el pago, envía el comprobante de transferencia.
            </div>
          </div>
        </div>

        <div class="footer">
          Este documento es un comprobante de pedido generado por KUMO Bakery.
        </div>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });

  const nuevoNombre = nombreArchivoFriendly(pedido);
  const nuevoUri = `${FileSystem.documentDirectory}${nuevoNombre}`;

  await FileSystem.copyAsync({
    from: uri,
    to: nuevoUri,
  });

  return nuevoUri;
}