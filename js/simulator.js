/**
 * simulator.js — Predictive Impact Simulator
 * Uses Linear Regression (OLS), Pearson Correlation, and K-Means Centroid
 * proximity to simulate where a user's profile lands in the dataset.
 */

document.addEventListener('DOMContentLoaded', () => {
    initSimulator();
});

let simScatterChart = null;
let simInfluenceChart = null;
let linearModel = { slope: 0, intercept: 0 };
let currentData = [];
let clusterCentroids = [];
let xLabel = 'X';
let yLabel = 'Y';

// ─── Init ─────────────────────────────────────────────────────────────────────

function initSimulator() {
    const dataStr = sessionStorage.getItem('kmeansData');

    xLabel = sessionStorage.getItem('kmeansXLabel') || 'Weekly_GenAI_Hours';
    yLabel = sessionStorage.getItem('kmeansYLabel') || 'Post_Semester_GPA';

    // Update labels
    document.getElementById('labelInputX').textContent = `${xLabel} (Independen X)`;
    document.getElementById('labelInputY').textContent = `${yLabel} (Dependen Y) — Opsional`;
    document.getElementById('predictLabelY').textContent = `Prediksi ${yLabel}`;

    if (!dataStr) {
        showSimError('Data tidak ditemukan. Silakan proses data di Workspace terlebih dahulu.', 'input.html');
        return;
    }

    currentData = JSON.parse(dataStr);

    // Check if clusters are assigned
    if (currentData.length === 0 || currentData[0].cluster === undefined) {
        showSimError('Data belum diklasterisasi. Silakan jalankan Engine terlebih dahulu.', 'process.html');
        return;
    }

    // Compute derived models
    clusterCentroids = calculateCentroids(currentData);
    linearModel = calculateOLSRegression(currentData);

    // Update data info badge
    const badge = document.getElementById('simDataBadge');
    if (badge) badge.textContent = `${currentData.length.toLocaleString()} data dimuat`;

    // Update model info
    const modelInfo = document.getElementById('simModelInfo');
    if (modelInfo) {
        modelInfo.textContent = `OLS: ŷ = ${linearModel.slope.toFixed(4)}x + ${linearModel.intercept.toFixed(4)} | R² = ${linearModel.r2.toFixed(4)}`;
    }

    // Render charts
    drawSimulatorScatter();
    drawInfluenceChart();
}

