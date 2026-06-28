/**
 * Input.js — Dedicated for AI Student Impact Dataset Default with Feature Selection
 */

let tableData = [];
let currentPage = 1;
const rowsPerPage = 10;
let tempCSVData = null; // Store fetched data before apply

document.addEventListener('DOMContentLoaded', function() {
    const stored = sessionStorage.getItem('kmeansData');
    if (stored) {
        try {
            tableData = JSON.parse(stored);
            renderTable();
        } catch(e) {
            console.error("Cache reset");
        }
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

        // Simpan sementara
        tempCSVData = parsed;
        
        // Setup dropdown & checkbox
        const colId = document.getElementById('csvColId');
        const colName = document.getElementById('csvColName');
        const colX = document.getElementById('csvColX');
        const colY = document.getElementById('csvColY');
        
        if(colId) colId.innerHTML = '';
        if(colName) colName.innerHTML = '';
        if(colX) colX.innerHTML = '';
        if(colY) colY.innerHTML = '';
        
        parsed.headers.forEach(header => {
            const optionX = document.createElement('option'); optionX.value = header; optionX.textContent = header;
            const optionY = document.createElement('option'); optionY.value = header; optionY.textContent = header;
            const optionId = document.createElement('option'); optionId.value = header; optionId.textContent = header;
            const optionName = document.createElement('option'); optionName.value = header; optionName.textContent = header;
            
            if(colX) colX.appendChild(optionX);
            if(colY) colY.appendChild(optionY);
            if(colId) colId.appendChild(optionId);
            if(colName) colName.appendChild(optionName);
        });
        
        const featuresContainer = document.getElementById('csvColFeatures');
        if(featuresContainer) {
            featuresContainer.innerHTML = '';
            parsed.headers.forEach(header => {
                const label = document.createElement('label');
                label.style.cssText = 'display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: 0.85rem; color: var(--text-primary); cursor: pointer;';
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = header;
                checkbox.name = 'kmeansFeatureCheck';
                
                const lower = header.toLowerCase();
                // Default checked
                if(lower.includes('hours') || lower.includes('gpa') || lower.includes('score') || lower.includes('level') || lower.includes('diversity') || lower.includes('dependency')) {
                    checkbox.checked = true;
                }
                
                label.appendChild(checkbox);
                label.appendChild(document.createTextNode(header));
                featuresContainer.appendChild(label);
            });
        }
        
        // Select Defaults
        selectOptionByText(colId, 'Student_ID');
        selectOptionByText(colName, 'Major_Category');
        selectOptionByText(colX, 'Weekly_GenAI_Hours');
        selectOptionByText(colY, 'Post_Semester_GPA');
        
        const card = document.getElementById('configCard');
        if(card) {
            card.style.display = 'block';
            card.scrollIntoView({ behavior: 'smooth' });
        }
        
        hideLoading();
        showToast("Pilih variabel X, Y, dan fitur multivariat Anda", "success");

    } catch (err) {
        hideLoading();
        showToast("Gagal memuat dataset: " + err.message, "error");
        console.error(err);
    }
}

function selectOptionByText(selectElem, text) {
    if (!selectElem) return;
    for (let i = 0; i < selectElem.options.length; i++) {
        if (selectElem.options[i].value.toLowerCase() === text.toLowerCase()) {
            selectElem.selectedIndex = i;
            break;
        }
    }
}

function cancelCSVConfig() {
    const card = document.getElementById('configCard');
    if(card) card.style.display = 'none';
    tempCSVData = null;
}

function applyCSVConfig() {
    if (!tempCSVData) return;
    
    const idVal = document.getElementById('csvColId').value;
    const nameVal = document.getElementById('csvColName').value;
    const xValCol = document.getElementById('csvColX').value;
    const yValCol = document.getElementById('csvColY').value;
    
    const idIdx = tempCSVData.headers.indexOf(idVal);
    const nameIdx = tempCSVData.headers.indexOf(nameVal);
    const xIdx = tempCSVData.headers.indexOf(xValCol);
    const yIdx = tempCSVData.headers.indexOf(yValCol);
    
    const checkedFeatures = Array.from(document.querySelectorAll('input[name="kmeansFeatureCheck"]:checked')).map(cb => cb.value);
    
    if (checkedFeatures.length === 0) {
        showToast("Pilih setidaknya satu fitur untuk klasterisasi!", "warning");
        return;
    }
    
    showLoading("Menerapkan konfigurasi...");
    
    setTimeout(() => {
        const data = [];
        const MAX_ROWS = 3000; // Limit for SessionStorage & Performance
        
        for (let i = 0; i < tempCSVData.rows.length; i++) {
            if (data.length >= MAX_ROWS) break;
            
            const row = tempCSVData.rows[i];
            const rawX = row[xIdx];
            const rawY = row[yIdx];
            
            const x = parseFloat(rawX);
            const y = parseFloat(rawY);
            
            if (isNaN(x) || isNaN(y)) continue;
            
            const record = {
                id: row[idIdx],
                nama: row[nameIdx],
                age: x,     // Internal X logic mapped
                income: y   // Internal Y logic mapped
            };

            // Store all columns
            tempCSVData.headers.forEach((header, idx) => {
                const val = row[idx];
                const parsedVal = parseFloat(val);
                record[header] = isNaN(parsedVal) ? val : parsedVal;
            });
            
            data.push(record);
        }

        tableData = data;
        currentPage = 1;
        
        sessionStorage.setItem('kmeansXLabel', xValCol);
        sessionStorage.setItem('kmeansYLabel', yValCol);
        sessionStorage.setItem('kmeansFeatures', JSON.stringify(checkedFeatures));

        saveData();
        renderTable();
        hideLoading();
        
        cancelCSVConfig();
        showToast("Dataset berhasil dikonfigurasi!", "success");
    }, 100);
}

function parseCSVText(text) {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return null;
    
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
    try {
        sessionStorage.setItem('kmeansData', JSON.stringify(tableData));
    } catch(e) {
        console.error(e);
        showToast("Storage penuh, memori tidak cukup untuk menyimpan.", "error");
    }
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
