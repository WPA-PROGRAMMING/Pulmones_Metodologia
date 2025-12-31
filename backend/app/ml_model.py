import tensorflow as tf
import numpy as np
import joblib
from tensorflow.keras.preprocessing.image import load_img, img_to_array
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
import cv2
import os

class MedicalAIModel:
    def __init__(self, model_dir="ml_models"):
        self.model_dir = model_dir
        self.feature_extractor = None
        self.svm_model = None
        self.class_info = None
        self.target_size = (224, 224)
        self.gradcam_dir = "gradcam_images"  # Nueva carpeta para GradCAMs
        self.load_models()
    
    def load_models(self):
        """Carga todos los modelos necesarios"""
        try:
            print("Cargando modelos...")
            
            # Verificar que los archivos existan
            required_files = ['feature_extractor.h5', 'svm_model.pkl', 'class_info.pkl']
            for file in required_files:
                file_path = os.path.join(self.model_dir, file)
                if not os.path.exists(file_path):
                    raise FileNotFoundError(f"Archivo no encontrado: {file_path}")
                print(f"{file} encontrado")
            
            # Cargar feature extractor
            self.feature_extractor = tf.keras.models.load_model(
                os.path.join(self.model_dir, "feature_extractor.h5"),
                compile=False
            )
            print("Feature extractor cargado")
            
            # Cargar SVM
            self.svm_model = joblib.load(
                os.path.join(self.model_dir, "svm_model.pkl")
            )
            print("SVM model cargado")
            
            # Cargar información de clases
            self.class_info = joblib.load(
                os.path.join(self.model_dir, "class_info.pkl")
            )
            print("Class info cargado")
            
            # Crear directorio para GradCAMs
            os.makedirs(self.gradcam_dir, exist_ok=True)
            print(f"Directorio GradCAM creado: {self.gradcam_dir}")
            
            print(f"Clases disponibles: {self.class_info['class_names']}")
            
        except Exception as e:
            print(f"Error cargando modelos: {e}")
            raise e
    
    def predict_image(self, image_path):
        """
        Realiza predicción en una imagen usando SVM
        """
        try:
            print(f"Procesando imagen: {image_path}")
            
            # Cargar y preprocesar imagen
            img = load_img(image_path, target_size=self.target_size)
            img_array = img_to_array(img)
            print(f"Forma de la imagen original: {img_array.shape}")
            
            # Aplicar preprocesamiento específico de MobileNetV2
            img_array = preprocess_input(img_array)
            img_array = np.expand_dims(img_array, axis=0)
            print(f"Forma después de preprocesamiento: {img_array.shape}")
            
            # Extraer características
            print("Extrayendo características...")
            features = self.feature_extractor.predict(img_array, verbose=0)
            print(f"Características extraídas: {features.shape}")
            
            # Predecir con SVM
            print("Realizando predicción con SVM...")
            prediction = self.svm_model.predict(features)[0]
            probabilities = self.svm_model.predict_proba(features)[0]
            
            # Mapear a nombres de clases
            class_names = self.class_info['class_names']
            
            print(f"Predicción completada: {class_names[prediction]}")
            
            return {
                'predicted_class': class_names[prediction],
                'predicted_class_index': int(prediction),
                'probabilities': {class_names[i]: float(prob) for i, prob in enumerate(probabilities)},
                'confidence': float(np.max(probabilities)),
                'all_predictions': dict(zip(class_names, probabilities))
            }
            
        except Exception as e:
            print(f"Error en predict_image: {e}")
            raise e
    
    def generate_gradcam(self, image_path, pred_class_index):
        """
        Genera mapa GradCAM para la imagen usando el feature extractor
        """
        try:
            print(f"Iniciando generación de GradCAM para: {image_path}")
            print(f"Clase objetivo para GradCAM: {pred_class_index}")
            
            # Cargar y preprocesar imagen
            original_img = load_img(image_path, target_size=self.target_size)
            img_array = img_to_array(original_img)
            img_array_expanded = np.expand_dims(img_array, axis=0)
            img_array_processed = preprocess_input(img_array_expanded.copy())
            
            # Encontrar la última capa convolucional en el feature extractor
            last_conv_layer = None
            for layer in reversed(self.feature_extractor.layers):
                # Buscar capas convolucionales por tipo de capa y forma de salida
                if ('conv' in layer.name or 'expand' in layer.name or 
                    'project' in layer.name or 'depthwise' in layer.name):
                    try:
                        # Verificar si la salida es 4D (convolucional)
                        if len(layer.output.shape) == 4:
                            last_conv_layer = layer
                            break
                    except:
                        continue
            
            if last_conv_layer is None:
                # Si no encontramos, usar la última capa antes del GlobalAveragePooling
                for layer in reversed(self.feature_extractor.layers):
                    if 'global_average' not in layer.name and 'flatten' not in layer.name:
                        try:
                            if len(layer.output.shape) == 4:
                                last_conv_layer = layer
                                break
                        except:
                            continue
            
            if last_conv_layer is None:
                print("No se pudo encontrar una capa convolucional adecuada")
                return None
            
            print(f"Usando capa para GradCAM: {last_conv_layer.name}")
            
            # Crear modelo que toma la entrada y devuelve la capa convolucional y la salida final
            grad_model = tf.keras.models.Model(
                inputs=self.feature_extractor.input,
                outputs=[last_conv_layer.output, self.feature_extractor.output]
            )
            
            # Calcular GradCAM
            with tf.GradientTape() as tape:
                conv_outputs, predictions = grad_model(img_array_processed)
                loss = predictions[:, pred_class_index]
            
            # Calcular gradientes
            grads = tape.gradient(loss, conv_outputs)
            
            if grads is None:
                print("No se pudieron calcular los gradientes")
                return None
            
            # Promediar gradientes sobre los ejes espaciales
            pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
            
            # Multiplicar cada canal en el feature map por el gradiente correspondiente
            conv_outputs = conv_outputs[0]
            heatmap = tf.reduce_mean(tf.multiply(pooled_grads, conv_outputs), axis=-1)
            
            # Aplicar ReLU y normalizar
            heatmap = np.maximum(heatmap, 0)
            max_heat = np.max(heatmap)
            if max_heat > 0:
                heatmap /= max_heat
            else:
                print("Heatmap vacío, no se puede normalizar")
                return None
            
            # Redimensionar heatmap al tamaño original de la imagen
            heatmap = cv2.resize(heatmap, (original_img.width, original_img.height))
            heatmap = np.uint8(255 * heatmap)
            heatmap = 255 - heatmap
            heatmap = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
            
            # Superponer en imagen original
            superimposed_img = heatmap * 0.4 + img_array
            superimposed_img = np.clip(superimposed_img, 0, 255).astype('uint8')
            
            # Guardar imagen GradCAM en carpeta específica
            original_filename = os.path.basename(image_path)
            name, ext = os.path.splitext(original_filename)
            gradcam_filename = f"gradcam_{name}{ext}"
            gradcam_path = os.path.join(self.gradcam_dir, gradcam_filename)
            
            print(f"Guardando GradCAM en: {gradcam_path}")
            
            # Convertir de RGB a BGR para OpenCV
            superimposed_img_bgr = cv2.cvtColor(superimposed_img, cv2.COLOR_RGB2BGR)
            success = cv2.imwrite(gradcam_path, superimposed_img_bgr)
            
            if success and os.path.exists(gradcam_path):
                file_size = os.path.getsize(gradcam_path)
                print(f"GradCAM guardado exitosamente: {gradcam_filename} ({file_size} bytes)")
                return gradcam_filename
            else:
                print("Error al guardar GradCAM")
                return None
            
        except Exception as e:
            print(f"Error generando GradCAM: {str(e)}")
            import traceback
            print("Traceback completo:")
            traceback.print_exc()
            return None

# Instancia global del modelo
ai_model = MedicalAIModel()