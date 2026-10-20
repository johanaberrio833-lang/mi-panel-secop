import pandas as pd
import requests
import os

URL = "https://www.datos.gov.co/resource/p6dx-8zbt.json"

def obtener_datos():
    print("Conectando a SECOP II...")
    
    # Consulta simplificada para evitar el Error 400 de Socrata
    params = {
        "$limit": 5000
    }
    
    response = requests.get(URL, params=params)
    
    if response.status_code == 200:
        datos = response.json()
        df = pd.DataFrame(datos)
        
        # Limpiamos los datos
        df.fillna("No definido", inplace=True)
        
        # Guardamos el archivo
        os.makedirs('data', exist_ok=True)
        ruta_archivo = 'data/datos_hoy.json'
        df.to_json(ruta_archivo, orient='records', force_ascii=False)
        print(f"Éxito: {len(df)} registros guardados en {ruta_archivo}")
    else:
        print(f"Error {response.status_code}: {response.text}")
        raise Exception("La API de SECOP falló o rechazó la consulta.")

if __name__ == "__main__":
    obtener_datos()
