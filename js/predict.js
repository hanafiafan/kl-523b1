/**
 * predict.js — Batch Cluster Prediction
 * Uses saved K-Means centroids (from kmeansResult in sessionStorage)
 * to predict cluster assignments for new data rows without re-running K-Means.
 */

// ─── State ────────────────────────────────────────────────────────────────────
let centroids     = [];   // [[x, y], ...]
let clusterLabels = [];   // ['X Tinggi & Y Tinggi', ...]
let stagingRows   = [];   // [{ id, x, y }]
let predictResults = [];  // [{ id, x, y, cluster, label, distance }]
let xLabel = 'X';
let yLabel = 'Y';
let tempCSVData = null;   // { headers, rows }

let donutChart    = null;
let distanceChart = null;

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initPredict();
    setupDragDrop();
});

function initPredict() {
    const resultStr = sessionStorage.getItem('kmeansResult');
    const dataStr   = sessionStorage.getItem('kmeansData');

    xLabel = sessionStorage.getItem('kmeansXLabel') || 'X';
    yLabel = sessionStorage.getItem('kmeansYLabel') || 'Y';

    // Update all dynamic labels in the page
    updateAllLabels();

    if (!resultStr) {
        showNoModelWarning();
        return;
    }

    const result = JSON.parse(resultStr);
    centroids = result.final_centroids; // [[cx, cy], ...]

    // Build cluster labels using the same heuristic as result.js
    clusterLabels = buildClusterLabels(centroids);

    // Model info bar
    const mdlInfo = document.getElementById('mdlInfo');
    if (mdlInfo) mdlInfo.textContent = `K-Means  k=${centroids.length}  |  ${dataStr ? JSON.parse(dataStr).length.toLocaleString() : '?'} data pelatihan`;

    // Render centroid reference table
    renderCentroidRef();

    renderStagingTable();
}

function showNoModelWarning() {
    const main = document.querySelector('main.bento-container');
    if (!main) return;
    main.innerHTML = `
        <div style="text-align:center; padding:80px 20px;">
            <i data-lucide="alert-triangle" width="52" height="52" style="display:block;margin:0 auto 16px;color:#f59e0b;"></i>
            <h3 style="color:var(--text-primary); margin-bottom:8px;">Model Belum Dilatih</h3>
            <p style="color:var(--text-muted); margin-bottom:20px;">Jalankan proses K-Means terlebih dahulu sebelum menggunakan fitur Batch Prediction.</p>
            <a href="process.html" class="btn btn-primary" style="display:inline-flex;">
                <i data-lucide="cpu" width="16" height="16"></i> Ke Engine K-Means
            </a>
        </div>
    `;
    if (window.lucide) lucide.createIcons();
}

function updateAllLabels() {
    // Nav / header labels
    setTextById('mdlXLabel', `X: ${xLabel}`);
    setTextById('mdlYLabel', `Y: ${yLabel}`);
    setTextById('newLabelX', xLabel);
    setTextById('newLabelY', `${yLabel} (Opsional)`);
    setTextById('stagingHeaderX', xLabel);
    setTextById('stagingHeaderY', yLabel);
    setTextById('resultHeaderX', xLabel);
    setTextById('resultHeaderY', yLabel);
    setTextById('cRefX', xLabel);
    setTextById('cRefY', yLabel);
    setAttrById('newX', 'placeholder', `Nilai ${xLabel} (wajib)`);
    setAttrById('newY', 'placeholder', `Nilai ${yLabel} (opsional)`);

    const csvXL = document.getElementById('csvMapXLabel');
    const csvYL = document.getElementById('csvMapYLabel');
    if (csvXL) csvXL.textContent = `Kolom ${xLabel}`;
    if (csvYL) csvYL.textContent = `Kolom ${yLabel} (Opsional)`;
}

function setTextById(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }
function setAttrById(id, attr, val) { const el = document.getElementById(id); if (el) el.setAttribute(attr, val); }

