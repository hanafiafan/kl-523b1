/**
 * Process.js — Run K-Means in browser via JS port
 */

let currentAlgorithm = 'kmeans';

document.addEventListener('DOMContentLoaded', function() {
    loadProcessData();
});

function selectAlgorithm(algo) {
    currentAlgorithm = algo;
    
    // Reset buttons
    document.getElementById('btnAlgoKMeans').className = 'btn ' + (algo === 'kmeans' ? 'btn-primary' : 'btn-secondary');
    document.getElementById('btnAlgoDBSCAN').className = 'btn ' + (algo === 'dbscan' ? 'btn-primary' : 'btn-secondary');
    
    // Toggle params UI
    document.getElementById('dbscanParams').style.display = algo === 'dbscan' ? 'block' : 'none';
    
    // Toggle info text
    const infoText = document.getElementById('algoInfoText');
    if (algo === 'kmeans') {
        infoText.textContent = 'Algoritma K-Means akan dijalankan secara client-side (di browser). Semua langkah perhitungan akan disimpan untuk analisis step-by-step.';
    } else {
        infoText.textContent = 'Algoritma DBSCAN (Density-Based Spatial Clustering) akan mencari kelompok berdasarkan kepadatan. Noise akan dimasukkan ke klaster -1.';
    }
}

function loadProcessData() {
    const dataStr = sessionStorage.getItem('kmeansData');
    const kValue = sessionStorage.getItem('kmeansK') || '3';
    const resultStr = sessionStorage.getItem('kmeansResult');

    const xLabel = sessionStorage.getItem('kmeansXLabel') || 'Weekly_GenAI_Hours';
    const yLabel = sessionStorage.getItem('kmeansYLabel') || 'Post_Semester_GPA';

    const headerX = document.getElementById('headerProcessX');
    const headerY = document.getElementById('headerProcessY');
    if (headerX) headerX.textContent = xLabel;
    if (headerY) headerY.textContent = yLabel;

    const tbody = document.getElementById('processDataBody');
    const emptyState = document.getElementById('processEmptyState');

    if (dataStr) {
        try {
            const data = JSON.parse(dataStr);
            document.getElementById('statDataCount').textContent = data.length;
            document.getElementById('statKValue').textContent = kValue;
            
            if (data.length > 0) {
                if(tbody) tbody.parentElement.style.display = '';
                if(emptyState) emptyState.style.display = 'none';

                if(tbody) {
                    tbody.innerHTML = '';
                    
                    // Limit DOM preview rendering to 100 rows
                    const itemsToShow = data.slice(0, 100);
                    itemsToShow.forEach(row => {
                        tbody.innerHTML += `
                            <tr>
                                <td>${row.id}</td>
                                <td>${row.nama}</td>
                                <td>${row.age}</td>
                                <td>${row.income}</td>
                            </tr>
                        `;
                    });
                    
                    if (data.length > 100) {
                        tbody.innerHTML += `
                            <tr>
                                <td colspan="4" style="text-align: center; color: var(--text-muted); font-style: italic; font-size: 0.85rem;">
                                    ... Dan ${data.length - 100} data lainnya tidak ditampilkan di pratinjau ini demi performa ...
                                </td>
                            </tr>
                        `;
                    }
                }
            } else {
                if(tbody) tbody.parentElement.style.display = 'none';
                if(emptyState) emptyState.style.display = 'block';
            }
        } catch(e) {
            console.error("Corrupted session data", e);
            if(tbody) tbody.parentElement.style.display = 'none';
            if(emptyState) emptyState.style.display = 'block';
        }
    } else {
        if(tbody) tbody.parentElement.style.display = 'none';
        if(emptyState) emptyState.style.display = 'block';
    }

    if (resultStr) {
        try {
            const result = JSON.parse(resultStr);
            document.getElementById('statIterations').textContent = result.converged_at || '-';
            document.getElementById('statStatus').textContent = '✅ Selesai';
            document.getElementById('statStatus').style.color = '#10B981';
        } catch(e) {
            console.error(e);
        }
    }
}

