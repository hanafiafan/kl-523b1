/**
 * Input.js — Dedicated for AI Student Impact Dataset Default
 */

let tableData = [];
let currentPage = 1;
const rowsPerPage = 10;

document.addEventListener('DOMContentLoaded', function() {
    const stored = sessionStorage.getItem('kmeansData');
    if (stored) {
        tableData = JSON.parse(stored);
        renderTable();
    }

    const storedK = sessionStorage.getItem('kmeansK');
    if (storedK) {
        const slider = document.getElementById('kSlider');
        const display = document.getElementById('kValueDisplay');
        if (slider) slider.value = storedK;
        if (display) display.textContent = storedK;
    }

    updateEmptyState();
});

async function loadStudentImpactDataset() {
    showLoading("Menginisialisasi AI Student Impact Dataset...");
    try {
        const response = await fetch('ai_student_impact_dataset.csv');
        if (!response.ok) throw new Error("Gagal mengambil file dataset.");
        const text = await response.text();
        
        const parsed = parseCSVText(text);
        if (!parsed || parsed.headers.length === 0) {
            throw new Error("File CSV kosong atau tidak valid");
        }

        const headersLower = parsed.headers.map(h => h.trim().toLowerCase());
        
        // Find specific columns based on AI Student Impact Dataset schema
        const idIdx = headersLower.findIndex(h => h === 'student_id');
        const nameIdx = headersLower.findIndex(h => h === 'major_category');
        const xIdx = headersLower.findIndex(h => h === 'weekly_genai_hours');
        const yIdx = headersLower.findIndex(h => h === 'post_semester_gpa');
        
        if (idIdx === -1 || nameIdx === -1 || xIdx === -1 || yIdx === -1) {
             throw new Error("Schema CSV tidak sesuai dengan AI Student Impact Dataset.");
        }

        const data = [];
        const MAX_ROWS = 3000; // Limit for SessionStorage & Performance
        for (let i = 0; i < parsed.rows.length; i++) {
            if (data.length >= MAX_ROWS) break;
            
            const row = parsed.rows[i];
            
            const rawX = row[xIdx];
            const rawY = row[yIdx];
            
            const x = parseFloat(rawX);
            const y = parseFloat(rawY);
            
            if (isNaN(x) || isNaN(y)) continue;
            
            const record = {
                id: row[idIdx],
                nama: row[nameIdx],
                age: x,     // Internal X logic
                income: y   // Internal Y logic
            };

            // Store all other columns for multivariate
            parsed.headers.forEach((header, idx) => {
                const val = row[idx];
                const parsedVal = parseFloat(val);
                record[header] = isNaN(parsedVal) ? val : parsedVal;
            });
            
            data.push(record);
        }

        tableData = data;
        currentPage = 1;
        
        // Set hardcoded configuration
        sessionStorage.setItem('kmeansXLabel', 'Weekly_GenAI_Hours');
        sessionStorage.setItem('kmeansYLabel', 'Post_Semester_GPA');
        
        // Hardcoded multivariate features relevant for impact
        const features = [
            'Pre_Semester_GPA',
            'Weekly_GenAI_Hours',
            'Tool_Diversity',
            'Traditional_Study_Hours',
            'Perceived_AI_Dependency',
            'Post_Semester_GPA',
            'Skill_Retention_Score'
        ];
        sessionStorage.setItem('kmeansFeatures', JSON.stringify(features));

        saveData();
        renderTable();
        hideLoading();
        showToast("Dataset berhasil diinisialisasi!", "success");

    } catch (err) {
        hideLoading();
        showToast("Gagal memuat dataset: " + err.message, "error");
        console.error(err);
    }
}

function parseCSVText(text) {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return null;
    
    // Check delimiter (comma or semicolon)
    const delimiter = lines[0].includes(';') ? ';' : ',';
    
    const headers = lines[0].split(delimiter).map(h => h.replace(/^["']|["']$/g, '').trim());
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const cols = [];
        let curr = '';
        let inQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === delimiter && !inQuotes) {
                cols.push(curr.trim());
                curr = '';
            } else {
                curr += char;
            }
        }
        cols.push(curr.trim());
        if (cols.length === headers.length) {
            rows.push(cols);
        }
    }
    
    return { headers, rows };
}

