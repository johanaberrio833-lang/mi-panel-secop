let datosMaestros = [];
let miGrafico = null;
let temporizadorBusqueda = null;

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
        
        cargarFiltrosIniciales();
        actualizarTablero(datosMaestros);
        
        // Listeners
        document.getElementById('filtro-departamento').addEventListener('change', (e) => {
            actualizarFiltroMunicipios(e.target.value);
            aplicarFiltros();
        });
        document.getElementById('filtro-municipio').addEventListener('change', aplicarFiltros);
        document.getElementById('filtro-modalidad').addEventListener('change', aplicarFiltros);
        document.getElementById('filtro-estado').addEventListener('change', aplicarFiltros);
        
        // Listener para la barra de búsqueda (con retraso para no saturar al escribir)
        document.getElementById('filtro-busqueda').addEventListener('input', () => {
            clearTimeout(temporizadorBusqueda);
            temporizadorBusqueda = setTimeout(aplicarFiltros, 500);
        });
        
    } catch (error) {
        console.error("Error cargando los datos:", error);
    }
});

function cargarFiltrosIniciales() {
    // Cargar Departamentos
    const selectDep = document.getElementById('filtro-departamento');
    selectDep.innerHTML = '<option value="Todos">Todos</option>';
    const departamentos = [...new Set(datosMaestros.map(p => obtenerValorExacto(p, ['departamento_entidad', 'departamento'])))].filter(d => d !== 'No definido').sort();
    departamentos.forEach(dep => selectDep.appendChild(new Option(dep, dep)));

    // Cargar Modalidades
    const selectMod = document.getElementById('filtro-modalidad');
    selectMod.innerHTML = '<option value="Todas">Todas</option>';
    const modalidades = [...new Set(datosMaestros.map(p => obtenerValorExacto(p, ['modalidad_de_contratacion', 'modalidad_de_contrataci_n'])))].filter(m => m !== 'No definido').sort();
    modalidades.forEach(mod => selectMod.appendChild(new Option(mod, mod)));

    // Cargar Estados
    const selectEst = document.getElementById('filtro-estado');
    selectEst.innerHTML = '<option value="Todos">Todos</option>';
    const estados = [...new Set(datosMaestros.map(p => obtenerValorExacto(p, ['estado_del_procedimiento', 'estado_resumen'])))].filter(e => e !== 'No definido').sort();
    estados.forEach(est => selectEst.appendChild(new Option(est, est)));
}

// LOGICA EN CASCADA: Actualiza los municipios según el departamento elegido
function actualizarFiltroMunicipios(departamentoSeleccionado) {
    const selectMun = document.getElementById('filtro-municipio');
    selectMun.innerHTML = '<option value="Todos">Todos</option>';
    
    if (departamentoSeleccionado === 'Todos') {
        selectMun.disabled = true;
        selectMun.innerHTML = '<option value="Todos">Seleccione un Depto primero</option>';
        return;
    }

    selectMun.disabled = false;
    
    // Filtrar la base de datos para obtener solo los municipios de ese departamento
    const procesosDelDepto = datosMaestros.filter(p => obtenerValorExacto(p, ['departamento_entidad', 'departamento']) === departamentoSeleccionado);
    
    const municipios = [...new Set(procesosDelDepto.map(p => obtenerValorExacto(p, ['ciudad_entidad', 'ciudad', 'municipio_entidad'])))].filter(m => m !== 'No definido').sort();
    
    municipios.forEach(mun => selectMun.appendChild(new Option(mun, mun)));
}

