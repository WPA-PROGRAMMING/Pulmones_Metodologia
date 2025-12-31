import os
import tensorflow as tf
from tensorflow.keras.models import load_model
import numpy as np

def check_gradcam_setup():
    print("Verificando configuración de GradCAM...")
    
    # 1. Verificar que el modelo existe
    model_path = "ml_models/gradcam_model.h5"
    if os.path.exists(model_path):
        print(f"Modelo GradCAM encontrado: {model_path}")
        file_size = os.path.getsize(model_path)
        print(f"Tamaño del modelo: {file_size / (1024*1024):.2f} MB")
    else:
        print(f"Modelo GradCAM NO encontrado: {model_path}")
        print("Ejecuta: python create_gradcam_model.py")
        return False
    
    # 2. Verificar que se puede cargar
    try:
        print("Intentando cargar modelo GradCAM...")
        model = load_model(model_path, compile=False)
        print("Modelo GradCAM cargado correctamente")
        
        # 3. Probar con entrada dummy para verificar la forma de salida
        print("Probando modelo con entrada dummy...")
        dummy_input = tf.random.normal([1, 224, 224, 3])
        
        try:
            output = model(dummy_input)
            print(f"Forma de salida del modelo: {output.shape}")
            
            if len(output.shape) == 4:
                print("Modelo adecuado para GradCAM (salida 4D - convolucional)")
                print(f"   - Batch: {output.shape[0]}")
                print(f"   - Altura: {output.shape[1]}")
                print(f"   - Ancho: {output.shape[2]}")
                print(f"   - Canales: {output.shape[3]}")
            else:
                print(f"Modelo puede no ser óptimo para GradCAM (salida {len(output.shape)}D)")
                
        except Exception as e:
            print(f"Error probando el modelo: {e}")
            return False
        
        # 4. Verificar las capas del modelo
        print("\nInformación de las capas (últimas 5):")
        for i, layer in enumerate(model.layers[-5:]):
            try:
                # Intentar diferentes métodos para obtener información de la capa
                layer_info = f"   {i}: {layer.name}"
                
                # Método 1: Usar output si está disponible
                if hasattr(layer, 'output'):
                    layer_info += f" - output.shape: {layer.output.shape}"
                # Método 2: Usar output_shape si está disponible  
                elif hasattr(layer, 'output_shape'):
                    layer_info += f" - output_shape: {layer.output_shape}"
                # Método 3: Probar la capa con entrada dummy
                else:
                    try:
                        test_output = layer(dummy_input)
                        layer_info += f" - test_output.shape: {test_output.shape}"
                    except:
                        layer_info += " - No se pudo obtener información de forma"
                
                print(layer_info)
                
            except Exception as e:
                print(f"   {i}: {layer.name} - Error: {e}")
        
        return True
        
    except Exception as e:
        print(f"Error cargando modelo: {e}")
        return False

if __name__ == "__main__":
    check_gradcam_setup()