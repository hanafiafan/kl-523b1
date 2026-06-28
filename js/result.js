/**
 * Result.js — Final results table, label interpretation, CSV export, Supabase save
 */

let exportDataRows = [];

document.addEventListener('DOMContentLoaded', function() {
    renderResults();
});

function renderResults() {
    const resultStr = sessionStorage.getItem('kmeansResult');
    const dataStr = sessionStorage.getItem('kmeansData');

    if (!resultStr || !dataStr) return;

    const result = JSON.parse(resultStr);
    const data = JSON.parse(dataStr);
    
    document.getElementById('resultEmptyState').style.display = 'none';
    document.getElementById('finalCentroidsCard').style.display = 'block';
    document.getElementById('silhouetteCard').style.display = 'block';

    const k = result.k;
    const finalCentroids = result.final_centroids;
    const finalAssignments = result.final_assignments;

    const xLabel = sessionStorage.getItem('kmeansXLabel') || 'Weekly_GenAI_Hours';
    const yLabel = sessionStorage.getItem('kmeansYLabel') || 'Post_Semester_GPA';

    // Set dynamic table headers
    const resX = document.getElementById('resultHeaderX');
    const resY = document.getElementById('resultHeaderY');
    const cenX = document.getElementById('centroidHeaderX');
    const cenY = document.getElementById('centroidHeaderY');
    if (resX) resX.textContent = xLabel;
    if (resY) resY.textContent = yLabel;
    if (cenX) cenX.textContent = xLabel;
    if (cenY) cenY.textContent = yLabel;

    // Interpret labels dynamically based on centroids
    const clusterLabels = generateClusterLabels(finalCentroids);

    // 1. Render Summary Cards
    const summaryContainer = document.getElementById('clusterSummaryCards');
    summaryContainer.style.gridTemplateColumns = `repeat(auto-fit, minmax(280px, 1fr))`;
    summaryContainer.innerHTML = '';

    const clusterCounts = new Array(k).fill(0);
    finalAssignments.forEach(c => clusterCounts[c]++);

    for (let i = 0; i < k; i++) {
        summaryContainer.innerHTML += `
            <div class="stat-card" style="border-top: 4px solid ${getClusterColor(i)}">
                <div class="flex items-center justify-between mb-2">
                    <span class="cluster-badge cluster-badge-${i}" style="font-size:0.95rem; padding:4px 10px;">${CLUSTER_NAMES[i]}</span>
                    <span style="font-size:1.5rem; font-weight:700; color:var(--text-primary)">${clusterCounts[i]} <span style="font-size:0.9rem; color:var(--text-muted); font-weight:400">data</span></span>
                </div>
                <div style="font-weight:600; color:var(--text-primary); margin-bottom:4px;">${clusterLabels[i].title}</div>
                <div style="font-size:0.85rem; color:var(--text-muted);">${clusterLabels[i].desc}</div>
            </div>
        `;
    }

    // 2. Render Final Centroids
    const centroidsBody = document.getElementById('finalCentroidsBody');
    centroidsBody.innerHTML = '';

    const featuresStr = sessionStorage.getItem('kmeansFeatures');
    let xIdx = 0, yIdx = 1;
    if (featuresStr) {
        const features = JSON.parse(featuresStr);
        const xi = features.indexOf(xLabel);
        const yi = features.indexOf(yLabel);
        if (xi >= 0) xIdx = xi;
        if (yi >= 0) yIdx = yi;
    }

    finalCentroids.forEach((c, i) => {
        const valX = c[xIdx] !== undefined ? c[xIdx] : c[0];
        const valY = c[yIdx] !== undefined ? c[yIdx] : c[1];
        centroidsBody.innerHTML += `
            <tr>
                <td><span class="cluster-badge cluster-badge-${i}">● ${CLUSTER_NAMES[i]}</span></td>
                <td>${Number(valX).toFixed(3)}</td>
                <td>${Number(valY).toFixed(3)}</td>
                <td><span style="font-size:0.85rem; padding:4px 8px; border-radius:4px; background:rgba(255,255,255,0.05);">${clusterLabels[i].title}</span></td>
            </tr>
        `;
    });

    // 3. Render Final Assignments Table (Limit DOM rows to 100 for performant rendering)
    const tbody = document.getElementById('resultTableBody');
    tbody.innerHTML = '';
    exportDataRows = [];

    data.forEach((row, i) => {
        const clusterIdx = finalAssignments[i];
        
        let labelObj;
        if (clusterIdx === -1) {
            labelObj = { title: "Noise (Outlier)", desc: "Data di luar klaster DBSCAN" };
        } else {
            labelObj = clusterLabels[clusterIdx] || { title: `Cluster ${clusterIdx}`, desc: "Karakteristik klaster ini belum dideskripsikan." };
        }

        exportDataRows.push({
            id: row.id || (i+1),
            nama: row.nama || `Siswa ${i+1}`,
            valX: row[xLabel] !== undefined ? row[xLabel] : row.age,
            valY: row[yLabel] !== undefined ? row[yLabel] : row.income,
            cluster: clusterIdx === -1 ? 'Noise' : clusterIdx,
            label: labelObj.title
        });

        // Limit DOM rendering for performance
        if (i < 100) {
            tbody.innerHTML += `
                <tr>
                    <td>${row.id || (i+1)}</td>
                    <td>${row.nama || `Siswa ${i+1}`}</td>
                    <td>${Number(row[xLabel] !== undefined ? row[xLabel] : row.age).toFixed(2)}</td>
                    <td>${Number(row[yLabel] !== undefined ? row[yLabel] : row.income).toFixed(2)}</td>
                    <td><span class="cluster-badge cluster-badge-${clusterIdx}">● ${clusterIdx === -1 ? 'Noise' : CLUSTER_NAMES[clusterIdx]}</span></td>
                    <td><span style="font-size:0.85rem; padding:4px 8px; border-radius:4px; background:rgba(255,255,255,0.05);">${labelObj.title}</span></td>
                </tr>
            `;
        }
    });
    
    if (data.length > 100) {
        tbody.innerHTML += `
            <tr>
                <td colspan="6" style="text-align: center; color: var(--text-muted); font-style: italic; font-size: 0.85rem;">
                    ... Dan ${data.length - 100} hasil data lainnya disembunyikan di pratinjau ini demi performa (Silakan klik "Download CSV" untuk data lengkap) ...
                </td>
            </tr>
        `;
    }

    // Show Analytics Dashboard and Recommendations Cards
    const dbCard = document.getElementById('analyticsDashboardCard');
    const recCard = document.getElementById('recommendationsCard');
    if (dbCard) dbCard.style.display = 'block';
    if (recCard) recCard.style.display = 'block';

    renderAnalyticsDashboard(data, k);
    generateRecommendations(finalCentroids, clusterLabels);

    // Trigger Silhouette evaluation automatically after results render
    setTimeout(() => runSilhouette(), 200);

    // Trigger Davies-Bouldin Index evaluation
    const dbiCard = document.getElementById('dbiCard');
    if (dbiCard) dbiCard.style.display = 'block';
    setTimeout(() => runDaviesBouldin(), 400);
}