function aplicarFiltros() {
    const depSeleccionado = document.getElementById('filtro-departamento').value;
    const munSeleccionado = document.getElementById('filtro-municipio').value;
    const modSeleccionada = document.getElementById('filtro-modalidad').value;
    const estSeleccionado = document.getElementById('filtro-estado').value; 
    const textoBusqueda = document.getElementById('filtro-busqueda').value.toLowerCase().trim();
    
    const datosFiltrados = datosMaestros.filter(proceso => {
        const depReal = obtenerValorExacto(proceso, ['departamento_entidad', 'departamento']);
        const munReal = obtenerValorExacto(proceso, ['ciudad_entidad', 'ciudad', 'municipio_entidad']);
        const modReal = obtenerValorExacto(proceso, ['modalidad_de_contratacion', 'modalidad_de_contrataci_n']);
        const estReal = obtenerValorExacto(proceso, ['estado_del_procedimiento', 'estado_resumen']);
        const sectorReal = obtenerValorExacto(proceso, ['nombre_de_la_familia', 'sector']).toLowerCase();
        const objReal = obtenerValorExacto(proceso, ['descripci_n_del_procedimiento', 'descripcion_del_procedimiento']).toLowerCase();
        const entidadReal = obtenerValorExacto(proceso, ['entidad', 'nombre_entidad']).toLowerCase();
        
        // Filtros desplegables
        const cumpleDep = (depSeleccionado === 'Todos') || (depReal === depSeleccionado);
        const cumpleMun = (munSeleccionado === 'Todos') || (munReal === munSeleccionado) || selectMun.disabled;
        const cumpleMod = (modSeleccionada === 'Todas') || (modReal === modSeleccionada);
        const cumpleEst = (estSeleccionado === 'Todos') || (estReal === estSeleccionado);
        
        // Filtro de Búsqueda Libre (UNSPSC, palabras o entidad)
        let cumpleBusqueda = true;
        if (textoBusqueda !== "") {
            cumpleBusqueda = objReal.includes(textoBusqueda) || entidadReal.includes(textoBusqueda) || sectorReal.includes(textoBusqueda);
        }
        
        return cumpleDep && cumpleMun && cumpleMod && cumpleEst && cumpleBusqueda;
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
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;">No hay procesos que coincidan con su búsqueda.</td></tr>';
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
        const sector = obtenerValorExacto(proceso, ['nombre_de_la_familia', 'sector'], 'Sector no definido');
        
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

        tr.innerHTML = `
            <td><strong>${entidad}</strong></td>
            <td>${departamento}</td>
            <td>${municipio}</td>
            <td>
                <div style="font-size: 10px; color: #7f8c8d; font-weight: bold; margin-bottom: 4px;">[${sector}]</div>
                <div style="max-width: 250px; max-height: 80px; overflow-y: auto; font-size: 0.85em; line-height: 1.4;">${objeto}</div>
            </td>
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
    const canvas = document.getElementById('graficoSectores');
    if (!canvas || typeof Chart === 'undefined') return; 
    
    const ctx = canvas.getContext('2d');
    
    // Contamos por SECTOR (no por modalidad) para la torta
    const conteo = {};
    datos.forEach(p => {
        let sector = obtenerValorExacto(p, ['nombre_de_la_familia', 'sector'], 'Otros').trim();
        if (sector.length > 30) sector = sector.substring(0, 30) + '...'; // Acortar nombres largos
        conteo[sector] = (conteo[sector] || 0) + 1;
    });

    // Ordenar de mayor a menor y tomar el Top 6 para que la torta sea legible
    const ordenados = Object.entries(conteo).sort((a, b) => b[1] - a[1]);
    const top6 = ordenados.slice(0, 6);
    
    if (miGrafico) miGrafico.destroy();

    miGrafico = new Chart(ctx, {
        type: 'pie', // GRÁFICO CIRCULAR
        data: {
            labels: top6.map(item => item[0]),
            datasets: [{
                data: top6.map(item => item[1]),
                backgroundColor: ['#3498db', '#2ecc71', '#f1c40f', '#e74c3c', '#9b59b6', '#34495e'],
                borderWidth: 1
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            plugins: { 
                legend: { position: 'right', labels: { boxWidth: 15, font: { size: 11 } } } 
            } 
        }
    });
}
