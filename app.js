let datosMaestros = [];
let miGrafico = null;

// Función "Inteligente" que busca la columna sin importar cómo SECOP le cambie el nombre
const buscarDato = (proceso, palabrasClave, valorPorDefecto = 'No definido') => {
    const claves = Object.keys(proceso);
    for (let palabra of palabrasClave) {
        const claveEncontrada = claves.find(k => k.toLowerCase().includes(palabra));
        if (claveEncontrada && proceso[claveEncontrada]) {
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
        
        cargarFiltros(datosMaestros);
        actualizarTablero(datosMaestros);
        
        document.getElementById('filtro-departamento').addEventListener('change', aplicarFiltros);
        document.getElementById('filtro-modalidad').addEventListener('change', aplicarFiltros);
        
    } catch (error) {
        console.error("Error cargando los datos:", error);
        document.getElementById('table-body').innerHTML = '<tr><td colspan="7" style="text-align: center; color: red;">Error al cargar los datos de SECOP.</td></tr>';
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
}

function aplicarFiltros() {
    const depSeleccionado = document.getElementById('filtro-departamento').value;
    const modSeleccionada = document.getElementById('filtro-modalidad').value;
    
    const datosFiltrados = datosMaestros.filter(proceso => {
        const depReal = buscarDato(proceso, ['departamento']);
        const modReal = buscarDato(proceso, ['modalidad', 'proceso']);
        
        const cumpleDep = (depSeleccionado === 'Todos') || (depReal === depSeleccionado);
        const cumpleMod = (modSeleccionada === 'Todas') || (modReal === modSeleccionada);
        return cumpleDep && cumpleMod;
    });
    
    actualizarTablero(datosFiltrados);
}

function actualizarTablero(datos) {
    // Dividimos en bloques seguros para que si algo falla, no bloquee lo demás
    try { renderizarKPIs(datos); } catch(e) { console.error(e); }
    try { renderizarTabla(datos); } catch(e) { console.error(e); }
    try { renderizarGrafico(datos); } catch(e) { console.error(e); }
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
    
    const datosMostrar = datos.slice(0, 150); // Muestra los primeros 150 para rapidez visual
    
    if(datosMostrar.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No hay procesos de oferta para estos filtros.</td></tr>';
        return;
    }

    datosMostrar.forEach(proceso => {
        const tr = document.createElement('tr');
        
        const entidad = buscarDato(proceso, ['entidad', 'nombre']);
        const departamento = buscarDato(proceso, ['departamento']);
        const modalidad = buscarDato(proceso, ['modalidad', 'proceso']);
        const objeto = buscarDato(proceso, ['descripci', 'objeto', 'detalle'], 'Sin descripción');
        
        const fechaPub = formatoFecha(buscarDato(proceso, ['publicacion', 'publicaci']));
        const fechaInicio = formatoFecha(buscarDato(proceso, ['recepcion', 'inicio']));
        const fechaCierre = formatoFecha(buscarDato(proceso, ['cierre', 'fin']));
        
        const bloqueFechas = `
            <div style="font-size: 12px; line-height: 1.5; white-space: nowrap;">
                <strong>Pub:</strong> ${fechaPub}<br>
                <strong>Inicio:</strong> ${fechaInicio}<br>
                <strong>Cierre:</strong> <span style="color:#e74c3c; font-weight:bold;">${fechaCierre}</span>
            </div>
        `;

        let urlSocrata = "#";
        if (proceso.urlproceso && typeof proceso.urlproceso === 'string') urlSocrata = proceso.urlproceso;
        else if (proceso.urlproceso && proceso.urlproceso.url) urlSocrata = proceso.urlproceso.url;
        
        const botonEnlace = urlSocrata !== "#" ? `<a href="${urlSocrata}" target="_blank" style="background-color: #2ecc71; color: white; padding: 6px 10px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 13px; display: inline-block; white-space: nowrap;">Ir a SECOP</a>` : 'Sin Enlace';
        
        const precio = Number(buscarDato(proceso, ['precio', 'cuantia', 'valor'], 0));
        const precioTexto = precio > 0 ? `$ ${precio.toLocaleString('es-CO')}` : 'Por definir';

        tr.innerHTML = `
            <td><strong>${entidad}</strong></td>
            <td>${departamento}</td>
            <td><div style="max-width: 350px; max-height: 80px; overflow-y: auto; font-size: 0.9em; line-height: 1.4;">${objeto}</div></td>
            <td>${modalidad}</td>
            <td>${bloqueFechas}</td>
            <td>${precioTexto}</td>
            <td style="text-align: center;">${botonEnlace}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderizarGrafico(datos) {
    const canvas = document.getElementById('graficoModalidad');
    // Verificamos que Chart.js se haya cargado correctamente para no arrojar errores
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
            datasets: [{
                label: 'Contratos',
                data: Object.values(conteo),
                backgroundColor: '#3498db',
                borderRadius: 4
            }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });
}
