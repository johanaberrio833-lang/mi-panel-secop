import pandas as pd
import requests
import json
import os

# Configuración de la API de Socrata (SECOP II)
DATASET_ID = "p6dx-8zbt"
URL = f"https://www.datos.gov.co/resource/{DATASET_ID}.json"

# Consulta SoQL: Filtramos procesos y seleccionamos columnas
QUERY = {
    "$select": "entidad, departamento, fase, precio_base, modalidad_de_contratacion",
    "$where": "fase IN ('Borrador', 'Presentación de ofertas')",
    "$limit": 50000 
}

def obtener_datos():
    print("Conectando a SECOP II...")
    response = requests.get(URL, params=QUERY)
    
    if response.status_code == 200:
        datos = response.json()
        
        # Procesamiento básico con Pandas
        df = pd.DataFrame(datos)
        df.fillna("No definido", inplace=True)
        
        # Crear directorio y guardar archivo
        os.makedirs('data', exist_ok=True)
        ruta_archivo = 'data/datos_hoy.json'
        df.to_json(ruta_archivo, orient='records', force_ascii=False)
        print(f"Éxito: {len(df)} registros guardados en {ruta_archivo}")
    else:
        print(f"Error en la descarga: Código {response.status_code}")

if __name__ == "__main__":
    obtener_datos()