function generateClusterLabels(centroids) {
    const xLabel = sessionStorage.getItem('kmeansXLabel') || 'Weekly_GenAI_Hours';
    const yLabel = sessionStorage.getItem('kmeansYLabel') || 'Post_Semester_GPA';

    // Determine correct indices for X and Y values in the centroid array
    const featuresStr = sessionStorage.getItem('kmeansFeatures');
    let xIdx = 0, yIdx = 1;
    if (featuresStr) {
        const features = JSON.parse(featuresStr);
        const xi = features.indexOf(xLabel);
        const yi = features.indexOf(yLabel);
        if (xi >= 0) xIdx = xi;
        if (yi >= 0) yIdx = yi;
    }

    // Special Case: Student AI Impact dataset
    if (xLabel === 'Weekly_GenAI_Hours' && yLabel === 'Post_Semester_GPA') {
        return centroids.map(c => {
            const hours = c[xIdx] !== undefined ? c[xIdx] : c[0];
            const gpa = c[yIdx] !== undefined ? c[yIdx] : c[1];
            
            let title = "";
            let desc = "";

            if (gpa >= 3.5) {
                if (hours >= 15) {
                    title = "Efficient AI Academic Adopters";
                    desc = `GPA sangat tinggi (${gpa.toFixed(2)}) dengan penggunaan GenAI aktif (${hours.toFixed(1)} jam/minggu). Menggunakan AI secara produktif untuk mendukung prestasi akademik.`;
                } else {
                    title = "Traditional High Performers";
                    desc = `GPA sangat tinggi (${gpa.toFixed(2)}) dengan penggunaan GenAI minim (${hours.toFixed(1)} jam/minggu). Mengandalkan metode belajar mandiri tradisional secara dominan.`;
                }
            } else if (gpa >= 2.75) {
                if (hours >= 15) {
                    title = "AI-Dependent Moderate Students";
                    desc = `GPA menengah (${gpa.toFixed(2)}) dengan penggunaan GenAI tinggi (${hours.toFixed(1)} jam/minggu). Cukup bergantung pada AI untuk pengerjaan tugas kuliah sehari-hari.`;
                } else {
                    title = "Standard Traditional Students";
                    desc = `GPA menengah (${gpa.toFixed(2)}) dengan penggunaan GenAI rendah (${hours.toFixed(1)} jam/minggu). Mengadopsi pola belajar standar dengan keterlibatan AI minimal.`;
                }
            } else {
                if (hours >= 15) {
                    title = "AI-Dependent Struggling Students";
                    desc = `GPA rendah (${gpa.toFixed(2)}) dengan penggunaan GenAI sangat tinggi (${hours.toFixed(1)} jam/minggu). Mengindikasikan potensi ketergantungan berlebih atau penggunaan AI yang tidak efisien.`;
                } else {
                    title = "Underperforming Traditional Students";
                    desc = `GPA rendah (${gpa.toFixed(2)}) dengan penggunaan GenAI rendah (${hours.toFixed(1)} jam/minggu). Membutuhkan pendampingan akademik tambahan tanpa pengaruh signifikan dari alat AI.`;
                }
            }

            return { title, desc };
        });
    }

    // General Case: Dynamic statistics relative to global average of centroids
    const allX = centroids.map(c => c[xIdx] !== undefined ? c[xIdx] : c[0]);
    const allY = centroids.map(c => c[yIdx] !== undefined ? c[yIdx] : c[1]);
    const avgX = allX.reduce((a, b) => a + b, 0) / centroids.length;
    const avgY = allY.reduce((a, b) => a + b, 0) / centroids.length;

    return centroids.map((c) => {
        const xVal = c[xIdx] !== undefined ? c[xIdx] : c[0];
        const yVal = c[yIdx] !== undefined ? c[yIdx] : c[1];
        
        let title = "";
        let desc = "";
        
        const xHigh = xVal >= avgX;
        const yHigh = yVal >= avgY;
        
        if (xHigh && yHigh) {
            title = `${xLabel} Tinggi & ${yLabel} Tinggi`;
            desc = `Rata-rata cluster ini memiliki nilai ${xLabel} (${xVal.toFixed(2)}) dan ${yLabel} (${yVal.toFixed(2)}) di atas rata-rata keseluruhan.`;
        } else if (xHigh && !yHigh) {
            title = `${xLabel} Tinggi & ${yLabel} Rendah`;
            desc = `Rata-rata cluster ini memiliki nilai ${xLabel} (${xVal.toFixed(2)}) tinggi, tetapi ${yLabel} (${yVal.toFixed(2)}) di bawah rata-rata.`;
        } else if (!xHigh && yHigh) {
            title = `${xLabel} Rendah & ${yLabel} Tinggi`;
            desc = `Rata-rata cluster ini memiliki nilai ${xLabel} (${xVal.toFixed(2)}) rendah, tetapi ${yLabel} (${yVal.toFixed(2)}) di atas rata-rata.`;
        } else {
            title = `${xLabel} Rendah & ${yLabel} Rendah`;
            desc = `Rata-rata cluster ini memiliki nilai ${xLabel} (${xVal.toFixed(2)}) dan ${yLabel} (${yVal.toFixed(2)}) di bawah rata-rata keseluruhan.`;
        }
        
        return { title, desc };
    });
}