function computeScalingParams(dataPoints, method, features) {
    if (method === 'none') {
        return { method: 'none', features: features };
    }
    const n = dataPoints.length;
    const d = dataPoints[0].length;
    
    if (method === 'minmax') {
        const min = new Array(d).fill(Infinity);
        const max = new Array(d).fill(-Infinity);
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < d; j++) {
                if (dataPoints[i][j] < min[j]) min[j] = dataPoints[i][j];
                if (dataPoints[i][j] > max[j]) max[j] = dataPoints[i][j];
            }
        }
        return { method: 'minmax', min, max, features };
    } else if (method === 'zscore') {
        const mean = new Array(d).fill(0);
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < d; j++) mean[j] += dataPoints[i][j];
        }
        for (let j = 0; j < d; j++) mean[j] /= n;
        
        const variance = new Array(d).fill(0);
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < d; j++) {
                const diff = dataPoints[i][j] - mean[j];
                variance[j] += diff * diff;
            }
        }
        const std = new Array(d).fill(0);
        for (let j = 0; j < d; j++) {
            std[j] = Math.sqrt(variance[j] / n) || 1; // handle std = 0 case
        }
        return { method: 'zscore', mean, std, features };
    }
    return { method: 'none', features };
}

function scalePoints(dataPoints, params) {
    if (!params || params.method === 'none') return dataPoints;
    const d = dataPoints[0].length;
    return dataPoints.map(p => {
        return p.map((val, j) => {
            if (params.method === 'minmax') {
                const range = params.max[j] - params.min[j];
                return range === 0 ? 0 : (val - params.min[j]) / range;
            } else if (params.method === 'zscore') {
                return (val - params.mean[j]) / params.std[j];
            }
            return val;
        });
    });
}

function unscalePoints(dataPoints, params) {
    if (!params || params.method === 'none') return dataPoints;
    return dataPoints.map(p => {
        return p.map((val, j) => {
            if (params.method === 'minmax') {
                const range = params.max[j] - params.min[j];
                return val * range + params.min[j];
            } else if (params.method === 'zscore') {
                return val * params.std[j] + params.mean[j];
            }
            return val;
        });
    });
}

function runClustering() {
    if (currentAlgorithm === 'kmeans') {
        runKMeansEngine();
    } else if (currentAlgorithm === 'dbscan') {
        runDBSCANEngine();
    }
}

