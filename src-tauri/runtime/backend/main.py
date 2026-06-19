from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect
from database import SessionLocal
from models import Producto, Mesa, Cuenta, DetalleCuenta, Pago, Orden, DetalleOrden, Configuracion
from schemas import (
    ProductoCreate, MesaCreate, MesaUpdate,
    MesaUpdatePosition, AgregarProductosCuenta, ConfiguracionSchema,
)
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, date, timedelta
from sqlalchemy import func
from sqlalchemy.orm import Session
from database import Base, engine
from models import *
from database import inicializar_bd
import asyncio
import json

inicializar_bd()

app = FastAPI(title="Restaurant System API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



from mantenimiento import router as mantenimiento_router
app.include_router(mantenimiento_router)


# ═══════════════════════════════════════════════════════════
#  WEBSOCKET MANAGER
# ═══════════════════════════════════════════════════════════

class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, evento: str):
        msg = json.dumps({"evento": evento})
        muertos = []
        for ws in self.active:
            try:
                await ws.send_text(msg)
            except Exception:
                muertos.append(ws)
        for ws in muertos:
            self.active.remove(ws)

manager = ConnectionManager()

def broadcast_sync(evento: str):
    print(f"[WS] broadcast_sync llamado: {evento}", flush=True)
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(manager.broadcast(evento))
    except RuntimeError:
        # No hay loop corriendo en este hilo
        try:
            loop = asyncio.new_event_loop()
            loop.run_until_complete(manager.broadcast(evento))
            loop.close()
        except Exception as e:
            print(f"[WS] Error en broadcast_sync: {e}", flush=True)

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws)


# ── util ─────────────────────────────────────────────────────────────────────

def obtener_o_crear_cuenta(db, mesa_id: int) -> Cuenta:
    cuenta = db.query(Cuenta).filter(
        Cuenta.mesa_id == mesa_id, Cuenta.estado == "ABIERTA"
    ).first()
    if cuenta:
        return cuenta
    nueva = Cuenta(mesa_id=mesa_id, estado="ABIERTA", fecha_apertura=datetime.now())
    db.add(nueva)
    db.flush()
    return nueva


def rango_turno(fecha_str: str, hora_inicio: str, hora_cierre: str):
    fecha = datetime.strptime(fecha_str, "%Y-%m-%d")
    hi, mi = map(int, hora_inicio.split(":"))
    hc, mc = map(int, hora_cierre.split(":"))
    inicio = fecha.replace(hour=hi, minute=mi, second=0, microsecond=0)
    if hc <= hi:
        fin = (fecha + timedelta(days=1)).replace(
            hour=hc, minute=mc, second=59, microsecond=999999
        )
    else:
        fin = fecha.replace(hour=hc, minute=mc, second=59, microsecond=999999)
    return inicio, fin


def get_config(db):
    return db.query(Configuracion).first()


# ═══════════════════════════════════════════════════════════
#  RAÍZ
# ═══════════════════════════════════════════════════════════
@app.get("/")
def root():
    return {"message": "Restaurant System funcionando"}


# ═══════════════════════════════════════════════════════════
#  PRODUCTOS
# ═══════════════════════════════════════════════════════════
@app.post("/productos")
def crear_producto(producto: ProductoCreate):
    db = SessionLocal()
    p = Producto(nombre=producto.nombre, precio=producto.precio)
    db.add(p); db.commit(); db.refresh(p); db.close()
    return p

@app.get("/productos")
def obtener_productos():
    db = SessionLocal()
    ps = db.query(Producto).filter(Producto.activo == 1).all()
    db.close(); return ps

@app.get("/productos/{producto_id}")
def obtener_producto(producto_id: int):
    db = SessionLocal()
    p = db.query(Producto).filter(Producto.id == producto_id).first()
    db.close(); return p

@app.put("/productos/{producto_id}")
def editar_producto(producto_id: int, datos: ProductoCreate):
    db = SessionLocal()
    p = db.query(Producto).filter(Producto.id == producto_id).first()
    if not p: db.close(); return {"error": "No encontrado"}
    p.nombre = datos.nombre; p.precio = datos.precio
    db.commit(); db.refresh(p); db.close(); return p

@app.delete("/productos/{producto_id}")
def eliminar_producto(producto_id: int):
    db = SessionLocal()
    p = db.query(Producto).filter(Producto.id == producto_id).first()
    if not p: db.close(); return {"error": "No encontrado"}
    p.activo = 0; db.commit(); db.close()
    return {"message": "Producto desactivado"}