// ─── Centroid Reference Table ─────────────────────────────────────────────────
function renderCentroidRef() {
    const tbody = document.getElementById('centroidRefBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    centroids.forEach((c, i) => {
        const color = CLUSTER_COLORS[i % CLUSTER_COLORS.length];
        tbody.innerHTML += `
            <tr>
                <td><span class="cluster-badge cluster-badge-${i}" style="font-size:0.78rem;">● ${CLUSTER_NAMES[i]}</span></td>
                <td style="font-family:var(--font-mono); font-size:0.82rem;">${Number(c[0]).toFixed(3)}</td>
                <td style="font-family:var(--font-mono); font-size:0.82rem;">${Number(c[1]).toFixed(3)}</td>
            </tr>
        `;
    });
}

// ─── Input Mode ───────────────────────────────────────────────────────────────
function setInputMode(mode) {
    document.getElementById('manualModePanel').style.display = mode === 'manual' ? 'block' : 'none';
    document.getElementById('csvModePanel').style.display    = mode === 'csv'    ? 'block' : 'none';

    const btnM = document.getElementById('btnModeManual');
    const btnC = document.getElementById('btnModeCSV');
    if (btnM) { btnM.className = mode === 'manual' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary'; }
    if (btnC) { btnC.className = mode === 'csv'    ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary'; }
}

// ─── Manual Row Add ───────────────────────────────────────────────────────────
function addPredictRow() {
    const idVal = document.getElementById('newId').value.trim();
    const xVal  = parseFloat(document.getElementById('newX').value);
    const yVal  = parseFloat(document.getElementById('newY').value);

    if (isNaN(xVal)) {
        showToast(`Nilai ${xLabel} wajib diisi dengan angka.`, 'warning');
        return;
    }

    stagingRows.push({
        id: idVal || `Data ${stagingRows.length + 1}`,
        x: xVal,
        y: isNaN(yVal) ? null : yVal
    });

    // Clear inputs
    document.getElementById('newId').value = '';
    document.getElementById('newX').value  = '';
    document.getElementById('newY').value  = '';
    document.getElementById('newX').focus();

    renderStagingTable();
}

// Enter key on newY also adds
document.addEventListener('DOMContentLoaded', () => {
    ['newX', 'newY', 'newId'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') addPredictRow(); });
    });
});

// ─── Staging Table ────────────────────────────────────────────────────────────
function renderStagingTable() {
    const tbody  = document.getElementById('stagingBody');
    const emptyEl = document.getElementById('stagingEmpty');
    const table  = document.getElementById('stagingTable');
    const countEl = document.getElementById('stagingCount');
    const btn    = document.getElementById('btnRunPredict');

    if (!tbody) return;
    tbody.innerHTML = '';

    const hasRows = stagingRows.length > 0;
    if (emptyEl) emptyEl.style.display = hasRows ? 'none' : 'block';
    if (table)   table.style.display   = hasRows ? 'table' : 'none';
    if (countEl) countEl.textContent   = `${stagingRows.length} baris`;
    if (btn)     btn.disabled          = !hasRows;

    stagingRows.forEach((row, i) => {
        tbody.innerHTML += `
            <tr>
                <td style="color:var(--text-muted);">${i + 1}</td>
                <td>${escHtml(row.id)}</td>
                <td style="font-family:var(--font-mono);">${row.x}</td>
                <td style="font-family:var(--font-mono); color:var(--text-muted);">${row.y !== null ? row.y : '—'}</td>
                <td>
                    <button class="btn btn-ghost btn-icon" onclick="removeRow(${i})" title="Hapus baris">
                        <i data-lucide="x" width="14" height="14"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    if (window.lucide) lucide.createIcons();
}

function removeRow(i) {
    stagingRows.splice(i, 1);
    renderStagingTable();
}

function clearPredictRows() {
    stagingRows = [];
    renderStagingTable();
}

// ─── CSV Upload ───────────────────────────────────────────────────────────────
function setupDragDrop() {
    const zone = document.getElementById('predictUploadZone');
    if (!zone) return;
    zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('drop-active'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drop-active'));
    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('drop-active');
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.csv')) processCSVFile(file);
        else showToast('Harap pilih file .csv', 'warning');
    });
    zone.addEventListener('click', () => document.getElementById('predictCSVInput').click());
}

function handlePredictCSV(event) {
    const file = event.target.files[0];
    if (!file) return;
    processCSVFile(file);
}

function processCSVFile(file) {
    const reader = new FileReader();
    reader.onload = e => {
        const text = e.target.result;
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) { showToast('File CSV kosong atau tidak valid.', 'error'); return; }

        const headers = parseCSVLine(lines[0]);
        const rows    = lines.slice(1).map(l => parseCSVLine(l));

        tempCSVData = { headers, rows };
        showCsvMapPanel(headers);
    };
    reader.readAsText(file);
}

function parseCSVLine(line) {
    const result = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { inQ = !inQ; }
        else if (ch === ',' && !inQ) { result.push(cur.trim()); cur = ''; }
        else { cur += ch; }
    }
    result.push(cur.trim());
    return result;
}

function showCsvMapPanel(headers) {
    const panel = document.getElementById('csvMapPanel');
    if (!panel) return;

    ['csvMapId', 'csvMapX', 'csvMapY'].forEach(selId => {
        const sel = document.getElementById(selId);
        if (!sel) return;
        sel.innerHTML = selId === 'csvMapY' ? '<option value="">— Tidak ada / Lewati —</option>' : '';
        headers.forEach(h => {
            const opt = document.createElement('option');
            opt.value = h; opt.textContent = h;
            sel.appendChild(opt);
        });
    });

    // Auto-guess
    const idGuess = headers.findIndex(h => /id|student|name|nama|label/i.test(h));
    const xGuess  = headers.findIndex(h => new RegExp(xLabel, 'i').test(h) || /gpa|hours|age|income|score|level/i.test(h));
    const xGuess2 = xGuess >= 0 ? xGuess : (headers.length > 0 ? 1 : 0);
    const yGuess  = headers.findIndex((h, i) => i !== xGuess2 && (new RegExp(yLabel, 'i').test(h) || /gpa|income|score/i.test(h)));

    const selId = document.getElementById('csvMapId');
    const selX  = document.getElementById('csvMapX');
    const selY  = document.getElementById('csvMapY');
    if (selId && idGuess >= 0) selId.selectedIndex = idGuess;
    if (selX)  selX.selectedIndex = xGuess2;
    if (selY && yGuess >= 0) selY.value = headers[yGuess];

    panel.style.display = 'block';
}

function applyCsvMapping() {
    if (!tempCSVData) return;

    const idCol = document.getElementById('csvMapId').value;
    const xCol  = document.getElementById('csvMapX').value;
    const yCol  = document.getElementById('csvMapY').value;

    const idIdx = tempCSVData.headers.indexOf(idCol);
    const xIdx  = tempCSVData.headers.indexOf(xCol);
    const yIdx  = yCol ? tempCSVData.headers.indexOf(yCol) : -1;

    let skipped = 0;
    const newRows = [];

    tempCSVData.rows.forEach((row, i) => {
        const xVal = parseFloat(row[xIdx]);
        if (isNaN(xVal)) { skipped++; return; }
        const yVal = yIdx >= 0 ? parseFloat(row[yIdx]) : null;
        newRows.push({
            id: (idIdx >= 0 && row[idIdx]) ? row[idIdx] : `Row ${i + 1}`,
            x: xVal,
            y: (yIdx >= 0 && !isNaN(yVal)) ? yVal : null
        });
    });

    stagingRows.push(...newRows);
    renderStagingTable();
    document.getElementById('csvMapPanel').style.display = 'none';
    showToast(`${newRows.length} baris dimuat dari CSV${skipped ? ` (${skipped} baris dilewati)` : ''}.`, 'success');
}

// ─── Batch Prediction ─────────────────────────────────────────────────────────
function runBatchPredict() {
    if (stagingRows.length === 0) return;
    if (centroids.length === 0) { showToast('Model belum dimuat.', 'error'); return; }

    predictResults = stagingRows.map((row, i) => {
        const { cluster, distance } = findNearestCentroid(row.x, row.y);
        return {
            rowNum: i + 1,
            id: row.id,
            x: row.x,
            y: row.y,
            cluster,
            label: clusterLabels[cluster] || `Cluster ${cluster}`,
            distance
        };
    });

    renderResultTable();
    renderResultCharts();

    document.getElementById('predictResultsSection').style.display = 'block';
    setTimeout(() => {
        document.getElementById('predictResultsSection').scrollIntoView({ behavior: 'smooth' });
    }, 100);
    showToast(`Prediksi selesai untuk ${predictResults.length} data.`, 'success');
}

function findNearestCentroid(x, y) {
    let minDist = Infinity;
    let nearest = 0;
    centroids.forEach((c, i) => {
        // c is [cx, cy] from kmeansResult.final_centroids
        const dist = Math.sqrt(Math.pow(x - c[0], 2) + Math.pow(y !== null ? y - c[1] : 0, 2));
        if (dist < minDist) { minDist = dist; nearest = i; }
    });
    return { cluster: nearest, distance: minDist };
}

// ─── Result Table ─────────────────────────────────────────────────────────────
function renderResultTable() {
    const tbody   = document.getElementById('resultBody');
    const countEl = document.getElementById('resultCount');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (countEl) countEl.textContent = `${predictResults.length} hasil`;

    predictResults.forEach(r => {
        const color = CLUSTER_COLORS[r.cluster % CLUSTER_COLORS.length];
        tbody.innerHTML += `
            <tr>
                <td style="color:var(--text-muted);">${r.rowNum}</td>
                <td>${escHtml(r.id)}</td>
                <td style="font-family:var(--font-mono);">${r.x}</td>
                <td style="font-family:var(--font-mono); color:var(--text-muted);">${r.y !== null ? r.y : '—'}</td>
                <td>
                    <span class="cluster-badge cluster-badge-${r.cluster}" style="font-size:0.8rem;">
                        <span class="result-cluster-dot" style="background:${color};"></span>${CLUSTER_NAMES[r.cluster]}
                    </span>
                </td>
                <td style="font-size:0.82rem; color:var(--text-secondary);">${r.label}</td>
                <td style="font-family:var(--font-mono); font-size:0.82rem;">${r.distance.toFixed(4)}</td>
            </tr>
        `;
    });
    if (window.lucide) lucide.createIcons();
}

// ─── Charts ───────────────────────────────────────────────────────────────────
function renderResultCharts() {
    // Count per cluster
    const clusterCounts = {};
    const clusterDistSum = {};
    predictResults.forEach(r => {
        clusterCounts[r.cluster]  = (clusterCounts[r.cluster]  || 0) + 1;
        clusterDistSum[r.cluster] = (clusterDistSum[r.cluster] || 0) + r.distance;
    });

    const clusterKeys  = Object.keys(clusterCounts).map(Number).sort((a, b) => a - b);
    const labels       = clusterKeys.map(c => `Cluster ${c} (${CLUSTER_NAMES[c]})`);
    const counts       = clusterKeys.map(c => clusterCounts[c]);
    const avgDistances = clusterKeys.map(c => clusterDistSum[c] / clusterCounts[c]);
    const bgColors     = clusterKeys.map(c => CLUSTER_COLORS_RGBA[c % CLUSTER_COLORS_RGBA.length]);
    const bdColors     = clusterKeys.map(c => CLUSTER_COLORS[c % CLUSTER_COLORS.length]);

    // Donut
    if (donutChart) { donutChart.destroy(); donutChart = null; }
    const donutCtx = document.getElementById('predictDonutChart');
    if (donutCtx) {
        donutChart = new Chart(donutCtx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{ data: counts, backgroundColor: bgColors, borderColor: bdColors, borderWidth: 2 }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: { legend: { display: false }, tooltip: { callbacks: {
                    label: ctx => ` ${ctx.label}: ${ctx.raw} data (${((ctx.raw / predictResults.length) * 100).toFixed(1)}%)`
                }}}
            }
        });
    }

    // Legend list
    const legendEl = document.getElementById('predictLegendList');
    if (legendEl) {
        legendEl.innerHTML = '';
        clusterKeys.forEach(c => {
            const color = CLUSTER_COLORS[c % CLUSTER_COLORS.length];
            const pct   = ((clusterCounts[c] / predictResults.length) * 100).toFixed(1);
            legendEl.innerHTML += `
                <li>
                    <span class="legend-dot" style="background:${color};"></span>
                    <span style="color:var(--text-secondary);">${CLUSTER_NAMES[c]}</span>
                    <span style="margin-left:auto; font-family:var(--font-mono); font-size:0.82rem;">${clusterCounts[c]} <span style="color:var(--text-muted);">(${pct}%)</span></span>
                </li>
            `;
        });
    }

    // Distance Bar
    if (distanceChart) { distanceChart.destroy(); distanceChart = null; }
    const distCtx = document.getElementById('predictDistanceChart');
    if (distCtx) {
        distanceChart = new Chart(distCtx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: clusterKeys.map(c => CLUSTER_NAMES[c]),
                datasets: [{
                    label: 'Avg Jarak ke Centroid',
                    data: avgDistances,
                    backgroundColor: bgColors,
                    borderColor: bdColors,
                    borderWidth: 1.5,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: 'rgba(255,255,255,0.5)' },
                        title: { display: true, text: 'Jarak Euclidean', color: 'rgba(255,255,255,0.5)' }
                    },
                    x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.8)' } }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: ctx => ` Avg dist: ${ctx.raw.toFixed(4)}` } }
                }
            }
        });
    }
}

// ─── Export CSV ───────────────────────────────────────────────────────────────
function exportPredictCSV() {
    if (!predictResults.length) { showToast('Tidak ada hasil untuk diexport.', 'warning'); return; }

    let csv = `data:text/csv;charset=utf-8,ID,${xLabel},${yLabel},Cluster,Cluster_Label,Jarak_Euclidean\r\n`;
    predictResults.forEach(r => {
        csv += `${escCsv(r.id)},${r.x},${r.y !== null ? r.y : ''},${CLUSTER_NAMES[r.cluster]},${escCsv(r.label)},${r.distance.toFixed(6)}\r\n`;
    });

    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `batch_prediction_result_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Export CSV berhasil!', 'success');
}

// ─── Cluster Label Builder ────────────────────────────────────────────────────
function buildClusterLabels(centroids) {
    const allX = centroids.map(c => c[0]);
    const allY = centroids.map(c => c[1]);
    const avgX = allX.reduce((a, b) => a + b, 0) / centroids.length;
    const avgY = allY.reduce((a, b) => a + b, 0) / centroids.length;
    return centroids.map(c => {
        const xH = c[0] >= avgX, yH = c[1] >= avgY;
        if (xH && yH)   return `${xLabel} Tinggi & ${yLabel} Tinggi`;
        if (xH && !yH)  return `${xLabel} Tinggi & ${yLabel} Rendah`;
        if (!xH && yH)  return `${xLabel} Rendah & ${yLabel} Tinggi`;
        return                 `${xLabel} Rendah & ${yLabel} Rendah`;
    });
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function escHtml(text) {
    if (!text) return '';
    const d = document.createElement('div');
    d.textContent = String(text);
    return d.innerHTML;
}

function escCsv(val) {
    if (typeof val !== 'string') return val;
    if (val.includes(',') || val.includes('"') || val.includes('\n'))
        return `"${val.replace(/"/g, '""')}"`;
    return val;
}
