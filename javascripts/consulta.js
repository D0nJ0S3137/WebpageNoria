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

    
    // Inicializar el tacómetro
    rpmGaugeHistoric = new Gauge(document.getElementById("rpmGaugeMap")).setOptions({
        angle: 0.20, 
        lineWidth: 0.15,
        radiusScale: 0.8,
        pointer: {
            length: 0.5, // Relativo al radio del gauge
            strokeWidth: 0.02, // El grosor del puntero
            color: '#000000' // Color del puntero
        },
        limitMax: false, 
        limitMin: false, 
        colorStart: '#FFC107', 
        colorStop: '#FFC107', 
        strokeColor: '#E0E0E0', 
        generateGradient: true,
        highDpiSupport: true,
        staticLabels: {
            font: "12px sans-serif", 
            labels: [0, 2000, 4000, 6000], 
            color: "#000000", 
            fractionDigits: 0 
        },
        staticZones: [
            {strokeStyle: "#30B32D", min: 0, max: 2000}, 
            {strokeStyle: "#3498DB", min: 2000, max: 4000}, 
            {strokeStyle: "#F03E3E", min: 4000, max: 6000},
        ],
    });
    rpmGaugeHistoric.maxValue = 6000; // valor máximo del tacómetro
    rpmGaugeHistoric.setMinValue(0);  // valor mínimo del tacómetro
    rpmGaugeHistoric.set(0); // Establece un valor inicial
    console.log("rpmGaugeHistoric inicializado:", rpmGaugeHistoric);

    document.getElementById("vehicleSelector").addEventListener("change", () => {
        limpiarMapa();  // Limpia el mapa cada vez que se cambia la selección del vehículo
        const vehiculoSeleccionado = document.getElementById("vehicleSelector").value;
        const startDateTime = document.getElementById('startDateTime').value;
        const endDateTime = document.getElementById('endDateTime').value;
    
        if (vehiculoSeleccionado === 'vehiculo1' && startDateTime && endDateTime) {
            cargarDatos2(startDateTime, endDateTime, myMap);
        } else if (vehiculoSeleccionado === 'vehiculo2' && startDateTime && endDateTime) {
            cargarDatos(startDateTime, endDateTime, myMap);
        } else if (vehiculoSeleccionado === 'vehiculos' && startDateTime && endDateTime) {
            cargarAmbosDatos(startDateTime, endDateTime, myMap);
        }
    });

    document.getElementById('submitButton').addEventListener('click', (event) => {
        event.preventDefault(); // Previene la acción por defecto del formulario
        limpiarMapa();
        const startDateTime = document.getElementById('startDateTime').value;
        const endDateTime = document.getElementById('endDateTime').value;
    
        // Actualiza y muestra la fecha y hora seleccionadas
        updateDateTimeDisplay(startDateTime, endDateTime);
    
        // Decidir qué función llamar basándose en el vehículo seleccionado
        const vehiculoSeleccionado = document.getElementById('vehicleSelector').value;
        if (vehiculoSeleccionado === 'vehiculo1') {
            cargarDatos2(startDateTime, endDateTime, myMap);
        } else if (vehiculoSeleccionado === 'vehiculo2') {
            cargarDatos(startDateTime, endDateTime, myMap);
        } else if (vehiculoSeleccionado === 'vehiculos'){
            cargarAmbosDatos(startDateTime, endDateTime, myMap);
        }
    });

    if (!localStorage.getItem('hasSeenInstructions')) {
        console.log('Mostrando modal');
        var myModal = new bootstrap.Modal(document.getElementById('instructionsModal'), {
            keyboard: false
        });
        myModal.show();
        localStorage.setItem('hasSeenInstructions', 'true');
    }
});

