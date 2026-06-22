/**
 * Visualization.js — Chart.js scatter plot with iteration animation, Elbow Method chart
 */

let scatterChart = null;
let elbowChartInstance = null;
let animInterval = null;
let currentIterIdx = 0;

document.addEventListener('DOMContentLoaded', function() {
    renderVisualization();
    renderElbowChart();
});

function renderVisualization() {
    const resultStr = sessionStorage.getItem('kmeansResult');
    if (!resultStr) return;

    const result = JSON.parse(resultStr);
    const totalIter = result.iterations.length;

    document.getElementById('vizEmptyState').style.display = 'none';
    document.getElementById('iterSliderCard').style.display = 'block';

    const slider = document.getElementById('iterSlider');
    slider.max = totalIter;
    slider.value = totalIter;
    currentIterIdx = totalIter;

    updateIterLabel();
    drawScatter(result, totalIter);
}

function drawScatter(result, iterIdx) {
    const canvas = document.getElementById('scatterChart');
    const ctx = canvas.getContext('2d');
    const dataPoints = result.data_points;
    const dataLabels = result.data_labels;
    const k = result.k;

    const xLabel = sessionStorage.getItem('kmeansXLabel') || 'Age';
    const yLabel = sessionStorage.getItem('kmeansYLabel') || 'Income';

    let assignments, centroids;

    if (iterIdx === 0) {
        centroids = result.initial_centroids;
        assignments = new Array(dataPoints.length).fill(-1);
    } else {
        const iter = result.iterations[iterIdx - 1];
        assignments = iter.assignments.map(a => a.assigned_cluster);
        centroids = iter.new_centroids;
    }

    const datasets = [];

    for (let c = 0; c < k; c++) {
        const points = [];
        const labels = [];
        for (let i = 0; i < dataPoints.length; i++) {
            if (assignments[i] === c) {
                points.push({ x: dataPoints[i][0], y: dataPoints[i][1] });
                labels.push(dataLabels[i] ? dataLabels[i].nama : `Data ${i+1}`);
            }
        }
        datasets.push({
            label: `Cluster ${c + 1}`,
            data: points,
            backgroundColor: CLUSTER_COLORS_RGBA[c],
            borderColor: CLUSTER_COLORS[c],
            borderWidth: 2,
            pointRadius: dataPoints.length > 5000 ? 2 : (dataPoints.length > 1000 ? 3 : 6), // smaller points for dense datasets
            pointHoverRadius: 8,
            pointStyle: 'circle',
            _labels: labels
        });
    }

    if (iterIdx === 0) {
        const unassigned = [];
        const labels = [];
        for (let i = 0; i < dataPoints.length; i++) {
            unassigned.push({ x: dataPoints[i][0], y: dataPoints[i][1] });
            labels.push(dataLabels[i] ? dataLabels[i].nama : `Data ${i+1}`);
        }
        datasets.push({
            label: 'Data (belum dikelompokkan)',
            data: unassigned,
            backgroundColor: 'rgba(148, 163, 184, 0.3)',
            borderColor: '#94A3B8',
            borderWidth: 1,
            pointRadius: dataPoints.length > 5000 ? 2 : (dataPoints.length > 1000 ? 3 : 6),
            _labels: labels
        });
    }

    const centroidPoints = centroids.map(c => ({ x: c[0], y: c[1] }));
    datasets.push({
        label: 'Centroid',
        data: centroidPoints,
        backgroundColor: '#FFFFFF',
        borderColor: '#F59E0B',
        borderWidth: 3,
        pointRadius: 10,
        pointHoverRadius: 12,
        pointStyle: 'star',
        _labels: centroids.map((_, i) => `C${i+1}`)
    });

    const iterLabel = document.getElementById('scatterIterLabel');
    if (iterIdx === 0) {
        iterLabel.textContent = 'Sebelum Iterasi (Centroid Awal)';
    } else if (iterIdx === result.iterations.length) {
        iterLabel.textContent = `Iterasi ${iterIdx} — Final (Konvergen)`;
    } else {
        iterLabel.textContent = `Iterasi ${iterIdx}`;
    }

    if (scatterChart) scatterChart.destroy();

    scatterChart = new Chart(ctx, {
        type: 'scatter',
        data: { datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: { duration: dataPoints.length > 1000 ? 0 : 500, easing: 'easeOutCubic' }, // Disable animation on large datasets for performance
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#94A3B8', font: { family: 'Plus Jakarta Sans', size: 12, weight: '500' }, usePointStyle: true, padding: 16 }
                },
                    tooltip: {
                        backgroundColor: 'rgba(10, 10, 10, 0.95)',
                        titleColor: '#f5f5f5',
                        bodyColor: '#a3a3a3',
                        borderColor: 'rgba(204, 255, 0, 0.3)',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 4,
                        titleFont: { family: 'Space Grotesk', weight: '600' },
                        bodyFont: { family: 'JetBrains Mono', size: 12 },
                    callbacks: {
                        title: function(context) {
                            const ds = context[0].dataset;
                            const idx = context[0].dataIndex;
                            if (ds._labels && ds._labels[idx]) return ds._labels[idx];
                            return ds.label;
                        },
                        label: function(context) {
                            return `${xLabel}: ${context.parsed.x}, ${yLabel}: ${context.parsed.y}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: xLabel, color: '#737373', font: { family: 'Space Grotesk', size: 13, weight: '600' } },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#737373', font: { family: 'JetBrains Mono', size: 11 } }
                },
                y: {
                    title: { display: true, text: yLabel, color: '#737373', font: { family: 'Space Grotesk', size: 13, weight: '600' } },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#737373', font: { family: 'JetBrains Mono', size: 11 } }
                }
            }
        }
    });
}

window.showIteration = function(idx) {
    const resultStr = sessionStorage.getItem('kmeansResult');
    if (!resultStr) return;
    currentIterIdx = idx;
    updateIterLabel();
    drawScatter(JSON.parse(resultStr), idx);
};

function updateIterLabel() {
    const resultStr = sessionStorage.getItem('kmeansResult');
    if (!resultStr) return;
    const totalIter = JSON.parse(resultStr).iterations.length;
    const label = document.getElementById('iterLabel');
    if (currentIterIdx === 0) label.textContent = `Awal`;
    else label.textContent = `${currentIterIdx} / ${totalIter}`;
}

window.prevIteration = function() {
    if (currentIterIdx > 0) {
        currentIterIdx--;
        document.getElementById('iterSlider').value = currentIterIdx;
        showIteration(currentIterIdx);
    }
};

window.nextIteration = function() {
    const resultStr = sessionStorage.getItem('kmeansResult');
    if (!resultStr) return;
    const totalIter = JSON.parse(resultStr).iterations.length;
    if (currentIterIdx < totalIter) {
        currentIterIdx++;
        document.getElementById('iterSlider').value = currentIterIdx;
        showIteration(currentIterIdx);
    }
};

window.playAnimation = function() {
    const resultStr = sessionStorage.getItem('kmeansResult');
    if (!resultStr) return;

    const totalIter = JSON.parse(resultStr).iterations.length;
    const btn = document.getElementById('btnPlayAnim');
    const slider = document.getElementById('iterSlider');

    if (animInterval) {
        clearInterval(animInterval);
        animInterval = null;
        btn.innerHTML = '<i data-lucide="play" width="14" height="14"></i> Play';
        if(window.lucide) lucide.createIcons();
        return;
    }

    currentIterIdx = 0;
    slider.value = 0;
    showIteration(0);

    btn.innerHTML = '<i data-lucide="pause" width="14" height="14"></i> Pause';
    if(window.lucide) lucide.createIcons();

    animInterval = setInterval(() => {
        currentIterIdx++;
        if (currentIterIdx > totalIter) {
            clearInterval(animInterval);
            animInterval = null;
            btn.innerHTML = '<i data-lucide="play" width="14" height="14"></i> Play';
            if(window.lucide) lucide.createIcons();
            return;
        }
        slider.value = currentIterIdx;
        showIteration(currentIterIdx);
    }, 1200);
};

function renderElbowChart() {
    const elbowStr = sessionStorage.getItem('elbowResult');
    if (!elbowStr) return;

    const elbowData = JSON.parse(elbowStr);
    const elbowCard = document.getElementById('elbowCard');
    elbowCard.style.display = 'block';

    const ctx = document.getElementById('elbowChart').getContext('2d');
    if (elbowChartInstance) elbowChartInstance.destroy();

    elbowChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: elbowData.map(d => `K=${d.k}`),
            datasets: [{
                label: 'SSE (Sum of Squared Errors)',
                data: elbowData.map(d => d.sse),
                borderColor: '#ccff00',
                backgroundColor: 'rgba(204,255,0,0.1)',
                borderWidth: 2,
                pointRadius: 6,
                pointBackgroundColor: '#ccff00',
                pointBorderColor: '#0a0a0a',
                pointBorderWidth: 2,
                pointHoverRadius: 9,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { labels: { color: '#737373', font: { family: 'Space Grotesk', size: 12, weight: '500' } } },
                tooltip: {
                    backgroundColor: 'rgba(10, 10, 10, 0.95)',
                    titleColor: '#f5f5f5',
                    bodyColor: '#a3a3a3',
                    borderColor: 'rgba(204, 255, 0, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 4,
                    titleFont: { family: 'Space Grotesk', weight: '600' },
                    bodyFont: { family: 'JetBrains Mono', size: 12 }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Jumlah Cluster (K)', color: '#737373', font: { family: 'Space Grotesk', size: 13, weight: '600' } },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#737373', font: { family: 'JetBrains Mono', size: 11 } }
                },
                y: {
                    title: { display: true, text: 'SSE', color: '#737373', font: { family: 'Space Grotesk', size: 13, weight: '600' } },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#737373', font: { family: 'JetBrains Mono', size: 11 } }
                }
            }
        }
    });
}
