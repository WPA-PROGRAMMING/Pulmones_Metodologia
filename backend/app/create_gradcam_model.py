import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.models import Model
import os

def create_gradcam_model():
    """Crea el modelo específico para GradCAM de manera robusta"""
    print("Creando modelo para GradCAM...")
    
    # Crear directorio si no existe
    os.makedirs("ml_models", exist_ok=True)
    
    INPUT_SHAPE = (224, 224, 3)
    
    try:
        # Cargar modelo base
        print("Cargando MobileNetV2...")
        base_model = MobileNetV2(
            weights='imagenet', 
            include_top=False, 
            input_shape=INPUT_SHAPE
        )
        base_model.trainable = False
        
        # Encontrar la última capa convolucional por nombre
        # En MobileNetV2, las capas convolucionales tienen nombres como 'block_X_expand', 'block_X_depthwise', etc.
        last_conv_layer_name = None
        for layer in reversed(base_model.layers):
            # Buscar capas convolucionales por nombre y tipo
            if any(keyword in layer.name for keyword in ['conv', 'expand', 'project']):
                last_conv_layer_name = layer.name
                break
        
        if last_conv_layer_name is None:
            # Si no encontramos por nombre, usar la última capa con salida 4D
            for layer in reversed(base_model.layers):
                try:
                    if len(layer.output.shape) == 4:
                        last_conv_layer_name = layer.name
                        break
                except:
                    continue
        
        if last_conv_layer_name is None:
            # Último recurso: usar la penúltima capa
            last_conv_layer_name = base_model.layers[-2].name
        
        print(f"Usando capa para GradCAM: {last_conv_layer_name}")
        
        # Crear modelo que toma la entrada y devuelve la salida de la última capa convolucional
        last_conv_layer = base_model.get_layer(last_conv_layer_name)
        gradcam_model = Model(
            inputs=base_model.input, 
            outputs=last_conv_layer.output
        )
        
        # Guardar modelo
        model_path = 'ml_models/gradcam_model.h5'
        gradcam_model.save(model_path)
        print(f"Modelo GradCAM creado y guardado en: {model_path}")
        
        # Verificar
        file_size = os.path.getsize(model_path)
        print(f"Tamaño del modelo: {file_size / (1024*1024):.2f} MB")
        
        print("Resumen del modelo GradCAM:")
        gradcam_model.summary()
        
        # Verificar la estructura
        print("\nVerificación de capas:")
        for i, layer in enumerate(gradcam_model.layers[-3:]):  # Últimas 3 capas
            try:
                if hasattr(layer, 'output'):
                    print(f"   {i}: {layer.name} - {layer.output.shape}")
                else:
                    print(f"   {i}: {layer.name} - No tiene atributo output")
            except Exception as e:
                print(f"   {i}: {layer.name} - Error: {e}")
        
        return True
        
    except Exception as e:
        print(f"Error creando modelo GradCAM: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    create_gradcam_model()