function runKMeansEngine() {
    const dataStr = sessionStorage.getItem('kmeansData');
    if (!dataStr) {
        showToast('Belum ada data. Masukkan data terlebih dahulu!', 'warning');
        return;
    }

    const dataRaw = JSON.parse(dataStr);
    const k = parseInt(sessionStorage.getItem('kmeansK') || '3');
    const initMethod = sessionStorage.getItem('centroidInit') || 'random';

    const xLabel = sessionStorage.getItem('kmeansXLabel') || 'Weekly_GenAI_Hours';
    const yLabel = sessionStorage.getItem('kmeansYLabel') || 'Post_Semester_GPA';
    const features = JSON.parse(sessionStorage.getItem('kmeansFeatures')) || [xLabel, yLabel];

    // Parse to float arrays based on selected features
    // For xLabel/yLabel the values are stored as d.age / d.income;
    // additional multivariate features are stored under their original CSV column name.
    const dataPoints = dataRaw.map(d => features.map(f => {
        if (f === xLabel) return parseFloat(d.age);
        if (f === yLabel) return parseFloat(d.income);
        // Multivariate: look up by column name stored on the record
        if (d[f] !== undefined) return parseFloat(d[f]) || 0;
        return 0;
    }));
    const dataLabels = dataRaw.map(d => ({ id: d.id, nama: d.nama }));

    // Apply Scaling
    const scalingMethod = document.getElementById('scalingMethodSelect').value;
    const scalingParams = computeScalingParams(dataPoints, scalingMethod, features);
    sessionStorage.setItem('scalingMethod', scalingMethod);
    sessionStorage.setItem('scalingParams', JSON.stringify(scalingParams));

    const dataPointsScaled = scalePoints(dataPoints, scalingParams);

    let initialCentroids = null;
    if (initMethod === 'first') {
        initialCentroids = dataPointsScaled.slice(0, k);
    }

    showLoading('Menjalankan algoritma K-Means...');
    const logDiv = document.getElementById('processLog');
    const logContent = document.getElementById('processLogContent');
    logDiv.style.display = 'block';
    logContent.innerHTML = '';

    addLog(logContent, `[START] K-Means Clustering (Client-Side JS)`);
    addLog(logContent, `Data: ${dataPoints.length} records, K=${k}`);
    addLog(logContent, `Features: ${features.join(', ')}`);
    addLog(logContent, `Scaling: ${scalingMethod.toUpperCase()}`);

    setTimeout(() => {
        try {
            const result = window.kmeansAlgorithm(dataPointsScaled, k, initialCentroids);

            addLog(logContent, `[OK] Konvergen di iterasi ${result.converged_at}`);

            // Unscale final and initial centroids for human-readable display in charts / results
            const finalCentroidsUnscaled = unscalePoints(result.final_centroids, scalingParams);
            const initialCentroidsUnscaled = unscalePoints(result.initial_centroids, scalingParams);

            // Unscale steps centroids
            const stepsUnscaled = result.steps.map(step => ({
                ...step,
                centroids_before: unscalePoints(step.centroids_before, scalingParams),
                centroids_after: unscalePoints(step.centroids_after, scalingParams)
            }));

            // ── 1. Simpan ringkasan kecil ke kmeansResult ──────────────────
            // Store BOTH scaled (for distance calculations) and unscaled (for display)
            const resultToStore = {
                k: result.k,
                converged_at: result.converged_at,
                initial_centroids: initialCentroidsUnscaled,
                final_centroids: finalCentroidsUnscaled,
                final_centroids_scaled: result.final_centroids,  // raw scaled centroids for prediction
                final_assignments: result.final_assignments
            };

            // ── 2. Coba simpan kmeansResult ────────────────────────────────
            const resultJson = JSON.stringify(resultToStore);
            addLog(logContent, `[INFO] kmeansResult size: ${(resultJson.length / 1024).toFixed(1)} KB`);
            sessionStorage.setItem('kmeansResult', resultJson);

            // ── 3. Simpan kmeansSteps (trace iterasi ringkas) ──────────────
            try {
                const stepsJson = JSON.stringify(stepsUnscaled);
                addLog(logContent, `[INFO] kmeansSteps size: ${(stepsJson.length / 1024).toFixed(1)} KB`);
                sessionStorage.setItem('kmeansSteps', stepsJson);
            } catch (e) {
                addLog(logContent, `[WARN] Steps terlalu besar untuk disimpan, di-skip.`);
                sessionStorage.removeItem('kmeansSteps');
            }

            // ── 4. Tambahkan properti 'cluster' langsung ke kmeansData ─────
            const assignments = result.final_assignments;
            const updatedData = dataRaw.map((row, i) => ({
                ...row,
                cluster: assignments[i]
            }));
            sessionStorage.setItem('kmeansData', JSON.stringify(updatedData));
            addLog(logContent, `[INFO] kmeansData (with cluster) updated`);

            // ── 5. Update UI ───────────────────────────────────────────────
            document.getElementById('statIterations').textContent = result.converged_at;
            document.getElementById('statStatus').textContent = '✅ Selesai';
            document.getElementById('statStatus').style.color = '#10B981';

            addLog(logContent, `[DONE] Selesai. Navigasi ke Trace, Matrix, Output, atau Simulator.`);
            showToast(`K-Means selesai! Konvergen di iterasi ${result.converged_at}`, 'success');
            hideLoading();
            if (window.lucide) lucide.createIcons();

        } catch (err) {
            hideLoading();
            addLog(logContent, `[ERROR] ${err.message}`);
            showToast('Error: ' + err.message, 'error');
            console.error(err);
        }
    }, 300);
}

