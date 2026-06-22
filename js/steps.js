/**
 * Steps.js — Render K-Means Iteration Details (Step-by-Step)
 * Membaca dari kmeansSteps (trace ringkas) dan kmeansResult (ringkasan)
 */

document.addEventListener('DOMContentLoaded', function() {
    renderSteps();
});

function renderSteps() {
    const resultStr = sessionStorage.getItem('kmeansResult');
    const stepsStr  = sessionStorage.getItem('kmeansSteps');

    if (!resultStr) return; // Empty state handles it

    const result = JSON.parse(resultStr);
    const steps  = stepsStr ? JSON.parse(stepsStr) : null;

    const xLabel = sessionStorage.getItem('kmeansXLabel') || 'Age';
    const yLabel = sessionStorage.getItem('kmeansYLabel') || 'Income';

    // Show stats
    document.getElementById('stepEmptyState').style.display = 'none';
    document.getElementById('initialCentroidsCard').style.display = 'block';

    document.getElementById('stepTotalIterations').textContent = result.converged_at;
    document.getElementById('stepConvergedAt').textContent = result.converged_at;
    document.getElementById('stepKValue').textContent = result.k;

    // Dynamic headers
    const initX = document.getElementById('initialHeaderX');
    const initY = document.getElementById('initialHeaderY');
    if (initX) initX.textContent = xLabel;
    if (initY) initY.textContent = yLabel;

    // Render Initial Centroids
    const initialBody = document.getElementById('initialCentroidsBody');
    initialBody.innerHTML = '';
    result.initial_centroids.forEach((c, idx) => {
        initialBody.innerHTML += `
            <tr>
                <td><span class="cluster-badge cluster-badge-${idx}">● Centroid ${idx + 1}</span></td>
                <td>${c[0]}</td>
                <td>${c[1]}</td>
            </tr>
        `;
    });

    // Render Accordion
    const accordion = document.getElementById('iterationAccordion');
    accordion.innerHTML = '';

    if (!steps || steps.length === 0) {
        // Fallback — tampilkan hanya ringkasan final tanpa trace detail
        accordion.innerHTML = `
            <div class="iteration-item active">
                <div class="iteration-header" onclick="toggleIteration(this)">
                    <div class="iteration-header-left">
                        <span class="iteration-number">✓</span>
                        <div>
                            <span class="iteration-title">Ringkasan Final</span>
                            <span class="iteration-subtitle"> — Konvergen di iterasi ${result.converged_at}</span>
                        </div>
                    </div>
                    <i data-lucide="chevron-down"></i>
                </div>
                <div class="iteration-body">
                    <div class="iteration-section">
                        <div class="iteration-section-title"><i data-lucide="crosshair" width="16" height="16"></i> Centroid Akhir</div>
                        <table class="data-table">
                            <thead><tr><th>Centroid</th><th>${xLabel}</th><th>${yLabel}</th></tr></thead>
                            <tbody>${result.final_centroids.map((c, i) => `
                                <tr>
                                    <td><span class="cluster-badge cluster-badge-${i}">● C${i+1}</span></td>
                                    <td>${c[0]}</td><td>${c[1]}</td>
                                </tr>`).join('')}
                            </tbody>
                        </table>
                    </div>
                    <div class="iteration-section" style="background:rgba(245,158,11,0.05); border:1px solid rgba(245,158,11,0.2); border-radius:6px; padding:14px;">
                        <i data-lucide="info" width="15" height="15" style="vertical-align:middle; color:#f59e0b;"></i>
                        <span style="font-size:0.85rem; color:var(--text-muted); margin-left:6px;">
                            Detail trace langkah per iterasi tidak tersimpan (data terlalu besar untuk sessionStorage browser). Hanya ringkasan centroid final yang ditampilkan.
                        </span>
                    </div>
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
    }

    steps.forEach((step, index) => {
        const isLast  = (step.iteration === result.converged_at);
        const changes = step.changes_count || 0;

        // Centroid before → after table
        let centroidsHtml = `
            <table class="data-table mb-2">
                <thead><tr><th>Centroid</th><th>${xLabel} Sebelum</th><th>${yLabel} Sebelum</th><th>${xLabel} Baru</th><th>${yLabel} Baru</th><th>Status</th></tr></thead>
                <tbody>
        `;
        step.centroids_before.forEach((cBefore, idx) => {
            const cAfter = step.centroids_after[idx];
            const moved  = (cBefore[0] !== cAfter[0] || cBefore[1] !== cAfter[1]);
            const dx = (cAfter[0] - cBefore[0]).toFixed(3);
            const dy = (cAfter[1] - cBefore[1]).toFixed(3);
            const statusHtml = moved
                ? `<span style="color:var(--accent-primary); font-size:0.8rem;">Bergerak (Δ${dx}, Δ${dy})</span>`
                : `<span style="color:var(--text-muted); font-size:0.8rem;">Tetap (Konvergen)</span>`;
            centroidsHtml += `
                <tr>
                    <td><span class="cluster-badge cluster-badge-${idx}">C${idx+1}</span></td>
                    <td>${cBefore[0]}</td><td>${cBefore[1]}</td>
                    <td style="color:var(--accent-secondary);">${cAfter[0]}</td>
                    <td style="color:var(--accent-secondary);">${cAfter[1]}</td>
                    <td>${statusHtml}</td>
                </tr>
            `;
        });
        centroidsHtml += `</tbody></table>`;

        // Cluster sizes table
        let sizesHtml = `
            <table class="data-table">
                <thead><tr><th>Cluster</th><th>Jumlah Data</th><th>Proporsi</th></tr></thead>
                <tbody>
        `;
        const totalPoints = step.cluster_sizes.reduce((a, b) => a + b, 0);
        step.cluster_sizes.forEach((sz, idx) => {
            const pct = totalPoints > 0 ? ((sz / totalPoints) * 100).toFixed(1) : 0;
            sizesHtml += `
                <tr>
                    <td><span class="cluster-badge cluster-badge-${idx}">● C${idx+1}</span></td>
                    <td style="font-family:var(--font-mono);">${sz.toLocaleString()}</td>
                    <td>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <div style="flex:1; height:6px; background:rgba(255,255,255,0.08); border-radius:99px;">
                                <div style="width:${pct}%; height:100%; background:${CLUSTER_COLORS[idx % CLUSTER_COLORS.length]}; border-radius:99px;"></div>
                            </div>
                            <span style="font-family:var(--font-mono); font-size:0.8rem;">${pct}%</span>
                        </div>
                    </td>
                </tr>
            `;
        });
        sizesHtml += `</tbody></table>`;

        // Changes summary
        let changesHtml = '';
        if (step.iteration === 1) {
            changesHtml = `<div class="text-muted" style="font-size:0.85rem; font-family:var(--font-mono)">Iterasi pertama — semua data mendapatkan cluster awal.</div>`;
        } else if (changes === 0) {
            changesHtml = `<div style="color:var(--accent-primary); font-size:0.85rem; font-family:var(--font-mono)">✓ Tidak ada data yang berpindah cluster. Algoritma konvergen.</div>`;
        } else {
            changesHtml = `<div style="font-family:var(--font-mono); font-size:0.88rem; color:var(--text-secondary);">
                <span style="color:#f59e0b; font-size:1.3rem; font-weight:700;">${changes.toLocaleString()}</span>
                data berpindah cluster pada iterasi ini dari total
                <span style="color:var(--text-primary); font-weight:600;">${totalPoints.toLocaleString()}</span> data.
                <div style="margin-top:6px; color:var(--text-muted); font-size:0.8rem;">(Detail perpindahan per data tidak disimpan untuk menjaga performa browser dengan dataset besar)</div>
            </div>`;
        }

        accordion.innerHTML += `
            <div class="iteration-item ${index === 0 ? 'active' : ''}">
                <div class="iteration-header" onclick="toggleIteration(this)">
                    <div class="iteration-header-left">
                        <span class="iteration-number">#${step.iteration}</span>
                        <div>
                            <span class="iteration-title">Iterasi ${step.iteration}</span>
                            <span class="iteration-subtitle"> — ${changes} perpindahan • SSE: ${step.sse?.toLocaleString() ?? '—'}</span>
                        </div>
                    </div>
                    <i data-lucide="chevron-down"></i>
                </div>
                <div class="iteration-body">
                    <div class="iteration-section">
                        <div class="iteration-section-title"><i data-lucide="crosshair" width="16" height="16"></i> 1. Pergerakan Centroid</div>
                        <div class="data-table-wrapper">${centroidsHtml}</div>
                    </div>
                    <div class="iteration-section">
                        <div class="iteration-section-title"><i data-lucide="layers" width="16" height="16"></i> 2. Ukuran Cluster</div>
                        ${sizesHtml}
                    </div>
                    <div class="iteration-section">
                        <div class="iteration-section-title"><i data-lucide="shuffle" width="16" height="16"></i> 3. Perpindahan Data</div>
                        <div style="background:var(--bg-main); border:1px solid var(--border-color); padding:16px; border-radius:var(--radius-sm);">
                            ${changesHtml}
                        </div>
                    </div>
                    ${step.sse !== undefined ? `
                    <div class="iteration-section">
                        <div class="iteration-section-title"><i data-lucide="activity" width="16" height="16"></i> 4. SSE (Sum of Squared Errors)</div>
                        <div style="font-family:var(--font-mono); font-size:1.8rem; font-weight:700; color:var(--accent-primary);">${step.sse?.toLocaleString()}</div>
                        <div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">Semakin kecil SSE, semakin kompak cluster yang terbentuk.</div>
                    </div>` : ''}
                </div>
            </div>
        `;
    });

    if (window.lucide) lucide.createIcons();
}

window.toggleIteration = function(element) {
    const item = element.parentElement;
    item.classList.toggle('active');
    const icon = element.querySelector('[data-lucide="chevron-down"]');
    if (icon) {
        icon.style.transform = item.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0deg)';
    }
};
