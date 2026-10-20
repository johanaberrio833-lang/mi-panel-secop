let datosMaestros = [];
let miGrafico = null;

// Función para extraer de forma segura los valores reales de SECOP (sin importar si cambian de nombre)
const obtenerValor = (obj, clavesPosibles, valorPorDefecto = 'No definido') => {
    for (let clave of clavesPosibles) {
        if (obj[clave] && obj[clave] !== 'No definido') return obj[clave];
    }
    return valorPorDefecto;
};

// Limpiar la fecha para que se vea corta (quitando la 'T' y la hora)
const formatoFecha = (cadena) => {
    if (!cadena || cadena === 'No definido') return 'Sin fecha';
    return cadena.split('T')[0];
};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const respuesta = await fetch('data/datos_hoy.json');
        datosMaestros = await respuesta.json();
        
        cargarFiltros(datosMaestros);
        actualizarTablero(datosMaestros);
        
        // Activar los filtros cuando el usuario hace clic
        document.getElementById('filtro-departamento').addEventListener('change', aplicarFiltros);
        document.getElementById('filtro-modalidad').addEventListener('change', aplicarFiltros);
        
    } catch (error) {
        console.error("Error cargando los datos:", error);
        document.getElementById('table-body').innerHTML = '<tr><td colspan="7" style="text-align: center; color: red;">Error al cargar los datos.</td></tr>';
    }
});

function cargarFiltros(datos) {
    const selectDep = document.getElementById('filtro-departamento');
    selectDep.innerHTML = '<option value="Todos">Todos</option>'; // Reiniciar el filtro
    const departamentos = [...new Set(datos.map(p => obtenerValor(p, ['departamento_entidad', 'departamento'])))].filter(d => d !== 'No definido').sort();
    departamentos.forEach(dep => selectDep.appendChild(new Option(dep, dep)));

    const selectMod = document.getElementById('filtro-modalidad');
    selectMod.innerHTML = '<option value="Todas">Todas</option>'; // Reiniciar el filtro
    const modalidades = [...new Set(datos.map(p => obtenerValor(p, ['modalidad_de_contratacion', 'modalidad_de_contrataci_n'])))].filter(m => m !== 'No definido').sort();
    modalidades.forEach(mod => selectMod.appendChild(new Option(mod, mod)));
}

function aplicarFiltros() {
    const depSeleccionado = document.getElementById('filtro-departamento').value;
    const modSeleccionada = document.getElementById('filtro-modalidad').value;
    
    const datosFiltrados = datosMaestros.filter(proceso => {
        const depReal = obtenerValor(proceso, ['departamento_entidad', 'departamento']);
        const modReal = obtenerValor(proceso, ['modalidad_de_contratacion', 'modalidad_de_contrataci_n']);
        
        const cumpleDep = (depSeleccionado === 'Todos') || (depReal === depSeleccionado);
        const cumpleMod = (modSeleccionada === 'Todas') || (modReal === modSeleccionada);
        return cumpleDep && cumpleMod;
    });
    
    actualizarTablero(datosFiltrados);
}

function actualizarTablero(datos) {
    renderizarKPIs(datos);
    renderizarGrafico(datos);
    renderizarTabla(datos);
}

function renderizarKPIs(datos) {
    // Actualizar la tarjeta de cantidad
    document.getElementById('kpi-total').textContent = datos.length;
    
    // Actualizar la tarjeta de dinero
    const valorTotal = datos.reduce((suma, proceso) => suma + (Number(proceso.precio_base) || 0), 0);
    document.getElementById('kpi-valor').textContent = `$ ${valorTotal.toLocaleString('es-CO')}`;
}

function renderizarGrafico(datos) {
    const canvas = document.getElementById('graficoModalidad');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const conteo = {};
    
    datos.forEach(p => {
        const mod = obtenerValor(p, ['modalidad_de_contratacion', 'modalidad_de_contrataci_n']);
        conteo[mod] = (conteo[mod] || 0) + 1;
    });

    if (miGrafico) miGrafico.destroy();

    miGrafico = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(conteo),
            datasets: [{
                label: 'Contratos en Oferta',
                data: Object.values(conteo),
                backgroundColor: '#3498db',
                borderRadius: 4
            }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });
}

function renderizarTabla(datos) {
    const tbody = document.getElementById('table-body'); 
    if (!tbody) return;
    tbody.innerHTML = ''; 
    
    const datosMostrar = datos.slice(0, 150); // Mostrar máximo 150 para que el navegador no colapse
    
    if(datosMostrar.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No hay procesos de oferta para estos filtros.</td></tr>';
        return;
    }

    datosMostrar.forEach(proceso => {
        const tr = document.createElement('tr');
        
        const entidad = obtenerValor(proceso, ['entidad']);
        const departamento = obtenerValor(proceso, ['departamento_entidad', 'departamento']);
        const modalidad = obtenerValor(proceso, ['modalidad_de_contratacion', 'modalidad_de_contrataci_n']);
        const objeto = obtenerValor(proceso, ['descripci_n_del_procedimiento', 'descripcion_del_procedimiento'], 'Sin descripción');
        
        // Fechas
        const fechaPub = formatoFecha(obtenerValor(proceso, ['fecha_de_publicacion_del']));
        const fechaInicio = formatoFecha(obtenerValor(proceso, ['fecha_de_recepcion_de', 'fecha_inicio_presentacion']));
        const fechaCierre = formatoFecha(obtenerValor(proceso, ['fecha_de_cierre', 'fecha_fin_presentacion']));
        
        const bloqueFechas = `
            <div style="font-size: 12px; line-height: 1.5; white-space: nowrap;">
                <strong>Pub:</strong> ${fechaPub}<br>
                <strong>Inicio:</strong> ${fechaInicio}<br>
                <strong>Cierre:</strong> <span style="color:#e74c3c;">${fechaCierre}</span>
            </div>
        `;

        // Enlace
        let urlSocrata = "#";
        if (typeof proceso.urlproceso === 'string') urlSocrata = proceso.urlproceso;
        else if (proceso.urlproceso && proceso.urlproceso.url) urlSocrata = proceso.urlproceso.url;
        
        const botonEnlace = urlSocrata !== "#" ? `<a href="${urlSocrata}" target="_blank" style="background-color: #2ecc71; color: white; padding: 6px 10px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 13px; display: inline-block; white-space: nowrap;">Ir a SECOP</a>` : 'N/A';
        
        const precio = proceso.precio_base ? Number(proceso.precio_base).toLocaleString('es-CO') : '0';

        tr.innerHTML = `
            <td><strong>${entidad}</strong></td>
            <td>${departamento}</td>
            <td><div style="max-width: 350px; max-height: 80px; overflow-y: auto; font-size: 0.9em; line-height: 1.4;">${objeto}</div></td>
            <td>${modalidad}</td>
            <td>${bloqueFechas}</td>
            <td>$ ${precio}</td>
            <td style="text-align: center;">${botonEnlace}</td>
        `;
        tbody.appendChild(tr);
    });
}