function runElbow() {
    const dataStr = sessionStorage.getItem('kmeansData');
    if (!dataStr) {
        showToast('Belum ada data!', 'warning');
        return;
    }

    const dataRaw = JSON.parse(dataStr);
    const xLabel = sessionStorage.getItem('kmeansXLabel') || 'Weekly_GenAI_Hours';
    const yLabel = sessionStorage.getItem('kmeansYLabel') || 'Post_Semester_GPA';
    const features = JSON.parse(sessionStorage.getItem('kmeansFeatures')) || [xLabel, yLabel];

    const dataPoints = dataRaw.map(d => features.map(f => {
        if (f === xLabel) return parseFloat(d.age);
        if (f === yLabel) return parseFloat(d.income);
        if (d[f] !== undefined) return parseFloat(d[f]) || 0;
        return 0;
    }));
    const scalingMethod = document.getElementById('scalingMethodSelect').value;

    const scalingParams = computeScalingParams(dataPoints, scalingMethod, features);
    const dataPointsScaled = scalePoints(dataPoints, scalingParams);

    const maxK = Math.min(dataPoints.length, 10);

    showLoading('Menjalankan Elbow Method...');
    const logDiv = document.getElementById('processLog');
    const logContent = document.getElementById('processLogContent');
    logDiv.style.display = 'block';

    addLog(logContent, `[START] Elbow Method (K=2 to K=${maxK})`);
    addLog(logContent, `Features: ${features.join(', ')}`);
    addLog(logContent, `Scaling: ${scalingMethod.toUpperCase()}`);

    setTimeout(() => {
        try {
            const elbowRes = window.elbowMethod(dataPointsScaled, maxK);
            sessionStorage.setItem('elbowResult', JSON.stringify(elbowRes));

            elbowRes.forEach(item => {
                addLog(logContent, `K=${item.k} → SSE=${item.sse}`);
            });

            // Draw Elbow chart inline
            drawInlineElbowChart(elbowRes);

            addLog(logContent, `[DONE] Elbow Method complete. Grafik digambar di bawah log.`);
            showToast('Elbow Method selesai! Grafik dapat dilihat langsung di bawah log.', 'success');
            hideLoading();
        } catch(err) {
            hideLoading();
            addLog(logContent, `[ERROR] ${err.message}`);
            showToast('Error: ' + err.message, 'error');
        }
    }, 500);
}

let processElbowChartInstance = null;