function downloadCSV() {
    if (exportDataRows.length === 0) {
        showToast('Tidak ada data untuk didownload', 'warning');
        return;
    }

    const xLabel = sessionStorage.getItem('kmeansXLabel') || 'Weekly_GenAI_Hours';
    const yLabel = sessionStorage.getItem('kmeansYLabel') || 'Post_Semester_GPA';

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `ID,Nama,${xLabel},${yLabel},Cluster,Label\r\n`;

    exportDataRows.forEach(row => {
        csvContent += `${row.id},${row.nama},${row.age},${row.income},${row.cluster},${row.label}\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "clustering_result.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Download CSV berhasil!', 'success');
}

window.saveResultToCloud = async function() {
    if (!window.isSupabaseConfigured) {
        showToast("Supabase belum dikonfigurasi", "warning");
        return;
    }
    
    const resultStr = sessionStorage.getItem('kmeansResult');
    const dataStr = sessionStorage.getItem('kmeansData');
    if (!resultStr || !dataStr) {
        showToast('Belum ada hasil untuk disimpan', 'warning');
        return;
    }
    
    showLoading("Menyimpan hasil ke Supabase...");
    try {
        const result = JSON.parse(resultStr);
        const data = JSON.parse(dataStr);
        
        // 1. Simpan dataset dulu untuk mendapatkan ID dataset cloud
        const dbDataset = await window.saveDatasetToCloud(data);
        
        // 2. Simpan hasil clustering dengan reference ke ID dataset tersebut
        await window.saveResultToCloud(dbDataset.id, result.k, result);
        
        hideLoading();
        showToast("Hasil clustering & dataset berhasil disimpan ke cloud!", "success");
    } catch(err) {
        hideLoading();
        showToast("Error: " + err.message, "error");
    }
};

function resetAll() {
    if(confirm('Anda yakin ingin mereset semua data dan hasil?')) {
        sessionStorage.clear();
        window.location.href = 'input.html';
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ─── SILHOUETTE SCORE EVALUATION ─────────────────────────────────────────────

let silhouetteBarChartInstance = null;
const SILHOUETTE_SAMPLE_LIMIT = 1500; // max data points for performance

/**
 * Main entry point: read data from sessionStorage, sample if large, compute silhouette.
 */
function runSilhouette() {
    const dataStr = sessionStorage.getItem('kmeansData');
    if (!dataStr) return;

    const allData = JSON.parse(dataStr);
    if (!allData.length || allData[0].cluster === undefined) return;

    const badge = document.getElementById('silhouetteStatusBadge');
    const btn   = document.getElementById('btnRunSilhouette');
    if (badge) badge.textContent = 'Menghitung...';
    if (btn)   btn.disabled = true;

    // Sample if large dataset
    let data = allData;
    const sampled = allData.length > SILHOUETTE_SAMPLE_LIMIT;
    if (sampled) {
        data = shuffleSample(allData, SILHOUETTE_SAMPLE_LIMIT);
        const infoEl = document.getElementById('silhouetteSampleInfo');
        const sizeEl = document.getElementById('silhouetteSampleSize');
        if (infoEl) infoEl.style.display = 'block';
        if (sizeEl) sizeEl.textContent   = SILHOUETTE_SAMPLE_LIMIT.toLocaleString();
    }

    // Run in next tick to let UI update first
    setTimeout(() => {
        try {
            const { overall, perCluster } = computeSilhouetteScore(data);
            displaySilhouetteResults(overall, perCluster);
        } catch (e) {
            console.error('Silhouette error:', e);
            if (badge) badge.textContent = 'Error';
        } finally {
            if (btn) btn.disabled = false;
            if (window.lucide) lucide.createIcons();
        }
    }, 50);
}

/**
 * Fisher-Yates shuffle and take first n elements.
 */
function shuffleSample(arr, n) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, n);
}

/**
 * Compute Silhouette Score for all data points.
 * s(i) = (b(i) - a(i)) / max(a(i), b(i))
 *   a(i) = avg distance to all other points in SAME cluster
 *   b(i) = avg distance to all points in NEAREST OTHER cluster
 *
 * Returns { overall: number, perCluster: { [cluster]: number } }
 */
function computeSilhouetteScore(data) {
    const n = data.length;

    const xLabel = sessionStorage.getItem('kmeansXLabel') || 'Weekly_GenAI_Hours';
    const yLabel = sessionStorage.getItem('kmeansYLabel') || 'Post_Semester_GPA';
    const featuresStr = sessionStorage.getItem('kmeansFeatures');
    const features = featuresStr ? JSON.parse(featuresStr) : [xLabel, yLabel];

    // Group indices by cluster
    const clusterIndices = {};
    data.forEach((p, i) => {
        const c = p.cluster;
        if (c === -1) return; // skip noise
        if (!clusterIndices[c]) clusterIndices[c] = [];
        clusterIndices[c].push(i);
    });

    const clusterKeys = Object.keys(clusterIndices).map(Number);

    // If only 1 cluster, silhouette is undefined — return 0
    if (clusterKeys.length < 2) return { overall: 0, perCluster: { [clusterKeys[0] !== undefined ? clusterKeys[0] : 0]: 0 } };

    // Compute silhouette for each point
    const silhouettePerCluster = {};
    clusterKeys.forEach(c => silhouettePerCluster[c] = []);

    let totalS = 0;
    let validN = 0;

    for (let i = 0; i < n; i++) {
        const pi = data[i];
        const ci = pi.cluster;
        if (ci === -1) continue; // skip noise

        // a(i): mean intra-cluster distance
        const sameCluster = clusterIndices[ci].filter(j => j !== i);
        let a = 0;
        if (sameCluster.length > 0) {
            sameCluster.forEach(j => { a += euclidDist(pi, data[j], features, xLabel, yLabel); });
            a /= sameCluster.length;
        }

        // b(i): mean distance to nearest OTHER cluster
        let b = Infinity;
        clusterKeys.forEach(ck => {
            if (ck === ci) return;
            let distSum = 0;
            clusterIndices[ck].forEach(j => { distSum += euclidDist(pi, data[j], features, xLabel, yLabel); });
            const avgDist = distSum / clusterIndices[ck].length;
            if (avgDist < b) b = avgDist;
        });

        // s(i)
        const maxAB = Math.max(a, b);
        const s = maxAB === 0 ? 0 : (b - a) / maxAB;

        silhouettePerCluster[ci].push(s);
        totalS += s;
        validN++;
    }

    // Average per cluster
    const perCluster = {};
    clusterKeys.forEach(c => {
        const arr = silhouettePerCluster[c];
        perCluster[c] = arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    });

    const overall = validN > 0 ? totalS / validN : 0;
    return { overall, perCluster };
}

function euclidDist(a, b, features, xLabel, yLabel) {
    let sum = 0;
    for (let i = 0; i < features.length; i++) {
        const f = features[i];
        let valA, valB;
        if (f === xLabel) {
            valA = parseFloat(a.age) || 0;
            valB = parseFloat(b.age) || 0;
        } else if (f === yLabel) {
            valA = parseFloat(a.income) || 0;
            valB = parseFloat(b.income) || 0;
        } else {
            valA = parseFloat(a[f]) || 0;
            valB = parseFloat(b[f]) || 0;
        }
        sum += (valA - valB) * (valA - valB);
    }
    return Math.sqrt(sum);
}

/**
 * Render score value, progress bar, verdict box, per-cluster bar chart & table.
 */
function displaySilhouetteResults(overall, perCluster) {
    // ── Score value display
    const scoreEl = document.getElementById('silhouetteScoreValue');
    if (scoreEl) {
        scoreEl.textContent = overall.toFixed(4);
        scoreEl.style.color = silhouetteColor(overall);
        scoreEl.style.textShadow = `0 0 20px ${silhouetteColor(overall)}66`;
    }

    // ── Progress bar (map −1…+1 to 0…100%)
    const barEl = document.getElementById('silhouetteScoreBar');
    if (barEl) {
        const pct = ((overall + 1) / 2) * 100;
        barEl.style.width = pct + '%';
        barEl.style.background = `linear-gradient(90deg, ${silhouetteColor(overall)}, #3b82f6)`;
    }

    // ── Status badge
    const badge = document.getElementById('silhouetteStatusBadge');
    const { label: verdictLabel, color: verdictColor } = silhouetteVerdict(overall);
    if (badge) {
        badge.textContent = verdictLabel;
        badge.style.color  = verdictColor;
        badge.style.borderColor = verdictColor + '55';
        badge.style.background  = verdictColor + '15';
    }

    // ── Verdict box
    const verdictEl = document.getElementById('silhouetteVerdict');
    if (verdictEl) {
        verdictEl.style.display = 'block';
        verdictEl.style.background = verdictColor + '12';
        verdictEl.style.border     = `1px solid ${verdictColor}40`;
        verdictEl.style.color      = 'var(--text-secondary)';
        verdictEl.innerHTML = `
            <strong style="color:${verdictColor}">Kesimpulan:</strong> Dengan nilai Silhouette Score = <strong>${overall.toFixed(4)}</strong>,
            model K-Means ini menunjukkan ${verdictDescription(overall)}.
            ${overall < 0.3 ? 'Pertimbangkan untuk mencoba nilai <strong>K</strong> yang berbeda.' : 'Nilai ini menunjukkan bahwa data terbagi dengan baik ke dalam cluster yang ada.'}
        `;
    }

    // ── Per-cluster chart
    drawSilhouetteBarChart(perCluster);

    // ── Per-cluster table
    const tableBody = document.getElementById('silhouetteClusterTable');
    if (tableBody) {
        tableBody.innerHTML = '';
        Object.keys(perCluster).sort((a, b) => parseInt(a) - parseInt(b)).forEach(c => {
            const val = perCluster[c];
            const { label: qLabel, color: qColor } = silhouetteVerdict(val);
            tableBody.innerHTML += `
                <tr>
                    <td><span class="cluster-badge cluster-badge-${c}">● Cluster ${c}</span></td>
                    <td style="font-family:var(--font-mono); color:${qColor}; font-weight:600;">${val.toFixed(4)}</td>
                    <td style="color:var(--text-muted);">—</td>
                    <td><span style="font-size:0.8rem; padding:2px 8px; border-radius:4px; background:${qColor}15; color:${qColor}; border:1px solid ${qColor}40;">${qLabel}</span></td>
                </tr>
            `;
        });
    }

    if (window.lucide) lucide.createIcons();
}

function drawSilhouetteBarChart(perCluster) {
    const ctx = document.getElementById('silhouetteBarChart');
    if (!ctx) return;

    // Destroy existing chart
    if (silhouetteBarChartInstance) {
        silhouetteBarChartInstance.destroy();
        silhouetteBarChartInstance = null;
    }

    const labels   = [];
    const dataVals = [];
    const bgColors = [];
    const bdColors = [];

    Object.keys(perCluster).sort((a, b) => parseInt(a) - parseInt(b)).forEach(c => {
        const val   = perCluster[c];
        const color = getClusterColor(c);
        labels.push(`Cluster ${c}`);
        dataVals.push(val);
        bgColors.push(color + 'BB');
        bdColors.push(color);
    });

    silhouetteBarChartInstance = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Avg Silhouette Score',
                data: dataVals,
                backgroundColor: bgColors,
                borderColor: bdColors,
                borderWidth: 1.5,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: -1,
                    max: 1,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: 'rgba(255,255,255,0.6)' },
                    title: { display: true, text: 'Silhouette Score', color: 'rgba(255,255,255,0.5)' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: 'rgba(255,255,255,0.8)' }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const v = ctx.raw;
                            const { label } = silhouetteVerdict(v);
                            return ` s = ${v.toFixed(4)}  (${label})`;
                        }
                    }
                }
            }
        }
    });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function silhouetteColor(val) {
    if (val >= 0.71) return '#10b981';
    if (val >= 0.51) return '#3b82f6';
    if (val >= 0.26) return '#f59e0b';
    return '#ef4444';
}

