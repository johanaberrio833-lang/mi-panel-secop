let datosMaestros = [];
let miGrafico = null;

// Búsqueda ESTRICTA: Solo lee la columna de SECOP si el nombre es exacto.
const obtenerValorExacto = (proceso, clavesPosibles, valorPorDefecto = 'No definido') => {
    for (let clave of clavesPosibles) {
        if (proceso[clave] !== undefined && proceso[clave] !== null && proceso[clave] !== 'No definido') {
            return proceso[clave];
        }
    }
    return valorPorDefecto;
};

const formatoFecha = (cadena) => {
    if (!cadena || cadena === 'No definido') return 'Sin fecha';
    return String(cadena).split('T')[0];
};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const respuesta = await fetch('data/datos_hoy.json');
        datosMaestros = await respuesta.json(); 
        
        cargarFiltros(datosMaestros);
        actualizarTablero(datosMaestros);
        
        document.getElementById('filtro-departamento').addEventListener('change', aplicarFiltros);
        document.getElementById('filtro-municipio').addEventListener('change', aplicarFiltros);
        document.getElementById('filtro-modalidad').addEventListener('change', aplicarFiltros);
        document.getElementById('filtro-estado').addEventListener('change', aplicarFiltros);
        
    } catch (error) {
        console.error("Error cargando los datos:", error);
    }
});

function cargarFiltros(datos) {
    const selectDep = document.getElementById('filtro-departamento');
    selectDep.innerHTML = '<option value="Todos">Todos</option>';
    const departamentos = [...new Set(datos.map(p => obtenerValorExacto(p, ['departamento_entidad', 'departamento'])))].filter(d => d !== 'No definido').sort();
    departamentos.forEach(dep => selectDep.appendChild(new Option(dep, dep)));

    const selectMun = document.getElementById('filtro-municipio');
    selectMun.innerHTML = '<option value="Todos">Todos</option>';
    const municipios = [...new Set(datos.map(p => obtenerValorExacto(p, ['ciudad_entidad', 'ciudad', 'municipio_entidad'])))].filter(m => m !== 'No definido').sort();
    municipios.forEach(mun => selectMun.appendChild(new Option(mun, mun)));

    const selectMod = document.getElementById('filtro-modalidad');
    selectMod.innerHTML = '<option value="Todas">Todas</option>';
    const modalidades = [...new Set(datos.map(p => obtenerValorExacto(p, ['modalidad_de_contratacion', 'modalidad_de_contrataci_n'])))].filter(m => m !== 'No definido').sort();
    modalidades.forEach(mod => selectMod.appendChild(new Option(mod, mod)));

    // Extrae exactamente el estado real del proceso en SECOP
    const selectEst = document.getElementById('filtro-estado');
    selectEst.innerHTML = '<option value="Todos">Todos</option>';
    const estados = [...new Set(datos.map(p => obtenerValorExacto(p, ['estado_del_procedimiento', 'estado_resumen'])))].filter(e => e !== 'No definido').sort();
    estados.forEach(est => selectEst.appendChild(new Option(est, est)));
}

function aplicarFiltros() {
    const depSeleccionado = document.getElementById('filtro-departamento').value;
    const munSeleccionado = document.getElementById('filtro-municipio').value;
    const modSeleccionada = document.getElementById('filtro-modalidad').value;
    const estSeleccionado = document.getElementById('filtro-estado').value; 
    
    const datosFiltrados = datosMaestros.filter(proceso => {
        const depReal = obtenerValorExacto(proceso, ['departamento_entidad', 'departamento']);
        const munReal = obtenerValorExacto(proceso, ['ciudad_entidad', 'ciudad', 'municipio_entidad']);
        const modReal = obtenerValorExacto(proceso, ['modalidad_de_contratacion', 'modalidad_de_contrataci_n']);
        const estReal = obtenerValorExacto(proceso, ['estado_del_procedimiento', 'estado_resumen']);
        
        const cumpleDep = (depSeleccionado === 'Todos') || (depReal === depSeleccionado);
        const cumpleMun = (munSeleccionado === 'Todos') || (munReal === munSeleccionado);
        const cumpleMod = (modSeleccionada === 'Todas') || (modReal === modSeleccionada);
        const cumpleEst = (estSeleccionado === 'Todos') || (estReal === estSeleccionado);
        
        return cumpleDep && cumpleMun && cumpleMod && cumpleEst;
    });
    
    actualizarTablero(datosFiltrados);
}

function actualizarTablero(datos) {
    try { renderizarKPIs(datos); } catch(e) {}
    try { renderizarTabla(datos); } catch(e) {}
    try { renderizarGrafico(datos); } catch(e) {}
}