# ═══════════════════════════════════════════════════════════
#  MESAS
# ═══════════════════════════════════════════════════════════
@app.post("/mesas")
def crear_mesa(mesa: MesaCreate):
    db = SessionLocal()
    m = Mesa(nombre=mesa.nombre, forma=mesa.forma or "cuadrada",
             capacidad=mesa.capacidad or 4, x=mesa.x or 80, y=mesa.y or 80)
    db.add(m); db.commit(); db.refresh(m); db.close()
    broadcast_sync("mesas_actualizadas")
    return m

@app.get("/mesas")
def obtener_mesas():
    db = SessionLocal()
    ms = db.query(Mesa).all(); db.close(); return ms

@app.get("/mesas/{mesa_id}")
def obtener_mesa(mesa_id: int):
    db = SessionLocal()
    m = db.query(Mesa).filter(Mesa.id == mesa_id).first()
    db.close(); return m or {"error": "No encontrada"}

@app.put("/mesas/{mesa_id}")
def editar_mesa(mesa_id: int, datos: MesaUpdate):
    db = SessionLocal()
    m = db.query(Mesa).filter(Mesa.id == mesa_id).first()
    if not m: db.close(); return {"error": "No encontrada"}
    m.nombre = datos.nombre; m.forma = datos.forma; m.capacidad = datos.capacidad
    db.commit(); db.refresh(m); db.close()
    broadcast_sync("mesas_actualizadas")
    return m

@app.put("/mesas/{mesa_id}/posicion")
def actualizar_posicion(mesa_id: int, posicion: MesaUpdatePosition):
    db = SessionLocal()
    m = db.query(Mesa).filter(Mesa.id == mesa_id).first()
    if not m: db.close(); return {"error": "No encontrada"}
    m.x = posicion.x; m.y = posicion.y
    db.commit(); db.refresh(m); db.close()
    return m

@app.delete("/mesas/{mesa_id}")
def eliminar_mesa(mesa_id: int):
    db = SessionLocal()
    m = db.query(Mesa).filter(Mesa.id == mesa_id).first()
    if not m: db.close(); return {"error": "No encontrada"}
    db.delete(m); db.commit(); db.close()
    broadcast_sync("mesas_actualizadas")
    return {"message": "Mesa eliminada"}

@app.post("/mesas/{mesa_id}/liberar")
def liberar_mesa(mesa_id: int):
    db = SessionLocal()
    m = db.query(Mesa).filter(Mesa.id == mesa_id).first()
    if not m: db.close(); return {"error": "No encontrada"}
    c = db.query(Cuenta).filter(Cuenta.mesa_id == mesa_id, Cuenta.estado == "ABIERTA").first()
    if c: c.estado = "ANULADA"
    m.estado = "LIBRE"
    db.commit(); db.close()
    broadcast_sync("mesas_actualizadas")
    return {"message": "Mesa liberada"}


# ═══════════════════════════════════════════════════════════
#  CUENTAS
# ═══════════════════════════════════════════════════════════
@app.post("/cuentas/abrir/{mesa_id}")
def abrir_cuenta(mesa_id: int):
    db = SessionLocal()
    ex = db.query(Cuenta).filter(
        Cuenta.mesa_id == mesa_id, Cuenta.estado == "ABIERTA"
    ).order_by(Cuenta.id.desc()).first()
    if ex: db.close(); return ex
    nueva = Cuenta(mesa_id=mesa_id, estado="ABIERTA", fecha_apertura=datetime.now())
    db.add(nueva); db.commit()
    final = db.query(Cuenta).filter(
        Cuenta.mesa_id == mesa_id, Cuenta.estado == "ABIERTA"
    ).order_by(Cuenta.id.asc()).first()
    db.close()
    broadcast_sync("mesas_actualizadas")
    return final

@app.get("/cuentas/mesa/{mesa_id}")
def obtener_cuenta_mesa(mesa_id: int):
    db = SessionLocal()
    c = db.query(Cuenta).filter(
        Cuenta.mesa_id == mesa_id, Cuenta.estado == "ABIERTA"
    ).first()
    db.close(); return c

