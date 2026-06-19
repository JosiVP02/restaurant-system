"""
Endpoints de mantenimiento de base de datos.

Reglas de seguridad aplicadas en TODAS las queries de borrado:
- Nunca se toca una Cuenta con estado == "ABIERTA" (mesa activa).
- Las Ordenes solo se borran si TODOS sus DetalleOrden están en ENTREGADO
  y la Cuenta a la que pertenecen ya no está abierta.
- El borrado de cuentas por rango de fechas excluye explícitamente
  cualquier cuenta ABIERTA, sin importar la fecha.

Importar este router en main.py con:
    from mantenimiento import router as mantenimiento_router
    app.include_router(mantenimiento_router)
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from database import SessionLocal
from models import Orden, DetalleOrden, Cuenta, DetalleCuenta, Pago

router = APIRouter(prefix="/mantenimiento", tags=["mantenimiento"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ─────────────────────────────────────────────────────────────────────────────
# Helpers de selección (centralizan la lógica para que resumen y borrado
# usen exactamente el mismo criterio, sin duplicar reglas)
# ─────────────────────────────────────────────────────────────────────────────

def _ids_ordenes_borrables(db: Session) -> list[int]:
    """
    IDs de Orden cuyos DetalleOrden están todos en ENTREGADO
    y cuya Cuenta ya no está ABIERTA (mesa libre/cerrada).
    Una orden sin ningún detalle no se considera borrable (caso borde).
    """
    subq_no_entregado = (
        db.query(DetalleOrden.orden_id)
        .filter(DetalleOrden.estado != "ENTREGADO")
        .distinct()
        .subquery()
    )

    ids = (
        db.query(Orden.id)
        .join(Cuenta, Cuenta.id == Orden.cuenta_id)
        .filter(Cuenta.estado != "ABIERTA")
        .filter(Orden.id.notin_(db.query(subq_no_entregado.c.orden_id)))
        .filter(
            Orden.id.in_(db.query(DetalleOrden.orden_id).distinct())
        )  # excluye órdenes sin detalles
        .all()
    )
    return [r[0] for r in ids]


def _ids_cuentas_borrables(db: Session, desde: datetime, hasta: datetime) -> list[int]:
    """
    IDs de Cuenta con estado != ABIERTA cuya fecha_apertura cae en el rango.
    Una cuenta ABIERTA nunca se incluye, sin importar su fecha.
    """
    ids = (
        db.query(Cuenta.id)
        .filter(Cuenta.estado != "ABIERTA")
        .filter(Cuenta.fecha_apertura >= desde)
        .filter(Cuenta.fecha_apertura <= hasta)
        .all()
    )
    return [r[0] for r in ids]


# ─────────────────────────────────────────────────────────────────────────────
# RESUMEN — para mostrar al usuario antes de confirmar el borrado
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/resumen")
def resumen_mantenimiento(
    desde: str | None = Query(default=None, description="YYYY-MM-DD"),
    hasta: str | None = Query(default=None, description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
):
    ids_ordenes = _ids_ordenes_borrables(db)
    detalles_ordenes_count = (
        db.query(func.count(DetalleOrden.id))
        .filter(DetalleOrden.orden_id.in_(ids_ordenes))
        .scalar()
        if ids_ordenes else 0
    )

    resultado = {
        "ordenes_borrables": len(ids_ordenes),
        "detalles_orden_borrables": detalles_ordenes_count,
    }

    if desde and hasta:
        d = datetime.strptime(desde, "%Y-%m-%d").replace(hour=0, minute=0, second=0)
        h = datetime.strptime(hasta, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
        ids_cuentas = _ids_cuentas_borrables(db, d, h)

        detalles_cuenta_count = (
            db.query(func.count(DetalleCuenta.id))
            .filter(DetalleCuenta.cuenta_id.in_(ids_cuentas))
            .scalar()
            if ids_cuentas else 0
        )
        pagos_count = (
            db.query(func.count(Pago.id))
            .filter(Pago.cuenta_id.in_(ids_cuentas))
            .scalar()
            if ids_cuentas else 0
        )
        ordenes_de_cuentas = (
            db.query(func.count(Orden.id))
            .filter(Orden.cuenta_id.in_(ids_cuentas))
            .scalar()
            if ids_cuentas else 0
        )

        resultado.update({
            "cuentas_borrables": len(ids_cuentas),
            "detalles_cuenta_borrables": detalles_cuenta_count,
            "pagos_borrables": pagos_count,
            "ordenes_de_cuentas_borrables": ordenes_de_cuentas,
        })

    return resultado


# ─────────────────────────────────────────────────────────────────────────────
# BORRADO — órdenes entregadas y huérfanas de mesa activa
# ─────────────────────────────────────────────────────────────────────────────

@router.delete("/ordenes")
def limpiar_ordenes(db: Session = Depends(get_db)):
    ids_ordenes = _ids_ordenes_borrables(db)

    if not ids_ordenes:
        return {"message": "No hay órdenes para limpiar", "ordenes_eliminadas": 0, "detalles_eliminados": 0}

    detalles_eliminados = (
        db.query(DetalleOrden)
        .filter(DetalleOrden.orden_id.in_(ids_ordenes))
        .delete(synchronize_session=False)
    )
    ordenes_eliminadas = (
        db.query(Orden)
        .filter(Orden.id.in_(ids_ordenes))
        .delete(synchronize_session=False)
    )

    db.commit()
    return {
        "message": "Órdenes limpiadas correctamente",
        "ordenes_eliminadas": ordenes_eliminadas,
        "detalles_eliminados": detalles_eliminados,
    }


# ─────────────────────────────────────────────────────────────────────────────
# BORRADO — histórico de cuentas por rango de fechas
# ─────────────────────────────────────────────────────────────────────────────

@router.delete("/cuentas")
def limpiar_cuentas(
    desde: str = Query(..., description="YYYY-MM-DD"),
    hasta: str = Query(..., description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
):
    d = datetime.strptime(desde, "%Y-%m-%d").replace(hour=0, minute=0, second=0)
    h = datetime.strptime(hasta, "%Y-%m-%d").replace(hour=23, minute=59, second=59)

    if h < d:
        return {"error": "El rango de fechas es inválido (hasta < desde)"}

    ids_cuentas = _ids_cuentas_borrables(db, d, h)

    if not ids_cuentas:
        return {
            "message": "No hay cuentas para eliminar en ese rango",
            "cuentas_eliminadas": 0,
            "detalles_cuenta_eliminados": 0,
            "pagos_eliminados": 0,
            "ordenes_eliminadas": 0,
            "detalles_orden_eliminados": 0,
        }

    ids_ordenes = [
        r[0] for r in db.query(Orden.id).filter(Orden.cuenta_id.in_(ids_cuentas)).all()
    ]

    detalles_orden_eliminados = 0
    ordenes_eliminadas = 0
    if ids_ordenes:
        detalles_orden_eliminados = (
            db.query(DetalleOrden)
            .filter(DetalleOrden.orden_id.in_(ids_ordenes))
            .delete(synchronize_session=False)
        )
        ordenes_eliminadas = (
            db.query(Orden)
            .filter(Orden.id.in_(ids_ordenes))
            .delete(synchronize_session=False)
        )

    pagos_eliminados = (
        db.query(Pago)
        .filter(Pago.cuenta_id.in_(ids_cuentas))
        .delete(synchronize_session=False)
    )
    detalles_cuenta_eliminados = (
        db.query(DetalleCuenta)
        .filter(DetalleCuenta.cuenta_id.in_(ids_cuentas))
        .delete(synchronize_session=False)
    )
    cuentas_eliminadas = (
        db.query(Cuenta)
        .filter(Cuenta.id.in_(ids_cuentas))
        .delete(synchronize_session=False)
    )

    db.commit()
    return {
        "message": "Histórico de cuentas eliminado correctamente",
        "cuentas_eliminadas": cuentas_eliminadas,
        "detalles_cuenta_eliminados": detalles_cuenta_eliminados,
        "pagos_eliminados": pagos_eliminados,
        "ordenes_eliminadas": ordenes_eliminadas,
        "detalles_orden_eliminados": detalles_orden_eliminados,
    }