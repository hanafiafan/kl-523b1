/**
 * dbscan.js
 * Implementation of Density-Based Spatial Clustering of Applications with Noise (DBSCAN)
 */

(function(global) {
    /**
     * Calculates Euclidean distance between two points.
     */
    function distance(p1, p2) {
        let sum = 0;
        for (let i = 0; i < p1.length; i++) {
            sum += Math.pow(p1[i] - p2[i], 2);
        }
        return Math.sqrt(sum);
    }

    /**
     * Finds all points in dataset within eps distance of point P.
     */
    function regionQuery(dataset, pointIdx, eps) {
        const neighbors = [];
        for (let i = 0; i < dataset.length; i++) {
            if (distance(dataset[pointIdx], dataset[i]) <= eps) {
                neighbors.push(i);
            }
        }
        return neighbors;
    }

    /**
     * DBSCAN Algorithm
     * @param {Array<Array<Number>>} dataset - Array of numeric arrays representing points
     * @param {Number} eps - Maximum distance between two samples to be considered in same neighborhood
     * @param {Number} minPts - Number of samples in neighborhood for a point to be considered a core point
     * @returns {Object} - Result containing assignments array and number of clusters k
     */
    function dbscanAlgorithm(dataset, eps, minPts) {
        const NOISE = -1;
        const UNCLASSIFIED = -2;
        
        const assignments = new Array(dataset.length).fill(UNCLASSIFIED);
        let clusterId = 0; // Starts from 0, 1, 2...

        for (let i = 0; i < dataset.length; i++) {
            if (assignments[i] !== UNCLASSIFIED) {
                continue; // Already processed
            }

            const neighbors = regionQuery(dataset, i, eps);

            if (neighbors.length < minPts) {
                assignments[i] = NOISE;
            } else {
                // Found a core point, start a new cluster
                assignments[i] = clusterId;
                
                // Process neighbors (seed set)
                // Use standard array and push for dynamic size
                let j = 0;
                while (j < neighbors.length) {
                    const neighborIdx = neighbors[j];

                    if (assignments[neighborIdx] === NOISE) {
                        // Change Noise to border point
                        assignments[neighborIdx] = clusterId;
                    }

                    if (assignments[neighborIdx] !== UNCLASSIFIED) {
                        j++;
                        continue; // Already processed
                    }

                    // Assign to current cluster
                    assignments[neighborIdx] = clusterId;

                    // Expand neighborhood
                    const newNeighbors = regionQuery(dataset, neighborIdx, eps);
                    if (newNeighbors.length >= minPts) {
                        // Avoid duplicates if necessary, or just push. Pushing is simpler.
                        // But to prevent infinite loop of same points, we check if they are unclassified above.
                        for (let n of newNeighbors) {
                            if (assignments[n] === UNCLASSIFIED || assignments[n] === NOISE) {
                                // Add to end of queue to process
                                neighbors.push(n);
                            }
                        }
                    }
                    j++;
                }
                
                clusterId++;
            }
        }

        return {
            assignments: assignments,
            k: clusterId // number of clusters formed
        };
    }

    // Expose to global scope
    global.dbscanAlgorithm = dbscanAlgorithm;

})(window);
