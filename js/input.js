/**
 * Input.js — Dynamic table, CSV upload (client-side), data preview
 */

let tableData = [];
let currentPage = 1;
const rowsPerPage = 10;
let tempCSVData = null;

document.addEventListener('DOMContentLoaded', function() {
    const stored = sessionStorage.getItem('kmeansData');
    if (stored) {
        tableData = JSON.parse(stored);
        renderTable();
    }

    const uploadZone = document.getElementById('uploadZone');
    if (uploadZone) {
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('drag-over');
        });
        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('drag-over');
        });
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file && file.name.endsWith('.csv')) {
                uploadCSVFile(file);
            } else {
                showToast('Harap upload file CSV (.csv)', 'warning');
            }
        });
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

function loadSampleData() {
    // Reset custom labels to defaults for new dataset
    sessionStorage.setItem('kmeansXLabel', 'Weekly_GenAI_Hours');
    sessionStorage.setItem('kmeansYLabel', 'Post_Semester_GPA');
    
    const sample = [
        {"id": "100001", "nama": "Humanities", "age": 23.31, "income": 2.393},
        {"id": "100002", "nama": "Medical", "age": 1.12, "income": 3.696},
        {"id": "100003", "nama": "Business", "age": 21.26, "income": 3.499},
        {"id": "100004", "nama": "Business", "age": 1.82, "income": 4.0},
        {"id": "100005", "nama": "STEM", "age": 9.29, "income": 3.798},
        {"id": "100006", "nama": "STEM", "age": 6.5, "income": 3.666},
        {"id": "100007", "nama": "STEM", "age": 31.41, "income": 4.0},
        {"id": "100008", "nama": "Arts", "age": 5.33, "income": 2.965},
        {"id": "100009", "nama": "Business", "age": 2.0, "income": 3.396},
        {"id": "100010", "nama": "Business", "age": 19.99, "income": 2.978}
    ];
    tableData = sample;
    currentPage = 1;
    saveData();
    renderTable();
    showToast('Sample data mahasiswa berhasil dimuat (10 data)', 'success');
}

function addRow() {
    const newId = tableData.length + 1;
    tableData.push({ id: String(newId), nama: '', age: '', income: '' });
    saveData();
    renderTable();
    
    // Jump to the last page if added
    const totalPages = Math.ceil(tableData.length / rowsPerPage);
    currentPage = totalPages;
    renderTable();
}

function removeRow(index) {
    tableData.splice(index, 1);
    saveData();
    renderTable();
}

function clearAllData() {
    tableData = [];
    currentPage = 1;
    sessionStorage.removeItem('kmeansData');
    sessionStorage.removeItem('kmeansResult');
    sessionStorage.removeItem('elbowResult');
    sessionStorage.removeItem('kmeansXLabel');
    sessionStorage.removeItem('kmeansYLabel');
    renderTable();
    updateDataBadge();
    showToast('Semua data telah dihapus', 'success');
}

function renderTable() {
    const tbody = document.getElementById('dataTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const paginationDiv = document.getElementById('tablePagination');
    const isLarge = tableData.length > rowsPerPage;

    // Update column headers based on sessionStorage values
    const xLabel = sessionStorage.getItem('kmeansXLabel') || 'Weekly_GenAI_Hours';
    const yLabel = sessionStorage.getItem('kmeansYLabel') || 'Post_Semester_GPA';
    document.getElementById('headerColX').textContent = xLabel;
    document.getElementById('headerColY').textContent = yLabel;

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
        if (info) info.textContent = `Menampilkan ${startIdx + 1}-${endIdx} dari ${tableData.length} data (Halaman ${currentPage}/${totalPages})`;
    } else {
        if (paginationDiv) paginationDiv.style.display = 'none';
    }

    for (let i = startIdx; i < endIdx; i++) {
        const row = tableData[i];
        const tr = document.createElement('tr');
        tr.style.animationDelay = ((i - startIdx) * 0.03) + 's';
        tr.innerHTML = `
            <td style="color: var(--text-muted)">${i + 1}</td>
            <td><input type="text" value="${escapeHtml(row.id)}" onchange="updateCell(${i}, 'id', this.value)" class="form-input-sm"></td>
            <td><input type="text" value="${escapeHtml(row.nama)}" onchange="updateCell(${i}, 'nama', this.value)" class="form-input-sm"></td>
            <td><input type="number" step="any" value="${row.age}" onchange="updateCell(${i}, 'age', this.value)" class="form-input-sm"></td>
            <td><input type="number" step="any" value="${row.income}" onchange="updateCell(${i}, 'income', this.value)" class="form-input-sm"></td>
            <td><button class="btn btn-ghost btn-icon" onclick="removeRow(${i})"><i data-lucide="x" width="16" height="16"></i></button></td>
        `;
        tbody.appendChild(tr);
    }

    if(window.lucide) lucide.createIcons();
    updateEmptyState();
    updateRowCount();
    updateDataBadge();
    updatePreview();
}

