const userLat = 48.6833;
        const userLon = 6.2;

        
        const map = L.map('map').setView([userLat, userLon], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
        }).addTo(map);

       
        fetch('https://api.cyclocity.fr/contracts/nancy/gbfs/station_information.json')
            .then(response => response.json())
            .then(data => {
                data.data.stations.forEach(station => {
                    const { name, lat, lon, capacity } = station;
                    L.marker([lat, lon]).addTo(map)
                        .bindPopup(`
                            <strong>${name}</strong><br>
                            Capacité : ${capacity}
                        `);
                });
            })
            .catch(err => console.error('Erreur API vélos :', err));

        
        fetch('https://api.waqi.info/feed/here/?token=6b2bcfeae5cf939d58d60c5e4617879531a8e65d')
            .then(response => response.json())
            .then(data => {
                const aqi = data.data.aqi;
                let quality;
                if (aqi <= 50) quality = "Bonne";
                else if (aqi <= 100) quality = "Moyenne";
                else quality = "Mauvaise";

                document.getElementById('pollutionInfo').innerHTML = `
                    <strong>Qualité de l'air : </strong> ${quality} (AQI : ${aqi})
                `;
            })
            .catch(err => console.error('Erreur API pollution :', err));

            function fetchWeather() {
    fetch('weather.xml')
        .then(response => response.text())
        .then(xmlData => {
            const parser = new DOMParser();
            const xml = parser.parseFromString(xmlData, "application/xml");

            if (!xml.querySelector("echeance")) {
                throw new Error("Aucune donnée de prévision météo trouvée !");
            }

            const currentDate = new Date().toISOString().slice(0, 10);
            const periods = ["07", "13", "19"];

            const forecasts = Array.from(xml.querySelectorAll("echeance"))
                .filter(echeance => {
                    const timestamp = echeance.getAttribute("timestamp");
                    return (
                        timestamp.startsWith(currentDate) &&
                        periods.includes(timestamp.slice(11, 13))
                    );
                });

            const weatherInfo = forecasts.map(echeance => {
                const temperatureNode = echeance.querySelector("temperature[level='sol']");
                const rainNode = echeance.querySelector("pluie");
                const snowNode = echeance.querySelector("risque_neige");
                const windNode = echeance.querySelector("vent_moyen level");

                const temperature = temperatureNode ? parseFloat(temperatureNode.textContent) - 273.15 : "N/A";
                const rainRisk = rainNode ? parseInt(rainNode.textContent, 10) > 0 : false;
                const snowRisk = snowNode ? parseInt(snowNode.textContent, 10) > 0 : false;
                const wind = windNode ? parseInt(windNode.textContent, 10) : "N/A";

               
                let emoji = "🌞"; 
                if (snowRisk) emoji = "❄️";
                else if (rainRisk) emoji = "🌧️";
                else if (wind > 20) emoji = "💨";
                else if (temperature < 0) emoji = "🥶";
                else if (temperature > 25) emoji = "🔥";

                return `
                    <div>
                        <h3>${echeance.getAttribute("timestamp").slice(11, 16)} ${emoji}</h3>
                        <ul>
                            <li>Température : ${temperature !== "N/A" ? `${temperature.toFixed(1)} °C` : temperature}</li>
                            <li>Risque de pluie : ${rainRisk ? "Oui" : "Non"}</li>
                            <li>Risque de neige : ${snowRisk ? "Oui" : "Non"}</li>
                            <li>Vent : ${wind} km/h</li>
                        </ul>
                    </div>
                `;
            });

            document.getElementById("weatherInfo").innerHTML = `
                <h2>Météo du ${currentDate}</h2>
                ${weatherInfo.join("") || "<p>Aucune prévision disponible pour aujourd'hui.</p>"}
            `;
        })
        .catch(err => console.error("Erreur lors de la récupération des données météo :", err));
}

        


        fetchWeather(userLat, userLon);

        document.getElementById('csvFile').addEventListener('change', function (event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function (e) {
                const csvData = e.target.result;
                const parsedData = Papa.parse(csvData, { header: true }).data;

                const labels = parsedData.map(row => row.metric_month);
                const values = parsedData.map(row => parseInt(row.monthly_visit, 10));

                const ctx = document.getElementById('covidChart').getContext('2d');
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels,
                        datasets: [{
                            label: 'Visites mensuelles COVID',
                            data: values,
                            borderColor: 'rgba(75, 192, 192, 1)',
                            borderWidth: 2,
                            fill: false
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { position: 'top' },
                            tooltip: { enabled: true },
                        },
                        scales: {
                            x: { title: { display: true, text: 'Mois' } },
                            y: { title: { display: true, text: 'Visites' } }
                        }
                    }
                });
            };

            reader.readAsText(file);
        });