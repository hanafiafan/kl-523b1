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
            <div class="stat-card" style="border-top: 4px solid ${CLUSTER_COLORS[i]}">
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
    finalCentroids.forEach((c, i) => {
        centroidsBody.innerHTML += `
            <tr>
                <td><span class="cluster-badge cluster-badge-${i}">● ${CLUSTER_NAMES[i]}</span></td>
                <td>${c[0]}</td>
                <td>${c[1]}</td>
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
        const labelObj = clusterLabels[clusterIdx];

        exportDataRows.push({
            id: row.id,
            nama: row.nama,
            age: row.age,
            income: row.income,
            cluster: CLUSTER_NAMES[clusterIdx],
            label: labelObj.title
        });

        if (i < 100) {
            tbody.innerHTML += `
                <tr>
                    <td>${escapeHtml(row.id)}</td>
                    <td>${escapeHtml(row.nama)}</td>
                    <td>${row.age}</td>
                    <td>${row.income}</td>
                    <td><span class="cluster-badge cluster-badge-${clusterIdx}">● ${CLUSTER_NAMES[clusterIdx]}</span></td>
                    <td>${labelObj.title}</td>
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

    // Trigger Silhouette evaluation automatically after results render
    setTimeout(() => runSilhouette(), 200);
}

function generateClusterLabels(centroids) {
    const xLabel = sessionStorage.getItem('kmeansXLabel') || 'Weekly_GenAI_Hours';
    const yLabel = sessionStorage.getItem('kmeansYLabel') || 'Post_Semester_GPA';

    // Special Case: Student AI Impact dataset
    if (xLabel === 'Weekly_GenAI_Hours' && yLabel === 'Post_Semester_GPA') {
        return centroids.map(c => {
            const hours = c[0];
            const gpa = c[1];
            
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
    const allX = centroids.map(c => c[0]);
    const allY = centroids.map(c => c[1]);
    const avgX = allX.reduce((a, b) => a + b, 0) / centroids.length;
    const avgY = allY.reduce((a, b) => a + b, 0) / centroids.length;

    return centroids.map((c) => {
        const xVal = c[0];
        const yVal = c[1];
        
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
    if (!resultStr) {
        showToast('Belum ada hasil untuk disimpan', 'warning');
        return;
    }
    
    showLoading("Menyimpan hasil ke Supabase...");
    try {
        const result = JSON.parse(resultStr);
        await window.saveResultToCloud(1, result.k, result);
        hideLoading();
        showToast("Hasil clustering berhasil disimpan ke cloud!", "success");
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

    // Group indices by cluster
    const clusterIndices = {};
    data.forEach((p, i) => {
        const c = p.cluster;
        if (!clusterIndices[c]) clusterIndices[c] = [];
        clusterIndices[c].push(i);
    });

    const clusterKeys = Object.keys(clusterIndices).map(Number);

    // If only 1 cluster, silhouette is undefined — return 0
    if (clusterKeys.length < 2) return { overall: 0, perCluster: { [clusterKeys[0]]: 0 } };

    // Compute silhouette for each point
    const silhouettePerCluster = {};
    clusterKeys.forEach(c => silhouettePerCluster[c] = []);

    let totalS = 0;

    for (let i = 0; i < n; i++) {
        const pi = data[i];
        const ci = pi.cluster;

        // a(i): mean intra-cluster distance
        const sameCluster = clusterIndices[ci].filter(j => j !== i);
        let a = 0;
        if (sameCluster.length > 0) {
            sameCluster.forEach(j => { a += euclidDist(pi, data[j]); });
            a /= sameCluster.length;
        }

        // b(i): mean distance to nearest OTHER cluster
        let b = Infinity;
        clusterKeys.forEach(ck => {
            if (ck === ci) return;
            let distSum = 0;
            clusterIndices[ck].forEach(j => { distSum += euclidDist(pi, data[j]); });
            const avgDist = distSum / clusterIndices[ck].length;
            if (avgDist < b) b = avgDist;
        });

        // s(i)
        const maxAB = Math.max(a, b);
        const s = maxAB === 0 ? 0 : (b - a) / maxAB;

        silhouettePerCluster[ci].push(s);
        totalS += s;
    }

    // Average per cluster
    const perCluster = {};
    clusterKeys.forEach(c => {
        const arr = silhouettePerCluster[c];
        perCluster[c] = arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    });

    const overall = totalS / n;
    return { overall, perCluster };
}

function euclidDist(a, b) {
    return Math.sqrt(Math.pow(a.age - b.age, 2) + Math.pow(a.income - b.income, 2));
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
        const color = CLUSTER_COLORS[c % CLUSTER_COLORS.length];
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
