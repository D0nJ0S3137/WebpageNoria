// errorMetrics.js

function processErrors(data) {
    if (!turfIdealLines) {
      console.warn('No hay ruta ideal cargada aún.');
      return;
    }
  
    // Unir todas las LineStrings en un solo LineString continuo para Turf.js
    const lineCoords = turfIdealLines.features
      .map(f => f.geometry.coordinates)
      .flat();
    const turfLine = turf.lineString(lineCoords);
  
    // Calcular las distancias en metros desde cada punto GPS al LineString
    const errores = data.map(pt => {
      const punto = turf.point([ pt.Longitude, pt.Latitude ]);
      return turf.pointToLineDistance(punto, turfLine, { units: 'meters' });
    });
  
    // Estadísticas
    const suma = errores.reduce((a, b) => a + b, 0);
    const media = suma / errores.length;
    const maximo = Math.max(...errores);
    const varianza = errores.reduce((a, d) => a + Math.pow(d - media, 2), 0) / errores.length;
    const desviacion = Math.sqrt(varianza);
  
    // Mostrar en pantalla
    const contenedor = document.getElementById('errorContent');
    contenedor.innerHTML = `
      <p><b>Error Medio:</b> ${media.toFixed(2)} metros</p>
      <p><b>Error Máximo:</b> ${maximo.toFixed(2)} metros</p>
      <p><b>Desviación Estándar:</b> ${desviacion.toFixed(2)} metros</p>
    `;
  }
  