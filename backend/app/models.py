from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    diagnoses = relationship("DiagnosisHistory", back_populates="owner")

class DiagnosisHistory(Base):
    __tablename__ = "diagnosis_history"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    gradcam_filename = Column(String)  # Nuevo: nombre del archivo GradCAM
    prediction = Column(String)
    confidence = Column(String)
    patient_name = Column(String) 
    nss = Column(String)
    probabilities_json = Column(Text)  # Nuevo: probabilidades en formato JSON
    timestamp = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="diagnoses")