@app.get("/cuentas/{cuenta_id}/detalle")
def obtener_detalle(cuenta_id: int):
    db = SessionLocal()
    rows = (
        db.query(DetalleCuenta.id, Producto.nombre.label("producto"),
                 DetalleCuenta.cantidad, DetalleCuenta.precio_unitario)
        .join(Producto, Producto.id == DetalleCuenta.producto_id)
        .filter(DetalleCuenta.cuenta_id == cuenta_id).all()
    )
    db.close()
    return [{"id": r.id, "producto": r.producto,
             "cantidad": r.cantidad, "precio_unitario": r.precio_unitario} for r in rows]

@app.get("/cuentas/{cuenta_id}/ordenes")
def obtener_ordenes_cuenta(cuenta_id: int):
    db = SessionLocal()
    rows = (
        db.query(DetalleOrden.id, Orden.id.label("orden_id"), Orden.fecha,
                 Producto.nombre.label("producto"), DetalleOrden.cantidad,
                 DetalleOrden.observacion, DetalleOrden.estado)
        .join(DetalleOrden, DetalleOrden.orden_id == Orden.id)
        .join(Producto, Producto.id == DetalleOrden.producto_id)
        .filter(Orden.cuenta_id == cuenta_id)
        .order_by(Orden.id.asc(), DetalleOrden.id.asc()).all()
    )
    db.close()
    return [{"id": int(r.id), "orden_id": int(r.orden_id), "fecha": r.fecha,
             "producto": r.producto, "cantidad": int(r.cantidad),
             "observacion": r.observacion, "estado": r.estado} for r in rows]

@app.post("/cuentas/{cuenta_id}/agregar-productos")
def agregar_productos(cuenta_id: int, datos: AgregarProductosCuenta):
    db = SessionLocal()
    nueva_orden = Orden(cuenta_id=cuenta_id, fecha=datetime.now(), estado="PENDIENTE")
    db.add(nueva_orden); db.commit(); db.refresh(nueva_orden)
    orden_id = nueva_orden.id
    for item in datos.productos:
        prod = db.query(Producto).filter(Producto.id == item.producto_id).first()
        if not prod: continue
        db.add(DetalleOrden(orden_id=orden_id, producto_id=prod.id,
                            cantidad=item.cantidad, observacion=item.observacion,
                            estado="PENDIENTE", fecha=datetime.now()))
        dc = db.query(DetalleCuenta).filter(
            DetalleCuenta.cuenta_id == cuenta_id,
            DetalleCuenta.producto_id == prod.id
        ).first()
        if dc: dc.cantidad += item.cantidad
        else:
            db.add(DetalleCuenta(cuenta_id=cuenta_id, producto_id=prod.id,
                                 cantidad=item.cantidad, precio_unitario=prod.precio,
                                 fecha=datetime.now()))
        db.flush()
    c = db.query(Cuenta).filter(Cuenta.id == cuenta_id).first()
    if c:
        m = db.query(Mesa).filter(Mesa.id == c.mesa_id).first()
        if m: m.estado = "OCUPADA"
    db.commit(); db.close()
    broadcast_sync("orden_nueva")
    broadcast_sync("mesas_actualizadas")
    return {"message": "Orden creada", "orden_id": orden_id}

@app.post("/cuentas/{cuenta_id}/agregar-directo")
def agregar_directo(cuenta_id: int, datos: AgregarProductosCuenta):
    db = SessionLocal()
    for item in datos.productos:
        prod = db.query(Producto).filter(Producto.id == item.producto_id).first()
        if not prod: continue
        dc = db.query(DetalleCuenta).filter(
            DetalleCuenta.cuenta_id == cuenta_id,
            DetalleCuenta.producto_id == prod.id
        ).first()
        if dc: dc.cantidad += item.cantidad
        else:
            db.add(DetalleCuenta(cuenta_id=cuenta_id, producto_id=prod.id,
                                 cantidad=item.cantidad, precio_unitario=prod.precio,
                                 observacion=item.observacion, estado="PENDIENTE",
                                 fecha=datetime.now()))
        db.flush()
    c = db.query(Cuenta).filter(Cuenta.id == cuenta_id).first()
    if c:
        m = db.query(Mesa).filter(Mesa.id == c.mesa_id).first()
        if m: m.estado = "OCUPADA"
    db.commit(); db.close()
    broadcast_sync("cuenta_actualizada")
    broadcast_sync("mesas_actualizadas")
    return {"message": "Productos agregados"}

