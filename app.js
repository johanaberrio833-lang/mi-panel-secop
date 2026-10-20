let datosMaestros = [];

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const respuesta = await fetch('data/datos_hoy.json');
        datosMaestros = await respuesta.json();
        
        // Cargar la lista de departamentos en el selector
        cargarFiltros(datosMaestros);
        // Mostrar la tabla inicial
        actualizarTablero(datosMaestros);
        
        // Escuchar cuando el usuario cambie el departamento
        document.getElementById('filtro-departamento').addEventListener('change', (evento) => {
            const depSeleccionado = evento.target.value;
            
            if (depSeleccionado === 'Todos') {
                actualizarTablero(datosMaestros);
            } else {
                const datosFiltrados = datosMaestros.filter(proceso => proceso.departamento === depSeleccionado);
                actualizarTablero(datosFiltrados);
            }
        });
        
    } catch (error) {
        console.error("Error cargando los datos:", error);
    }
});

function cargarFiltros(datos) {
    const selectDep = document.getElementById('filtro-departamento');
    // Extraer departamentos únicos, eliminar vacíos y ordenarlos alfabéticamente
    const departamentos = [...new Set(datos.map(p => p.departamento).filter(Boolean))].sort();
    
    departamentos.forEach(dep => {
        const option = document.createElement('option');
        option.value = dep;
        option.textContent = dep;
        selectDep.appendChild(option);
    });
}

function actualizarTablero(datos) {
    // Actualizar el contador
    document.getElementById('contador-procesos').textContent = `Mostrando ${datos.length} procesos`;
    renderizarTabla(datos);
}

function renderizarTabla(datos) {
    const tbody = document.getElementById('table-body'); 
    if (!tbody) return;
    
    tbody.innerHTML = ''; 
    
    // Mostramos los primeros 150 para que el navegador no se ponga lento
    const datosMostrar = datos.slice(0, 150);
    
    if(datosMostrar.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay procesos para este filtro.</td></tr>';
        return;
    }

    datosMostrar.forEach(proceso => {
        const tr = document.createElement('tr');
        
        // Extraer el objeto (Socrata usa "descripci_n_del_procedimiento")
        const objeto = proceso.descripci_n_del_procedimiento || 'Sin descripción detallada';
        
        // Extraer el enlace (Socrata lo envía como un objeto con una propiedad "url")
        let urlSocrata = "#";
        if (typeof proceso.urlproceso === 'string') {
            urlSocrata = proceso.urlproceso;
        } else if (proceso.urlproceso && proceso.urlproceso.url) {
            urlSocrata = proceso.urlproceso.url;
        }
        
        const botonEnlace = urlSocrata !== "#" 
            ? `<a href="${urlSocrata}" target="_blank" class="btn-enlace">Ir a SECOP</a>` 
            : 'N/A';
        
        // Formatear precio
        const precio = proceso.precio_base ? Number(proceso.precio_base).toLocaleString('es-CO') : '0';

        tr.innerHTML = `
            <td><strong>${proceso.entidad || 'N/A'}</strong></td>
            <td>${proceso.departamento || 'N/A'}</td>
            <td><div style="max-width: 400px; max-height: 100px; overflow-y: auto; font-size: 0.9em; line-height: 1.4;">${objeto}</div></td>
            <td>${proceso.fase || 'N/A'}</td>
            <td>$ ${precio}</td>
            <td style="text-align: center;">${botonEnlace}</td>
        `;
        tbody.appendChild(tr);
    });
}
