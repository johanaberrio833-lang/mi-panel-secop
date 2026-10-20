import pandas as pd
import requests
import os

URL = "https://www.datos.gov.co/resource/p6dx-8zbt.json"

def obtener_datos():
    print("Conectando a SECOP II...")
    
    # Exigimos estrictamente procesos creados desde enero de 2026
    params = {
        "$where": "fecha_de_publicacion_del >= '2026-01-01T00:00:00.000'",
        "$order": "fecha_de_publicacion_del DESC",
        "$limit": 10000
    }
    
    response = requests.get(URL, params=params)
    
    if response.status_code == 200:
        datos = response.json()
        df = pd.DataFrame(datos)
        df.fillna("No definido", inplace=True)
        
        os.makedirs('data', exist_ok=True)
        ruta_archivo = 'data/datos_hoy.json'
        df.to_json(ruta_archivo, orient='records', force_ascii=False)
        print(f"Éxito: {len(df)} registros guardados en {ruta_archivo}")
    else:
        print(f"Error {response.status_code}: {response.text}")
        raise Exception("La API de SECOP falló.")

if __name__ == "__main__":
    obtener_datos()
