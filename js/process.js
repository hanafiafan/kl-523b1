/**
 * Process.js — Run K-Means in browser via JS port
 */

document.addEventListener('DOMContentLoaded', function() {
    loadProcessData();
});

function loadProcessData() {
    const dataStr = sessionStorage.getItem('kmeansData');
    const kValue = sessionStorage.getItem('kmeansK') || '3';
    const resultStr = sessionStorage.getItem('kmeansResult');

    const xLabel = sessionStorage.getItem('kmeansXLabel') || 'Age';
    const yLabel = sessionStorage.getItem('kmeansYLabel') || 'Income';

    const headerX = document.getElementById('headerProcessX');
    const headerY = document.getElementById('headerProcessY');
    if (headerX) headerX.textContent = xLabel;
    if (headerY) headerY.textContent = yLabel;

    if (dataStr) {
        const data = JSON.parse(dataStr);
        document.getElementById('statDataCount').textContent = data.length;
        document.getElementById('statKValue').textContent = kValue;

        const tbody = document.getElementById('processDataBody');
        const emptyState = document.getElementById('processEmptyState');
        
        if (data.length > 0) {
            tbody.parentElement.style.display = '';
            emptyState.style.display = 'none';

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
        } else {
            tbody.parentElement.style.display = 'none';
            emptyState.style.display = 'block';
        }
    } else {
        document.getElementById('processDataBody').parentElement.style.display = 'none';
        document.getElementById('processEmptyState').style.display = 'block';
    }

    if (resultStr) {
        const result = JSON.parse(resultStr);
        document.getElementById('statIterations').textContent = result.converged_at;
        document.getElementById('statStatus').textContent = '✅ Selesai';
        document.getElementById('statStatus').style.color = '#10B981';
    }
}

function runKMeans() {
    const dataStr = sessionStorage.getItem('kmeansData');
    if (!dataStr) {
        showToast('Belum ada data. Masukkan data terlebih dahulu!', 'warning');
        return;
    }

    const dataRaw = JSON.parse(dataStr);
    const k = parseInt(sessionStorage.getItem('kmeansK') || '3');
    const initMethod = sessionStorage.getItem('centroidInit') || 'random';

    // Parse to [age, income] float arrays
    const dataPoints = dataRaw.map(d => [parseFloat(d.age), parseFloat(d.income)]);
    const dataLabels = dataRaw.map(d => ({ id: d.id, nama: d.nama }));

    let initialCentroids = null;
    if (initMethod === 'first') {
        initialCentroids = dataPoints.slice(0, k);
    }

    showLoading('Menjalankan algoritma K-Means...');
    const logDiv = document.getElementById('processLog');
    const logContent = document.getElementById('processLogContent');
    logDiv.style.display = 'block';
    logContent.innerHTML = '';

    addLog(logContent, `[START] K-Means Clustering (Client-Side JS)`);
    addLog(logContent, `Data: ${dataPoints.length} records, K=${k}`);

    setTimeout(() => {
        try {
            const result = window.kmeansAlgorithm(dataPoints, k, initialCentroids);

            addLog(logContent, `[OK] Konvergen di iterasi ${result.converged_at}`);

            // ── 1. Simpan ringkasan kecil ke kmeansResult ──────────────────
            //    Hapus steps dari kmeansResult agar kecil — simpan terpisah
            const resultToStore = {
                k: result.k,
                converged_at: result.converged_at,
                initial_centroids: result.initial_centroids,
                final_centroids: result.final_centroids,
                final_assignments: result.final_assignments
                // 'steps' tidak disimpan di sini — lihat di bawah
            };

            // ── 2. Coba simpan kmeansResult ────────────────────────────────
            const resultJson = JSON.stringify(resultToStore);
            addLog(logContent, `[INFO] kmeansResult size: ${(resultJson.length / 1024).toFixed(1)} KB`);
            sessionStorage.setItem('kmeansResult', resultJson);

            // ── 3. Simpan kmeansSteps (trace iterasi ringkas) ──────────────
            //    Hanya centroid + SSE + change count, BUKAN per-point distances
            try {
                const stepsJson = JSON.stringify(result.steps);
                addLog(logContent, `[INFO] kmeansSteps size: ${(stepsJson.length / 1024).toFixed(1)} KB`);
                sessionStorage.setItem('kmeansSteps', stepsJson);
            } catch (e) {
                addLog(logContent, `[WARN] Steps terlalu besar untuk disimpan, di-skip.`);
                sessionStorage.removeItem('kmeansSteps');
            }

            // ── 4. Tambahkan properti 'cluster' langsung ke kmeansData ─────
            //    Ini yang dipakai result.html, simulator.js, predict.js, dll.
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
    const dataPoints = dataRaw.map(d => [parseFloat(d.age), parseFloat(d.income)]);
    const maxK = Math.min(dataPoints.length, 10);

    showLoading('Menjalankan Elbow Method...');
    const logDiv = document.getElementById('processLog');
    const logContent = document.getElementById('processLogContent');
    logDiv.style.display = 'block';

    addLog(logContent, `[START] Elbow Method (K=2 to K=${maxK})`);

    setTimeout(() => {
        try {
            const elbowRes = window.elbowMethod(dataPoints, maxK);
            sessionStorage.setItem('elbowResult', JSON.stringify(elbowRes));

            elbowRes.forEach(item => {
                addLog(logContent, `K=${item.k} → SSE=${item.sse}`);
            });

            addLog(logContent, `[DONE] Elbow Method complete. Go to Visualization to see the chart.`);
            showToast('Elbow Method selesai! Lihat grafik di halaman Visualisasi', 'success');
            hideLoading();
        } catch(err) {
            hideLoading();
            addLog(logContent, `[ERROR] ${err.message}`);
            showToast('Error: ' + err.message, 'error');
        }
    }, 500);
}

function addLog(container, message) {
    const time = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.style.marginBottom = '4px';
    line.innerHTML = `<span style="color:var(--text-muted)">[${time}]</span> ${message}`;
    container.appendChild(line);
    container.scrollTop = container.scrollHeight;
}
