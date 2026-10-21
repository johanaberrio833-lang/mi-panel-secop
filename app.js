let datosMaestros = [];
let miGrafico = null;
let temporizadorBusqueda = null;

// Buscador Inteligente que previene cruces de columnas
const buscarColumna = (proceso, palabras) => {
    const keys = Object.keys(proceso);
    for (let p of palabras) {
        const encontrada = keys.find(k => k.toLowerCase().includes(p));
        if (encontrada && proceso[encontrada] && proceso[encontrada] !== 'No definido') {
            return proceso[encontrada];
        }
    }
    return 'No definido';
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
        
        document.getElementById('filtro-departamento').addEventListener('change', (e) => {
            actualizarFiltroMunicipios(e.target.value);
            aplicarFiltros();
        });
        document.getElementById('filtro-municipio').addEventListener('change', aplicarFiltros);
        document.getElementById('filtro-modalidad').addEventListener('change', aplicarFiltros);
        document.getElementById('filtro-estado').addEventListener('change', aplicarFiltros);
        document.getElementById('filtro-ofertas').addEventListener('change', aplicarFiltros);
        
        document.getElementById('filtro-busqueda').addEventListener('input', () => {
            clearTimeout(temporizadorBusqueda);
            temporizadorBusqueda = setTimeout(aplicarFiltros, 500);
        });
        
    } catch (error) {
        console.error("Error:", error);
    }
});

function cargarFiltrosIniciales() {
    const selectDep = document.getElementById('filtro-departamento');
    const departamentos = [...new Set(datosMaestros.map(p => buscarColumna(p, ['departamento'])))].filter(d => d !== 'No definido').sort();
    departamentos.forEach(dep => selectDep.appendChild(new Option(dep, dep)));

    const selectMod = document.getElementById('filtro-modalidad');
    const modalidades = [...new Set(datosMaestros.map(p => buscarColumna(p, ['modalidad', 'proceso'])))].filter(m => m !== 'No definido').sort();
    modalidades.forEach(mod => selectMod.appendChild(new Option(mod, mod)));

    const selectEst = document.getElementById('filtro-estado');
    const estados = [...new Set(datosMaestros.map(p => buscarColumna(p, ['estado', 'fase'])))].filter(e => e !== 'No definido').sort();
    estados.forEach(est => selectEst.appendChild(new Option(est, est)));
}

function actualizarFiltroMunicipios(deptoSeleccionado) {
    const selectMun = document.getElementById('filtro-municipio');
    selectMun.innerHTML = '<option value="Todos">Todos</option>';
    
    if (deptoSeleccionado === 'Todos') {
        selectMun.disabled = true;
        selectMun.options[0].text = "Seleccione Depto primero";
        return;
    }

    selectMun.disabled = false;
    const procesosDelDepto = datosMaestros.filter(p => buscarColumna(p, ['departamento']) === deptoSeleccionado);
    const municipios = [...new Set(procesosDelDepto.map(p => buscarColumna(p, ['ciudad', 'municipio'])))].filter(m => m !== 'No definido').sort();
    municipios.forEach(mun => selectMun.appendChild(new Option(mun, mun)));
}

