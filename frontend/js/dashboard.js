        const apiBase = 'http://localhost:5000/api/trips';
        let map;
        let allTrips = [];
        let filteredTrips = [];
        let currentPage = 0;
        const pageSize = 10;        let chartInstances = {};

        async function fetchData(endpoint, params = {}) {
            const urlParams = new URLSearchParams(params).toString();
            const url = `${apiBase}${endpoint}${urlParams ? '?' + urlParams : ''}`;
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return await response.json();
            } catch (error) {
                throw error;
            }
        }

        const toggleFilters = document.getElementById('toggle-filters');
        const filterForm = document.getElementById('filter-form');
        const loader = document.getElementById('loader');

        toggleFilters.addEventListener('click', () => {
            filterForm.classList.toggle('active');
        });

        function updateMetrics() {
            const total = filteredTrips.length;
            if (total === 0) {
                document.getElementById('trip-count').textContent = '0';
                document.getElementById('avg-duration').textContent = '0';
                document.getElementById('avg-speed').textContent = '0';
                document.getElementById('avg-fare').textContent = '0';
                document.getElementById('rush-pct').textContent = '0%';
                return;
            }

            const avgDuration = filteredTrips.reduce((s, t) => s + t.trip_duration, 0) / total / 60;
            const avgSpeed = filteredTrips.reduce((s, t) => s + t.trip_speed_km_hr, 0) / total;
            const avgFare = filteredTrips.reduce((s, t) => s + t.fare_per_km, 0) / total;
            const rushCount = filteredTrips.filter(t => t.is_rush_hour).length;
            const rushPct = Math.round(rushCount / total * 100);

            document.getElementById('trip-count').textContent = total.toLocaleString();
            document.getElementById('avg-duration').textContent = Math.round(avgDuration);
            document.getElementById('avg-speed').textContent = avgSpeed.toFixed(1);
            document.getElementById('avg-fare').textContent = avgFare.toFixed(2);
            document.getElementById('rush-pct').textContent = rushPct + '% rush hour';
        }

        function updateCharts() {
            const hourlyData = {};
            for (let i = 0; i < 24; i++) hourlyData[i] = 0;
            filteredTrips.forEach(t => {
                const hour = parseInt(t.pickup_datetime.split(' ')[1].split(':')[0]);
                if (!isNaN(hour)) hourlyData[hour]++;
            });

            const ctx1 = document.getElementById('hourly-chart').getContext('2d');
            if (chartInstances.hourly) chartInstances.hourly.destroy();
            chartInstances.hourly = new Chart(ctx1, {
                type: 'bar',
                data: {
                    labels: Object.keys(hourlyData).map(h => h + ':00'),
                    datasets: [{
                        label: 'Trips',
                        data: Object.values(hourlyData),
                        backgroundColor: '#2563eb',
                        borderRadius: 4
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
            });

            const passengerData = {};
            for (let i = 1; i <= 6; i++) passengerData[i] = 0;
            filteredTrips.forEach(t => {
                if (t.passenger_count <= 6) passengerData[t.passenger_count]++;
            });

            const ctx2 = document.getElementById('passenger-chart').getContext('2d');
            if (chartInstances.passenger) chartInstances.passenger.destroy();
            chartInstances.passenger = new Chart(ctx2, {
                type: 'bar',
                data: {
                    labels: Object.keys(passengerData),
                    datasets: [{
                        label: 'Count',
                        data: Object.values(passengerData),
                        backgroundColor: '#10b981',
                        borderRadius: 4
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
            });

            const vendorData = {};
            filteredTrips.forEach(t => {
                vendorData[t.vendor_id] = (vendorData[t.vendor_id] || 0) + 1;
            });

            const ctx3 = document.getElementById('vendor-pie').getContext('2d');
            if (chartInstances.vendor) chartInstances.vendor.destroy();
            chartInstances.vendor = new Chart(ctx3, {
                type: 'doughnut',
                data: {
                    labels: ['Vendor 1', 'Vendor 2'],
                    datasets: [{
                        data: [vendorData[1] || 0, vendorData[2] || 0],
                        backgroundColor: ['#2563eb', '#f97316']
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });

            const rushTrips = filteredTrips.filter(t => t.is_rush_hour);
            const nonRushTrips = filteredTrips.filter(t => !t.is_rush_hour);
            const rushAvg = rushTrips.length > 0 ? rushTrips.reduce((s, t) => s + t.trip_duration, 0) / rushTrips.length / 60 : 0;
            const nonRushAvg = nonRushTrips.length > 0 ? nonRushTrips.reduce((s, t) => s + t.trip_duration, 0) / nonRushTrips.length / 60 : 0;

            const ctx4 = document.getElementById('rush-chart').getContext('2d');
            if (chartInstances.rush) chartInstances.rush.destroy();
            chartInstances.rush = new Chart(ctx4, {
                type: 'bar',
                data: {
                    labels: ['Rush Hour', 'Non-Rush'],
                    datasets: [{
                        label: 'Avg Duration (min)',
                        data: [rushAvg, nonRushAvg],
                        backgroundColor: ['#dc2626', '#10b981']
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
            });
        }

        function updateTable() {
            const start = currentPage * pageSize;
            const end = start + pageSize;
            const pageTrips = filteredTrips.slice(start, end);

            const tbody = document.getElementById('trip-table-body');
            tbody.innerHTML = pageTrips.map(t => `
                <tr>
                    <td>${t.id}</td>
                    <td>${t.vendor_id}</td>
                    <td>${t.pickup_datetime}</td>
                    <td>${Math.round(t.trip_duration / 60)}m</td>
                    <td>${t.passenger_count}</td>
                    <td>${t.trip_speed_km_hr.toFixed(1)}</td>
                    <td class="${t.fare_per_km > 0.35 ? 'fare-high' : ''}">${t.fare_per_km.toFixed(2)}</td>
                    <td>${t.is_rush_hour ? '<span class="rush-badge">Yes</span>' : 'No'}</td>
                </tr>
            `).join('');

            document.getElementById('page-info').textContent = `Page ${currentPage + 1} of ${Math.ceil(filteredTrips.length / pageSize)}`;
            document.getElementById('prev-page').disabled = currentPage === 0;
            document.getElementById('next-page').disabled = end >= filteredTrips.length;
        }

        function updateInsights() {
            if (filteredTrips.length === 0) {
                document.getElementById('key-insights').innerHTML = '<li>No data available</li>';
                document.getElementById('top-longest').innerHTML = '<li>No data available</li>';
                document.getElementById('zones-list').innerHTML = '<li>No data available</li>';
                return;
            }

            const rushTrips = filteredTrips.filter(t => t.is_rush_hour);
            const nonRushTrips = filteredTrips.filter(t => !t.is_rush_hour);
            const rushAvg = rushTrips.length > 0 ? rushTrips.reduce((s, t) => s + t.trip_duration, 0) / rushTrips.length : 0;
            const nonRushAvg = nonRushTrips.length > 0 ? nonRushTrips.reduce((s, t) => s + t.trip_duration, 0) / nonRushTrips.length : 0;
            const difference = nonRushAvg > 0 ? Math.round((rushAvg / nonRushAvg - 1) * 100) : 0;

            document.getElementById('key-insights').innerHTML = `
                <li>Rush hour trips are <strong>${difference}% longer</strong> than non-rush</li>
                <li>Average speed: <strong>${(filteredTrips.reduce((s, t) => s + t.trip_speed_km_hr, 0) / filteredTrips.length).toFixed(1)} km/h</strong></li>
                <li>Solo trips: <strong>${Math.round(filteredTrips.filter(t => t.passenger_count === 1).length / filteredTrips.length * 100)}%</strong> of all trips</li>
            `;

            const longest = [...filteredTrips].sort((a, b) => b.trip_duration - a.trip_duration).slice(0, 3);
            document.getElementById('top-longest').innerHTML = longest.map(t => 
                `<li>Trip ${t.id.slice(0, 8)}: ${Math.round(t.trip_duration / 60)}m at ${t.trip_speed_km_hr.toFixed(1)} km/h</li>`
            ).join('');

            const avgFareRush = rushTrips.length > 0 ? rushTrips.reduce((s, t) => s + t.fare_per_km, 0) / rushTrips.length : 0;
            const avgFareNonRush = nonRushTrips.length > 0 ? nonRushTrips.reduce((s, t) => s + t.fare_per_km, 0) / nonRushTrips.length : 0;

            document.getElementById('zones-list').innerHTML = `
                <li>Book <strong>off-peak</strong> to save ~${Math.round((avgFareRush / avgFareNonRush - 1) * 100)}% on fare</li>
                <li>Early morning (before 6 AM) tends to have <strong>lower fares</strong></li>
                <li>Weekend trips are typically <strong>faster</strong> than weekday rush</li>
            `;
        }

        function updateMap() {
            if (!map) {
                map = L.map('pickup-map').setView([40.7128, -74.0060], 12);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(map);
            }

            map.eachLayer(layer => {
                if (layer instanceof L.CircleMarker) map.removeLayer(layer);
            });

            const rushTrips = filteredTrips.filter(t => t.is_rush_hour);
            const nonRushTrips = filteredTrips.filter(t => !t.is_rush_hour);

            rushTrips.forEach(t => {
                if (t.pickup_latitude && t.pickup_longitude) {
                    L.circleMarker([t.pickup_latitude, t.pickup_longitude], {
                        radius: 5,
                        fillColor: '#dc2626',
                        color: '#991b1b',
                        weight: 1,
                        opacity: 0.7,
                        fillOpacity: 0.5
                    }).bindPopup(`Rush Hour: ${t.pickup_datetime}`).addTo(map);
                }
            });

            nonRushTrips.forEach(t => {
                if (t.pickup_latitude && t.pickup_longitude) {
                    L.circleMarker([t.pickup_latitude, t.pickup_longitude], {
                        radius: 5,
                        fillColor: '#10b981',
                        color: '#059669',
                        weight: 1,
                        opacity: 0.7,
                        fillOpacity: 0.5
                    }).bindPopup(`Non-Rush: ${t.pickup_datetime}`).addTo(map);
                }
            });
        }

        function applyFilters() {
            const formData = new FormData(filterForm);
            const params = Object.fromEntries(formData);
            Object.keys(params).forEach(key => !params[key] && delete params[key]);

            filteredTrips = allTrips.filter(trip => {
                if (params.start_date && trip.pickup_datetime < params.start_date) return false;
                if (params.end_date && trip.pickup_datetime > params.end_date) return false;
                if (params.vendor_id && trip.vendor_id !== parseInt(params.vendor_id)) return false;
                if (params.passenger_count && trip.passenger_count !== parseInt(params.passenger_count)) return false;
                if (params.is_rush_hour !== '' && String(trip.is_rush_hour ? 1 : 0) !== params.is_rush_hour) return false;
                if (params.min_fare_per_km && trip.fare_per_km < parseFloat(params.min_fare_per_km)) return false;
                return true;
            });

            currentPage = 0;
            updateDashboard();

            document.getElementById('active-filters').innerHTML = Object.entries(params)
                .map(([k, v]) => `<span class="filter-chip">${k}: ${v}</span>`)
                .join('');
        }

        function updateDashboard() {
            updateMetrics();
            updateCharts();
            updateTable();
            updateInsights();
            updateMap();
        }

        filterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            applyFilters();
        });

        filterForm.addEventListener('reset', () => {
            filteredTrips = [...allTrips];
            currentPage = 0;
            document.getElementById('active-filters').innerHTML = '';
            updateDashboard();
        });

        document.getElementById('refresh-data').addEventListener('click', loadData);

        document.getElementById('prev-page').addEventListener('click', () => {
            if (currentPage > 0) {
                currentPage--;
                updateTable();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });

        document.getElementById('next-page').addEventListener('click', () => {
            if ((currentPage + 1) * pageSize < filteredTrips.length) {
                currentPage++;
                updateTable();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });

        document.getElementById('search-list').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#trip-table-body tr');
            rows.forEach(row => {
                row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';
            });
        });

        document.getElementById('export-csv').addEventListener('click', () => {
            if (filteredTrips.length === 0) {
                alert('No data to export');
                return;
            }

            let csv = 'ID,Vendor,Pickup,Duration(m),Passengers,Speed,Fare/KM,RushHour\n';
            filteredTrips.forEach(t => {
                csv += `${t.id},${t.vendor_id},${t.pickup_datetime},${Math.round(t.trip_duration / 60)},${t.passenger_count},${t.trip_speed_km_hr.toFixed(1)},${t.fare_per_km.toFixed(2)},${t.is_rush_hour ? 'Yes' : 'No'}\n`;
            });

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'taxi_trips.csv';
            a.click();
        });

        async function loadData() {
            loader.classList.add('active');
            try {
                // summary from summary api
                const summary = await fetchData('/summary', {});
                const totalCount = summary.trip_count;

                let allTrips = [];
                const chunkSize = 10000;
                const targetTrips = 100000;
                const maxChunks = Math.ceil(targetTrips / chunkSize);
                
                for (let i = 0; i < maxChunks; i++) {
                    const offset = i * chunkSize;
                    
                    const data = await fetchData('', { 
                        offset: offset, 
                        limit: chunkSize 
                    });
                    
                    const trips = Array.isArray(data) ? data : data.trips || [];
                    
                    if (trips.length === 0) {
                        break;
                    }
                    
                    allTrips = allTrips.concat(trips);
                    
                    // Update dashboard after each chunk, we used this for faster feedback
                    filteredTrips = [...allTrips];
                    currentPage = 0;
                    updateDashboard();
                }

                // Finally store data here
                allTrips.forEach(t => {
                    t.is_rush_hour = t.is_rush_hour ? true : false;
                });
                
                filteredTrips = [...allTrips];
                currentPage = 0;
                updateDashboard();
                
            } catch (error) {
                document.getElementById('trip-table-body').innerHTML = 
                    '<tr><td colspan="8">Failed to load data. Error: ' + error.message + '</td></tr>';
            } finally {
                loader.classList.remove('active');
            }
        }

        loadData();