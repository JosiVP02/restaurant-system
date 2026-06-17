from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from pathlib import Path
import os

appdata = Path(os.getenv("APPDATA")) / "POSKEY"
appdata.mkdir(parents=True, exist_ok=True)

db_path = appdata / "restaurant.db"

DATABASE_URL = f"sqlite:///{db_path}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def inicializar_bd():
    """
    Crea tablas y datos iniciales si no existen.
    """

    from models import Usuario, Configuracion

    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:

        if not db.query(Configuracion).first():
            db.add(
                Configuracion(
                    nombre_negocio="POSKEY",
                    telefono="",
                    correo="",
                    direccion="",
                    logo="",
                    mensaje_factura="Gracias por su visita",

                    hora_inicio_operacion="08:00",
                    hora_cierre_operacion="22:00",

                    porcentaje_servicio=10
                )
            )

            db.commit()

        if not db.query(Usuario).filter(
            Usuario.usuario == "admin"
        ).first():
            db.add(
                Usuario(
                    nombre="Administrador",
                    usuario="admin",
                    password="admin123",
                    rol="ADMIN",
                    activo=1,
                )
            )
            db.commit()

    finally:
        db.close()

    print(f"Base de datos: {db_path}")