function renderizarKPIs(datos) {
    document.getElementById('kpi-total').textContent = datos.length;
    const valorTotal = datos.reduce((suma, proceso) => suma + (Number(obtenerValorExacto(proceso, ['precio_base', 'cuantia_proceso'], 0)) || 0), 0);
    document.getElementById('kpi-valor').textContent = `$ ${valorTotal.toLocaleString('es-CO')}`;
}

function renderizarTabla(datos) {
    const tbody = document.getElementById('table-body'); 
    if (!tbody) return;
    tbody.innerHTML = ''; 
    
    const datosMostrar = datos.slice(0, 150); 
    
    if(datosMostrar.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;">No hay procesos para estos filtros.</td></tr>';
        return;
    }

    datosMostrar.forEach(proceso => {
        const tr = document.createElement('tr');
        
        const entidad = obtenerValorExacto(proceso, ['entidad', 'nombre_entidad']);
        const departamento = obtenerValorExacto(proceso, ['departamento_entidad', 'departamento']);
        const municipio = obtenerValorExacto(proceso, ['ciudad_entidad', 'ciudad', 'municipio_entidad']);
        const modalidad = obtenerValorExacto(proceso, ['modalidad_de_contratacion', 'modalidad_de_contrataci_n']);
        const estado = obtenerValorExacto(proceso, ['estado_del_procedimiento', 'estado_resumen']);
        const objeto = obtenerValorExacto(proceso, ['descripci_n_del_procedimiento', 'descripcion_del_procedimiento'], 'Sin descripción');
        
        const fechaPub = formatoFecha(obtenerValorExacto(proceso, ['fecha_de_publicacion_del']));
        const fechaCierre = formatoFecha(obtenerValorExacto(proceso, ['fecha_de_cierre', 'fecha_fin_presentacion']));
        
        const bloqueFechas = `
            <div style="font-size: 11px; line-height: 1.5; white-space: nowrap;">
                <strong>Pub:</strong> ${fechaPub}<br>
                <strong>Cierre:</strong> <span style="color:#e74c3c; font-weight:bold;">${fechaCierre}</span>
            </div>
        `;

        let urlSocrata = "#";
        if (proceso.urlproceso && typeof proceso.urlproceso === 'string') urlSocrata = proceso.urlproceso;
        else if (proceso.urlproceso && proceso.urlproceso.url) urlSocrata = proceso.urlproceso.url;
        
        const botonEnlace = urlSocrata !== "#" ? `<a href="${urlSocrata}" target="_blank" class="btn-enlace">Ir a SECOP</a>` : 'Sin Enlace';
        
        const precio = Number(obtenerValorExacto(proceso, ['precio_base', 'cuantia_proceso'], 0));
        const precioTexto = precio > 0 ? `$ ${precio.toLocaleString('es-CO')}` : 'Por definir';

        let colorEstado = "#bdc3c7"; 
        if(estado.toLowerCase().includes('oferta') || estado.toLowerCase().includes('publicado')) colorEstado = "#3498db"; 
        if(estado.toLowerCase().includes('evaluaci') || estado.toLowerCase().includes('observacion')) colorEstado = "#f1c40f"; 
        if(estado.toLowerCase().includes('adjudicado') || estado.toLowerCase().includes('celebrado')) colorEstado = "#2ecc71"; 

        const etiquetaEstado = `<span style="background-color: ${colorEstado}; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-align: center; display: inline-block;">${estado}</span>`;

        // Exactamente 9 celdas para que no haya cruce de información
        tr.innerHTML = `
            <td><strong>${entidad}</strong></td>
            <td>${departamento}</td>
            <td>${municipio}</td>
            <td><div style="max-width: 250px; max-height: 80px; overflow-y: auto; font-size: 0.85em; line-height: 1.4;">${objeto}</div></td>
            <td>${modalidad}</td>
            <td style="text-align: center;">${etiquetaEstado}</td>
            <td>${bloqueFechas}</td>
            <td style="white-space: nowrap;">${precioTexto}</td>
            <td style="text-align: center;">${botonEnlace}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderizarGrafico(datos) {
    const canvas = document.getElementById('graficoModalidad');
    if (!canvas || typeof Chart === 'undefined') return; 
    
    const ctx = canvas.getContext('2d');
    const conteo = {};
    
    datos.forEach(p => {
        const mod = obtenerValorExacto(p, ['modalidad_de_contratacion', 'modalidad_de_contrataci_n']);
        conteo[mod] = (conteo[mod] || 0) + 1;
    });

    if (miGrafico) miGrafico.destroy();

    miGrafico = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(conteo),
            datasets: [{ label: 'Contratos', data: Object.values(conteo), backgroundColor: '#3498db', borderRadius: 4 }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });
}
