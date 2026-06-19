// ── Tipos ─────────────────────────────────────────────────────────────────────
interface TopProducto {
  nombre: string;
  cantidad: number;
  total: number;
}

interface CuentaDetalle {
  id: number;
  mesa: string;
  fecha_cierre: string | null;
  metodo: string;
  subtotal: number;
  servicio: number;
  total: number;
}

interface ResultadoCierre {
  fecha: string;
  turno_inicio: string;
  turno_fin: string;
  total_ventas: number;
  total_subtotal: number;
  total_servicio: number;
  total_cuentas: number;
  ticket_promedio: number;
  total_efectivo: number;
  total_tarjeta: number;
  total_sinpe: number;
  monto_apertura: number;
  caja_esperada: number;
  top_productos: TopProducto[];
  cuentas: CuentaDetalle[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) => `₡${Math.round(n).toLocaleString("es-CR")}`;

const pct = (parte: number, total: number) =>
  total > 0 ? ((parte / total) * 100).toFixed(1) + "%" : "0%";

const fmtHora = (s: string | null) =>
  s
    ? new Date(s).toLocaleTimeString("es-CR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const fmtFechaHora = (s: string) =>
  new Date(s + ":00").toLocaleString("es-CR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const ahora = () =>
  new Date().toLocaleString("es-CR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

// ── Generador principal ───────────────────────────────────────────────────────
export function imprimirReporteCierre(
  resultado: ResultadoCierre,
  nombreNegocio = "Mi Restaurante"
) {
  const cajaFinal = resultado.monto_apertura + resultado.total_efectivo;

  const metodos = [
    { nombre: "Efectivo", monto: resultado.total_efectivo, icono: "" },
    { nombre: "Tarjeta", monto: resultado.total_tarjeta, icono: "" },
    { nombre: "SINPE", monto: resultado.total_sinpe, icono: "" },
  ].filter((m) => m.monto > 0);

  const filasMetodos = metodos
    .map(
      (m) => `
      <tr>
        <td class="label">${m.icono} ${m.nombre}</td>
        <td class="mono">${fmt(m.monto)}</td>
        <td class="mono pct-cell">${pct(m.monto, resultado.total_ventas)}</td>
      </tr>`
    )
    .join("");

  const filasProductos = resultado.top_productos
    .slice(0, 10)
    .map(
      (p, i) => `
      <tr>
        <td class="rank">${i + 1}</td>
        <td>${p.nombre}</td>
        <td class="mono center">${p.cantidad}</td>
        <td class="mono">${fmt(p.total)}</td>
      </tr>`
    )
    .join("");

  const filasCuentas = resultado.cuentas
    .map(
      (c, i) => `
      <tr class="${i % 2 === 0 ? "" : "alt"}">
        <td class="mono">#${c.id}</td>
        <td>${c.mesa}</td>
        <td class="center">${fmtHora(c.fecha_cierre)}</td>
        <td class="center">${c.metodo}</td>
        <td class="mono">${fmt(c.subtotal)}</td>
        <td class="mono ${c.servicio > 0 ? "servicio" : ""}">
          ${c.servicio > 0 ? fmt(c.servicio) : "—"}
        </td>
        <td class="mono bold">${fmt(c.total)}</td>
      </tr>`
    )
    .join("");

  const topProductos =
    resultado.top_productos.length > 0
      ? `
    <section class="section">
      <h2>Productos del turno</h2>
      <table>
        <thead>
          <tr>
            <th style="width:36px">#</th>
            <th>Producto</th>
            <th class="center">Uds.</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>${filasProductos}</tbody>
      </table>
    </section>`
      : "";

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>Cierre_${nombreNegocio}_${resultado.fecha}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 11px;
    color: #1a1a1a;
    background: white;
    padding: 28px 32px;
    max-width: 720px;
    margin: 0 auto;
  }

  /* ── ENCABEZADO ── */
  header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #0f2d1f;
    padding-bottom: 16px;
    margin-bottom: 20px;
  }
  .negocio-nombre {
    font-size: 18px;
    font-weight: 800;
    color: #0f2d1f;
    letter-spacing: -0.3px;
  }
  .negocio-sub {
    font-size: 10px;
    color: #6b7280;
    margin-top: 3px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  .turno-info { text-align: right; }
  .turno-fecha {
    font-size: 12px;
    font-weight: 700;
    color: #0f2d1f;
  }
  .turno-rango {
    font-size: 10px;
    color: #6b7280;
    margin-top: 2px;
  }

  /* ── TOTAL DESTACADO ── */
  .total-destacado {
    background: #0f2d1f;
    color: white;
    border-radius: 8px;
    padding: 18px 22px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .total-destacado .td-label {
    font-size: 10px;
    opacity: 0.55;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 700;
  }
  .total-destacado .td-monto {
    font-size: 30px;
    font-weight: 800;
    letter-spacing: -1px;
    margin-top: 4px;
  }
  .total-destacado .td-stats { text-align: right; }
  .total-destacado .td-stat {
    font-size: 11px;
    opacity: 0.7;
    margin-top: 3px;
  }
  .total-destacado .td-stat strong {
    color: white;
    font-weight: 700;
  }

  /* ── KPI ROW ── */
  .kpi-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 20px;
  }
  .kpi-card {
    border: 1px solid #e5e7eb;
    border-radius: 7px;
    padding: 12px 14px;
  }
  .kpi-card .kv-label {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #6b7280;
    margin-bottom: 5px;
  }
  .kpi-card .kv-value {
    font-size: 15px;
    font-weight: 800;
    color: #0f2d1f;
  }

  /* ── SECCIONES ── */
  .section { margin-bottom: 20px; }
  .section h2 {
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #374151;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 6px;
    margin-bottom: 10px;
  }

  /* ── TABLAS ── */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10.5px;
  }
  thead tr { background: #f3f4f6; }
  th {
    padding: 7px 10px;
    text-align: left;
    font-size: 9.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #6b7280;
    border-bottom: 1px solid #e5e7eb;
  }
  td {
    padding: 7px 10px;
    border-bottom: 1px solid #f3f4f6;
    color: #1f2937;
    vertical-align: middle;
  }
  tr.alt td { background: #f9fafb; }
  tr:last-child td { border-bottom: none; }

  /* ── TABLA SIMPLE ── */
  table.simple td {
    padding: 8px 10px;
    border-bottom: 1px solid #f3f4f6;
  }
  table.simple tr.total-row td {
    border-top: 2px solid #0f2d1f;
    border-bottom: none;
    padding-top: 10px;
    padding-bottom: 10px;
  }

  /* ── MÉTODOS + ARQUEO ── */
  .col-metodos-arqueo {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 20px;
  }
  .pct-bar {
    height: 4px;
    background: #e5e7eb;
    border-radius: 99px;
    margin-top: 4px;
    overflow: hidden;
  }
  .pct-bar-fill {
    height: 100%;
    background: #0f2d1f;
    border-radius: 99px;
  }
  td.pct-cell { color: #6b7280; font-size: 10px; }

  /* ── UTILIDADES ── */
  .mono   { font-variant-numeric: tabular-nums; }
  .bold   { font-weight: 800; }
  .center { text-align: center; }
  .label  { color: #374151; }
  .servicio { color: #b45309; }
  .rank {
    width: 28px;
    text-align: center;
    font-weight: 800;
    color: #6b7280;
    font-size: 10px;
  }
  .hint {
    font-size: 9.5px;
    color: #9ca3af;
    margin-top: 8px;
    font-style: italic;
  }

  /* ── PIE ── */
  footer {
    margin-top: 28px;
    padding-top: 12px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    font-size: 9px;
    color: #9ca3af;
  }

  /* ── PRINT ── */
  @media print {
    body { padding: 12px 16px; }
    .no-print { display: none !important; }
    @page { margin: 1cm; size: A4 portrait; }
  }
</style>
</head>
<body>

<!-- ENCABEZADO -->
<header>
  <div>
    <div class="negocio-nombre">${nombreNegocio}</div>
    <div class="negocio-sub">Reporte de cierre de turno</div>
  </div>
  <div class="turno-info">
    <div class="turno-fecha">${fmtFechaHora(resultado.turno_inicio).split(",")[0]}</div>
    <div class="turno-rango">
      ${fmtHora(resultado.turno_inicio)} – ${fmtHora(resultado.turno_fin)}
    </div>
  </div>
</header>

<!-- TOTAL DESTACADO -->
<div class="total-destacado">
  <div>
    <div class="td-label">Total ventas del turno</div>
    <div class="td-monto">${fmt(resultado.total_ventas)}</div>
  </div>
  <div class="td-stats">
    <div class="td-stat"><strong>${resultado.total_cuentas}</strong> cuentas cobradas</div>
    <div class="td-stat">Ticket promedio <strong>${fmt(resultado.ticket_promedio)}</strong></div>
    <div class="td-stat">Servicio 10% <strong>${fmt(resultado.total_servicio)}</strong></div>
  </div>
</div>

<!-- KPI CARDS -->
<div class="kpi-row">
  <div class="kpi-card">
    <div class="kv-label">Subtotal (sin 10%)</div>
    <div class="kv-value">${fmt(resultado.total_subtotal)}</div>
  </div>
  <div class="kpi-card">
    <div class="kv-label">Servicio 10%</div>
    <div class="kv-value">${fmt(resultado.total_servicio)}</div>
  </div>
  <div class="kpi-card">
    <div class="kv-label">Efectivo recibido</div>
    <div class="kv-value">${fmt(resultado.total_efectivo)}</div>
  </div>
  <div class="kpi-card">
    <div class="kv-label">Ticket promedio</div>
    <div class="kv-value">${fmt(resultado.ticket_promedio)}</div>
  </div>
</div>

<!-- MÉTODOS + ARQUEO -->
<div class="col-metodos-arqueo">

  <section class="section" style="margin-bottom:0">
    <h2>Métodos de pago</h2>
    <table class="simple">
      <tbody>
        ${filasMetodos}
        <tr class="total-row">
          <td class="label bold">Total</td>
          <td class="mono bold">${fmt(resultado.total_ventas)}</td>
          <td class="mono pct-cell">100%</td>
        </tr>
      </tbody>
    </table>
    <div style="margin-top:12px; display:flex; flex-direction:column; gap:8px;">
      ${metodos
        .map(
          (m) => `
        <div>
          <div style="display:flex; justify-content:space-between; font-size:9.5px; color:#6b7280; margin-bottom:3px;">
            <span>${m.nombre}</span>
            <span>${pct(m.monto, resultado.total_ventas)}</span>
          </div>
          <div class="pct-bar">
            <div class="pct-bar-fill" style="width:${pct(m.monto, resultado.total_ventas)}"></div>
          </div>
        </div>`
        )
        .join("")}
    </div>
  </section>

  ${
    resultado.monto_apertura > 0
      ? `<section class="section" style="margin-bottom:0">
    <h2>Arqueo de caja</h2>
    <table class="simple">
      <tbody>
        <tr>
          <td class="label">Efectivo apertura</td>
          <td class="mono">${fmt(resultado.monto_apertura)}</td>
        </tr>
        <tr>
          <td class="label">+ Ventas efectivo</td>
          <td class="mono">${fmt(resultado.total_efectivo)}</td>
        </tr>
        <tr class="total-row">
          <td class="label bold">= Caja esperada</td>
          <td class="mono bold">${fmt(cajaFinal)}</td>
        </tr>
      </tbody>
    </table>
    <p class="hint">Compare con el efectivo físico contado al cierre.</p>
  </section>`
      : `<section class="section" style="margin-bottom:0">
    <h2>Arqueo de caja</h2>
    <p class="hint" style="margin-top:8px;">No se ingresó monto de apertura.</p>
  </section>`
  }

</div>

${topProductos}

<!-- DETALLE CUENTAS -->
<section class="section">
  <h2>Detalle de cuentas (${resultado.total_cuentas})</h2>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Mesa</th>
        <th class="center">Hora</th>
        <th class="center">Método</th>
        <th>Subtotal</th>
        <th>Servicio</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${filasCuentas}
      <tr style="background:#e8f5ee; border-top:2px solid #0f2d1f;">
        <td colspan="4" class="bold" style="color:#0f2d1f;">TOTAL DEL TURNO</td>
        <td class="mono bold" style="color:#0f2d1f;">${fmt(resultado.total_subtotal)}</td>
        <td class="mono bold" style="color:#b45309;">${fmt(resultado.total_servicio)}</td>
        <td class="mono bold" style="color:#0f2d1f;">${fmt(resultado.total_ventas)}</td>
      </tr>
    </tbody>
  </table>
</section>

<!-- PIE -->
<footer>
  <span>Generado el ${ahora()}</span>
  <span>${nombreNegocio} · Reporte oficial de cierre de turno</span>
</footer>

<script>
  window.onload = () => {
    window.focus();
    window.print();
  };
</script>
</body>
</html>`;

  // ── Imprimir vía iframe (compatible con Tauri, sin window.open) ──────────────
  const iframe = document.createElement("iframe");

  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;

  if (!doc) {
    console.error("No se pudo acceder al documento del iframe.");
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  // Esperamos a que cargue completamente antes de imprimir
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error("Error al imprimir:", e);
    } finally {
      // Limpiamos el iframe después de que el diálogo de impresión cierre
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }
  };
}