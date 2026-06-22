/**
 * K-Means Clustering Algorithm — Manual Implementation (JavaScript Port)
 * ====================================================================
 * Implementasi algoritma K-Means secara manual tanpa library eksternal.
 * Hanya menggunakan Math.sqrt() untuk perhitungan Euclidean Distance.
 *
 * STORAGE STRATEGY (untuk menghindari sessionStorage quota ~5MB):
 *   - kmeansResult   → ringkasan kecil: k, converged_at, final_centroids, final_assignments (int array)
 *   - kmeansSteps    → trace per-iterasi TANPA per-point distances (hanya centroid + cluster_changes count)
 *   - kmeansData     → data asli + cluster property ditambahkan langsung
 */

/**
 * Menghitung Euclidean Distance antara dua titik.
 */
function computeDistance(a, b) {
    let total = 0;
    for (let i = 0; i < a.length; i++) {
        total += (a[i] - b[i]) * (a[i] - b[i]);
    }
    return Math.sqrt(total);
}

/**
 * Assign setiap data ke cluster terdekat.
 * RINGKAS: hanya kembalikan array integer cluster assignment (bukan objek lengkap).
 */
function assignClusters(data, centroids) {
    const n = data.length;
    const k = centroids.length;
    const assignments = new Int32Array(n);

    for (let i = 0; i < n; i++) {
        let minDist = Infinity;
        let nearest = 0;
        for (let j = 0; j < k; j++) {
            const dist = computeDistance(data[i], centroids[j]);
            if (dist < minDist) { minDist = dist; nearest = j; }
        }
        assignments[i] = nearest;
    }
    return assignments;
}

/**
 * Hitung centroid baru berdasarkan mean cluster.
 */
function updateCentroids(data, assignments, k) {
    const dims = data[0].length;
    const sums   = Array.from({ length: k }, () => new Array(dims).fill(0));
    const counts = new Array(k).fill(0);

    for (let i = 0; i < data.length; i++) {
        const c = assignments[i];
        counts[c]++;
        for (let d = 0; d < dims; d++) sums[c][d] += data[i][d];
    }

    return sums.map((s, c) => {
        if (counts[c] === 0) return new Array(dims).fill(0);
        return s.map(v => Math.round((v / counts[c]) * 10000) / 10000);
    });
}

/**
 * Menjalankan K-Means lengkap.
 * Mengembalikan objek RINGKAS yang aman untuk sessionStorage.
 */
function kmeansAlgorithm(data, k, initialCentroids = null, maxIterations = 100) {
    const n = data.length;

    // 1. Inisialisasi centroid
    let centroids;
    if (initialCentroids && initialCentroids.length === k) {
        centroids = initialCentroids.map(c => [...c]);
    } else {
        const indices = new Set();
        while (indices.size < k) indices.add(Math.floor(Math.random() * n));
        centroids = Array.from(indices).map(i => [...data[i]]);
    }

    const initialCentroidsCopy = centroids.map(c => [...c]);
    const steps = [];          // trace ringkas per iterasi
    let prevAssignments = null;
    let convergedAt = maxIterations;

    for (let iter = 1; iter <= maxIterations; iter++) {
        const assignments = assignClusters(data, centroids);
        const newCentroids = updateCentroids(data, assignments, k);

        // Hitung jumlah data point yang berpindah cluster
        let changes = 0;
        if (prevAssignments) {
            for (let i = 0; i < n; i++) {
                if (prevAssignments[i] !== assignments[i]) changes++;
            }
        }

        // Hitung SSE iterasi ini (lebih ringan daripada menyimpan semua jarak)
        let sse = 0;
        for (let i = 0; i < n; i++) {
            const d = computeDistance(data[i], centroids[assignments[i]]);
            sse += d * d;
        }

        // Hitung ukuran tiap cluster
        const clusterSizes = new Array(k).fill(0);
        for (let i = 0; i < n; i++) clusterSizes[assignments[i]]++;

        // Simpan trace RINGKAS (tidak ada per-point distances)
        steps.push({
            iteration: iter,
            centroids_before: centroids.map(c => [...c]),
            centroids_after:  newCentroids.map(c => [...c]),
            assignments: Array.from(assignments),
            changes_count: changes,
            cluster_sizes: clusterSizes,
            sse: Math.round(sse * 100) / 100
        });

        // Cek konvergensi
        let converged = true;
        for (let j = 0; j < k; j++) {
            if (JSON.stringify(centroids[j]) !== JSON.stringify(newCentroids[j])) {
                converged = false; break;
            }
        }

        centroids = newCentroids;
        prevAssignments = assignments;

        if (converged) { convergedAt = iter; break; }
    }

    // Buat hasil final RINGKAS
    const finalAssignments = Array.from(prevAssignments); // Int32Array → normal array

    return {
        k,
        converged_at: convergedAt,
        initial_centroids: initialCentroidsCopy,
        final_centroids: centroids,
        final_assignments: finalAssignments,  // hanya integer per point
        steps: steps                          // trace per iterasi (tanpa per-point dist)
    };
}

/**
 * Menghitung SSE (untuk Elbow Method)
 */
function computeSSE(data, assignments, centroids) {
    let sse = 0;
    for (let i = 0; i < data.length; i++) {
        const dist = computeDistance(data[i], centroids[assignments[i]]);
        sse += dist * dist;
    }
    return Math.round(sse * 100) / 100;
}

/**
 * Elbow Method
 */
function elbowMethod(data, maxK = 10) {
    const results = [];
    const limitK = Math.min(maxK, data.length);
    for (let k = 2; k <= limitK; k++) {
        const result = kmeansAlgorithm(data, k);
        const sse = computeSSE(data, result.final_assignments, result.final_centroids);
        results.push({ k, sse });
    }
    return results;
}

// Export for browser
window.kmeansAlgorithm = kmeansAlgorithm;
window.elbowMethod = elbowMethod;
