const apiBase = 'http://localhost:5000/api/trips';
let map;
let filteredTrips = [];
let currentPage = 0;
const pageSize = 10;
const sampleSize = 10000;
let chartInstances = {};
let currentParams = {};
let totalTripsCount = 0;

async function fetchData(endpoint, params) {
    let urlParams = new URLSearchParams();
    for (let key in params) {
        if (params[key] !== undefined && params[key] !== '') {
            urlParams.append(key, params[key]);
        }
    }
    const url = `${apiBase}${endpoint}${urlParams.toString() ? '?' + urlParams : ''}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        throw error;
    }
}

function setupEventListeners() {
    const toggleFilters = document.getElementById('toggle-filters');
    const refreshData = document.getElementById('refresh-data');
    const prevPage = document.getElementById('prev-page');
    const nextPage = document.getElementById('next-page');
    const searchList = document.getElementById('search-list');

    if (toggleFilters) {
        toggleFilters.onclick = () => {
            const form = document.getElementById('filter-form');
            if (form) form.classList.toggle('active');
        };
    }

    const filterForm = document.getElementById('filter-form');
    if (filterForm) {
        filterForm.onsubmit = (event) => {
            event.preventDefault();
            applyFilters();
        };
        filterForm.onreset = () => {
            currentParams = {};
            const activeFilters = document.getElementById('active-filters');
            if (activeFilters) activeFilters.innerHTML = '';
            refreshDashboard({});
        };
    }

    if (refreshData) {
        refreshData.onclick = () => refreshDashboard(currentParams);
    }

    if (prevPage) {
        prevPage.onclick = async () => {
            if (currentPage > 0) {
                currentPage--;
                await updateTable();
                window.scrollTo(0, 0);
            }
        };
    }

    if (nextPage) {
        nextPage.onclick = async () => {
            if ((currentPage + 1) * pageSize < totalTripsCount) {
                currentPage++;
                await updateTable();
                window.scrollTo(0, 0);
            }
        };
    }

    if (searchList) {
        searchList.oninput = (event) => {
            const term = event.target.value.toLowerCase();
            const rows = document.getElementsByTagName('tr');
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(term) ? '' : 'none';
            }
        };
    }
}

function updateMetricsWithSummary(summary) {
    const tripCountEl = document.getElementById('trip-count');
    const avgDurationEl = document.getElementById('avg-duration');
    const avgSpeedEl = document.getElementById('avg-speed');
    const avgFareEl = document.getElementById('avg-fare');
    const rushPctEl = document.getElementById('rush-pct');

    if (!tripCountEl || !avgDurationEl || !avgSpeedEl || !avgFareEl || !rushPctEl) {
        return;
    }

    tripCountEl.textContent = summary.trip_count || 0;
    avgDurationEl.textContent = Math.round(summary.avg_duration || 0);
    avgSpeedEl.textContent = (summary.avg_speed || 0).toFixed(1);
    avgFareEl.textContent = (summary.avg_fare || 0).toFixed(2);
    rushPctEl.textContent = (summary.rush_pct || 0) + '% rush hour';
    totalTripsCount = summary.trip_count || 0;
}

function updateCharts() {
    let hourlyData = Array(24).fill(0);
    for (let trip of filteredTrips) {
        const timeParts = trip.pickup_datetime.split(' ')[1].split(':');
        const hour = parseInt(timeParts[0]);
        if (hour >= 0 && hour < 24) hourlyData[hour]++;
    }

    const ctx1 = document.getElementById('hourly-chart');
    if (ctx1) {
        const chartCtx1 = ctx1.getContext('2d');
        if (chartInstances.hourly) chartInstances.hourly.destroy();
        chartInstances.hourly = new Chart(chartCtx1, {
            type: 'bar',
            data: {
                labels: [
                    '0:00', '1:00', '2:00', '3:00', '4:00', '5:00', '6:00', '7:00',
                    '8:00', '9:00', '10:00', '11:00', '12:00', '13:00', '14:00',
                    '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00',
                    '22:00', '23:00'
                ],
                datasets: [{
                    label: 'Trips',
                    data: hourlyData,
                    backgroundColor: '#2563eb',
                    borderColor: '#1e40af',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Trips by Hour' }
                },
                scales: {
                    x: { title: { display: true, text: 'Hour of Day' } },
                    y: { title: { display: true, text: 'Number of Trips' } }
                }
            }
        });
    }

    let passengerData = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    for (let trip of filteredTrips) {
        let pc = trip.passenger_count;
        if (pc > 6) pc = 6;
        if (pc >= 1 && pc <= 6) passengerData[pc]++;
    }

    const ctx2 = document.getElementById('passenger-chart');
    if (ctx2) {
        const chartCtx2 = ctx2.getContext('2d');
        if (chartInstances.passenger) chartInstances.passenger.destroy();
        chartInstances.passenger = new Chart(chartCtx2, {
            type: 'bar',
            data: {
                labels: ['1', '2', '3', '4', '5', '6+'],
                datasets: [{
                    label: 'Count',
                    data: [
                        passengerData[1], passengerData[2], passengerData[3],
                        passengerData[4], passengerData[5], passengerData[6]
                    ],
                    backgroundColor: '#10b981',
                    borderColor: '#047857',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Passengers Distribution' }
                },
                scales: {
                    x: { title: { display: true, text: 'Passenger Count' } },
                    y: { title: { display: true, text: 'Number of Trips' } }
                }
            }
        });
    }

    let vendorData = { 1: 0, 2: 0 };
    for (let trip of filteredTrips) {
        const vid = trip.vendor_id;
        vendorData[vid] = (vendorData[vid] || 0) + 1;
    }

    const ctx3 = document.getElementById('vendor-pie');
    if (ctx3) {
        const chartCtx3 = ctx3.getContext('2d');
        if (chartInstances.vendor) chartInstances.vendor.destroy();
        chartInstances.vendor = new Chart(chartCtx3, {
            type: 'doughnut',
            data: {
                labels: ['Vendor 1', 'Vendor 2'],
                datasets: [{
                    data: [vendorData[1], vendorData[2]],
                    backgroundColor: ['#2563eb', '#f97316'],
                    borderColor: ['#1e40af', '#c2410c'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: 'Vendor Trip Comparison' }
                }
            }
        });
    }

    let rushSum = 0, rushCount = 0, nonRushSum = 0, nonRushCount = 0;
    for (let trip of filteredTrips) {
        if (trip.is_rush_hour) {
            rushSum += trip.trip_duration;
            rushCount++;
        } else {
            nonRushSum += trip.trip_duration;
            nonRushCount++;
        }
    }
    const rushAvg = rushCount > 0 ? rushSum / rushCount / 60 : 0;
    const nonRushAvg = nonRushCount > 0 ? nonRushSum / nonRushCount / 60 : 0;

    const ctx4 = document.getElementById('rush-chart');
    if (ctx4) {
        const chartCtx4 = ctx4.getContext('2d');
        if (chartInstances.rush) chartInstances.rush.destroy();
        chartInstances.rush = new Chart(chartCtx4, {
            type: 'bar',
            data: {
                labels: ['Rush Hour', 'Non-Rush'],
                datasets: [{
                    label: 'Avg Duration (min)',
                    data: [rushAvg, nonRushAvg],
                    backgroundColor: ['#dc2626', '#10b981'],
                    borderColor: ['#991b1b', '#047857'],
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Rush vs Non-Rush Duration' }
                },
                scales: {
                    x: { title: { display: true, text: 'Time Period' } },
                    y: { title: { display: true, text: 'Average Duration (min)' } }
                }
            }
        });
    }
}

async function updateTable() {
    const tbody = document.getElementById('trip-table-body');
    if (!tbody) return;

    try {
        const pageTrips = await fetchData('', { ...currentParams, offset: currentPage * pageSize, limit: pageSize });
        let html = '';
        for (let trip of pageTrips) {
            html += `<tr>
                <td>${trip.id}</td>
                <td>${trip.vendor_id}</td>
                <td>${trip.pickup_datetime}</td>
                <td>${Math.round(trip.trip_duration / 60)}m</td>
                <td>${trip.passenger_count}</td>
                <td>${trip.trip_speed_km_hr.toFixed(1)}</td>
                <td class="${trip.fare_per_km > 0.35 ? 'fare-high' : ''}">${trip.fare_per_km.toFixed(2)}</td>
                <td>${trip.is_rush_hour ? '<span class="rush-badge">Yes</span>' : 'No'}</td>
            </tr>`;
        }
        tbody.innerHTML = html || '<tr><td colspan="8">No trips found</td></tr>';
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="8">Failed to load page data. Error: ${error.message}</td></tr>`;
    }

    const pageInfo = document.getElementById('page-info');
    if (pageInfo) {
        const totalPages = Math.ceil(totalTripsCount / pageSize);
        pageInfo.textContent = `Page ${currentPage + 1} of ${totalPages || 1}`;
    }
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    if (prevPageBtn) prevPageBtn.disabled = currentPage === 0;
    if (nextPageBtn) nextPageBtn.disabled = (currentPage + 1) * pageSize >= totalTripsCount;
}