@app.post("/cuentas/{cuenta_id}/cerrar")
def cerrar_cuenta(cuenta_id: int, metodo: str, aplicar_servicio: bool = True):
    db = SessionLocal()
    cuenta = db.query(Cuenta).filter(Cuenta.id == cuenta_id).first()
    if not cuenta: db.close(); return {"error": "Cuenta no encontrada"}
    detalles = db.query(DetalleCuenta).filter(DetalleCuenta.cuenta_id == cuenta_id).all()
    subtotal = sum(d.cantidad * d.precio_unitario for d in detalles)
    servicio = round(subtotal * 0.10, 2) if aplicar_servicio else 0.0
    total    = round(subtotal + servicio, 2)
    db.add(Pago(cuenta_id=cuenta_id, metodo=metodo,
                monto=total, subtotal=subtotal, servicio=servicio,
                fecha=datetime.now()))
    cuenta.estado       = "PAGADA"
    cuenta.fecha_cierre = datetime.now()
    m = db.query(Mesa).filter(Mesa.id == cuenta.mesa_id).first()
    if m: m.estado = "LIBRE"
    db.commit(); db.close()
    broadcast_sync("mesas_actualizadas")
    return {"message": "Cuenta cerrada", "subtotal": subtotal,
            "servicio": servicio, "total": total}

@app.post("/cuentas/{cuenta_id}/transferir")
def transferir_cuenta(cuenta_id: int, nueva_mesa_id: int):
    db = SessionLocal()
    c = db.query(Cuenta).filter(Cuenta.id == cuenta_id).first()
    if not c: db.close(); return {"error": "No encontrada"}
    ma = db.query(Mesa).filter(Mesa.id == c.mesa_id).first()
    mn = db.query(Mesa).filter(Mesa.id == nueva_mesa_id).first()
    if not mn: db.close(); return {"error": "Mesa destino no encontrada"}
    mn.estado = "OCUPADA"
    if ma: ma.estado = "LIBRE"
    c.mesa_id = nueva_mesa_id
    db.commit(); db.close()
    broadcast_sync("mesas_actualizadas")
    return {"message": "Mesa transferida"}


# ─── detalle cuenta ───────────────────────────────────────────────────────────
@app.post("/detalle/{detalle_id}/sumar")
def sumar_producto(detalle_id: int):
    db = SessionLocal()
    d = db.query(DetalleCuenta).filter(DetalleCuenta.id == detalle_id).first()
    if not d: db.close(); return {"error": "No encontrado"}
    d.cantidad += 1; db.commit(); db.close()
    broadcast_sync("cuenta_actualizada")
    return {"message": "OK"}

@app.post("/detalle/{detalle_id}/restar")
def restar_producto(detalle_id: int):
    db = SessionLocal()
    d = db.query(DetalleCuenta).filter(DetalleCuenta.id == detalle_id).first()
    if not d: db.close(); return {"error": "No encontrado"}
    d.cantidad -= 1
    if d.cantidad <= 0: db.delete(d)
    db.commit(); db.close()
    broadcast_sync("cuenta_actualizada")
    return {"message": "OK"}

@app.delete("/detalle/{detalle_id}")
def eliminar_producto_cuenta(detalle_id: int):
    db = SessionLocal()
    d = db.query(DetalleCuenta).filter(DetalleCuenta.id == detalle_id).first()
    if not d: db.close(); return {"error": "No encontrado"}
    db.delete(d); db.commit(); db.close()
    broadcast_sync("cuenta_actualizada")
    return {"message": "Eliminado"}

@app.post("/detalle/{detalle_id}/estado")
def cambiar_estado_cocina(detalle_id: int, estado: str):
    db = SessionLocal()
    d = db.query(DetalleCuenta).filter(DetalleCuenta.id == detalle_id).first()
    if not d: db.close(); return {"error": "No encontrado"}
    d.estado = estado; db.commit(); db.close()
    return {"message": "OK"}


# ─── detalle orden ────────────────────────────────────────────────────────────
@app.post("/detalle-orden/{detalle_id}/estado")
def cambiar_estado_detalle_orden(detalle_id: int, estado: str):
    db = SessionLocal()
    d = db.query(DetalleOrden).filter(DetalleOrden.id == detalle_id).first()
    if not d: db.close(); return {"error": "No encontrado"}
    d.estado = estado; db.commit(); db.close()
    broadcast_sync("orden_actualizada")
    return {"message": "OK"}

