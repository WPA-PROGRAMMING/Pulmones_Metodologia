import os
import random
import shutil
from pathlib import Path

def split_dataset(source_dir, target_base, train_ratio=0.7, val_ratio=0.2, test_ratio=0.1):
    """
    Divide un dataset en train, validation y test
    """
    # Verificar ratios
    assert abs(train_ratio + val_ratio + test_ratio - 1.0) < 0.001, "Los ratios deben sumar 1"
    
    # Crear directorios destino
    for split in ['train', 'val', 'test']:
        for class_dir in os.listdir(source_dir):
            class_path = os.path.join(source_dir, class_dir)
            if os.path.isdir(class_path):
                os.makedirs(os.path.join(target_base, split, class_dir), exist_ok=True)
    
    # Dividir imágenes
    for class_dir in os.listdir(source_dir):
        class_path = os.path.join(source_dir, class_dir)
        if not os.path.isdir(class_path):
            continue
            
        images = [f for f in os.listdir(class_path) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        random.shuffle(images)
        
        n_total = len(images)
        n_train = int(n_total * train_ratio)
        n_val = int(n_total * val_ratio)
        
        # Asignar imágenes a cada split
        splits = {
            'train': images[:n_train],
            'val': images[n_train:n_train + n_val],
            'test': images[n_train + n_val:]
        }
        
        # Copiar archivos
        for split_name, split_images in splits.items():
            for img in split_images:
                src = os.path.join(class_path, img)
                dst = os.path.join(target_base, split_name, class_dir, img)
                shutil.copy2(src, dst)
        
        print(f"Clase {class_dir}: {n_train} train, {n_val} val, {len(splits['test'])} test")

# Usar la función
source_directory = "../dataset_limpio"  # Ajusta esta ruta
target_directory = "../dataset_split"

if os.path.exists(source_directory):
    split_dataset(source_directory, target_directory)
else:
    print(f"❌ No se encuentra el directorio fuente: {source_directory}")