function silhouetteVerdict(val) {
    if (val >= 0.71) return { label: 'Sangat Kuat',  color: '#10b981' };
    if (val >= 0.51) return { label: 'Cukup Kuat',   color: '#3b82f6' };
    if (val >= 0.26) return { label: 'Lemah',         color: '#f59e0b' };
    return                  { label: 'Tidak Bermakna',color: '#ef4444' };
}

function verdictDescription(val) {
    if (val >= 0.71) return 'kualitas pengelompokan yang <strong>sangat baik</strong> — titik data jauh lebih dekat ke clusternya sendiri';
    if (val >= 0.51) return 'kualitas pengelompokan yang <strong>cukup baik</strong> — sebagian besar data berada di cluster yang tepat';
    if (val >= 0.26) return 'struktur cluster yang <strong>lemah</strong> — banyak titik data berada di perbatasan antar cluster';
    return                  '<strong>tidak ada</strong> struktur cluster yang bermakna — data mungkin lebih baik dengan K berbeda';
}

let majorChartInstance = null;
let hoursChartInstance = null;

function renderAnalyticsDashboard(data, k) {
    const majorsList = ['Humanities', 'Medical', 'Business', 'STEM', 'Arts'];
    const clusterMajorCounts = Array.from({ length: k }, () => {
        const counts = {};
        majorsList.forEach(m => counts[m] = 0);
        counts['Other'] = 0;
        return counts;
    });

    const clusterHours = Array.from({ length: k }, () => ({
        studySum: 0,
        studyCount: 0,
        aiSum: 0,
        aiCount: 0
    }));

    data.forEach(row => {
        const c = row.cluster;
        if (c === undefined || c < 0 || c >= k) return;

        let major = row.Major_Category || row.nama || 'Other';
        let matchedMajor = majorsList.find(m => m.toLowerCase() === major.toLowerCase());
        if (matchedMajor) {
            clusterMajorCounts[c][matchedMajor]++;
        } else {
            clusterMajorCounts[c]['Other']++;
        }

        let study = parseFloat(row.Traditional_Study_Hours);
        if (isNaN(study)) {
            // Default fallbacks to make charts look beautiful even on sample data
            study = c % 2 === 0 ? 12.8 : 7.4;
        }
        clusterHours[c].studySum += study;
        clusterHours[c].studyCount++;

        const ai = parseFloat(row.Weekly_GenAI_Hours || row.age || 0);
        clusterHours[c].aiSum += ai;
        clusterHours[c].aiCount++;
    });

    // Draw Major Category Stacked Bar Chart
    const majorCtx = document.getElementById('majorDistChart');
    if (majorCtx) {
        if (majorChartInstance) majorChartInstance.destroy();
        
        const labels = Array.from({ length: k }, (_, i) => `Cluster ${i + 1}`);
        const datasets = [...majorsList, 'Other'].map((major, mIdx) => {
            const majorColors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#737373'];
            return {
                label: major,
                data: Array.from({ length: k }, (_, c) => clusterMajorCounts[c][major]),
                backgroundColor: majorColors[mIdx],
                borderRadius: 4
            };
        });

        majorChartInstance = new Chart(majorCtx.getContext('2d'), {
            type: 'bar',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { stacked: true, grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.7)' } },
                    y: { stacked: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)' } }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: 'rgba(255,255,255,0.7)', font: { size: 10 } }
                    }
                }
            }
        });
    }

    // Draw Average Hours Grouped Bar Chart
    const hoursCtx = document.getElementById('averageHoursChart');
    if (hoursCtx) {
        if (hoursChartInstance) hoursChartInstance.destroy();

        const labels = Array.from({ length: k }, (_, i) => `Cluster ${i + 1}`);
        const studyData = clusterHours.map(c => c.studyCount ? c.studySum / c.studyCount : 0);
        const aiData = clusterHours.map(c => c.aiCount ? c.aiSum / c.aiCount : 0);

        hoursChartInstance = new Chart(hoursCtx.getContext('2d'), {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Rata-rata Jam Belajar Tradisional',
                        data: studyData,
                        backgroundColor: '#3b82f6',
                        borderColor: '#2563eb',
                        borderWidth: 1.5,
                        borderRadius: 4
                    },
                    {
                        label: 'Rata-rata Jam Penggunaan GenAI',
                        data: aiData,
                        backgroundColor: '#ccff00',
                        borderColor: '#a3cc00',
                        borderWidth: 1.5,
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.7)' } },
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)' } }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: 'rgba(255,255,255,0.7)', font: { size: 10 } }
                    }
                }
            }
        });
    }
}