function renderTable() {
    const tbody = document.getElementById('dataTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const paginationDiv = document.getElementById('tablePagination');
    const isLarge = tableData.length > rowsPerPage;

    const xLabel = sessionStorage.getItem('kmeansXLabel') || 'Weekly_GenAI_Hours';
    const yLabel = sessionStorage.getItem('kmeansYLabel') || 'Post_Semester_GPA';
    
    const headerX = document.getElementById('headerColX');
    const headerY = document.getElementById('headerColY');
    if (headerX) headerX.textContent = xLabel;
    if (headerY) headerY.textContent = yLabel;

    let startIdx = 0;
    let endIdx = tableData.length;

    if (isLarge) {
        if (paginationDiv) paginationDiv.style.display = 'flex';
        const totalPages = Math.ceil(tableData.length / rowsPerPage);
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;
        startIdx = (currentPage - 1) * rowsPerPage;
        endIdx = Math.min(startIdx + rowsPerPage, tableData.length);
        
        const info = document.getElementById('paginationInfo');
        if (info) info.textContent = `Menampilkan ${startIdx + 1}-${endIdx} dari ${tableData.length} data`;
    } else {
        if (paginationDiv) paginationDiv.style.display = 'none';
    }

    for (let i = startIdx; i < endIdx; i++) {
        const row = tableData[i];
        const tr = document.createElement('tr');
        tr.style.animationDelay = ((i - startIdx) * 0.03) + 's';
        tr.innerHTML = `
            <td style="color: var(--text-muted)">${i + 1}</td>
            <td>${escapeHtml(String(row.id))}</td>
            <td>${escapeHtml(String(row.nama))}</td>
            <td>${row.age}</td>
            <td>${row.income}</td>
            <td style="text-align: center;"><i data-lucide="check" width="16" height="16" style="color: var(--accent-success)"></i></td>
        `;
        tbody.appendChild(tr);
    }

    updateEmptyState();
    if(window.lucide) lucide.createIcons();
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderTable();
    }
}

function nextPage() {
    const totalPages = Math.ceil(tableData.length / rowsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderTable();
    }
}

function updateEmptyState() {
    const tableWrap = document.querySelector('.data-table-wrapper');
    const emptyState = document.getElementById('emptyState');
    const label = document.getElementById('rowCountLabel');
    
    if (label) {
        label.textContent = `${tableData.length} baris data`;
    }
    
    if (tableData.length === 0) {
        if (tableWrap) tableWrap.style.display = 'none';
        if (emptyState) emptyState.style.display = 'flex';
    } else {
        if (tableWrap) tableWrap.style.display = 'block';
        if (emptyState) emptyState.style.display = 'none';
    }
    updateDataBadge();
}

function saveData() {
    sessionStorage.setItem('kmeansData', JSON.stringify(tableData));
    updateEmptyState();
}

function updateDataBadge() {
    const badge = document.getElementById('dataCountBadge');
    if (!badge) return;
    if (tableData.length > 0) {
        badge.textContent = tableData.length;
        badge.style.display = 'inline';
    } else {
        badge.style.display = 'none';
    }
}

function updateKValue(val) {
    const display = document.getElementById('kValueDisplay');
    if (display) display.textContent = val;
    sessionStorage.setItem('kmeansK', val);
}

function goToProcess() {
    if (tableData.length === 0) {
        showToast('Inisialisasi dataset terlebih dahulu!', 'warning');
        return;
    }
    const k = parseInt(document.getElementById('kSlider').value);
    sessionStorage.setItem('kmeansK', k);
    sessionStorage.setItem('centroidInit', document.getElementById('centroidInit').value);
    window.location.href = 'process.html';
}

async function saveToCloud() {
    if (!window.isSupabaseConfigured) {
        showToast("Supabase belum dikonfigurasi di supabase-config.js", "warning");
        return;
    }
    if (tableData.length === 0) {
        showToast("Tidak ada data untuk disimpan", "warning");
        return;
    }
    showLoading("Menyimpan ke Supabase...");
    try {
        await window.saveDatasetToCloud(tableData);
        hideLoading();
        showToast("Dataset berhasil disimpan ke cloud!", "success");
    } catch (err) {
        hideLoading();
        showToast("Error: " + err.message, "error");
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