function nextPage() {
    const totalPages = Math.ceil(tableData.length / rowsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderTable();
    }
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderTable();
    }
}

function updateCell(rowIndex, field, value) {
    if (tableData[rowIndex]) {
        tableData[rowIndex][field] = value;
        saveData();
    }
}

function saveData() {
    sessionStorage.setItem('kmeansData', JSON.stringify(tableData));
}

function updateEmptyState() {
    const empty = document.getElementById('emptyState');
    const tableWrapper = document.querySelector('.data-table-wrapper');
    if (!empty) return;

    if (tableData.length === 0) {
        empty.style.display = 'block';
        if (tableWrapper) tableWrapper.style.display = 'none';
    } else {
        empty.style.display = 'none';
        if (tableWrapper) tableWrapper.style.display = 'block';
    }
}

function updateRowCount() {
    const label = document.getElementById('rowCountLabel');
    if (label) label.textContent = `${tableData.length} baris data`;
}

function updatePreview() {
    const card = document.getElementById('previewCard');
    const tbody = document.getElementById('previewTableBody');
    if (!card || !tbody) return;

    if (tableData.length === 0) {
        card.style.display = 'none';
        return;
    }

    card.style.display = 'block';
    tbody.innerHTML = '';

    // Show only first 5 preview items for layout
    const xLabel = sessionStorage.getItem('kmeansXLabel') || 'Weekly_GenAI_Hours';
    const yLabel = sessionStorage.getItem('kmeansYLabel') || 'Post_Semester_GPA';
    
    const previewHeader = card.querySelector('thead tr');
    if (previewHeader) {
        previewHeader.innerHTML = `
            <th>ID</th>
            <th>Nama</th>
            <th>${xLabel}</th>
            <th>${yLabel}</th>
        `;
    }

    const itemsToPreview = tableData.slice(0, 10);
    itemsToPreview.forEach(row => {
        tbody.innerHTML += `
            <tr>
                <td>${escapeHtml(row.id)}</td>
                <td>${escapeHtml(row.nama)}</td>
                <td>${row.age}</td>
                <td>${row.income}</td>
            </tr>
        `;
    });
    
    if (tableData.length > 10) {
        tbody.innerHTML += `
            <tr>
                <td colspan="4" style="text-align: center; color: var(--text-muted); font-size: 0.85rem;">
                    ... Dan ${tableData.length - 10} data lainnya ...
                </td>
            </tr>
        `;
    }
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    uploadCSVFile(file);
}

function parseCSVText(text) {
    const lines = text.split(/\r?\n/);
    if (lines.length === 0 || !lines[0].trim()) return null;
    
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = [];
        let inQuotes = false;
        let currentValue = '';
        
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"' || char === "'") {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(currentValue.trim());
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        values.push(currentValue.trim());
        
        if (values.length >= headers.length) {
            rows.push(values.slice(0, headers.length));
        }
    }
    
    return { headers, rows };
}

function uploadCSVFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const parsed = parseCSVText(text);
        if (!parsed || parsed.headers.length === 0) {
            showToast("File CSV kosong atau tidak valid", "error");
            return;
        }
        
        // Check if standard headers (id, nama, age, income) exist directly and only 4 columns
        const headersLower = parsed.headers.map(h => h.trim().toLowerCase());
        const hasId = headersLower.includes('id') || headersLower.includes('student_id');
        const hasName = headersLower.some(h => h === 'nama' || h === 'name' || h === 'major_category');
        const hasAge = headersLower.some(h => h === 'age' || h === 'umur' || h === 'weekly_genai_hours');
        const hasIncome = headersLower.some(h => h === 'income' || h === 'pendapatan' || h === 'post_semester_gpa');
        
        if (hasId && hasName && hasAge && hasIncome && parsed.headers.length === 4) {
            // Standard dataset! Import directly
            const idIdx = headersLower.findIndex(h => h === 'id' || h === 'student_id');
            const nameIdx = headersLower.findIndex(h => h === 'nama' || h === 'name' || h === 'major_category');
            const ageIdx = headersLower.findIndex(h => h === 'age' || h === 'umur' || h === 'weekly_genai_hours');
            const incIdx = headersLower.findIndex(h => h === 'income' || h === 'pendapatan' || h === 'post_semester_gpa');
            
            const data = [];
            for (let i = 0; i < parsed.rows.length; i++) {
                const vals = parsed.rows[i];
                data.push({
                    id: vals[idIdx],
                    nama: vals[nameIdx],
                    age: parseFloat(vals[ageIdx]) || 0,
                    income: parseFloat(vals[incIdx]) || 0
                });
            }
            
            tableData = data;
            currentPage = 1;
            sessionStorage.removeItem('kmeansXLabel');
            sessionStorage.removeItem('kmeansYLabel');
            saveData();
            renderTable();
            showToast(`Berhasil memuat ${data.length} data dari CSV`, 'success');
        } else {
            // Custom dataset! Show config card
            showColumnConfig(parsed.headers, parsed.rows);
        }
    };
    reader.readAsText(file);
}

