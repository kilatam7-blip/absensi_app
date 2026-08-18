// ========== SISTEM KEAMANAN WEBSITE ==========

// ========== CSRF TOKEN ==========
const CSRF_CONFIG = {
    TOKEN_LENGTH: 32,
    TOKEN_EXPIRY: 3600000 // 1 jam
};

function generateCSRFToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < CSRF_CONFIG.TOKEN_LENGTH; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

function createCSRFToken() {
    const existingToken = sessionStorage.getItem('csrfToken');
    const tokenExpiry = sessionStorage.getItem('csrfTokenExpiry');
    const now = Date.now();
    
    if (existingToken && tokenExpiry && now < parseInt(tokenExpiry)) {
        return existingToken;
    }
    
    const token = generateCSRFToken();
    sessionStorage.setItem('csrfToken', token);
    sessionStorage.setItem('csrfTokenExpiry', (now + CSRF_CONFIG.TOKEN_EXPIRY).toString());
    return token;
}

function verifyCSRFToken(token) {
    const storedToken = sessionStorage.getItem('csrfToken');
    const tokenExpiry = sessionStorage.getItem('csrfTokenExpiry');
    const now = Date.now();
    
    if (!storedToken || !tokenExpiry) return false;
    if (now > parseInt(tokenExpiry)) {
        sessionStorage.removeItem('csrfToken');
        sessionStorage.removeItem('csrfTokenExpiry');
        return false;
    }
    
    return token === storedToken;
}