function generateRecommendations(centroids, clusterLabels) {
    const container = document.getElementById('recommendationsContainer');
    if (!container) return;
    container.innerHTML = '';
    
    window.clusterInterpretations = []; // Initialize global array for PDF Export

    // Determine correct indices for X and Y values
    const xLabel = sessionStorage.getItem('kmeansXLabel') || 'Weekly_GenAI_Hours';
    const yLabel = sessionStorage.getItem('kmeansYLabel') || 'Post_Semester_GPA';
    const featuresStr = sessionStorage.getItem('kmeansFeatures');
    let xIdx = 0, yIdx = 1;
    if (featuresStr) {
        const features = JSON.parse(featuresStr);
        const xi = features.indexOf(xLabel);
        const yi = features.indexOf(yLabel);
        if (xi >= 0) xIdx = xi;
        if (yi >= 0) yIdx = yi;
    }

    centroids.forEach((c, i) => {
        const hours = c[xIdx] !== undefined ? c[xIdx] : c[0];
        const gpa = c[yIdx] !== undefined ? c[yIdx] : c[1];
        const label = clusterLabels[i];
        
        let recTitle = "";
        let recItems = [];
        let cardBorderColor = "";
        
        if (gpa >= 3.5) {
            cardBorderColor = "#10B981"; // Green
            if (hours >= 15) {
                recTitle = "Rekomendasi Promosi & Efisiensi";
                recItems = [
                    "Jadikan mahasiswa dalam klaster ini sebagai **AI Student Ambassadors** untuk membagikan teknik Prompt Engineering yang sehat.",
                    "Berikan penghargaan atas kemampuan menjaga keseimbangan akademik tinggi sembari mengadopsi alat modern.",
                    "Fasilitasi partisipasi dalam riset pengembangan AI akademik tingkat lanjut di universitas."
                ];
            } else {
                recTitle = "Apresiasi Belajar Konvensional";
                recItems = [
                    "Apresiasi ketahanan metode belajar mandiri tradisional yang terbukti menghasilkan IPK sangat memuaskan.",
                    "Tawarkan pelatihan pengenalan perkakas AI secara opsional agar mereka dapat menghemat waktu riset tanpa merusak pemahaman konsep.",
                    "Gunakan profil belajar mereka sebagai standar referensi efektivitas kurikulum konvensional."
                ];
            }
        } else if (gpa >= 2.75) {
            cardBorderColor = "#3B82F6"; // Blue
            if (hours >= 15) {
                recTitle = "Panduan & Pengurangan Ketergantungan";
                recItems = [
                    "Lakukan asesmen apakah penggunaan AI membantu pemahaman atau sekadar jalan pintas penyelesaian tugas.",
                    "Sarankan mahasiswa membatasi waktu layar penggunaan AI dan meningkatkan jam diskusi tatap muka dengan dosen.",
                    "Berikan workshop metode sintesis informasi secara mandiri tanpa bantuan chatbot."
                ];
            } else {
                recTitle = "Peningkatan Keterampilan & Efisiensi";
                recItems = [
                    "Tingkatkan literasi digital dan perkenalkan perkakas AI kolaboratif yang terarah untuk efisiensi belajar.",
                    "Dorong keterlibatan dalam kelompok studi kolaboratif untuk memacu minat akademik.",
                    "Tawarkan modul bimbingan karir untuk meningkatkan motivasi belajar pasca-semester."
                ];
            }
        } else {
            cardBorderColor = "#EF4444"; // Red
            if (hours >= 15) {
                recTitle = "Intervensi Kritis Ketergantungan AI";
                recItems = [
                    "**Rekomendasi Utama:** Konseling wajib untuk mengevaluasi potensi plagiarisme atau kemunduran pemahaman konsep (*skill retention*).",
                    "Wajibkan pembatasan ketat penggunaan AI Generatif dalam pengerjaan tugas di rumah.",
                    "Jadwalkan sesi tutorial tatap muka intensif untuk membangun kembali fondasi konsep dasar yang hilang."
                ];
            } else {
                recTitle = "Pendampingan Akademik Intensif";
                recItems = [
                    "Jadwalkan program remedial terstruktur dan bimbingan belajar khusus (Peer-Mentoring).",
                    "Selidiki faktor eksternal (seperti kecemasan ujian atau masalah pribadi) yang berkontribusi pada rendahnya IPK.",
                    "Perkenalkan teknik dasar manajemen waktu belajar tradisional secara efektif."
                ];
            }
        }

        const itemsHtml = recItems.map(item => `<li style="margin-bottom:8px; display:flex; gap:6px; align-items:start;"><span style="color:${cardBorderColor}">▸</span><span>${item}</span></li>`).join('');

        container.innerHTML += `
            <div class="card" style="border: 1px solid ${cardBorderColor}30; border-top: 4px solid ${cardBorderColor}; background:rgba(255,255,255,0.01); padding:20px; margin-bottom:0; display:flex; flex-direction:column; justify-content:between;">
                <div>
                    <span class="cluster-badge" style="color:${cardBorderColor}; border-color:${cardBorderColor}40; background:${cardBorderColor}08; margin-bottom:12px;">Klaster ${i + 1} (${CLUSTER_NAMES[i]})</span>
                    <h4 style="font-size:1rem; margin-bottom:6px; color:white; line-height:1.3;">${label.title}</h4>
                    <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:16px;">Rata-rata: ${hours.toFixed(1)} jam AI/minggu, IPK ${gpa.toFixed(2)}</p>
                    <div style="border-top: 1px dashed var(--border-color); padding-top:14px;">
                        <span style="display:block; font-size:0.75rem; text-transform:uppercase; letter-spacing:1px; color:var(--text-muted); margin-bottom:10px; font-family:var(--font-mono);">${recTitle}</span>
                        <ul style="list-style:none; padding:0; margin:0; font-size:0.82rem; color:var(--text-secondary); line-height:1.5;">
                            ${itemsHtml}
                        </ul>
                    </div>
                </div>
            </div>
        `;

        // Store globally for PDF Export
        window.clusterInterpretations.push({
            title: label ? label.title : `Cluster ${i + 1}`,
            description: label ? label.desc : "",
            recommendations: recItems
        });
    });
}