function showSimError(message, redirect) {
    const mainEl = document.querySelector('main.bento-container');
    if (mainEl) {
        mainEl.innerHTML = `
            <div style="text-align:center; padding: 80px 20px; color: var(--text-muted);">
                <i data-lucide="alert-triangle" width="48" height="48" style="margin: 0 auto 16px; display:block; color: var(--accent-warning);"></i>
                <h3 style="color: var(--text-primary); margin-bottom: 8px;">${message}</h3>
                <a href="${redirect}" class="btn btn-primary" style="margin-top: 16px; display: inline-flex;">Kembali ke Halaman Data</a>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }
}

// ─── Math Functions ───────────────────────────────────────────────────────────

function calculateCentroids(data) {
    const sums = {};
    const counts = {};

    data.forEach(p => {
        const c = p.cluster;
        if (!sums[c]) { sums[c] = { x: 0, y: 0 }; counts[c] = 0; }
        sums[c].x += p.age;
        sums[c].y += p.income;
        counts[c]++;
    });

    const centroids = [];
    Object.keys(sums).forEach(c => {
        centroids[parseInt(c)] = {
            cluster: parseInt(c),
            x: sums[c].x / counts[c],
            y: sums[c].y / counts[c],
            count: counts[c]
        };
    });

    return centroids;
}

function calculateOLSRegression(data) {
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

    for (let i = 0; i < n; i++) {
        sumX  += data[i].age;
        sumY  += data[i].income;
        sumXY += data[i].age * data[i].income;
        sumX2 += data[i].age * data[i].age;
        sumY2 += data[i].income * data[i].income;
    }

    const denom = (n * sumX2 - sumX * sumX);
    const slope     = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
    const intercept = (sumY - slope * sumX) / n;

    // R² = r²
    const meanY   = sumY / n;
    let ssTot = 0, ssRes = 0;
    data.forEach(p => {
        const pred = slope * p.age + intercept;
        ssTot += Math.pow(p.income - meanY, 2);
        ssRes += Math.pow(p.income - pred, 2);
    });
    const r2 = ssTot !== 0 ? 1 - ssRes / ssTot : 0;

    return { slope, intercept, r2 };
}

function calculatePearsonCorrelation(data) {
    const n = data.length;
    if (n === 0) return 0;

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (let i = 0; i < n; i++) {
        sumX  += data[i].age;
        sumY  += data[i].income;
        sumXY += data[i].age * data[i].income;
        sumX2 += data[i].age * data[i].age;
        sumY2 += data[i].income * data[i].income;
    }

    const num   = n * sumXY - sumX * sumY;
    const denom = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    return denom === 0 ? 0 : num / denom;
}

function euclideanDistance(ax, ay, bx, by) {
    return Math.sqrt(Math.pow(ax - bx, 2) + Math.pow(ay - by, 2));
}

function describeCorrelation(r) {
    const abs = Math.abs(r);
    const dir = r >= 0 ? 'positif' : 'negatif';
    if (abs > 0.7) return `Korelasi ${dir} kuat`;
    if (abs > 0.3) return `Korelasi ${dir} sedang`;
    if (abs > 0.1) return `Korelasi ${dir} lemah`;
    return 'Hampir tidak ada korelasi';
}

// ─── Simulation ───────────────────────────────────────────────────────────────

function runSimulation() {
    const inputXRaw = document.getElementById('inputX').value;
    const inputYRaw = document.getElementById('inputY').value;

    if (inputXRaw.trim() === '') {
        alert(`Harap masukkan nilai untuk ${xLabel}!`);
        return;
    }

    const x = parseFloat(inputXRaw);
    let y = parseFloat(inputYRaw);
    let usedLinearRegression = false;

    if (isNaN(y)) {
        y = linearModel.slope * x + linearModel.intercept;
        usedLinearRegression = true;
    }

    // Find closest cluster
    let minDistance = Infinity;
    let closestCluster = 0;

    clusterCentroids.forEach((centroid, idx) => {
        if (!centroid) return;
        const dist = euclideanDistance(x, y, centroid.x, centroid.y);
        if (dist < minDistance) {
            minDistance = dist;
            closestCluster = idx;
        }
    });

    displayResults(x, y, closestCluster, minDistance, usedLinearRegression);
    updateScatterUserPoint(x, y, closestCluster);

    // Scroll result card into view smoothly
    const resultCard = document.getElementById('resultCard');
    if (resultCard) {
        resultCard.style.display = 'block';
        setTimeout(() => resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    }
}

function displayResults(x, y, cluster, distance, usedLR) {
    document.getElementById('resultCard').style.display = 'block';
    document.getElementById('predYValue').textContent = y.toFixed(4);

    const colors = (typeof CLUSTER_COLORS !== 'undefined') ? CLUSTER_COLORS : ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    const color  = colors[cluster % colors.length];

    const badge = document.getElementById('predClusterBadge');
    badge.textContent = `Cluster ${cluster}`;
    badge.style.background = color + '25';
    badge.style.color  = color;
    badge.style.border = `1px solid ${color}`;

    document.getElementById('predDistance').textContent = distance.toFixed(4) + ' (Euclidean)';

    // Correlation at user's cluster
    const clusterGroup = currentData.filter(d => d.cluster === cluster);
    const r = calculatePearsonCorrelation(clusterGroup);

    // --- Recommendation ---
    const recEl = document.getElementById('systemRecommendation');
    let rec = '';

    if (usedLR) {
        rec += `Nilai ${yLabel} tidak dimasukkan, sehingga sistem memprediksinya sebesar ${y.toFixed(4)} menggunakan OLS Regression (R²=${linearModel.r2.toFixed(3)}). `;
    }

    rec += `Profil ini paling dekat dengan Cluster ${cluster} (jarak Euclidean: ${distance.toFixed(2)} unit). `;
    rec += `Di dalam Cluster ${cluster}, korelasi antara ${xLabel} dan ${yLabel} adalah r = ${r.toFixed(3)} (${describeCorrelation(r)}). `;

    if (linearModel.slope > 0.01) {
        rec += `Tren global menunjukkan bahwa setiap kenaikan 1 unit ${xLabel} diprediksi menaikkan ${yLabel} sebesar ${Math.abs(linearModel.slope).toFixed(4)}.`;
    } else if (linearModel.slope < -0.01) {
        rec += `Tren global menunjukkan bahwa setiap kenaikan 1 unit ${xLabel} diprediksi menurunkan ${yLabel} sebesar ${Math.abs(linearModel.slope).toFixed(4)}.`;
    } else {
        rec += `Tren global hampir datar — ${xLabel} tidak memiliki pengaruh linier yang signifikan terhadap ${yLabel}.`;
    }

    recEl.textContent = rec;
}

// ─── Chart: Scatter Plot ──────────────────────────────────────────────────────

function drawSimulatorScatter() {
    const ctx = document.getElementById('simulatorScatterChart').getContext('2d');
    const colors = (typeof CLUSTER_COLORS !== 'undefined') ? CLUSTER_COLORS : ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    const colorRgba = (typeof CLUSTER_COLORS_RGBA !== 'undefined') ? CLUSTER_COLORS_RGBA : colors.map(c => c + '99');

    const datasets = [];

    // Group by cluster
    const clusterData = {};
    currentData.forEach(p => {
        if (!clusterData[p.cluster]) clusterData[p.cluster] = [];
        clusterData[p.cluster].push({ x: p.age, y: p.income });
    });

    const isLarge = currentData.length > 1000;
    const ptLimit = isLarge ? 800 : currentData.length;
    const ptRadius = isLarge ? 2 : 4;

    // Cluster data sets
    Object.keys(clusterData).sort((a, b) => parseInt(a) - parseInt(b)).forEach(c => {
        datasets.push({
            label: `Cluster ${c}`,
            data: clusterData[c].slice(0, ptLimit),
            backgroundColor: colorRgba[c % colorRgba.length],
            borderColor: colors[c % colors.length],
            borderWidth: 0.5,
            pointRadius: ptRadius
        });
    });

    // Centroid markers
    const centroidPts = clusterCentroids.filter(Boolean).map(ce => ({ x: ce.x, y: ce.y }));
    datasets.push({
        label: 'Centroid',
        data: centroidPts,
        backgroundColor: '#ffffff',
        borderColor: '#ffffff',
        borderWidth: 2,
        pointRadius: 8,
        pointStyle: 'crossRot'
    });

    // OLS Regression Line
    const allX = currentData.map(d => d.age);
    const xMin = Math.min(...allX);
    const xMax = Math.max(...allX);
    datasets.push({
        label: 'OLS Regression',
        data: [
            { x: xMin, y: linearModel.slope * xMin + linearModel.intercept },
            { x: xMax, y: linearModel.slope * xMax + linearModel.intercept }
        ],
        type: 'line',
        borderColor: 'rgba(255,255,255,0.5)',
        borderWidth: 2,
        borderDash: [6, 4],
        fill: false,
        pointRadius: 0,
        tension: 0
    });

    // User simulation point (empty at first, updated on runSimulation)
    datasets.push({
        label: '★ Input Simulasi Anda',
        data: [],
        backgroundColor: '#ffffff',
        borderColor: '#f59e0b',
        borderWidth: 3,
        pointRadius: 12,
        pointStyle: 'star',
        order: -1 // draw on top
    });

    simScatterChart = new Chart(ctx, {
        type: 'scatter',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: isLarge ? 0 : 400 },
            scales: {
                x: {
                    title: { display: true, text: xLabel, color: 'rgba(255,255,255,0.7)' },
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: { color: 'rgba(255,255,255,0.5)' }
                },
                y: {
                    title: { display: true, text: yLabel, color: 'rgba(255,255,255,0.7)' },
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: { color: 'rgba(255,255,255,0.5)' }
                }
            },
            plugins: {
                legend: {
                    labels: { color: 'rgba(255,255,255,0.7)', boxWidth: 12, padding: 16 }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            if (ctx.dataset.label === '★ Input Simulasi Anda') {
                                return ` Anda — ${xLabel}: ${ctx.raw.x.toFixed(2)}, ${yLabel}: ${ctx.raw.y.toFixed(2)}`;
                            }
                            return ` ${ctx.dataset.label}: (${ctx.raw.x.toFixed(2)}, ${ctx.raw.y.toFixed(2)})`;
                        }
                    }
                }
            }
        }
    });
}

function updateScatterUserPoint(x, y, cluster) {
    if (!simScatterChart) return;

    const ds = simScatterChart.data.datasets;
    const idx = ds.findIndex(d => d.label === '★ Input Simulasi Anda');

    if (idx !== -1) {
        const colors = (typeof CLUSTER_COLORS !== 'undefined') ? CLUSTER_COLORS : ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
        ds[idx].data = [{ x, y }];
        ds[idx].borderColor = colors[cluster % colors.length];
        simScatterChart.update('none');
    }
}

// ─── Chart: Feature Influence (Pearson r Diverging Bar) ──────────────────────

function drawInfluenceChart() {
    const ctx = document.getElementById('influenceBarChart').getContext('2d');
    const colors = (typeof CLUSTER_COLORS !== 'undefined') ? CLUSTER_COLORS : ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    const overallR = calculatePearsonCorrelation(currentData);

    const labels   = [];
    const dataVals = [];
    const bgColors = [];
    const bdColors = [];

    // Overall first
    labels.push(`Overall (n=${currentData.length.toLocaleString()})`);
    dataVals.push(overallR);
    const overallColor = overallR >= 0 ? 'rgba(16,185,129,0.75)' : 'rgba(239,68,68,0.75)';
    bgColors.push(overallColor);
    bdColors.push(overallR >= 0 ? 'rgba(16,185,129,1)' : 'rgba(239,68,68,1)');

    // Per-cluster
    const clusterData = {};
    currentData.forEach(p => {
        if (!clusterData[p.cluster]) clusterData[p.cluster] = [];
        clusterData[p.cluster].push(p);
    });

    Object.keys(clusterData).sort((a, b) => parseInt(a) - parseInt(b)).forEach(c => {
        const r = calculatePearsonCorrelation(clusterData[c]);
        labels.push(`Cluster ${c} (n=${clusterData[c].length.toLocaleString()})`);
        dataVals.push(r);
        const hexColor = colors[c % colors.length];
        bgColors.push(hexColor + 'CC');
        bdColors.push(hexColor);
    });

    simInfluenceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: `Pearson r  (${xLabel} vs ${yLabel})`,
                data: dataVals,
                backgroundColor: bgColors,
                borderColor: bdColors,
                borderWidth: 1.5,
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 600 },
            scales: {
                x: {
                    min: -1,
                    max: 1,
                    grid: { color: 'rgba(255,255,255,0.06)' },
                    ticks: { color: 'rgba(255,255,255,0.5)' },
                    title: {
                        display: true,
                        text: `Pearson r — Korelasi Antara ${xLabel} dan ${yLabel}`,
                        color: 'rgba(255,255,255,0.6)'
                    }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: 'rgba(255,255,255,0.8)', font: { size: 12 } }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: context => {
                            const val = context.raw;
                            return `  r = ${val.toFixed(4)}  →  ${describeCorrelation(val)}`;
                        }
                    }
                }
            }
        }
    });
}