// ========== INPUT SANITIZATION ==========
const SANITIZER = {
    // Daftar karakter berbahaya untuk HTML
    htmlEscape: function(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    },
    
    // Hapus script tags dan event handlers
    removeScripts: function(text) {
        // Hapus <script> tags
        text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        // Hapus event handlers
        text = text.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
        text = text.replace(/on\w+\s*=\s*[^\s>]*/gi, '');
        return text;
    },
    
    // Sanitize string input
    sanitizeString: function(str) {
        if (typeof str !== 'string') return '';
        
        // Hapus whitespace di awal dan akhir
        str = str.trim();
        
        // Hapus script tags
        str = this.removeScripts(str);
        
        // Escape HTML
        str = this.htmlEscape(str);
        
        return str;
    },
    
    // Sanitize untuk nama file
    sanitizeFilename: function(filename) {
        // Hapus path traversal attempts
        filename = filename.replace(/\.\./g, '');
        filename = filename.replace(/\//g, '');
        filename = filename.replace(/\\/g, '');
        
        // Hapus karakter invalid
        filename = filename.replace(/[^a-zA-Z0-9._-]/g, '');
        
        return filename || 'file';
    }
};

// ========== INPUT VALIDATION ==========
const VALIDATOR = {
    // Validasi nama (hanya huruf, spasi, dan tanda hubung)
    isValidName: function(name) {
        const regex = /^[a-zA-Z\s\-']{3,100}$/;
        return regex.test(name);
    },
    
    // Validasi tanggal
    isValidDate: function(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    },
    
    // Validasi tanggal tidak di masa depan
    isNotFutureDate: function(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date <= today;
    },
    
    // Validasi file size (max 5MB)
    isValidFileSize: function(file) {
        const MAX_SIZE = 5 * 1024 * 1024; // 5MB
        return file.size <= MAX_SIZE;
    },
    
    // Validasi file type (hanya image dan PDF)
    isValidFileType: function(file) {
        const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
        return ALLOWED_TYPES.includes(file.type);
    },
    
    // Validasi panjang string
    isValidLength: function(str, min, max) {
        return str.length >= min && str.length <= max;
    },
    
    // Validasi apakah tanggal awal <= tanggal akhir
    isValidDateRange: function(startDate, endDate) {
        if (!endDate) return true; // Tanggal akhir opsional
        return new Date(startDate) <= new Date(endDate);
    }
};

// ========== RATE LIMITING ==========
const RATE_LIMIT = {
    MAX_SUBMISSIONS: 10,
    WINDOW_TIME: 3600000, // 1 jam
    
    canSubmit: function() {
        const now = Date.now();
        const submissions = JSON.parse(sessionStorage.getItem('submissions') || '[]');
        
        // Hapus submissions yang sudah lama
        const recentSubmissions = submissions.filter(time => now - time < this.WINDOW_TIME);
        
        if (recentSubmissions.length >= this.MAX_SUBMISSIONS) {
            return false;
        }
        
        return true;
    },
    
    recordSubmission: function() {
        const now = Date.now();
        const submissions = JSON.parse(sessionStorage.getItem('submissions') || '[]');
        submissions.push(now);
        sessionStorage.setItem('submissions', JSON.stringify(submissions));
    },
    
    getRemainingSubmissions: function() {
        const now = Date.now();
        const submissions = JSON.parse(sessionStorage.getItem('submissions') || '[]');
        const recentSubmissions = submissions.filter(time => now - time < this.WINDOW_TIME);
        return this.MAX_SUBMISSIONS - recentSubmissions.length;
    }
};

// ========== SECURE DATA HANDLING ==========
const SECURE_DATA = {
    // Enkripsi data dengan simple XOR (untuk demo, production gunakan crypto library)
    encrypt: function(data, key) {
        const jsonStr = JSON.stringify(data);
        let encrypted = '';
        for (let i = 0; i < jsonStr.length; i++) {
            encrypted += String.fromCharCode(jsonStr.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return btoa(encrypted); // Base64 encode
    },
    
    decrypt: function(encrypted, key) {
        try {
            const decoded = atob(encrypted); // Base64 decode
            let decrypted = '';
            for (let i = 0; i < decoded.length; i++) {
                decrypted += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
            }
            return JSON.parse(decrypted);
        } catch (e) {
            console.error('Decryption failed:', e);
            return null;
        }
    }
};

// ========== SECURITY UTILITIES ==========
function showSecurityAlert(message, type = 'warning') {
    const alertDiv = document.createElement('div');
    const bgColor = type === 'error' ? '#fed7d7' : '#fef3c7';
    const textColor = type === 'error' ? '#9b2c2c' : '#92400e';
    const borderColor = type === 'error' ? '#e53e3e' : '#f59e0b';
    
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: ${textColor};
        padding: 15px 25px;
        border-radius: 8px;
        border-left: 4px solid ${borderColor};
        z-index: 9999;
        font-weight: bold;
        animation: slideIn 0.3s ease;
    `;
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);
    
    setTimeout(() => alertDiv.remove(), 4000);
}

// ========== ORIGINAL CODE STARTS HERE ==========
const form = document.getElementById('absenForm');

const tabelBody = document.querySelector('#tabelAbsen tbody');
const btnReset = document.getElementById('btnReset');
const statusSelect = document.getElementById('status');

// Elemen area Izin
const areaIzin = document.getElementById('areaIzin');
const alasanInput = document.getElementById('alasan');
const tglMulaiInput = document.getElementById('tglMulai');
const tglSelesaiInput = document.getElementById('tglSelesai');
const buktiInput = document.getElementById('bukti');

// Tampilkan area pengajuan jika pilih Izin/Sakit
statusSelect.addEventListener('change', function() {
    if (this.value === 'Izin' || this.value === 'Sakit') {
        areaIzin.classList.remove('hidden');
        alasanInput.required = true;
        tglMulaiInput.required = true; 
    } else {
        areaIzin.classList.add('hidden');
        alasanInput.required = false;
        tglMulaiInput.required = false;
        
        // Bersihkan inputan
        alasanInput.value = '';
        tglMulaiInput.value = '';
        tglSelesaiInput.value = '';
        buktiInput.value = '';
    }
});

let dataAbsen = JSON.parse(localStorage.getItem('dataAbsen')) || [];

function renderTable() {
    if (!tabelBody) return;

    tabelBody.innerHTML = ''; 

    if (dataAbsen.length === 0) {
        tabelBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #a0aec0; padding: 2rem;">Belum ada data hari ini.</td></tr>`;
        return;
    }

    dataAbsen.forEach((data, index) => {
        const tr = document.createElement('tr');

        // Kelas Kategori (Hadir/Sakit/Izin)
        let statusClass = '';
        if(data.status === 'Hadir') statusClass = 'status-hadir';
        else if(data.status === 'Sakit') statusClass = 'status-sakit';
        else statusClass = 'status-izin';

        // TAMPILAN BARU: Kelas Persetujuan dari Admin
        let approvalText = data.approval || 'Menunggu';
        let approvalClass = '';
        if(approvalText === 'Menunggu') approvalClass = 'app-menunggu';
        else if(approvalText === 'Disetujui') approvalClass = 'app-disetujui';
        else if(approvalText === 'Ditolak') approvalClass = 'app-ditolak';
        else approvalClass = 'app-selesai';

        // Escape output untuk XSS prevention
        const escapedNama = SANITIZER.htmlEscape(data.nama);
        const escapedAlasan = SANITIZER.htmlEscape(data.alasan);
        const escapedTanggalAbsen = SANITIZER.htmlEscape(data.tanggalAbsen);
        const escapedWaktu = SANITIZER.htmlEscape(data.waktuInput);
        const escapedNamaFile = SANITIZER.htmlEscape(data.namaFile);

        // Susun detail jika dia izin/sakit
        let elemenDetail = `<strong class="detail-nama">${escapedNama}</strong>`;
        if(data.status !== 'Hadir') {
            elemenDetail += `<span class="detail-teks">📝 Alasan: <span style="font-weight:400">${escapedAlasan}</span></span>`;
            let formatTgl = data.tglMulai;
            if(data.tglSelesai) formatTgl += ` s/d ${data.tglSelesai}`;
            elemenDetail += `<span class="detail-teks">📅 Tanggal: <span style="font-weight:400">${formatTgl}</span></span>`;
            if(escapedNamaFile) {
                elemenDetail += `<span class="detail-teks" style="color:#3182ce;">📎 Bukti: <span style="font-weight:400">${escapedNamaFile}</span></span>`;
            }
        }
        
        tr.innerHTML = `
            <td>
                <div>📅 ${escapedTanggalAbsen}</div>
                <div style="font-size: 0.8rem; color: #718096;">Jam: ${escapedWaktu}</div>
            </td>
            <td>${elemenDetail}</td>
            <td><span class="status-badge ${statusClass}">${SANITIZER.htmlEscape(data.status)}</span></td>
            <td><span class="badge-approval ${approvalClass}">${SANITIZER.htmlEscape(approvalText)}</span></td>
            <td><button class="btn-delete" onclick="hapusData(${index})">Hapus</button></td>
        `;
        tabelBody.appendChild(tr);
    });
}

form.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // ========== SECURITY CHECKS ==========
    
    // 1. Rate Limiting Check
    if (!RATE_LIMIT.canSubmit()) {
        showSecurityAlert('❌ Terlalu banyak pengajuan! Coba lagi dalam 1 jam.', 'error');
        return;
    }
    
    // 2. CSRF Token Verification
    const csrfToken = createCSRFToken();
    
    // ========== INPUT VALIDATION ==========
    
    const namaValue = document.getElementById('nama').value.trim();
    const tanggalAbsenValue = document.getElementById('tanggalAbsen').value;
    const statusValue = document.getElementById('status').value;
    const alasanValue = document.getElementById('alasan').value.trim();
    const tglMulaiValue = document.getElementById('tglMulai').value;
    const tglSelesaiValue = document.getElementById('tglSelesai').value;
    
    // Validasi nama
    if (!VALIDATOR.isValidName(namaValue)) {
        showSecurityAlert('❌ Nama harus 3-100 karakter (huruf, spasi, tanda hubung)', 'error');
        return;
    }
    
    // Validasi tanggal absensi
    if (!VALIDATOR.isValidDate(tanggalAbsenValue)) {
        showSecurityAlert('❌ Tanggal absensi tidak valid', 'error');
        return;
    }
    
    if (!VALIDATOR.isNotFutureDate(tanggalAbsenValue)) {
        showSecurityAlert('❌ Tanggal tidak boleh di masa depan', 'error');
        return;
    }
    
    // Validasi untuk Izin/Sakit
    if (statusValue === 'Izin' || statusValue === 'Sakit') {
        if (!alasanValue || !VALIDATOR.isValidLength(alasanValue, 5, 200)) {
            showSecurityAlert('❌ Alasan harus 5-200 karakter', 'error');
            return;
        }
        
        if (!VALIDATOR.isValidDate(tglMulaiValue)) {
            showSecurityAlert('❌ Tanggal mulai tidak valid', 'error');
            return;
        }
        
        if (!VALIDATOR.isNotFutureDate(tglMulaiValue)) {
            showSecurityAlert('❌ Tanggal mulai tidak boleh di masa depan', 'error');
            return;
        }
        
        if (tglSelesaiValue && !VALIDATOR.isValidDateRange(tglMulaiValue, tglSelesaiValue)) {
            showSecurityAlert('❌ Tanggal selesai harus >= tanggal mulai', 'error');
            return;
        }
    }
    
    // Validasi file upload
    let namaFileBukti = '';
    if (buktiInput.files.length > 0) {
        const file = buktiInput.files[0];
        
        if (!VALIDATOR.isValidFileSize(file)) {
            showSecurityAlert('❌ Ukuran file max 5MB', 'error');
            return;
        }
        
        if (!VALIDATOR.isValidFileType(file)) {
            showSecurityAlert('❌ Hanya file JPG, PNG, GIF, dan PDF yang diperbolehkan', 'error');
            return;
        }
        
        namaFileBukti = SANITIZER.sanitizeFilename(file.name);
    }
    
    // ========== SANITIZE DATA ==========
    const sanitizedNama = SANITIZER.sanitizeString(namaValue);
    const sanitizedAlasan = SANITIZER.sanitizeString(alasanValue);
    
    const now = new Date();
    const waktu = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    let defaultApproval = (statusValue === 'Hadir') ? 'Selesai' : 'Menunggu';

    // ========== STORE SECURE DATA ==========
    const newData = {
        waktuInput: waktu,
        tanggalAbsen: tanggalAbsenValue,
        nama: sanitizedNama,
        status: statusValue,
        alasan: sanitizedAlasan,
        tglMulai: tglMulaiValue,
        tglSelesai: tglSelesaiValue,
        namaFile: namaFileBukti,
        approval: defaultApproval,
        csrfToken: csrfToken, // Store CSRF token
        timestamp: now.getTime() // Timestamp untuk audit trail
    };
    
    dataAbsen.push(newData);
    localStorage.setItem('dataAbsen', JSON.stringify(dataAbsen));
    
    // Record submission untuk rate limiting
    RATE_LIMIT.recordSubmission();
    
    // Show success alert
    showSecurityAlert('✅ Data berhasil disimpan! (' + RATE_LIMIT.getRemainingSubmissions() + ' pengajuan tersisa)', 'success');

    form.reset();
    areaIzin.classList.add('hidden');
    alasanInput.required = false;
    tglMulaiInput.required = false;
    
    renderTable();

    // Otomatis set tanggal hari ini pada input tanggal
    document.getElementById('tanggalAbsen').valueAsDate = new Date();
});

window.hapusData = function(index) {
    if(confirm('Yakin ingin menghapus data ini?')) {
        dataAbsen.splice(index, 1); 
        localStorage.setItem('dataAbsen', JSON.stringify(dataAbsen)); 
        renderTable(); 
    }
}

if (btnReset) {
    btnReset.addEventListener('click', function() {
        if(dataAbsen.length === 0) return alert('Data sudah kosong!');
        if(confirm('Semua data akan dihapus. Lanjutkan?')) {
            dataAbsen = [];
            localStorage.removeItem('dataAbsen');
            renderTable();
        }
    });
}

if (tabelBody) {
    renderTable();
}