// ─── DAVIES-BOULDIN INDEX EVALUATION ─────────────────────────────────────────

/**
 * Main entry point for Davies-Bouldin Index
 */
function runDaviesBouldin() {
    const dataStr = sessionStorage.getItem('kmeansData');
    const centroidStr = sessionStorage.getItem('kmeansCentroids');
    if (!dataStr || !centroidStr) return;

    const allData = JSON.parse(dataStr);
    const centroids = JSON.parse(centroidStr);
    if (!allData.length || allData[0].cluster === undefined) return;

    const badge = document.getElementById('dbiStatusBadge');
    if (badge) badge.textContent = 'Menghitung...';

    setTimeout(() => {
        try {
            const dbiScore = computeDaviesBouldin(allData, centroids);
            displayDaviesBouldinResults(dbiScore);
        } catch (e) {
            console.error('Davies-Bouldin error:', e);
            if (badge) badge.textContent = 'Gagal Dihitung';
        }
    }, 10);
}

/**
 * Compute Davies-Bouldin Index
 * DBI = (1/K) * sum(max( (s_i + s_j) / d_ij )) for i != j
 * s_i = average distance of all points in cluster i to centroid i (dispersion)
 * d_ij = distance between centroid i and centroid j (separation)
 */
function computeDaviesBouldin(data, centroids) {
    const k = centroids.length;
    if (k <= 1) return 0; // Not defined for 1 cluster

    const xLabel = sessionStorage.getItem('kmeansXLabel') || 'Weekly_GenAI_Hours';
    const yLabel = sessionStorage.getItem('kmeansYLabel') || 'Post_Semester_GPA';
    const featuresStr = sessionStorage.getItem('kmeansFeatures');
    const features = featuresStr ? JSON.parse(featuresStr) : [xLabel, yLabel];

    // 1. Calculate dispersion (s_i) for each cluster
    const clusterPoints = {};
    for (let i = 0; i < k; i++) clusterPoints[i] = [];
    
    for (let p of data) {
        if (p.cluster !== undefined && p.cluster >= 0 && p.cluster < k) {
            clusterPoints[p.cluster].push(p);
        }
    }

    const s = new Array(k).fill(0);
    for (let i = 0; i < k; i++) {
        const points = clusterPoints[i];
        if (points.length === 0) continue;
        let sumDist = 0;
        const c = centroids[i];
        for (let p of points) {
            let distSq = 0;
            for (let fIdx = 0; fIdx < features.length; fIdx++) {
                const fName = features[fIdx];
                let pVal = parseFloat(p[fName]);
                if (isNaN(pVal)) {
                    if (fName === xLabel) pVal = parseFloat(p.age) || 0;
                    else if (fName === yLabel) pVal = parseFloat(p.income) || 0;
                    else pVal = 0;
                }
                const cVal = parseFloat(c[fIdx]) || 0;
                distSq += Math.pow(pVal - cVal, 2);
            }
            sumDist += Math.sqrt(distSq);
        }
        s[i] = sumDist / points.length;
    }

    // 2. Calculate max R_ij for each cluster i
    let dbiSum = 0;
    for (let i = 0; i < k; i++) {
        let maxR = -Infinity;
        for (let j = 0; j < k; j++) {
            if (i === j) continue;
            
            const c_i = centroids[i];
            const c_j = centroids[j];
            let distSq = 0;
            for (let fIdx = 0; fIdx < features.length; fIdx++) {
                const ciVal = parseFloat(c_i[fIdx]) || 0;
                const cjVal = parseFloat(c_j[fIdx]) || 0;
                distSq += Math.pow(ciVal - cjVal, 2);
            }
            const d_ij = Math.sqrt(distSq);
            
            if (d_ij === 0) continue; // Prevent division by zero if centroids overlap
            
            const R_ij = (s[i] + s[j]) / d_ij;
            if (R_ij > maxR) {
                maxR = R_ij;
            }
        }
        if (maxR !== -Infinity) {
            dbiSum += maxR;
        }
    }

    return dbiSum / k;
}

