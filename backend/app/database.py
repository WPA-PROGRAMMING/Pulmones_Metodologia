from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Usamos SQLite para pruebas rápidas. En producción cambiarías esto por PostgreSQL.
SQLALCHEMY_DATABASE_URL = "sqlite:///./medical_ai.db"

# connect_args es necesario solo para SQLite
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependencia para obtener la sesión de BD en cada petición
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()