@app.put("/detalle-orden/{detalle_id}/cantidad/{cantidad}")
def editar_cantidad_detalle_orden(detalle_id: int, cantidad: int):
    db = SessionLocal()
    d = db.query(DetalleOrden).filter(DetalleOrden.id == detalle_id).first()
    if not d: db.close(); return {"error": "No encontrado"}
    if d.estado != "PENDIENTE": db.close(); return {"error": "Solo pendientes"}
    if cantidad <= 0: db.delete(d)
    else: d.cantidad = cantidad
    db.commit(); db.close()
    broadcast_sync("orden_actualizada")
    return {"message": "OK"}

@app.put("/detalle-orden/{detalle_id}/observacion")
def editar_observacion_detalle_orden(detalle_id: int, observacion: str = ""):
    db = SessionLocal()
    d = db.query(DetalleOrden).filter(DetalleOrden.id == detalle_id).first()
    if not d: db.close(); return {"error": "No encontrado"}
    if d.estado != "PENDIENTE": db.close(); return {"error": "Solo pendientes"}
    d.observacion = observacion; db.commit(); db.close()
    broadcast_sync("orden_actualizada")
    return {"message": "OK"}

@app.delete("/detalle-orden/{detalle_id}")
def eliminar_detalle_orden(detalle_id: int):
    db = SessionLocal()
    d = db.query(DetalleOrden).filter(DetalleOrden.id == detalle_id).first()
    if not d: db.close(); return {"error": "No encontrado"}
    if d.estado != "PENDIENTE": db.close(); return {"error": "Solo pendientes"}
    db.delete(d); db.commit(); db.close()
    broadcast_sync("orden_actualizada")
    return {"message": "Cancelado"}


# ═══════════════════════════════════════════════════════════
#  COCINA
# ═══════════════════════════════════════════════════════════
@app.get("/cocina")
def obtener_cocina():
    db = SessionLocal()
    rows = (
        db.query(DetalleOrden.id, Orden.id.label("orden_id"),
                 Mesa.nombre.label("mesa"), Producto.nombre.label("producto"),
                 DetalleOrden.cantidad, DetalleOrden.observacion,
                 DetalleOrden.estado, DetalleOrden.fecha)
        .join(Orden,    Orden.id    == DetalleOrden.orden_id)
        .join(Cuenta,   Cuenta.id   == Orden.cuenta_id)
        .join(Mesa,     Mesa.id     == Cuenta.mesa_id)
        .join(Producto, Producto.id == DetalleOrden.producto_id)
        .filter(DetalleOrden.estado != "ENTREGADO")
        .order_by(Orden.id.asc()).all()
    )
    db.close()
    return [{"id": r.id, "orden_id": r.orden_id, "mesa": r.mesa,
             "producto": r.producto, "cantidad": r.cantidad,
             "observacion": r.observacion, "estado": r.estado, "fecha": r.fecha}
            for r in rows]


# ═══════════════════════════════════════════════════════════
#  CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════
@app.get("/configuracion")
def obtener_configuracion():
    db = SessionLocal()
    cfg = db.query(Configuracion).first()
    if not cfg:
        cfg = Configuracion(
            nombre_negocio="Mi Restaurante",
            telefono="", correo="", direccion="", logo="",
            mensaje_factura="Gracias por su visita",
            hora_inicio_operacion="18:00",
            hora_cierre_operacion="02:00",
            porcentaje_servicio=10,
            impresora_vid=None,
            impresora_pid=None,
        )
        db.add(cfg); db.commit(); db.refresh(cfg)
    db.close(); return cfg

@app.put("/configuracion")
def guardar_configuracion(datos: ConfiguracionSchema):
    db = SessionLocal()
    cfg = db.query(Configuracion).first()
    if not cfg:
        cfg = Configuracion(); db.add(cfg)
    cfg.nombre_negocio        = datos.nombre_negocio
    cfg.telefono              = datos.telefono
    cfg.correo                = datos.correo
    cfg.direccion             = datos.direccion
    cfg.logo                  = datos.logo
    cfg.mensaje_factura       = datos.mensaje_factura
    cfg.hora_inicio_operacion = datos.hora_inicio_operacion
    cfg.hora_cierre_operacion = datos.hora_cierre_operacion
    cfg.porcentaje_servicio   = datos.porcentaje_servicio
    cfg.impresora_vid         = datos.impresora_vid
    cfg.impresora_pid         = datos.impresora_pid
    db.commit(); db.refresh(cfg); db.close(); return cfg