function cargarDatos(startDateTime, endDateTime, myMap) {
    limpiarMapa();
    const vehiculoSeleccionado = document.getElementById('vehicleSelector').value;
    if (vehiculoSeleccionado === 'vehiculo2') {
        const link = `/consulta-historicos?startDateTime=${startDateTime}&endDateTime=${endDateTime}`; 
        fetch(link)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                console.log(data);

                if (data.length > 0) {
                    trayectos.forEach(trayecto => trayecto.remove());
                    trayectos = [];
                    markers.forEach(marker => marker.remove());
                    markers = [];
                    decoradores.forEach(decorador => decorador.remove());
                    decoradores = [];

                    rutaActual = L.polyline([], {
                        color: 'blue',      
                        weight: 3,          
                        opacity: 0.7,       
                        lineJoin: 'round',  
                    }).addTo(myMap);

                    trayectos.push(rutaActual);

                    let ultimoPunto = null;
                    data.forEach(point => {
                        const lat = parseFloat(point.Latitude); 
                        const lng = parseFloat(point.Longitude);
                        const nuevoPunto = L.latLng(lat, lng);

                        if (ultimoPunto && myMap.distance(ultimoPunto, nuevoPunto) > 200) {
                            if (ultimoPunto) {
                                let decorador = L.polylineDecorator(rutaActual, {
                                    patterns: [
                                        {offset: '5%', repeat: '50px', symbol: L.Symbol.arrowHead({pixelSize: 10, pathOptions: {opacity: 0.7, color: 'blue', weight: 3}})}
                                    ]
                                }).addTo(myMap);
                                decoradores.push(decorador);
                            }
                            rutaActual = L.polyline([], { color: 'blue', weight: 3, opacity: 0.7, lineJoin: 'round' }).addTo(myMap);
                            trayectos.push(rutaActual);
                        }
                        rutaActual.addLatLng(nuevoPunto);
                        ultimoPunto = nuevoPunto;
                    });

                    if (rutaActual.getLatLngs().length > 0) {
                        let decorador = L.polylineDecorator(rutaActual, {
                            patterns: [
                                {offset: '5%', repeat: '50px', symbol: L.Symbol.arrowHead({pixelSize: 10, pathOptions: {opacity: 0.7, color: 'blue', weight: 3}})}
                            ]
                        }).addTo(myMap);
                        decoradores.push(decorador);
                    }

                    if (!marcadorDeslizable1) {
                        marcadorDeslizable1 = L.marker([0, 0],{ 
                            draggable: true,
                            icon: truckIcon2
                        }).addTo(myMap);
                    }
                    actualizarSlider(data, myMap);

                    // 🚀🚀🚀 CALCULAR ERRORES AQUÍ DENTRO
                    if (turfIdealLines) {
                        const lineCoords = turfIdealLines.features
                            .map(f => f.geometry.coordinates)
                            .flat();
                        const turfLine = turf.lineString(lineCoords);
                        const errores = data.map(pt => {
                            const punto = turf.point([pt.Longitude, pt.Latitude]);
                            return turf.pointToLineDistance(punto, turfLine, { units: 'meters' });
                        });
                        const suma = errores.reduce((a,b) => a + b, 0);
                        const media = suma / errores.length;
                        const maximo = Math.max(...errores);
                        const varianza = errores.reduce((a,d) => a + Math.pow(d - media, 2), 0) / errores.length;
                        const desviacion = Math.sqrt(varianza);

                        document.getElementById('errorContent').innerHTML = `
                            <p><strong>Error Medio:</strong> ${media.toFixed(1)} m</p>
                            <p><strong>Error Máximo:</strong> ${maximo.toFixed(1)} m</p>
                            <p><strong>Desviación Estándar:</strong> ${desviacion.toFixed(1)} m</p>
                        `;
                        dibujarTrayectoConError(data, errores, myMap);
                    }
                    // (O simplemente puedes llamar processErrors(data) aquí)
                    // processErrors(data);

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
}



function cargarDatos2(startDateTime, endDateTime, myMap) {
    limpiarMapa();
    const vehiculoSeleccionado = document.getElementById('vehicleSelector').value;
    if (vehiculoSeleccionado === 'vehiculo1') {
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
                        const lineCoords = turfIdealLines.features.flatMap(f => f.geometry.coordinates);
                        const turfLine = turf.lineString(lineCoords);

                        const errores = calcularErroresContraSegmentos(data2, turfIdealLines);
                        // Recalcular métricas
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

                        // Redibujar trayecto coloreado según error
                        for (let i = 0; i < data2.length - 1; i++) {
                            const coordA = L.latLng(data2[i].Latitude, data2[i].Longitude);
                            const coordB = L.latLng(data2[i + 1].Latitude, data2[i + 1].Longitude);
                            const errAvg = (errores[i] + errores[i + 1]) / 2;

                            let color = 'green';
                            if (errAvg > 5) color = 'red';
                            else if (errAvg > 2) color = 'orange';

                            L.polyline([coordA, coordB], {
                                color,
                                weight: 5,
                                opacity: 0.9,
                                lineJoin: 'round'
                            }).addTo(myMap);
                        }
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
}
function calcularErroresContraSegmentos(data, turfIdealLines) {
    const segmentos = turfIdealLines.features.flatMap(f => {
        const coords = f.geometry.coordinates;
        const result = [];
        for (let i = 0; i < coords.length - 1; i++) {
            result.push(turf.lineString([coords[i], coords[i + 1]]));
        }
        return result;
    });

    return data.map(pt => {
        const punto = turf.point([parseFloat(pt.Longitude), parseFloat(pt.Latitude)]);
        const minDist = Math.min(...segmentos.map(seg => 
            turf.pointToLineDistance(punto, seg, { units: 'meters' })
        ));

        // Dibujar círculo para validación
        L.circle([pt.Latitude, pt.Longitude], {
            radius: minDist,
            color: 'red',
            fillColor: 'red',
            fillOpacity: 0.15,
            weight: 1
        }).addTo(myMap);

        return minDist;
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

function cargarAmbosDatos(startDateTime, endDateTime, myMap) {
    limpiarMapa();
    console.log("Cargando datos para ambos vehículos");

    const link1 = `/consulta-historicos?startDateTime=${startDateTime}&endDateTime=${endDateTime}`;
    const link2 = `/consulta-historicos2?startDateTime=${startDateTime}&endDateTime=${endDateTime}`;

    Promise.all([
        fetch(link1).then(response => response.json()),
        fetch(link2).then(response => response.json())
    ]).then(results => {
        const [data1, data2] = results;

        if (data1.length > 0) {
            procesarDatosVehiculo(data1, myMap, 'blue', truckIcon2, true);
        } else {
            console.log("No hay datos para el vehículo 1 en el rango seleccionado.");
        }

        if (data2.length > 0) {
            procesarDatosVehiculo(data2, myMap, 'red', truckIcon, false);
        } else {
            console.log("No hay datos para el vehículo 2 en el rango seleccionado.");
        }

        if (data1.length > 0 || data2.length > 0) {
            actualizarSliderAmbos(data1, data2, myMap);
            document.getElementById('timeSlider').style.display = 'block';
        } else {
            alert("No hay datos de ruta disponibles para la ventana de tiempo seleccionada.");
            document.getElementById('timeSlider').style.display = 'none';
        }
    }).catch(error => {
        console.error('Error cargando datos de ambos vehículos:', error);
        alert("Hubo un problema al cargar los datos de ambos vehículos.");
        document.getElementById('timeSlider').style.display = 'none';
    });
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

function actualizarSliderAmbos(data1, data2, myMap) {
    const slider = document.getElementById('timeSlider');

    const combinedData = data1.concat(data2).sort((a, b) => new Date(a.DateTime) - new Date(b.DateTime));

    slider.max = combinedData.length - 1;
    slider.value = 0;

    // Recopilar todas las coordenadas de ambos vehículos para ajustar la vista del mapa
    let allCoordinates = combinedData.map(point => [point.Latitude, point.Longitude]);

    const fechaPaso = document.getElementById('fechaPaso');
    const horaPaso = document.getElementById('horaPaso');
    const rpmInfo = document.getElementById('rpmInfo');

    slider.oninput = function() {
        const index = this.value;
        const currentPoint = combinedData[index];

        const [fecha, hora] = currentPoint.DateTime.split(' ');

        // Actualizar el marcador y la información del vehículo correspondiente
        if (data1.includes(currentPoint)) {
            const latLng1 = L.latLng(currentPoint.Latitude, currentPoint.Longitude);
            const rpm1 = currentPoint.RPM !== undefined ? currentPoint.RPM : '-';

            if (marcadorDeslizable1) {
                marcadorDeslizable1.setLatLng(latLng1);
            }

            if (rpmGaugeHistoric && rpm1 !== '-') {
                rpmGaugeHistoric.set(rpm1);
            } else if (rpmGaugeHistoric && rpm1 === '-') {
                rpmGaugeHistoric.set(0);
            }
        }

        if (data2.includes(currentPoint)) {
            const latLng2 = L.latLng(currentPoint.Latitude, currentPoint.Longitude);

            if (marcadorDeslizable2) {
                marcadorDeslizable2.setLatLng(latLng2);
            }
        }

        // Actualiza el contenido del elemento HTML
        fechaPaso.textContent = fecha;
        horaPaso.textContent = hora;
        rpmInfo.textContent = currentPoint.RPM !== undefined ? currentPoint.RPM : '-';

        // Ajustar la vista del mapa para incluir todos los puntos de ambos vehículos
        myMap.fitBounds(allCoordinates);
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