async function loadStudentImpactDataset() {
    showLoading("Membaca file ai_student_impact_dataset.csv...");
    try {
        const response = await fetch('ai_student_impact_dataset.csv');
        if (!response.ok) throw new Error("Gagal mengambil file dataset.");
        const text = await response.text();
        hideLoading();
        
        const parsed = parseCSVText(text);
        if (!parsed || parsed.headers.length === 0) {
            showToast("File CSV kosong atau tidak valid", "error");
            return;
        }

        showColumnConfig(parsed.headers, parsed.rows);
        
        // Auto-select defaults for AI Student Impact dataset
        const colId = document.getElementById('csvColId');
        const colName = document.getElementById('csvColName');
        const colX = document.getElementById('csvColX');
        const colY = document.getElementById('csvColY');
        
        selectOptionByText(colId, 'Student_ID');
        selectOptionByText(colName, 'Major_Category');
        selectOptionByText(colX, 'Weekly_GenAI_Hours');
        selectOptionByText(colY, 'Post_Semester_GPA');
        
        showToast("Dataset dibaca! Silakan sesuaikan kolom dan klik 'Terapkan'.", "success");
    } catch (err) {
        hideLoading();
        showToast("Gagal memuat otomatis (CORS/File tidak ditemukan). Silakan drag & drop file ai_student_impact_dataset.csv ke area upload di bawah.", "warning");
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

function showColumnConfig(headers, rows) {
    tempCSVData = { headers, rows };
    
    const colId = document.getElementById('csvColId');
    const colName = document.getElementById('csvColName');
    const colX = document.getElementById('csvColX');
    const colY = document.getElementById('csvColY');
    
    [colId, colName, colX, colY].forEach(select => {
        if (!select) return;
        select.innerHTML = '';
        headers.forEach((header) => {
            const option = document.createElement('option');
            option.value = header;
            option.textContent = header;
            select.appendChild(option);
        });
    });
    
    // Guess defaults based on headers
    const idIdx = headers.findIndex(h => h.toLowerCase().includes('id'));
    if (idIdx >= 0) colId.selectedIndex = idIdx;
    
    const nameIdx = headers.findIndex(h => h.toLowerCase().includes('name') || h.toLowerCase().includes('nama') || h.toLowerCase().includes('major'));
    if (nameIdx >= 0) colName.selectedIndex = nameIdx;
    
    const numericCandidates = [];
    headers.forEach((h, idx) => {
        const lower = h.toLowerCase();
        if (lower.includes('gpa') || lower.includes('hours') || lower.includes('age') || lower.includes('income') || lower.includes('score') || lower.includes('level') || lower.includes('dependency') || lower.includes('diversity') || lower.includes('anxiety') || lower.includes('study')) {
            numericCandidates.push(idx);
        }
    });
    
    if (numericCandidates.length >= 2) {
        colX.selectedIndex = numericCandidates[0];
        colY.selectedIndex = numericCandidates[1];
    } else {
        if (headers.length > 2) colX.selectedIndex = 2;
        if (headers.length > 3) colY.selectedIndex = 3;
    }

    // Populate features container with checkboxes
    const featuresContainer = document.getElementById('csvFeaturesContainer');
    if (featuresContainer) {
        featuresContainer.innerHTML = '';
        headers.forEach((header) => {
            const label = document.createElement('label');
            label.style.cssText = 'display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: 0.85rem; color: var(--text-primary); cursor: pointer;';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = header;
            checkbox.name = 'kmeansFeatureCheck';
            
            // Check by default if it looks numeric
            const lower = header.toLowerCase();
            if (lower.includes('gpa') || lower.includes('hours') || lower.includes('age') || lower.includes('income') || lower.includes('score') || lower.includes('level') || lower.includes('dependency') || lower.includes('diversity') || lower.includes('anxiety') || lower.includes('study') || lower.includes('retention')) {
                // Ignore columns that are clearly strings
                if (!lower.includes('level') && !lower.includes('policy') && !lower.includes('subscription') && !lower.includes('case') && !lower.includes('category') && !lower.includes('study_of') && !lower.includes('year_of')) {
                    checkbox.checked = true;
                }
            }
            
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(header));
            featuresContainer.appendChild(label);
        });
    }
    
    const card = document.getElementById('columnConfigCard');
    if (card) {
        card.style.display = 'block';
        card.scrollIntoView({ behavior: 'smooth' });
    }
}

function applyCSVColumnConfig() {
    if (!tempCSVData) return;
    
    const idVal = document.getElementById('csvColId').value;
    const nameVal = document.getElementById('csvColName').value;
    const xValCol = document.getElementById('csvColX').value;
    const yValCol = document.getElementById('csvColY').value;
    const limitVal = parseInt(document.getElementById('csvRowLimit').value);
    
    const idIdx = tempCSVData.headers.indexOf(idVal);
    const nameIdx = tempCSVData.headers.indexOf(nameVal);
    const xIdx = tempCSVData.headers.indexOf(xValCol);
    const yIdx = tempCSVData.headers.indexOf(yValCol);

    const checkedFeatures = Array.from(document.querySelectorAll('input[name="kmeansFeatureCheck"]:checked')).map(cb => cb.value);
    if (checkedFeatures.length === 0) {
        showToast("Pilih setidaknya satu fitur untuk klasterisasi!", "warning");
        return;
    }
    
    showLoading("Mengimpor data...");
    
    setTimeout(() => {
        const data = [];
        let skippedRows = 0;
        
        for (let i = 0; i < tempCSVData.rows.length; i++) {
            if (data.length >= limitVal) break;
            
            const row = tempCSVData.rows[i];
            const rawX = row[xIdx];
            const rawY = row[yIdx];
            
            const x = parseFloat(rawX);
            const y = parseFloat(rawY);
            
            if (isNaN(x) || isNaN(y)) {
                skippedRows++;
                continue;
            }
            
            const record = {
                id: row[idIdx] || String(i + 1),
                nama: row[nameIdx] || `Data ${i + 1}`,
                age: x,
                income: y
            };

            // Store all columns in the object
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
        
        document.getElementById('columnConfigCard').style.display = 'none';
        
        let msg = `Berhasil mengimpor ${data.length} baris data.`;
        if (skippedRows > 0) {
            msg += ` (${skippedRows} baris dilewati karena bukan angka).`;
        }
        showToast(msg, 'success');
        
        document.getElementById('csvFileInput').value = '';
    }, 100);
}

function cancelCSVConfig() {
    document.getElementById('columnConfigCard').style.display = 'none';
    document.getElementById('csvFileInput').value = '';
    tempCSVData = null;
}

function updateKValue(val) {
    const display = document.getElementById('kValueDisplay');
    if (display) display.textContent = val;
    sessionStorage.setItem('kmeansK', val);
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

function goToProcess() {
    if (tableData.length === 0) {
        showToast('Masukkan data terlebih dahulu!', 'warning');
        return;
    }
    for (let i = 0; i < tableData.length; i++) {
        const row = tableData[i];
        if (row.age === '' || row.income === '' || isNaN(row.age) || isNaN(row.income)) {
            const xLabel = sessionStorage.getItem('kmeansXLabel') || 'Age';
            const yLabel = sessionStorage.getItem('kmeansYLabel') || 'Income';
            showToast(`Baris ${i + 1}: ${xLabel} dan ${yLabel} harus berupa angka`, 'warning');
            return;
        }
    }
    const k = parseInt(document.getElementById('kSlider').value);
    if (tableData.length < k) {
        showToast(`Jumlah data (${tableData.length}) harus lebih besar dari K (${k})`, 'warning');
        return;
    }

    sessionStorage.setItem('kmeansK', k);
    sessionStorage.setItem('centroidInit', document.getElementById('centroidInit').value);
    window.location.href = 'process.html';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