# ═══════════════════════════════════════════════════════════
#  REPORTES DE VENTAS
# ═══════════════════════════════════════════════════════════

def _rango_fechas(fecha_inicio: str, fecha_fin: str, cfg):
    h_ini_h, h_ini_m = map(int, cfg.hora_inicio_operacion.split(":"))
    h_fin_h, h_fin_m = map(int, cfg.hora_cierre_operacion.split(":"))
    desde = datetime.strptime(fecha_inicio, "%Y-%m-%d").replace(
        hour=h_ini_h, minute=h_ini_m, second=0, microsecond=0
    )
    hasta_base = datetime.strptime(fecha_fin, "%Y-%m-%d").replace(
        hour=h_fin_h, minute=h_fin_m, second=59, microsecond=999999
    )
    if h_fin_h < h_ini_h:
        hasta_base += timedelta(days=1)
    return desde, hasta_base

def _pagos_del_turno(db, fi, ff):
    cuentas = db.query(Cuenta).filter(
        Cuenta.estado == "PAGADA",
        Cuenta.fecha_cierre >= fi,
        Cuenta.fecha_cierre <= ff,
    ).all()
    ids = [c.id for c in cuentas]
    pagos = db.query(Pago).filter(Pago.cuenta_id.in_(ids)).all() if ids else []
    return pagos, ids, cuentas

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/reportes/resumen")
def reporte_resumen(
    fecha_inicio: str | None = None,
    fecha_fin:    str | None = None,
    db: Session = Depends(get_db),
):
    cfg = get_config(db)
    if not cfg:
        return {"error": "Configure el horario en Configuración"}

    fi_str = fecha_inicio or date.today().strftime("%Y-%m-%d")
    ff_str = fecha_fin    or fi_str
    fi, ff = _rango_fechas(fi_str, ff_str, cfg)

    cuentas = db.query(Cuenta).filter(
        Cuenta.estado == "PAGADA",
        Cuenta.fecha_cierre >= fi,
        Cuenta.fecha_cierre <= ff,
    ).all()
    ids = [c.id for c in cuentas]
    pagos = db.query(Pago).filter(Pago.cuenta_id.in_(ids)).all() if ids else []

    total_ventas   = sum(p.monto    for p in pagos)
    total_subtotal = sum(p.subtotal for p in pagos)
    total_servicio = sum(p.servicio for p in pagos)
    total_cuentas  = len(pagos)
    ticket_prom    = total_ventas / total_cuentas if total_cuentas else 0

    metodos: dict = {}
    for p in pagos:
        if p.metodo not in metodos:
            metodos[p.metodo] = {"monto": 0, "subtotal": 0, "servicio": 0}
        metodos[p.metodo]["monto"]    += p.monto
        metodos[p.metodo]["subtotal"] += p.subtotal
        metodos[p.metodo]["servicio"] += p.servicio

    top = []
    if ids:
        rows = (
            db.query(
                Producto.nombre,
                func.sum(DetalleCuenta.cantidad).label("qty"),
                func.sum(DetalleCuenta.cantidad * DetalleCuenta.precio_unitario).label("monto"),
            )
            .join(DetalleCuenta, DetalleCuenta.producto_id == Producto.id)
            .filter(DetalleCuenta.cuenta_id.in_(ids))
            .group_by(Producto.nombre)
            .order_by(func.sum(DetalleCuenta.cantidad).desc())
            .limit(10).all()
        )
        top = [{"nombre": r.nombre, "cantidad": int(r.qty), "total": float(r.monto)} for r in rows]

    pago_by_id   = {p.cuenta_id: p for p in pagos}
    ventas_hora: dict = {}
    ventas_dia:  dict = {}
    for c in cuentas:
        if not c.fecha_cierre or c.id not in pago_by_id:
            continue
        monto = pago_by_id[c.id].monto
        h     = f"{c.fecha_cierre.hour:02d}:00"
        dia   = c.fecha_cierre.strftime("%Y-%m-%d")
        ventas_hora[h]  = ventas_hora.get(h, 0)  + monto
        ventas_dia[dia] = ventas_dia.get(dia, 0) + monto

    return {
        "fecha_inicio":    fi.strftime("%Y-%m-%d %H:%M"),
        "fecha_fin":       ff.strftime("%Y-%m-%d %H:%M"),
        "total_ventas":    round(total_ventas, 2),
        "total_subtotal":  round(total_subtotal, 2),
        "total_servicio":  round(total_servicio, 2),
        "total_cuentas":   total_cuentas,
        "ticket_promedio": round(ticket_prom, 2),
        "metodos_pago": [
            {"metodo": k, "monto": round(v["monto"], 2),
             "subtotal": round(v["subtotal"], 2), "servicio": round(v["servicio"], 2)}
            for k, v in metodos.items()
        ],
        "top_productos":   top,
        "ventas_por_hora": [{"hora": k, "monto": round(v, 2)} for k, v in sorted(ventas_hora.items())],
        "ventas_por_dia":  [{"dia": k,  "monto": round(v, 2)} for k, v in sorted(ventas_dia.items())],
    }

