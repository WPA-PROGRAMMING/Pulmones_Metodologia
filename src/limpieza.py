import os
from PIL import Image
import numpy as np
from tqdm import tqdm

DATASET_DIR = "../dataset"
OUTPUT_DIR = "../dataset_limpio"

TARGET_SIZE = (224, 224)
VALID_EXTS = [".png"]

def ensure_dir(path):
    if not os.path.exists(path):
        os.makedirs(path)

def normalize_image_gray(img):
    """Convierte a escala de grises y normaliza al rango [0,1]."""
    img_gray = img.convert("L")  # modo L = grayscale (1 canal)
    arr = np.asarray(img_gray).astype(np.float32)
    arr = (arr - np.min(arr)) / (np.max(arr) - np.min(arr) + 1e-8)  # normaliza
    arr = (arr * 255).astype(np.uint8)
    return Image.fromarray(arr, mode="L")

def process_dataset():
    classes = os.listdir(DATASET_DIR)
    print(f"Clases detectadas: {classes}")

    for cls in classes:
        input_path = os.path.join(DATASET_DIR, cls)
        output_path = os.path.join(OUTPUT_DIR, cls)
        ensure_dir(output_path)

        images = [f for f in os.listdir(input_path) if os.path.splitext(f)[1].lower() in VALID_EXTS]

        for img_name in tqdm(images, desc=f"Procesando {cls}", ncols=100):
            img_path = os.path.join(input_path, img_name)

            try:
                img = Image.open(img_path)
                img = img.resize(TARGET_SIZE)
                img = normalize_image_gray(img)
                output_file = os.path.splitext(img_name)[0] + ".png"
                img.save(os.path.join(output_path, output_file))
            except Exception as e:
                print(f"Error con {img_name}: {e}")

    print("\nLimpieza y normalización completadas (en escala de grises).")

if __name__ == "__main__":
    process_dataset()
 