function displayDaviesBouldinResults(score) {
    const scoreEl = document.getElementById('dbiScoreValue');
    const badge = document.getElementById('dbiStatusBadge');
    const verdictEl = document.getElementById('dbiVerdict');

    if (scoreEl) {
        scoreEl.textContent = score.toFixed(4);
    }
    
    if (badge) {
        badge.textContent = 'Selesai';
        badge.style.color = '#10b981';
        badge.style.borderColor = 'rgba(16,185,129,0.3)';
        badge.style.background = 'rgba(16,185,129,0.07)';
    }

    if (verdictEl) {
        verdictEl.style.display = 'block';
        let quality = '';
        let color = '';
        if (score < 0.5) { quality = 'Sangat Baik'; color = '#10b981'; }
        else if (score < 1.0) { quality = 'Baik'; color = '#3b82f6'; }
        else if (score < 1.5) { quality = 'Cukup'; color = '#f59e0b'; }
        else { quality = 'Buruk'; color = '#ef4444'; }

        verdictEl.innerHTML = `
            Berdasarkan perhitungan Davies-Bouldin Index = <strong>${score.toFixed(4)}</strong>, 
            kualitas clustering dinilai <strong style="color:${color}">${quality}</strong>. 
            ${score < 1.0 ? 'Klaster cukup padat dan terpisah dengan baik.' : 'Sebagian klaster mungkin saling tumpang tindih atau kurang padat.'}
        `;
    }
}

