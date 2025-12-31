import os
import shutil
import uuid
import json
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List

from . import models, schemas, database, ml_model
from passlib.context import CryptContext
from jose import JWTError, jwt

# --- CONFIGURACIÓN ---
SECRET_KEY = "tu_clave_super_secreta"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
UPLOAD_DIR = "uploaded_images"
GRADCAM_DIR = "gradcam_images"  # Nueva carpeta para GradCAMs

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(GRADCAM_DIR, exist_ok=True)  # Crear carpeta GradCAM

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Medical Assistant AI API")

# --- CORS ---
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173", 
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Montar directorios estáticos
app.mount("/static", StaticFiles(directory=UPLOAD_DIR), name="static")
app.mount("/gradcam", StaticFiles(directory=GRADCAM_DIR), name="gradcam")  # Nuevo endpoint para GradCAMs

# --- FUNCIONES AUXILIARES ---
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

# --- ENDPOINTS ---

@app.post("/register", response_model=schemas.UserOut)
def register(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    hashed_pw = get_password_hash(user.password)
    new_user = models.User(email=user.email, hashed_password=hashed_pw)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

# --- ENDPOINT PREDICT MEJORADO ---
@app.post("/predict", response_model=schemas.DiagnosisOut)
async def predict_condition(
    file: UploadFile = File(...),
    patientName: str = Form(...), 
    nss: str = Form(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    # Validar tipo de archivo
    allowed_extensions = {'png', 'jpg', 'jpeg', 'bmp', 'tiff'}
    file_extension = file.filename.split('.')[-1].lower()
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail="Formato de archivo no soportado. Use: PNG, JPG, JPEG, BMP, TIFF"
        )
    
    try:
        # 1. Guardar archivo
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        file_location = f"{UPLOAD_DIR}/{unique_filename}"
        
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        print(f"Imagen guardada en: {file_location}")
        
        # 2. Realizar predicción con el modelo real
        prediction_result = ml_model.ai_model.predict_image(file_location)
        print(f"Predicción completada: {prediction_result}")
        
        # 3. Generar GradCAM - INTENTAR CON EL FEATURE EXTRACTOR
        gradcam_filename = None
        try:
            gradcam_filename = ml_model.ai_model.generate_gradcam(
                file_location, 
                prediction_result['predicted_class_index']
            )
            if gradcam_filename:
                print(f"GradCAM generado: {gradcam_filename}")
            else:
                print("GradCAM no se pudo generar (pero continuamos)")
        except Exception as gradcam_error:
            print(f"Error en GradCAM (no crítico): {gradcam_error}")
            gradcam_filename = None
        
        # 4. Guardar en BD
        new_diagnosis = models.DiagnosisHistory(
            filename=unique_filename,
            gradcam_filename=gradcam_filename,
            prediction=prediction_result['predicted_class'],
            confidence=f"{prediction_result['confidence']:.2%}",
            patient_name=patientName,
            nss=nss,
            user_id=current_user.id,
            probabilities_json=json.dumps(prediction_result['all_predictions'])
        )
        
        db.add(new_diagnosis)
        db.commit()
        db.refresh(new_diagnosis)
        
        print(f"Diagnóstico guardado en BD con ID: {new_diagnosis.id}")
        print(f"Datos guardados: Predicción={new_diagnosis.prediction}, GradCAM={new_diagnosis.gradcam_filename}")
        
        return new_diagnosis
        
    except Exception as e:
        # Limpiar archivo en caso de error
        if 'file_location' in locals() and os.path.exists(file_location):
            os.remove(file_location)
        print(f"Error en endpoint /predict: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail=f"Error procesando la imagen: {str(e)}"
        )

@app.get("/history", response_model=List[schemas.DiagnosisOut])
def get_history(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    return current_user.diagnoses

# Endpoint de salud del modelo
@app.get("/model-health")
def model_health():
    try:
        # Verificar que los modelos estén cargados
        models_loaded = (
            ml_model.ai_model.svm_model is not None and 
            ml_model.ai_model.feature_extractor is not None and 
            ml_model.ai_model.class_info is not None
        )
        
        return {
            "status": "healthy" if models_loaded else "unhealthy",
            "message": "Modelos cargados correctamente" if models_loaded else "Modelos no cargados correctamente",
            "classes": ml_model.ai_model.class_info['class_names'] if models_loaded else [],
            "gradcam_available": True  # Ahora siempre disponible con el feature extractor
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

@app.get("/")
def read_root():
    return {"message": "Medical Assistant AI API - Con GradCAM integrado"}