import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { api } from "../services/api";
import { readFile, BaseDirectory } from "@tauri-apps/plugin-fs";

const CARPETA_APP = "POSKEY";

function moneda(valor: number) {
  return `₡${Number(valor || 0).toLocaleString("es-CR")}`;
}

function escapar(texto: string) {
  return String(texto ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function bytesABase64(bytes: Uint8Array) {
  let binario = "";
  for (let i = 0; i < bytes.length; i++) {
    binario += String.fromCharCode(bytes[i]);
  }
  return btoa(binario);
}

async function obtenerLogoBase64(nombreLogo: string): Promise<string | null> {
  if (!nombreLogo) return null;
  try {
    const bytes = await readFile(`${CARPETA_APP}/${nombreLogo}`, {
      baseDir: BaseDirectory.AppData,
    });
    return `data:image/png;base64,${bytesABase64(bytes)}`;
  } catch {
    return null;
  }
}

async function obtenerHTMLFactura(cuentaId: number) {
  const [facturaRes, configRes] = await Promise.all([
    api.get(`/facturas/${cuentaId}`),
    api.get("/configuracion"),
  ]);

  const data = facturaRes.data;
  const config = configRes.data;

  const logoSrc = await obtenerLogoBase64(config.logo);

  const numeroFactura = String(data.id).padStart(6, "0");

  const productosHTML = data.productos
    .map(
      (p: any) => `
        <tr>
          <td>${escapar(p.producto)}</td>
          <td class="center">${p.cantidad}</td>
          <td class="right">${moneda(p.precio_unitario)}</td>
          <td class="right">${moneda(p.total)}</td>
        </tr>
      `
    )
    .join("");

  return `
    <div class="factura">

      <div class="header">
        ${logoSrc ? `<img class="logo" src="${logoSrc}" />` : ""}
        <div class="nombre">${escapar(config.nombre_negocio || "POSKEY")}</div>
        ${
          config.direccion
            ? `<div class="dato">${escapar(config.direccion)}</div>`
            : ""
        }
        ${
          config.telefono || config.correo
            ? `<div class="dato">
                ${config.telefono ? `Tel: ${escapar(config.telefono)}` : ""}
                ${config.telefono && config.correo ? " · " : ""}
                ${config.correo ? escapar(config.correo) : ""}
              </div>`
            : ""
        }
      </div>

      <div class="linea-gruesa"></div>

      <div class="info">
        <div class="info-fila">
          <span>Factura</span>
          <strong>${numeroFactura}</strong>
        </div>
        <div class="info-fila">
          <span>Fecha</span>
          <strong>${new Date(data.fecha).toLocaleString("es-CR", {
            dateStyle: "short",
            timeStyle: "short",
          })}</strong>
        </div>
        <div class="info-fila">
          <span>Mesa</span>
          <strong>${escapar(data.mesa)}</strong>
        </div>
        <div class="info-fila">
          <span>Método</span>
          <strong>${escapar(data.metodo)}</strong>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th class="center">Cant.</th>
            <th class="right">Precio</th>
            <th class="right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${productosHTML}
        </tbody>
      </table>

      <div class="totales">
        <div>
          <span>Subtotal</span>
          <strong>${moneda(data.subtotal)}</strong>
        </div>

        <div>
          <span>Servicio</span>
          <strong>${moneda(data.servicio)}</strong>
        </div>

        <div class="total">
          <span>TOTAL</span>
          <strong>${moneda(data.total)}</strong>
        </div>
      </div>

      <div class="footer">
        ${escapar(config.mensaje_factura || "Gracias por su visita")}
      </div>
    </div>
  `;
}

function estilosFactura() {
  return `
    <style>
      body {
        margin: 0;
        padding: 0;
        background: white;
        font-family: 'Helvetica Neue', Arial, sans-serif;
        color: #111827;
      }

      .factura {
        width: 760px;
        background: white;
        padding: 44px;
        box-sizing: border-box;
      }

      /* HEADER */
      .header {
        text-align: center;
        margin-bottom: 28px;
      }

      .logo {
        max-width: 90px;
        max-height: 90px;
        object-fit: contain;
        margin-bottom: 18px;
      }

      .nombre {
        font-size: 22px;
        font-weight: 800;
        letter-spacing: 0.01em;
        color: #111827;
      }

      .dato {
        font-size: 13px;
        margin-top: 4px;
        color: #6b7280;
      }

      .linea-gruesa {
        border-top: 2px solid #111827;
        margin: 24px 0 28px;
      }

      /* INFO */
      .info {
        display: grid;
        grid-template-columns: 1fr 1fr;
        column-gap: 32px;
        row-gap: 14px;
        font-size: 14px;
        margin-bottom: 32px;
      }

      .info-fila {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 12px;
      }

      .info-fila span {
        color: #6b7280;
        flex-shrink: 0;
      }

      .info-fila strong {
        color: #111827;
        text-align: right;
      }

      /* TABLA */
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 14px;
        margin-top: 4px;
      }

      th {
        text-align: left;
        font-size: 11.5px;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: #6b7280;
        padding: 0 8px 10px 0;
        border-bottom: 1.5px solid #111827;
      }

      td {
        padding: 14px 8px 14px 0;
        border-bottom: 1px solid #e5e7eb;
      }

      th:last-child, td:last-child { padding-right: 0; }

      .center { text-align: center; }
      .right  { text-align: right; }

      /* TOTALES */
      .totales {
        margin-top: 28px;
        margin-left: auto;
        width: 260px;
        font-size: 14px;
      }

      .totales div {
        display: flex;
        justify-content: space-between;
        padding: 7px 0;
        color: #4b5563;
      }

      .totales .total {
        margin-top: 10px;
        padding-top: 14px;
        border-top: 2px solid #111827;
        font-size: 19px;
        font-weight: 800;
        color: #111827;
      }

      /* FOOTER */
      .footer {
        text-align: center;
        margin-top: 36px;
        padding-top: 18px;
        border-top: 1px dashed #cbd5e1;
        font-size: 14px;
        font-weight: 600;
        color: #374151;
      }
    </style>
  `;
}

export async function generarFacturaPDF(cuentaId: number, descargar = true) {
  const html = await obtenerHTMLFactura(cuentaId);

  const contenedor = document.createElement("div");
  contenedor.style.position = "fixed";
  contenedor.style.left = "-9999px";
  contenedor.style.top = "0";
  contenedor.innerHTML = estilosFactura() + html;

  document.body.appendChild(contenedor);

  const factura = contenedor.querySelector(".factura") as HTMLElement;

  const canvas = await html2canvas(factura, {
    scale: 2,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF("p", "mm", "a4");

  const pageWidth = pdf.internal.pageSize.getWidth();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);

  document.body.removeChild(contenedor);

  if (descargar) {
    pdf.save(`Factura-${cuentaId}.pdf`);
  }

  return pdf;
}

export async function imprimirFactura(cuentaId: number) {
  const html = await obtenerHTMLFactura(cuentaId);

  const ventana = window.open("", "_blank", "width=900,height=700");

  if (!ventana) return;

  ventana.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Factura ${cuentaId}</title>
        ${estilosFactura()}
        <style>
          @media print {
            body {
              margin: 0;
            }

            .factura {
              width: 100%;
              padding: 28px;
            }
          }
        </style>
      </head>
      <body>
        ${html}
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);

  ventana.document.close();
}