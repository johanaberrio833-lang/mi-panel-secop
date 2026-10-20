// Variable global para almacenar los datos originales
let datosMaestros = [];

// Cuando la página cargue, ejecutamos la función inicial
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 1. Cargar los datos del archivo JSON generado esta madrugada
        const respuesta = await fetch('data/datos_hoy.json');
        datosMaestros = await respuesta.json();
        
        // 2. Inicializar la tabla y los gráficos con todos los datos
        actualizarTablero(datosMaestros);
        
        // (Aquí agregaremos los "escuchadores" de tus filtros más adelante)
        
    } catch (error) {
        console.error("Error cargando los datos de SECOP:", error);
    }
});

function actualizarTablero(datos) {
    renderizarTabla(datos);
    // renderizarGraficos(datos); // Lo activaremos cuando configuremos Chart.js
}

function renderizarTabla(datos) {
    // Busca el cuerpo de la tabla en tu HTML (asumimos que tiene el id "table-body")
    const tbody = document.getElementById('table-body'); 
    if (!tbody) return;
    
    tbody.innerHTML = ''; // Limpia la tabla antes de inyectar nuevos datos
    
    // Mostramos solo los primeros 100 registros para no saturar el navegador
    const datosMostrar = datos.slice(0, 100);
    
    datosMostrar.forEach(proceso => {
        const tr = document.createElement('tr');
        
        // Inyectamos las columnas exactas que descargamos en Python
        tr.innerHTML = `
            <td>${proceso.entidad || 'N/A'}</td>
            <td>${proceso.departamento || 'N/A'}</td>
            <td>${proceso.fase || 'N/A'}</td>
            <td>${proceso.modalidad_de_contratacion || 'N/A'}</td>
            <td>$ ${proceso.precio_base ? Number(proceso.precio_base).toLocaleString('es-CO') : '0'}</td>
        `;
        tbody.appendChild(tr);
    });
}
