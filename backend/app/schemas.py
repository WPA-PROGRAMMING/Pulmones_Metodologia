from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    password: str

class UserOut(UserBase):
    id: int
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

# --- Schemas de Diagnóstico Actualizados ---
class DiagnosisBase(BaseModel):
    filename: str
    gradcam_filename: Optional[str] = None  # Nuevo
    prediction: str
    confidence: str
    patient_name: str
    nss: str
    probabilities_json: Optional[str] = None  # Nuevo

class DiagnosisOut(DiagnosisBase):
    id: int
    timestamp: datetime
    
    # Propiedad computada para obtener probabilidades como dict
    @property
    def probabilities(self) -> Optional[Dict[str, float]]:
        if self.probabilities_json:
            import json
            return json.loads(self.probabilities_json)
        return None
    
    class Config:
        from_attributes = True

# Schema para respuesta de salud del modelo
class ModelHealth(BaseModel):
    status: str
    message: str
    classes: Optional[List[str]] = None