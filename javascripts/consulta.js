var truckIcon = L.icon({
    iconUrl: '/colectivo1 (2).png', 
    iconSize: [40, 40],  // Tamaño del ícono
    iconAnchor: [20, 20],  // Punto del ícono que corresponderá a la coordenada del marcador
    popupAnchor: [0, -20]  // Dónde se mostrará el popup en relación al ícono
});

var truckIcon2 = L.icon({
    iconUrl: '/colectivo2-removebg-preview.png', 
    iconSize: [40, 40],  // Tamaño del ícono
    iconAnchor: [20, 20],  // Punto del ícono que corresponderá a la coordenada del marcador
    popupAnchor: [0, -20]  // Dónde se mostrará el popup en relación al ícono
});
let markers= []
let markers2 = []
let trayectos = []; // Almacena las polilíneas de cada trayecto
let trayectos2 = [];
let rutaActual;
let rutaActual2;
let decoradores = [];
let decoradores2 = []; // Almacena las instancias de los decoradores de flechas
let rpmGaugeHistoric;
let marcadorDeslizable1 = null;
let marcadorDeslizable2 = null;
let myMap;

document.addEventListener('DOMContentLoaded', () => {
    myMap = L.map('mapid').setView([11.02115114, -74.84057200], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(myMap);

    document.getElementById('submitButton').addEventListener('click', (event) => {
        event.preventDefault();
        limpiarMapa();
        const startDateTime = document.getElementById('startDateTime').value;
        const endDateTime = document.getElementById('endDateTime').value;
        updateDateTimeDisplay(startDateTime, endDateTime);
        cargarDatos2(startDateTime, endDateTime, myMap);
    });

    if (!localStorage.getItem('hasSeenInstructions')) {
        const myModal = new bootstrap.Modal(document.getElementById('instructionsModal'), { keyboard: false });
        myModal.show();
        localStorage.setItem('hasSeenInstructions', 'true');
    }

    // Cargar líneas ideales desde el geojson
    fetch('/assets/data/Layers.geojson')
        .then(response => response.json())
        .then(geojson => {
            const lineas = geojson.features.filter(f => f.geometry.type === 'LineString');
            if (lineas.length > 0) {
                const lineCollection = { type: 'FeatureCollection', features: lineas };
                L.geoJSON(lineCollection, { style: { color: 'green', weight: 5, opacity: 0.7 } }).addTo(myMap);
                turfIdealLines = lineCollection;
            } else {
                console.error('No se encontraron LineStrings en el GeoJSON.');
            }
        })
        .catch(error => console.error('Error cargando Layers.geojson:', error));
});




function cargarDatos2(startDateTime, endDateTime, myMap) {
    limpiarMapa();
    const link2 = `/consulta-historicos2?startDateTime=${startDateTime}&endDateTime=${endDateTime}`; 
    fetch(link2)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data2 => {
            console.log(data2);
            if (data2.length > 0) {
                procesarDatosVehiculo(data2, myMap, 'red', truckIcon, false);
                actualizarSlider(data2, myMap);

                // 🚀🚀🚀 CALCULAR ERRORES AQUÍ DENTRO
                if (turfIdealLines) {
                    const lineCoords = turfIdealLines.features
                        .map(f => f.geometry.coordinates)
                        .flat();
                    const turfLine = turf.lineString(lineCoords);
                    const errores = data2.map(pt => {
                        const punto = turf.point([pt.Longitude, pt.Latitude]);
                        return turf.pointToLineDistance(punto, turfLine, { units: 'meters' });
                    });
                    const suma = errores.reduce((a, b) => a + b, 0);
                    const media = suma / errores.length;
                    const maximo = Math.max(...errores);
                    const varianza = errores.reduce((a, d) => a + Math.pow(d - media, 2), 0) / errores.length;
                    const desviacion = Math.sqrt(varianza);

                    document.getElementById('errorContent').innerHTML = `
                        <p><strong>Error Medio:</strong> ${media.toFixed(1)} m</p>
                        <p><strong>Error Máximo:</strong> ${maximo.toFixed(1)} m</p>
                        <p><strong>Desviación Estándar:</strong> ${desviacion.toFixed(1)} m</p>
                    `;
                    dibujarTrayectoConError(data2, errores, myMap);
                }

                // (O simplemente puedes llamar processErrors(data2); aquí)
                // processErrors(data2);

            } else {
                alert("No hay datos de ruta disponibles para la ventana de tiempo seleccionada.");
                document.getElementById('timeSlider').style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Error en fetch o procesando data:', error);
            alert("Hubo un problema al cargar los datos.");
            document.getElementById('timeSlider').style.display = 'none';
        });
    
}
function dibujarTrayectoConError(data, errores, myMap) {
    for (let i = 0; i < data.length - 1; i++) {
        const puntoA = data[i];
        const puntoB = data[i + 1];

        const coordA = L.latLng(puntoA.Latitude, puntoA.Longitude);
        const coordB = L.latLng(puntoB.Latitude, puntoB.Longitude);

        // Promediar error entre punto A y punto B
        const errorA = errores[i];
        const errorB = errores[i + 1];
        const errorPromedio = (errorA + errorB) / 2;

        let color = 'green'; // Default
        if (errorPromedio > 5) {
            color = 'red';
        } else if (errorPromedio > 2) {
            color = 'orange';
        }

        L.polyline([coordA, coordB], {
            color: color,
            weight: 5,
            opacity: 0.9,
            lineJoin: 'round'
        }).addTo(myMap);
    }
}





function updateDateTimeDisplay(startDateTime, endDateTime) {
    const startDateTimeStr = document.getElementById('startDateTime').value;
    const endDateTimeStr = document.getElementById('endDateTime').value;

    if (startDateTimeStr && endDateTimeStr) {
        const [startDate, startTime] = startDateTimeStr.split(' ');
        const [endDate, endTime] = endDateTimeStr.split(' ');

        document.getElementById('startDateSpan').textContent = startDate;
        document.getElementById('startTimeSpan').textContent = startTime;
        document.getElementById('endDateSpan').textContent = endDate;
        document.getElementById('endTimeSpan').textContent = endTime;
    }
}




function procesarDatosVehiculo(data, myMap, color, icon, isVehiculo1) {
    let rutaActual;
    let decoradoresTemp = [];

    if (isVehiculo1) {
        rutaActual = L.polyline([], { color: color, weight: 3, opacity: 0.7, lineJoin: 'round' }).addTo(myMap);
        trayectos.push(rutaActual);
    } else {
        rutaActual = L.polyline([], { color: color, weight: 3, opacity: 0.7, lineJoin: 'round' }).addTo(myMap);
        trayectos2.push(rutaActual);
    }

    let ultimoPunto = null;

    data.forEach(point => {
        const lat = parseFloat(point.Latitude);
        const lng = parseFloat(point.Longitude);
        const nuevoPunto = L.latLng(lat, lng);

        if (ultimoPunto && myMap.distance(ultimoPunto, nuevoPunto) > 200) {
            let decorador = L.polylineDecorator(rutaActual, {
                patterns: [
                    { offset: '5%', repeat: '50px', symbol: L.Symbol.arrowHead({ pixelSize: 10, pathOptions: { opacity: 0.7, color: color, weight: 3 } }) }
                ]
            }).addTo(myMap);
            decoradoresTemp.push(decorador);

            rutaActual = L.polyline([], { color: color, weight: 3, opacity: 0.7, lineJoin: 'round' }).addTo(myMap);
            if (isVehiculo1) {
                trayectos.push(rutaActual);
            } else {
                trayectos2.push(rutaActual);
            }
        }

        rutaActual.addLatLng(nuevoPunto);
        ultimoPunto = nuevoPunto;
    });

    let decorador = L.polylineDecorator(rutaActual, {
        patterns: [
            { offset: '5%', repeat: '50px', symbol: L.Symbol.arrowHead({ pixelSize: 10, pathOptions: { opacity: 0.7, color: color, weight: 3 } }) }
        ]
    }).addTo(myMap);
    console.log(`Decorador creado para el vehículo ${isVehiculo1 ? '1' : '2'}`, decorador);
    decoradoresTemp.push(decorador);

    if (isVehiculo1) {
        decoradoresTemp.forEach(decorador => decoradores.push(decorador));
        if (!marcadorDeslizable1) {
            marcadorDeslizable1 = L.marker([0, 0], {
                draggable: true,
                icon: icon
            }).addTo(myMap);
        }
    } else {
        decoradoresTemp.forEach(decorador => decoradores2.push(decorador));
        if (!marcadorDeslizable2) {
            marcadorDeslizable2 = L.marker([0, 0], {
                draggable: true,
                icon: icon
            }).addTo(myMap);
        }
    }
}

function actualizarSlider(data, myMap) {
    const slider = document.getElementById('timeSlider');
    slider.max = data.length - 1;
    slider.value = 0;
    slider.style.display = 'block';  // Asegura que el slider esté visible

    const fechaPaso = document.getElementById('fechaPaso');
    const horaPaso = document.getElementById('horaPaso');
    const rpmInfo = document.getElementById('rpmInfo');

    slider.oninput = function() {
        const puntoSeleccionado = data[this.value];
        const latLng = L.latLng(puntoSeleccionado.Latitude, puntoSeleccionado.Longitude);
        const rpm = puntoSeleccionado.RPM !== undefined ? puntoSeleccionado.RPM : '-';

        const [fecha, hora] = puntoSeleccionado.DateTime.split(' ');

        if (marcadorDeslizable1) {
            marcadorDeslizable1.setLatLng(latLng);
        }
        if (marcadorDeslizable2) {
            marcadorDeslizable2.setLatLng(latLng);
        }
        myMap.setView(latLng, myMap.getZoom());

        // Actualiza el contenido del elemento HTML
        fechaPaso.textContent = fecha;
        horaPaso.textContent = hora;
        rpmInfo.textContent = rpm;

        if (rpmGaugeHistoric) {
            rpmGaugeHistoric.set(rpm === '-' ? 0 : rpm);
        }
    };

    slider.oninput();
}



function limpiarMapa() {
    console.log("Limpieza de mapa iniciada");

    // Limpiar elementos del vehículo 1
    if (rutaActual) {
        console.log("Eliminando rutaActual");
        rutaActual.remove();
        rutaActual = null;
    }
    trayectos.forEach(trayecto => {
        console.log("Eliminando trayecto");
        trayecto.remove();
    });
    trayectos = [];
    markers.forEach(marker => {
        console.log("Eliminando marker");
        marker.remove();
    });
    markers = [];
    decoradores.forEach(decorador => {
        if (decorador.remove) {
            console.log("Eliminando decorador");
            decorador.remove();
        }
    });
    decoradores = [];

    // Limpiar elementos del vehículo 2
    if (rutaActual2) {
        console.log("Eliminando rutaActual2");
        rutaActual2.remove();
        rutaActual2 = null;
    }
    trayectos2.forEach(trayecto => {
        console.log("Eliminando trayecto2");
        trayecto.remove();
    });
    trayectos2 = [];
    markers2.forEach(marker => {
        console.log("Eliminando marker2");
        marker.remove();
    });
    markers2 = [];
    decoradores2.forEach(decorador => {
        if (decorador.remove) {
            console.log("Eliminando decorador2");
            decorador.remove();
        }
    });
    decoradores2 = [];

    // Eliminar marcadores deslizables si existen
    if (marcadorDeslizable1) {
        console.log("Eliminando marcadorDeslizable1");
        marcadorDeslizable1.remove();
        marcadorDeslizable1 = null;
    }
    if (marcadorDeslizable2) {
        console.log("Eliminando marcadorDeslizable2");
        marcadorDeslizable2.remove();
        marcadorDeslizable2 = null;
    }

    // Asegurar que el slider esté oculto al limpiar el mapa
    const slider = document.getElementById('timeSlider');
    slider.style.display = 'none';

    console.log("Limpieza de mapa completada");
}