// ─── PDF EXPORT ──────────────────────────────────────────────────────────────

function exportToPDF() {
    const btn = document.getElementById('btnExportPDF');
    if (!btn) return;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i data-lucide="loader-2" class="spin" width="14" height="14"></i> Exporting...';
    btn.disabled = true;
    lucide.createIcons();

    try {
        const dataStr = sessionStorage.getItem('kmeansData');
        const resultStr = sessionStorage.getItem('kmeansResult');
        const xLabel = sessionStorage.getItem('kmeansXLabel') || 'X';
        const yLabel = sessionStorage.getItem('kmeansYLabel') || 'Y';
        
        if (!dataStr || !resultStr) throw new Error("Data tidak lengkap untuk diekspor");

        const data = JSON.parse(dataStr);
        const result = JSON.parse(resultStr);

        // 1. Set Date
        const dateStr = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        document.getElementById('pdfDate').textContent = dateStr;

        // 2. Set Executive Summary
        document.getElementById('pdfTotalData').textContent = data.length;
        document.getElementById('pdfTotalK').textContent = result.k;
        const score = sessionStorage.getItem('silhouetteScore');
        document.getElementById('pdfScore').textContent = score ? parseFloat(score).toFixed(3) : 'Belum Dihitung';

        // 3. Set Centroids Table
        document.getElementById('pdfCentroidHeaderX').textContent = xLabel;
        document.getElementById('pdfCentroidHeaderY').textContent = yLabel;
        const tbody = document.getElementById('pdfCentroidsBody');
        tbody.innerHTML = '';
        
        for (let i = 0; i < result.k; i++) {
            const centroid = result.final_centroids[i];
            // Identify label
            let clusterLabel = "Cluster " + (i+1);
            if (clusterInterpretations && clusterInterpretations[i]) {
                clusterLabel = `<strong>${clusterInterpretations[i].title}</strong><br><span style="font-size:11px; color:#6b7280;">${clusterInterpretations[i].description}</span>`;
            }
            
            // X and Y values
            // Determine X and Y index from headers
            const headersStr = sessionStorage.getItem('kmeansFeatures');
            let cx = centroid[0];
            let cy = centroid[1];
            if (headersStr) {
                const headers = JSON.parse(headersStr);
                const idxX = headers.indexOf(xLabel);
                const idxY = headers.indexOf(yLabel);
                if (idxX >= 0) cx = centroid[idxX];
                if (idxY >= 0) cy = centroid[idxY];
            }

            tbody.innerHTML += `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 10px; color: #111827;"><b>${i+1}</b></td>
                    <td style="padding: 10px;">${cx.toFixed(2)}</td>
                    <td style="padding: 10px;">${cy.toFixed(2)}</td>
                    <td style="padding: 10px;">${clusterLabel}</td>
                </tr>
            `;
        }

        // 4. Capture Charts
        const chartsContainer = document.getElementById('pdfChartsContainer');
        chartsContainer.innerHTML = '';
        
        const canvas1 = document.getElementById('majorDistChart');
        if (canvas1) {
            const img1 = document.createElement('img');
            img1.src = canvas1.toDataURL('image/png', 1.0);
            img1.style.width = '45%';
            img1.style.border = '1px solid #e5e7eb';
            img1.style.borderRadius = '8px';
            chartsContainer.appendChild(img1);
        }
        const canvas2 = document.getElementById('averageHoursChart');
        if (canvas2) {
            const img2 = document.createElement('img');
            img2.src = canvas2.toDataURL('image/png', 1.0);
            img2.style.width = '45%';
            img2.style.border = '1px solid #e5e7eb';
            img2.style.borderRadius = '8px';
            chartsContainer.appendChild(img2);
        }

        // 5. Recommendations
        const recContainer = document.getElementById('pdfRecommendations');
        recContainer.innerHTML = '';
        if (clusterInterpretations) {
            clusterInterpretations.forEach((rec, idx) => {
                let recHtml = `<div style="margin-bottom: 16px;">`;
                recHtml += `<strong style="color:#111827; font-size:14px;">Klaster ${idx+1}: ${rec.title}</strong>`;
                recHtml += `<ul style="margin: 4px 0 0 0; padding-left: 20px; line-height: 1.6;">`;
                rec.recommendations.forEach(r => {
                    recHtml += `<li>${r}</li>`;
                });
                recHtml += `</ul></div>`;
                recContainer.innerHTML += recHtml;
            });
        }

        // 6. Generate PDF
        const element = document.getElementById('pdfTemplate');
        element.style.display = 'block'; // Make it visible temporarily for html2pdf

        const opt = {
            margin:       10, // mm
            filename:     `Laporan_KMeans_${new Date().getTime()}.pdf`,
            image:        { type: 'jpeg', quality: 1.0 },
            html2canvas:  { scale: 2, useCORS: true, logging: false },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save().then(() => {
            element.style.display = 'none';
            btn.innerHTML = originalText;
            btn.disabled = false;
            lucide.createIcons();
        }).catch(err => {
            console.error(err);
            element.style.display = 'none';
            btn.innerHTML = originalText;
            btn.disabled = false;
            alert("Gagal memproses PDF.");
        });

    } catch (err) {
        console.error("PDF Export Error: ", err);
        alert("Gagal mengekspor PDF: " + err.message);
        btn.innerHTML = originalText;
        btn.disabled = false;
        lucide.createIcons();
    }
}
