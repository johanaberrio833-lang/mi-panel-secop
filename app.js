let datosMaestros = [];

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const respuesta = await fetch('data/datos_hoy.json');
        datosMaestros = await respuesta.json();
        
        cargarFiltros(datosMaestros);
        actualizarTablero(datosMaestros);
        
        // Escuchar los cambios en AMBOS filtros
        document.getElementById('filtro-departamento').addEventListener('change', aplicarFiltros);
        document.getElementById('filtro-modalidad').addEventListener('change', aplicarFiltros);
        
    } catch (error) {
        console.error("Error cargando los datos:", error);
    }
});

function cargarFiltros(datos) {
    // 1. Cargar selector de Departamentos
    const selectDep = document.getElementById('filtro-departamento');
    const departamentos = [...new Set(datos.map(p => p.departamento).filter(Boolean))].sort();
    departamentos.forEach(dep => {
        const option = document.createElement('option');
        option.value = dep;
        option.textContent = dep;
        selectDep.appendChild(option);
    });

    // 2. Cargar selector de Modalidades de Contratación
    const selectMod = document.getElementById('filtro-modalidad');
    const modalidades = [...new Set(datos.map(p => p.modalidad_de_contratacion).filter(Boolean))].sort();
    modalidades.forEach(mod => {
        const option = document.createElement('option');
        option.value = mod;
        option.textContent = mod;
        selectMod.appendChild(option);
    });
}

function aplicarFiltros() {
    // Leemos qué seleccionó el usuario en ambos menús
    const depSeleccionado = document.getElementById('filtro-departamento').value;
    const modSeleccionada = document.getElementById('filtro-modalidad').value;
    
    // Filtramos los datos que cumplan ambas condiciones
    const datosFiltrados = datosMaestros.filter(proceso => {
        const cumpleDep = (depSeleccionado === 'Todos') || (proceso.departamento === depSeleccionado);
        const cumpleMod = (modSeleccionada === 'Todas') || (proceso.modalidad_de_contratacion === modSeleccionada);
        return cumpleDep && cumpleMod;
    });
    
    actualizarTablero(datosFiltrados);
}

function actualizarTablero(datos) {
    document.getElementById('contador-procesos').textContent = `Mostrando ${datos.length} procesos`;
    renderizarTabla(datos);
}

function renderizarTabla(datos) {
    const tbody = document.getElementById('table-body'); 
    if (!tbody) return;
    
    tbody.innerHTML = ''; 
    
    const datosMostrar = datos.slice(0, 150);
    
    if(datosMostrar.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay procesos que coincidan con estos filtros.</td></tr>';
        return;
    }

    datosMostrar.forEach(proceso => {
        const tr = document.createElement('tr');
        
        const objeto = proceso.descripci_n_del_procedimiento || 'Sin descripción detallada';
        const modalidad = proceso.modalidad_de_contratacion || 'N/A';
        
        let urlSocrata = "#";
        if (typeof proceso.urlproceso === 'string') {
            urlSocrata = proceso.urlproceso;
        } else if (proceso.urlproceso && proceso.urlproceso.url) {
            urlSocrata = proceso.urlproceso.url;
        }
        
        const botonEnlace = urlSocrata !== "#" 
            ? `<a href="${urlSocrata}" target="_blank" class="btn-enlace">Ir a SECOP</a>` 
            : 'N/A';
        
        const precio = proceso.precio_base ? Number(proceso.precio_base).toLocaleString('es-CO') : '0';

        tr.innerHTML = `
            <td><strong>${proceso.entidad || 'N/A'}</strong></td>
            <td>${proceso.departamento || 'N/A'}</td>
            <td><div style="max-width: 400px; max-height: 100px; overflow-y: auto; font-size: 0.9em; line-height: 1.4;">${objeto}</div></td>
            <td>${modalidad}</td>
            <td>$ ${precio}</td>
            <td style="text-align: center;">${botonEnlace}</td>
        `;
        tbody.appendChild(tr);
    });
}
