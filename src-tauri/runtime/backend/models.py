from database import Base
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from datetime import datetime
from database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    usuario = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    rol = Column(String, nullable=False)
    activo = Column(Integer, default=1)


class Producto(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    precio = Column(Float, nullable=False)
    activo = Column(Integer, default=1)


class Mesa(Base):
    __tablename__ = "mesas"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    estado = Column(String, default="LIBRE")
    x = Column(Integer, default=80)
    y = Column(Integer, default=80)
    forma = Column(String, default="cuadrada")
    capacidad = Column(Integer, default=4)






class Cuenta(Base):
    __tablename__ = "cuentas"
    id = Column(Integer, primary_key=True, index=True)
    mesa_id = Column(Integer, ForeignKey("mesas.id"), nullable=False)
    estado = Column(String, default="ABIERTA")
    fecha_apertura = Column(DateTime, default=datetime.now)
    fecha_cierre = Column(DateTime, nullable=True)
 
 
class DetalleCuenta(Base):
    __tablename__ = "detalle_cuenta"
    id = Column(Integer, primary_key=True, index=True)
    cuenta_id = Column(Integer, ForeignKey("cuentas.id"), nullable=False)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    cantidad = Column(Integer, nullable=False)
    precio_unitario = Column(Float, nullable=False)
    observacion = Column(String, nullable=True)
    estado = Column(String, default="PENDIENTE")
    fecha = Column(DateTime, default=datetime.now)
 
 
class Pago(Base):
    __tablename__ = "pagos"
    id = Column(Integer, primary_key=True, index=True)
    cuenta_id = Column(Integer, ForeignKey("cuentas.id"), nullable=False)
    metodo = Column(String, nullable=False)
    monto = Column(Float, nullable=False)          # total cobrado
    subtotal = Column(Float, nullable=False, default=0)  # sin servicio
    servicio = Column(Float, nullable=False, default=0)  # monto 10%
    fecha = Column(DateTime, default=datetime.now)




class Orden(Base):
    __tablename__ = "ordenes"

    id = Column(Integer, primary_key=True, index=True)
    cuenta_id = Column(Integer, ForeignKey("cuentas.id"), nullable=False)
    fecha = Column(DateTime, default=datetime.now)           
    estado = Column(String, default="PENDIENTE")






class DetalleOrden(Base):
    __tablename__ = "detalle_orden"

    id = Column(Integer, primary_key=True, index=True)
    orden_id = Column(Integer, ForeignKey("ordenes.id"), nullable=False)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    cantidad = Column(Integer, nullable=False)
    observacion = Column(String, nullable=True)
    estado = Column(String, default="PENDIENTE")
    fecha = Column(DateTime, default=datetime.now)   










class Configuracion(Base):
    __tablename__ = "configuracion"

    id = Column(Integer, primary_key=True, index=True)
    nombre_negocio = Column(String, nullable=True)
    telefono = Column(String, nullable=True)
    correo = Column(String, nullable=True)
    direccion = Column(String, nullable=True)
    logo = Column(String, nullable=True)
    mensaje_factura = Column(String, nullable=True)
    hora_inicio_operacion = Column(String, nullable=True)
    hora_cierre_operacion = Column(String, nullable=True)
    porcentaje_servicio = Column(Float, nullable=True)
    # ── IMPRESORA ──
    impresora_vid = Column(Integer, nullable=True)
    impresora_pid = Column(Integer, nullable=True)