function updateInsights() {
    const insights = document.getElementById('key-insights');
    const topLongest = document.getElementById('top-longest');
    const zonesList = document.getElementById('zones-list');

    if (!insights || !topLongest || !zonesList) return;

    if (!filteredTrips.length) {
        insights.innerHTML = '<li>No data available</li>';
        topLongest.innerHTML = '<li>No data available</li>';
        zonesList.innerHTML = '<li>No data available</li>';
        return;
    }

    let rushSum = 0, rushCount = 0, nonRushSum = 0, nonRushCount = 0, soloCount = 0, totalSpeed = 0, rushFareSum = 0, nonRushFareSum = 0;
    for (let trip of filteredTrips) {
        if (trip.is_rush_hour) {
            rushSum += trip.trip_duration;
            rushCount++;
            rushFareSum += trip.fare_per_km;
        } else {
            nonRushSum += trip.trip_duration;
            nonRushCount++;
            nonRushFareSum += trip.fare_per_km;
        }
        if (trip.passenger_count === 1) soloCount++;
        totalSpeed += trip.trip_speed_km_hr;
    }

    const rushAvg = rushCount > 0 ? rushSum / rushCount : 0;
    const nonRushAvg = nonRushCount > 0 ? nonRushSum / nonRushCount : 0;
    const difference = nonRushAvg > 0 ? Math.round((rushAvg / nonRushAvg - 1) * 100) : 0;
    const avgSpeed = filteredTrips.length > 0 ? totalSpeed / filteredTrips.length : 0;
    const soloPct = filteredTrips.length > 0 ? Math.round(soloCount / filteredTrips.length * 100) : 0;
    const avgFareRush = rushCount > 0 ? rushFareSum / rushCount : 0;
    const avgFareNonRush = nonRushCount > 0 ? nonRushFareSum / nonRushCount : 0;
    const fareDiff = avgFareNonRush > 0 ? Math.round((avgFareRush / avgFareNonRush - 1) * 100) : 0;

    insights.innerHTML = `
        <li>Rush hour trips are <strong>${difference}% longer</strong> than non-rush</li>
        <li>Average speed: <strong>${avgSpeed.toFixed(1)} km/h</strong></li>
        <li>Solo trips: <strong>${soloPct}%</strong> of all trips</li>`;

    const top3 = filteredTrips.slice().sort((a, b) => b.trip_duration - a.trip_duration).slice(0, 3);
    let longestHtml = '';
    for (let trip of top3) {
        longestHtml += `<li>Trip ${trip.id.substring(0, 8)}: ${Math.round(trip.trip_duration / 60)}m at ${trip.trip_speed_km_hr.toFixed(1)} km/h</li>`;
    }
    topLongest.innerHTML = longestHtml || '<li>No data</li>';

    zonesList.innerHTML = `
        <li>Book <strong>off-peak</strong> to save ~${fareDiff}% on fare</li>
        <li>Early morning (before 6 AM) tends to have <strong>lower fares</strong></li>
        <li>Weekend trips are typically <strong>faster</strong> than weekday rush</li>`;
}