function aplicarFiltros() {
    const depSeleccionado = document.getElementById('filtro-departamento').value;
    const munSeleccionado = document.getElementById('filtro-municipio').value;
    const modSeleccionada = document.getElementById('filtro-modalidad').value;
    const estSeleccionado = document.getElementById('filtro-estado').value; 
    const textoBusqueda = document.getElementById('filtro-busqueda').value.toLowerCase().trim();
    const soloOfertasVigentes = document.getElementById('filtro-ofertas').checked;
    
    const fechaHoy = new Date();
    fechaHoy.setHours(0,0,0,0);

    const datosFiltrados = datosMaestros.filter(proceso => {
        const depReal = buscarColumna(proceso, ['departamento']);
        const munReal = buscarColumna(proceso, ['ciudad', 'municipio']);
        const modReal = buscarColumna(proceso, ['modalidad', 'proceso']);
        const estReal = buscarColumna(proceso, ['estado', 'fase']);
        const objReal = buscarColumna(proceso, ['descripci', 'objeto']).toLowerCase();
        const codigoUNSPSC = buscarColumna(proceso, ['codigo', 'unspsc', 'segmento']).toLowerCase();
        const entidadReal = buscarColumna(proceso, ['entidad', 'nombre']).toLowerCase();
        
        // Comprobación de Vigencia
        const fechaCierreStr = buscarColumna(proceso, ['cierre', 'fin']);
        let esVigente = false;
        if (fechaCierreStr !== 'No definido') {
            const fechaCierre = new Date(fechaCierreStr.split('T')[0]);
            fechaCierre.setHours(0,0,0,0);
            if (fechaCierre >= fechaHoy) esVigente = true;
        }

        // Si el usuario marcó el checkbox, forzamos que el estado sea Oferta/Publicado Y que no haya vencido
        if (soloOfertasVigentes) {
            const estadoValido = estReal.toLowerCase().includes('oferta') || estReal.toLowerCase().includes('publicado');
            if (!estadoValido || !esVigente) return false;
        }

        const cumpleDep = (depSeleccionado === 'Todos') || (depReal === depSeleccionado);
        const cumpleMun = (munSeleccionado === 'Todos') || (munReal === munSeleccionado) || document.getElementById('filtro-municipio').disabled;
        const cumpleMod = (modSeleccionada === 'Todas') || (modReal === modSeleccionada);
        const cumpleEst = (estSeleccionado === 'Todos') || (estReal === estSeleccionado);
        
        let cumpleBusqueda = true;
        if (textoBusqueda !== "") {
            cumpleBusqueda = objReal.includes(textoBusqueda) || entidadReal.includes(textoBusqueda) || codigoUNSPSC.includes(textoBusqueda);
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
    
    // Contar cuántos están en fase de presentación de oferta explícitamente
    const enOferta = datos.filter(p => {
        const est = buscarColumna(p, ['estado', 'fase']).toLowerCase();
        return est.includes('oferta') || est.includes('publicado');
    }).length;
    document.getElementById('kpi-ofertas').textContent = enOferta;

    const valorTotal = datos.reduce((suma, p) => suma + (Number(buscarColumna(p, ['precio', 'cuantia', 'valor'])) || 0), 0);
    document.getElementById('kpi-valor').textContent = `$ ${valorTotal.toLocaleString('es-CO')}`;
}

function renderizarTabla(datos) {
    const tbody = document.getElementById('table-body'); 
    if (!tbody) return;
    tbody.innerHTML = ''; 
    
    const datosMostrar = datos.slice(0, 150); 
    if(datosMostrar.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;">No hay procesos que coincidan.</td></tr>';
        return;
    }

    datosMostrar.forEach(proceso => {
        const tr = document.createElement('tr');
        
        const entidad = buscarColumna(proceso, ['entidad', 'nombre']);
        const departamento = buscarColumna(proceso, ['departamento']);
        const municipio = buscarColumna(proceso, ['ciudad', 'municipio']);
        const modalidad = buscarColumna(proceso, ['modalidad', 'proceso']);
        const estado = buscarColumna(proceso, ['estado', 'fase']);
        const objeto = buscarColumna(proceso, ['descripci', 'objeto'], 'Sin descripción');
        const tipoContrato = buscarColumna(proceso, ['tipo_de_contrato', 'tipo_contrato', 'familia'], 'Otros');
        const unspsc = buscarColumna(proceso, ['codigo_principal', 'codigo_de_categoria', 'unspsc']);
        
        const fechaPub = formatoFecha(buscarColumna(proceso, ['publicacion', 'publicaci']));
        const fechaCierre = formatoFecha(buscarColumna(proceso, ['cierre', 'fin']));
        
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
        
        const precio = Number(buscarColumna(proceso, ['precio', 'cuantia', 'valor']));
        const precioTexto = precio > 0 ? `$ ${precio.toLocaleString('es-CO')}` : 'Por definir';

        let colorEstado = "#bdc3c7"; 
        if(estado.toLowerCase().includes('oferta') || estado.toLowerCase().includes('publicado')) colorEstado = "#3498db"; 
        if(estado.toLowerCase().includes('evaluaci') || estado.toLowerCase().includes('observacion')) colorEstado = "#f1c40f"; 
        if(estado.toLowerCase().includes('adjudicado') || estado.toLowerCase().includes('celebrado')) colorEstado = "#2ecc71"; 

        const etiquetaEstado = `<span style="background-color: ${colorEstado}; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-align: center; display: inline-block;">${estado}</span>`;

        tr.innerHTML = `
            <td><strong>${entidad}</strong></td>
            <td><div style="font-size: 11px;">${departamento}<br><b>${municipio}</b></div></td>
            <td><div style="font-size: 11px;"><b>${tipoContrato}</b><br>Cod: ${unspsc !== 'No definido' ? unspsc : 'N/A'}</div></td>
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
    const canvas = document.getElementById('graficoTipos');
    if (!canvas || typeof Chart === 'undefined') return; 
    const ctx = canvas.getContext('2d');
    
    // Agrupamos usando 'Tipo de Contrato' (Suministro, Obra, etc) que funciona perfectamente para discriminar sectores
    const conteo = {};
    datos.forEach(p => {
        let tipo = buscarColumna(p, ['tipo_de_contrato', 'tipo_contrato', 'familia'], 'Otros').trim();
        if (tipo.length > 30) tipo = tipo.substring(0, 30) + '...';
        conteo[tipo] = (conteo[tipo] || 0) + 1;
    });

    const ordenados = Object.entries(conteo).sort((a, b) => b[1] - a[1]).slice(0, 6);
    
    if (miGrafico) miGrafico.destroy();

    miGrafico = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ordenados.map(item => item[0]),
            datasets: [{
                data: ordenados.map(item => item[1]),
                backgroundColor: ['#3498db', '#2ecc71', '#f1c40f', '#e74c3c', '#9b59b6', '#34495e'],
                borderWidth: 1
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
    });
}