function drawInlineElbowChart(elbowData) {
    const container = document.getElementById('elbowChartContainer');
    if (!container) return;
    container.style.display = 'block';

    const ctx = document.getElementById('processElbowChart').getContext('2d');
    if (processElbowChartInstance) {
        processElbowChartInstance.destroy();
    }

    processElbowChartInstance = new Chart(ctx, {
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
                pointHoverBackgroundColor: '#ccff00',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
                fill: true,
                tension: 0.25
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: 'rgba(255,255,255,0.6)' },
                    title: { display: true, text: 'SSE', color: 'rgba(255,255,255,0.5)', font: { family: 'Space Grotesk' } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: 'rgba(255,255,255,0.8)' }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function addLog(container, message) {
    const time = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.style.marginBottom = '4px';
    line.innerHTML = `<span style="color:var(--text-muted)">[${time}]</span> ${message}`;
    container.appendChild(line);
    container.scrollTop = container.scrollHeight;
}

// ─── DBSCAN ENGINE ─────────────────────────────────────────────────────────

function runDBSCANEngine() {
    const dataStr = sessionStorage.getItem('kmeansData');
    if (!dataStr) {
        showToast('Belum ada data. Masukkan data terlebih dahulu!', 'warning');
        return;
    }

    const dataRaw = JSON.parse(dataStr);
    const eps = parseFloat(document.getElementById('dbscanEps').value) || 0.5;
    const minPts = parseInt(document.getElementById('dbscanMinPts').value) || 4;

    const xLabel = sessionStorage.getItem('kmeansXLabel') || 'Weekly_GenAI_Hours';
    const yLabel = sessionStorage.getItem('kmeansYLabel') || 'Post_Semester_GPA';
    const features = JSON.parse(sessionStorage.getItem('kmeansFeatures')) || [xLabel, yLabel];

    const dataPoints = dataRaw.map(d => features.map(f => {
        if (f === xLabel) return parseFloat(d.age);
        if (f === yLabel) return parseFloat(d.income);
        if (d[f] !== undefined) return parseFloat(d[f]) || 0;
        return 0;
    }));

    const scalingMethod = document.getElementById('scalingMethodSelect').value;
    const scalingParams = computeScalingParams(dataPoints, scalingMethod, features);
    sessionStorage.setItem('scalingMethod', scalingMethod);
    sessionStorage.setItem('scalingParams', JSON.stringify(scalingParams));

    const dataPointsScaled = scalePoints(dataPoints, scalingParams);

    showLoading('Menjalankan algoritma DBSCAN...');
    const logDiv = document.getElementById('processLog');
    const logContent = document.getElementById('processLogContent');
    logDiv.style.display = 'block';
    logContent.innerHTML = '';

    addLog(logContent, \`[START] DBSCAN Clustering (Client-Side JS)\`);
    addLog(logContent, \`Data: \${dataPoints.length} records, Eps=\${eps}, MinPts=\${minPts}\`);
    addLog(logContent, \`Scaling: \${scalingMethod.toUpperCase()}\`);

    setTimeout(() => {
        try {
            if (typeof window.dbscanAlgorithm !== 'function') {
                throw new Error("DBSCAN algorithm script not loaded.");
            }
            
            const result = window.dbscanAlgorithm(dataPointsScaled, eps, minPts);

            addLog(logContent, \`[OK] DBSCAN selesai. Ditemukan \${result.k} cluster (di luar Noise)\`);

            // Compute "fake" centroids for DBSCAN clusters so result.js / visualization.js don't break
            const k = result.k;
            const centroidsScaled = [];
            
            for (let c = 0; c < k; c++) {
                const clusterPoints = [];
                for (let i = 0; i < dataPointsScaled.length; i++) {
                    if (result.assignments[i] === c) {
                        clusterPoints.push(dataPointsScaled[i]);
                    }
                }
                
                if (clusterPoints.length > 0) {
                    const centroid = [];
                    for (let j = 0; j < features.length; j++) {
                        let sum = 0;
                        for (let p of clusterPoints) sum += p[j];
                        centroid.push(sum / clusterPoints.length);
                    }
                    centroidsScaled.push(centroid);
                } else {
                    centroidsScaled.push(new Array(features.length).fill(0));
                }
            }
            
            const centroidsUnscaled = unscalePoints(centroidsScaled, scalingParams);

            const resultToStore = {
                k: result.k,
                converged_at: 'N/A (DBSCAN)',
                initial_centroids: centroidsUnscaled, // fake
                final_centroids: centroidsUnscaled,   // fake
                final_centroids_scaled: centroidsScaled,
                final_assignments: result.assignments
            };

            sessionStorage.setItem('kmeansResult', JSON.stringify(resultToStore));
            sessionStorage.removeItem('kmeansSteps'); // No steps for DBSCAN

            const updatedData = dataRaw.map((row, i) => ({
                ...row,
                cluster: result.assignments[i]
            }));
            sessionStorage.setItem('kmeansData', JSON.stringify(updatedData));
            
            addLog(logContent, \`[INFO] DBSCAN result saved\`);

            document.getElementById('statIterations').textContent = 'N/A';
            document.getElementById('statStatus').textContent = '✅ Selesai (DBSCAN)';
            document.getElementById('statStatus').style.color = '#10B981';
            
            // Note: DBScan doesn't use K input directly, but update statKValue to show clusters found
            document.getElementById('statKValue').textContent = result.k;

            hideLoading();
            setTimeout(() => {
                showToast('Clustering DBSCAN selesai!', 'success');
            }, 500);

        } catch (err) {
            hideLoading();
            addLog(logContent, \`[ERROR] \${err.message}\`);
            showToast('Gagal menjalankan DBSCAN. Cek log.', 'error');
            console.error(err);
        }
    }, 100);
}