function updateMap() {
    const mapDiv = document.getElementById('pickup-map');
    if (!mapDiv) return;

    if (!map) {
        map = L.map('pickup-map').setView([40.7128, -74.0060], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
    }

    map.eachLayer(layer => {
        if (layer instanceof L.CircleMarker) map.removeLayer(layer);
    });

    for (let trip of filteredTrips) {
        if (trip.pickup_latitude && trip.pickup_longitude) {
            const color = trip.is_rush_hour ? '#dc2626' : '#10b981';
            const border = trip.is_rush_hour ? '#991b1b' : '#059669';
            const popup = trip.is_rush_hour ? `Rush Hour: ${trip.pickup_datetime}` : `Non-Rush: ${trip.pickup_datetime}`;
            L.circleMarker([trip.pickup_latitude, trip.pickup_longitude], {
                radius: 5,
                fillColor: color,
                color: border,
                weight: 1,
                opacity: 0.7,
                fillOpacity: 0.5
            }).bindPopup(popup).addTo(map);
        }
    }
}

function applyFilters() {
    const form = document.getElementById('filter-form'); 
    if (!form) {
        console.error('Filter form not found');
        return;
    }

    const inputs = form.querySelectorAll('input, select');
    let params = {};

    inputs.forEach(el => {
        if (el.value) params[el.name] = el.value;
    });

    currentParams = params;
    currentPage = 0;

    const activeFilters = document.getElementById('active-filters');
    if (activeFilters) {
        activeFilters.innerHTML = Object.entries(params)
            .map(([k, v]) => `<span class="filter-chip">${k}: ${v}</span>`)
            .join('');
    }

    refreshDashboard(params);
}



async function refreshDashboard(params) {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.add('active');

    try {
        const summary = await fetchData('/summary', params);
        updateMetricsWithSummary(summary);

        const sampleData = await fetchData('', { ...params, offset: 0, limit: sampleSize });
        filteredTrips = sampleData.map(t => ({ ...t, is_rush_hour: !!t.is_rush_hour }));

        updateCharts();
        updateInsights();
        updateMap();
        await updateTable();
    } catch (error) {
        console.error('Error refreshing dashboard:', error);
        const tbody = document.getElementById('trip-table-body');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8">Failed to load data. Error: ${error.message}</td></tr>`;
        }
    } finally {
        if (loader) loader.classList.remove('active');
    }
}

document.addEventListener('DOMContentLoaded', setupEventListeners);
document.addEventListener('DOMContentLoaded', () => refreshDashboard({}));