@app.get("/reportes/cuentas")
def reporte_cuentas(
    fecha_inicio: str | None = None,
    fecha_fin:    str | None = None,
    pagina:    int = 1,
    por_pagina: int = 20,
    db: Session = Depends(get_db),
):
    cfg = get_config(db)
    if not cfg:
        return {"error": "Configure el horario en Configuración"}

    fi_str = fecha_inicio or date.today().strftime("%Y-%m-%d")
    ff_str = fecha_fin    or fi_str
    fi, ff = _rango_fechas(fi_str, ff_str, cfg)

    q = (
        db.query(Cuenta)
        .filter(
            Cuenta.estado == "PAGADA",
            Cuenta.fecha_cierre >= fi,
            Cuenta.fecha_cierre <= ff,
        )
        .order_by(Cuenta.fecha_cierre.desc())
    )

    total   = q.count()
    cuentas = q.offset((pagina - 1) * por_pagina).limit(por_pagina).all()

    resultado = []
    for c in cuentas:
        pago = db.query(Pago).filter(Pago.cuenta_id == c.id).first()
        mesa = db.query(Mesa).filter(Mesa.id == c.mesa_id).first()
        resultado.append({
            "id":             c.id,
            "mesa":           mesa.nombre if mesa else f"Mesa {c.mesa_id}",
            "fecha_apertura": c.fecha_apertura.isoformat() if c.fecha_apertura else None,
            "fecha_cierre":   c.fecha_cierre.isoformat()   if c.fecha_cierre   else None,
            "metodo":         pago.metodo    if pago else "—",
            "subtotal":       round(pago.subtotal, 2) if pago else 0,
            "servicio":       round(pago.servicio, 2) if pago else 0,
            "total":          round(pago.monto, 2)    if pago else 0,
        })

    return {"total": total, "pagina": pagina, "por_pagina": por_pagina, "cuentas": resultado}


# ═══════════════════════════════════════════════════════════
#  CIERRE DE TURNO
# ═══════════════════════════════════════════════════════════
@app.get("/cierre/calcular")
def calcular_cierre(fecha: str, monto_apertura: float = 0):
    db  = SessionLocal()
    cfg = get_config(db)
    if not cfg:
        db.close(); return {"error": "Configure el horario en Configuración"}

    fi, ff = rango_turno(fecha, cfg.hora_inicio_operacion, cfg.hora_cierre_operacion)
    pagos, ids, cuentas = _pagos_del_turno(db, fi, ff)

    total_efectivo = sum(p.monto for p in pagos if p.metodo == "Efectivo")
    total_tarjeta  = sum(p.monto for p in pagos if p.metodo == "Tarjeta")
    total_sinpe    = sum(p.monto for p in pagos if p.metodo == "SINPE")
    total_ventas   = total_efectivo + total_tarjeta + total_sinpe
    total_servicio = sum(p.servicio for p in pagos)
    total_subtotal = sum(p.subtotal for p in pagos)
    caja_esperada  = monto_apertura + total_efectivo

    pago_by_id = {p.cuenta_id: p for p in pagos}
    detalle_cuentas = []
    for c in sorted(cuentas, key=lambda x: x.fecha_cierre or datetime.min):
        pago = pago_by_id.get(c.id)
        mesa = db.query(Mesa).filter(Mesa.id == c.mesa_id).first()
        detalle_cuentas.append({
            "id":           c.id,
            "mesa":         mesa.nombre if mesa else f"Mesa {c.mesa_id}",
            "fecha_cierre": c.fecha_cierre.isoformat() if c.fecha_cierre else None,
            "metodo":       pago.metodo   if pago else "—",
            "subtotal":     pago.subtotal if pago else 0,
            "servicio":     pago.servicio if pago else 0,
            "total":        pago.monto    if pago else 0,
        })

    top = []
    if ids:
        rows = (
            db.query(Producto.nombre,
                     func.sum(DetalleCuenta.cantidad).label("qty"),
                     func.sum(DetalleCuenta.cantidad * DetalleCuenta.precio_unitario).label("monto"))
            .join(DetalleCuenta, DetalleCuenta.producto_id == Producto.id)
            .filter(DetalleCuenta.cuenta_id.in_(ids))
            .group_by(Producto.nombre)
            .order_by(func.sum(DetalleCuenta.cantidad).desc())
            .limit(10).all()
        )
        top = [{"nombre": r.nombre, "cantidad": int(r.qty), "total": float(r.monto)} for r in rows]

    db.close()
    return {
        "fecha":           fecha,
        "turno_inicio":    fi.strftime("%Y-%m-%d %H:%M"),
        "turno_fin":       ff.strftime("%Y-%m-%d %H:%M"),
        "total_ventas":    round(total_ventas, 2),
        "total_subtotal":  round(total_subtotal, 2),
        "total_servicio":  round(total_servicio, 2),
        "total_cuentas":   len(cuentas),
        "ticket_promedio": round(total_ventas / len(cuentas), 2) if cuentas else 0,
        "total_efectivo":  round(total_efectivo, 2),
        "total_tarjeta":   round(total_tarjeta, 2),
        "total_sinpe":     round(total_sinpe, 2),
        "monto_apertura":  round(monto_apertura, 2),
        "caja_esperada":   round(caja_esperada, 2),
        "top_productos":   top,
        "cuentas":         detalle_cuentas,
    }


