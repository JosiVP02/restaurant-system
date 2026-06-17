from pydantic import BaseModel
from typing import Optional


class ProductoCreate(BaseModel):
    nombre: str
    precio: float


class ProductoResponse(BaseModel):
    id: int
    nombre: str
    precio: float
    activo: int

    class Config:
        from_attributes = True


class MesaCreate(BaseModel):
    nombre: str
    forma: Optional[str] = "cuadrada"
    capacidad: Optional[int] = 4
    x: Optional[int] = 80
    y: Optional[int] = 80


class MesaUpdate(BaseModel):
    nombre: str
    forma: Optional[str] = "cuadrada"
    capacidad: Optional[int] = 4


class MesaUpdatePosition(BaseModel):
    x: int
    y: int


class MesaResponse(BaseModel):
    id: int
    nombre: str
    estado: str
    x: int
    y: int
    forma: Optional[str] = "cuadrada"
    capacidad: Optional[int] = 4

    class Config:
        from_attributes = True


class AbrirCuenta(BaseModel):
    mesa_id: int


class ProductoCuenta(BaseModel):
    producto_id: int
    cantidad: int
    observacion: str | None = None


class AgregarProductosCuenta(BaseModel):
    productos: list[ProductoCuenta]




class ConfiguracionSchema(BaseModel):
    nombre_negocio: str
    telefono: str
    correo: str
    direccion: str
    logo: str
    mensaje_factura: str
    hora_inicio_operacion: str
    hora_cierre_operacion: str
    porcentaje_servicio: float
    # ── IMPRESORA ──
    impresora_vid: Optional[int] = None
    impresora_pid: Optional[int] = None