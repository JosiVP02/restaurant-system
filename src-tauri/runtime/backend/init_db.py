from database import Base, engine, SessionLocal
from models import Usuario

Base.metadata.create_all(bind=engine)

db = SessionLocal()

admin_existente = db.query(Usuario).filter(Usuario.usuario == "admin").first()

if not admin_existente:
    admin = Usuario(
        nombre="Administrador",
        usuario="admin",
        password="admin123",
        rol="ADMIN",
        activo=1
    )

    db.add(admin)
    db.commit()

db.close()

print("Base de datos creada correctamente.")
print("Usuario inicial: admin")
print("Contraseña inicial: admin123")