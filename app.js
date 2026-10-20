let datosMaestros = [];
let miGrafico = null;

const buscarDato = (proceso, palabrasClave, valorPorDefecto = 'No definido') => {
    const claves = Object.keys(proceso);
    for (let palabra of palabrasClave) {
        const claveEncontrada = claves.find(k => k.toLowerCase().includes(palabra));
        if (claveEncontrada && proceso[claveEncontrada] && proceso[claveEncontrada] !== 'No definido') {
            return proceso[claveEncontrada];
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
        // Eliminamos el bloque que borraba los procesos cerrados. ¡Ahora queremos hacerles seguimiento a todos!
        
        cargarFiltros(datosMaestros);
        actualizarTablero(datosMaestros);
        
        // Activamos los 3 filtros
        document.getElementById('filtro-departamento').addEventListener('change', aplicarFiltros);
        document.getElementById('filtro-modalidad').addEventListener('change', aplicarFiltros);
        document.getElementById('filtro-estado').addEventListener('change', aplicarFiltros);
        
    } catch (error) {
        console.error("Error cargando los datos:", error);
    }
});

function cargarFiltros(datos) {
    const selectDep = document.getElementById('filtro-departamento');
    selectDep.innerHTML = '<option value="Todos">Todos</option>';
    const departamentos = [...new Set(datos.map(p => buscarDato(p, ['departamento'])))].filter(d => d !== 'No definido').sort();
    departamentos.forEach(dep => selectDep.appendChild(new Option(dep, dep)));

    const selectMod = document.getElementById('filtro-modalidad');
    selectMod.innerHTML = '<option value="Todas">Todas</option>';
    const modalidades = [...new Set(datos.map(p => buscarDato(p, ['modalidad', 'proceso'])))].filter(m => m !== 'No definido').sort();
    modalidades.forEach(mod => selectMod.appendChild(new Option(mod, mod)));

    // Cargar el nuevo selector de Estados
    const selectEst = document.getElementById('filtro-estado');
    selectEst.innerHTML = '<option value="Todos">Todos</option>';
    const estados = [...new Set(datos.map(p => buscarDato(p, ['estado', 'fase'])))].filter(e => e !== 'No definido').sort();
    estados.forEach(est => selectEst.appendChild(new Option(est, est)));
}

function aplicarFiltros() {
    const depSeleccionado = document.getElementById('filtro-departamento').value;
    const modSeleccionada = document.getElementById('filtro-modalidad').value;
    const estSeleccionado = document.getElementById('filtro-estado').value; // Leer el estado
    
    const datosFiltrados = datosMaestros.filter(proceso => {
        const depReal = buscarDato(proceso, ['departamento']);
        const modReal = buscarDato(proceso, ['modalidad', 'proceso']);
        const estReal = buscarDato(proceso, ['estado', 'fase']);
        
        const cumpleDep = (depSeleccionado === 'Todos') || (depReal === depSeleccionado);
        const cumpleMod = (modSeleccionada === 'Todas') || (modReal === modSeleccionada);
        const cumpleEst = (estSeleccionado === 'Todos') || (estReal === estSeleccionado);
        
        return cumpleDep && cumpleMod && cumpleEst;
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
    const valorTotal = datos.reduce((suma, proceso) => suma + (Number(buscarDato(proceso, ['precio', 'cuantia', 'valor'], 0)) || 0), 0);
    document.getElementById('kpi-valor').textContent = `$ ${valorTotal.toLocaleString('es-CO')}`;
}

function renderizarTabla(datos) {
    const tbody = document.getElementById('table-body'); 
    if (!tbody) return;
    tbody.innerHTML = ''; 
    
    const datosMostrar = datos.slice(0, 150); 
    
    if(datosMostrar.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No hay procesos vigentes para estos filtros.</td></tr>';
        return;
    }

    datosMostrar.forEach(proceso => {
        const tr = document.createElement('tr');
        
        const entidad = buscarDato(proceso, ['entidad', 'nombre']);
        const departamento = buscarDato(proceso, ['departamento']);
        const modalidad = buscarDato(proceso, ['modalidad', 'proceso']);
        const estado = buscarDato(proceso, ['estado', 'fase']);
        const objeto = buscarDato(proceso, ['descripci', 'objeto', 'detalle'], 'Sin descripción');
        
        const fechaPub = formatoFecha(buscarDato(proceso, ['publicacion', 'publicaci']));
        const fechaCierre = formatoFecha(buscarDato(proceso, ['cierre', 'fin']));
        
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
        
        const precio = Number(buscarDato(proceso, ['precio', 'cuantia', 'valor'], 0));
        const precioTexto = precio > 0 ? `$ ${precio.toLocaleString('es-CO')}` : 'Por definir';

        // Determinar el color de la etiqueta de Estado
        let colorEstado = "#bdc3c7"; // Gris por defecto
        if(estado.toLowerCase().includes('oferta') || estado.toLowerCase().includes('borrador')) colorEstado = "#3498db"; // Azul
        if(estado.toLowerCase().includes('evaluaci')) colorEstado = "#f1c40f"; // Amarillo
        if(estado.toLowerCase().includes('adjudicado') || estado.toLowerCase().includes('celebrado')) colorEstado = "#2ecc71"; // Verde

        const etiquetaEstado = `<span style="background-color: ${colorEstado}; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">${estado}</span>`;

        tr.innerHTML = `
            <td><strong>${entidad}</strong></td>
            <td>${departamento}</td>
            <td><div style="max-width: 300px; max-height: 80px; overflow-y: auto; font-size: 0.85em; line-height: 1.4;">${objeto}</div></td>
            <td>${modalidad}</td>
            <td style="text-align: center;">${etiquetaEstado}</td>
            <td>${bloqueFechas}</td>
            <td>${precioTexto}</td>
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
        const mod = buscarDato(p, ['modalidad', 'proceso']);
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