# ═══════════════════════════════════════════════════════════
#  FACTURAS
# ═══════════════════════════════════════════════════════════
@app.get("/facturas/{cuenta_id}")
def obtener_factura(cuenta_id: int):
    db = SessionLocal()
    cuenta = db.query(Cuenta).filter(Cuenta.id == cuenta_id).first()
    if not cuenta:
        db.close(); return {"error": "Cuenta no encontrada"}
    mesa    = db.query(Mesa).filter(Mesa.id == cuenta.mesa_id).first()
    pago    = db.query(Pago).filter(Pago.cuenta_id == cuenta_id).first()
    detalles = (
        db.query(Producto.nombre.label("producto"), DetalleCuenta.cantidad, DetalleCuenta.precio_unitario)
        .join(Producto, Producto.id == DetalleCuenta.producto_id)
        .filter(DetalleCuenta.cuenta_id == cuenta_id).all()
    )
    productos = [{"producto": d.producto, "cantidad": d.cantidad,
                  "precio_unitario": d.precio_unitario,
                  "total": round(d.cantidad * d.precio_unitario, 2)} for d in detalles]
    db.close()
    return {
        "id": cuenta.id, "mesa": mesa.nombre if mesa else "",
        "fecha": cuenta.fecha_cierre, "metodo": pago.metodo if pago else "",
        "subtotal": pago.subtotal if pago else 0,
        "servicio": pago.servicio if pago else 0,
        "total": pago.monto if pago else 0,
        "productos": productos,
    }


# ═══════════════════════════════════════════════════════════
#  HEALTH
# ═══════════════════════════════════════════════════════════
@app.get("/health")
def health():
    return {"status": "ok", "nombre": "POSKEY"}


# ═══════════════════════════════════════════════════════════
#  ARCHIVOS ESTÁTICOS (MOBILE)
# ═══════════════════════════════════════════════════════════
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MOBILE_DIST = os.path.join(BASE_DIR, "static", "dist")

print("MOBILE_DIST =", MOBILE_DIST)
print("EXISTE =", os.path.isdir(MOBILE_DIST))

if os.path.isdir(MOBILE_DIST):
    app.mount(
        "/mobile/assets",
        StaticFiles(directory=os.path.join(MOBILE_DIST, "assets")),
        name="mobile-assets",
    )

    @app.get("/mobile")
    @app.get("/mobile/{full_path:path}")
    async def serve_mobile_spa(full_path: str = ""):
        candidato = os.path.join(MOBILE_DIST, full_path)
        if full_path and os.path.isfile(candidato):
            return FileResponse(candidato)
        return FileResponse(os.path.join(MOBILE_DIST, "index.html"))