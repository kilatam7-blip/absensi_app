// ========== SISTEM KEAMANAN ADMIN ==========
// Credentials Admin (Bisa diubah sesuai kebutuhan)
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'admin123'
};

// Konfigurasi Keamanan
const SECURITY_CONFIG = {
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000, // 15 menit dalam milliseconds
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 menit timeout
    SESSION_TOKEN_LENGTH: 32
};

// ========== RATE LIMITING FUNCTIONS ==========
function getLoginAttempts() {
    const data = JSON.parse(localStorage.getItem('loginAttempts') || '{}');
    return data;
}

function recordFailedLoginAttempt() {
    const attempts = getLoginAttempts();
    const now = Date.now();
    const key = 'attempt_' + Math.floor(now / 1000);
    
    attempts[key] = now;
    
    // Hapus attempt yang sudah lama
    Object.keys(attempts).forEach(key => {
        if (now - attempts[key] > SECURITY_CONFIG.LOCKOUT_DURATION) {
            delete attempts[key];
        }
    });
    
    localStorage.setItem('loginAttempts', JSON.stringify(attempts));
}

function getRecentFailedAttempts() {
    const attempts = getLoginAttempts();
    const now = Date.now();
    let count = 0;
    
    Object.keys(attempts).forEach(key => {
        if (now - attempts[key] < SECURITY_CONFIG.LOCKOUT_DURATION) {
            count++;
        }
    });
    
    return count;
}

function isLoginLocked() {
    return getRecentFailedAttempts() >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS;
}

function getRemainingLockoutTime() {
    const attempts = getLoginAttempts();
    const now = Date.now();
    let oldestAttempt = null;
    
    Object.keys(attempts).forEach(key => {
        if (now - attempts[key] < SECURITY_CONFIG.LOCKOUT_DURATION) {
            if (!oldestAttempt || attempts[key] < oldestAttempt) {
                oldestAttempt = attempts[key];
            }
        }
    });
    
    if (!oldestAttempt) return 0;
    return Math.ceil((SECURITY_CONFIG.LOCKOUT_DURATION - (now - oldestAttempt)) / 1000);
}

// ========== SESSION MANAGEMENT FUNCTIONS ==========
function generateSessionToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < SECURITY_CONFIG.SESSION_TOKEN_LENGTH; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

function createSecureSession(username) {
    const token = generateSessionToken();
    const sessionData = {
        token: token,
        username: username,
        loginTime: new Date().toISOString(),
        lastActivity: Date.now(),
        userAgent: navigator.userAgent,
        ip: 'local' // Untuk aplikasi lokal
    };
    
    localStorage.setItem('adminSession', JSON.stringify(sessionData));
    localStorage.setItem('adminSessionToken', token);
    localStorage.setItem('adminLoggedIn', 'true');
    
    startSessionMonitoring();
}

function validateSession() {
    const sessionData = JSON.parse(localStorage.getItem('adminSession') || 'null');
    const token = localStorage.getItem('adminSessionToken');
    const isLoggedIn = localStorage.getItem('adminLoggedIn');
    
    if (!sessionData || !token || !isLoggedIn) {
        return false;
    }
    
    // Validasi token
    if (sessionData.token !== token) {
        clearSession();
        return false;
    }
    
    // Cek session timeout
    const now = Date.now();
    if (now - sessionData.lastActivity > SECURITY_CONFIG.SESSION_TIMEOUT) {
        showSessionTimeoutAlert();
        clearSession();
        return false;
    }
    
    // Update last activity
    sessionData.lastActivity = now;
    localStorage.setItem('adminSession', JSON.stringify(sessionData));
    
    return true;
}

function startSessionMonitoring() {
    // Monitor aktivitas setiap 30 detik
    setInterval(() => {
        if (!validateSession()) {
            window.location.href = 'login.html?expired=true';
        }
    }, 30000);
    
    // Update last activity pada setiap interaksi user
    document.addEventListener('click', updateSessionActivity);
    document.addEventListener('keypress', updateSessionActivity);
    document.addEventListener('mousemove', updateSessionActivity, { passive: true });
}

function updateSessionActivity() {
    const sessionData = JSON.parse(localStorage.getItem('adminSession') || 'null');
    if (sessionData) {
        sessionData.lastActivity = Date.now();
        localStorage.setItem('adminSession', JSON.stringify(sessionData));
    }
}

function clearSession() {
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('adminSession');
    localStorage.removeItem('adminSessionToken');
    localStorage.removeItem('adminUsername');
    localStorage.removeItem('adminLoginTime');
    
    // Hapus event listeners
    document.removeEventListener('click', updateSessionActivity);
    document.removeEventListener('keypress', updateSessionActivity);
    document.removeEventListener('mousemove', updateSessionActivity);
}

function showSessionTimeoutAlert() {
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #fed7d7;
        color: #9b2c2c;
        padding: 2rem;
        border-radius: 12px;
        border: 2px solid #e53e3e;
        z-index: 10000;
        text-align: center;
        font-weight: bold;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    `;
    alertDiv.innerHTML = `
        <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">⏱️ Session Expired</p>
        <p style="font-size: 0.9rem;">Sesi Anda telah berakhir karena inaktif. Silakan login kembali.</p>
    `;
    document.body.appendChild(alertDiv);
    
    setTimeout(() => alertDiv.remove(), 3000);
}

// ========== LOGIN CHECK FUNCTION ==========
// Cek apakah user sudah login saat halaman dimuat
function checkAdminLogin() {
    const currentPage = window.location.pathname.split('/').pop();
    
    // Jika di halaman login
    if (currentPage === 'login.html' || currentPage === '') {
        handleLoginForm();
        preventBackButton();
    }
    // Jika di halaman admin
    else if (currentPage === 'admin.html') {
        // Validasi session sebelum akses
        if (!validateSession()) {
            // Belum login atau session invalid, redirect ke login
            window.location.href = 'login.html';
        } else {
            // Sudah login dan session valid, tampilkan dashboard
            initializeAdminPanel();
        }
    }
}

function preventBackButton() {
    // Cegah user kembali ke halaman admin setelah logout
    history.pushState(null, null, window.location.href);
    window.addEventListener('popstate', function() {
        if (localStorage.getItem('adminLoggedIn')) {
            history.pushState(null, null, window.location.href);
        } else {
            history.back();
        }
    });
}

// Handle form login
function handleLoginForm() {
    const loginForm = document.getElementById('loginForm');
    
    // Tampilkan alert jika session expired
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('expired') === 'true') {
        const alert = document.getElementById('sessionExpiredAlert');
        if (alert) {
            alert.style.display = 'block';
            // Hapus parameter dari URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Cek apakah akun terkunci
            if (isLoginLocked()) {
                const remainingTime = getRemainingLockoutTime();
                showLoginAlert(`🔒 Akun terkunci! Coba lagi dalam ${remainingTime} detik.`, 'error');
                return;
            }
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            // Validasi credentials
            if (username === ADMIN_CREDENTIALS.username && 
                password === ADMIN_CREDENTIALS.password) {
                
                // Clear login attempts
                localStorage.removeItem('loginAttempts');
                
                // Buat secure session
                createSecureSession(username);
                
                // Tampilkan pesan sukses
                showLoginAlert('✅ Login berhasil! Mengalihkan ke dashboard...', 'success');
                
                // Redirect ke admin.html setelah 1 detik
                setTimeout(() => {
                    window.location.href = 'admin.html';
                }, 1000);
            } else {
                // Record failed attempt
                recordFailedLoginAttempt();
                const attempts = getRecentFailedAttempts();
                const remaining = SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS - attempts;
                
                if (remaining > 0) {
                    showLoginAlert(`❌ Username atau password salah! (${remaining} percobaan tersisa)`, 'error');
                } else {
                    showLoginAlert(`🔒 Terlalu banyak percobaan login gagal! Akun terkunci selama 15 menit.`, 'error');
                }
                
                document.getElementById('password').value = '';
            }
        });
    }
}

// Tampilkan alert login
function showLoginAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 8px;
        font-weight: bold;
        z-index: 9999;
        animation: slideIn 0.3s ease;
        ${type === 'success' ? 'background: #c6f6d5; color: #22543d; border: 2px solid #48bb78;' : 'background: #fed7d7; color: #9b2c2c; border: 2px solid #e53e3e;'}
    `;
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);
    
    setTimeout(() => alertDiv.remove(), 4000);
}

// Fungsi logout
function logoutAdmin() {
    // Clear secure session
    clearSession();
    
    // Tampilkan pesan logout
    showLoginAlert('👋 Logout berhasil! Mengalihkan ke halaman login...', 'success');
    
    // Redirect ke login setelah 1 detik
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 1000);
}

// Initialize Admin Panel
function initializeAdminPanel() {
    // Ambil data session yang valid
    const sessionData = JSON.parse(localStorage.getItem('adminSession') || '{}');
    const username = sessionData.username || 'Admin';
    
    // Tambahkan tombol logout ke sidebar
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && !document.querySelector('.logout-section')) {
        const logoutSection = document.createElement('div');
        logoutSection.className = 'logout-section';
        logoutSection.style.cssText = `
            margin-top: auto;
            padding-top: 1rem;
            border-top: 1px solid #475569;
        `;
        
        // Hitung sisa waktu session
        const now = Date.now();
        const remainingMs = SECURITY_CONFIG.SESSION_TIMEOUT - (now - sessionData.lastActivity);
        const remainingMin = Math.ceil(remainingMs / 60000);
        
        logoutSection.innerHTML = `
            <div style="font-size: 0.85rem; color: #cbd5e1; margin-bottom: 0.5rem;">
                👤 Masuk sebagai<br><strong>${username}</strong>
            </div>
            <div style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 0.75rem;">
                ⏱️ Timeout: ${remainingMin} menit
            </div>
            <button id="logoutBtnAdmin" class="btn-logout">🚪 Logout</button>
        `;
        sidebar.appendChild(logoutSection);
        
        // Tambahkan event listener ke tombol logout
        const logoutBtn = document.getElementById('logoutBtnAdmin');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                logoutAdmin();
            });
        }
    }
}

// Jalankan pengecekan login saat halaman dimuat
document.addEventListener('DOMContentLoaded', checkAdminLogin);

// Ambil elemen admin panel (hanya ada di admin.html)
const tabelAdminBody = document.querySelector('#tabelAdmin tbody');
const statTotal = document.getElementById('statTotal');
const statPending = document.getElementById('statPending');
const statApproved = document.getElementById('statApproved');
const btnBersihkan = document.getElementById('btnBersihkan');

// Filter elements
const filterTanggal = document.getElementById('filterTanggal');
const filterHari = document.getElementById('filterHari');
const btnResetFilter = document.getElementById('btnResetFilter');
const filterStatus = document.getElementById('filterStatus');

// Ambil data
let dataAbsen = JSON.parse(localStorage.getItem('dataAbsen')) || [];
let currentFilters = {
    tanggal: '',
    hari: ''
};

// Fungsi untuk mendapatkan nama hari dari date
function getDayName(dateString) {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const date = new Date(dateString + 'T00:00:00');
    return days[date.getDay()];
}

// Fungsi untuk filter data berdasarkan tanggal dan hari
function getFilteredData() {
    let filtered = [...dataAbsen];

    // Filter berdasarkan tanggal
    if (currentFilters.tanggal) {
        filtered = filtered.filter(data => data.tanggalAbsen === currentFilters.tanggal);
    }

    // Filter berdasarkan hari
    if (currentFilters.hari) {
        filtered = filtered.filter(data => {
            const dayName = getDayName(data.tanggalAbsen);
            return dayName === currentFilters.hari;
        });
    }

    return filtered;
}

// Fungsi untuk update filter status text
function updateFilterStatus() {
    let statusText = '';
    let filterCount = 0;

    if (currentFilters.tanggal) {
        statusText += `📅 Tanggal: ${currentFilters.tanggal}`;
        filterCount++;
    }

    if (currentFilters.hari) {
        if (statusText) statusText += ' | ';
        statusText += `📆 Hari: ${currentFilters.hari}`;
        filterCount++;
    }

    if (filterStatus) {
        if (statusText) {
            filterStatus.innerHTML = `✓ Filter aktif: ${statusText} <span style="color: #94a3b8; margin-left: 0.5rem;">(${getFilteredData().length} data)</span>`;
        } else {
            filterStatus.innerHTML = '';
        }
    }
}

// Event listener untuk filter tanggal
if (filterTanggal) {
    filterTanggal.addEventListener('change', function() {
        currentFilters.tanggal = this.value;
        updateFilterStatus();
        renderAdminTable();
    });
}

// Event listener untuk filter hari
if (filterHari) {
    filterHari.addEventListener('change', function() {
        currentFilters.hari = this.value;
        updateFilterStatus();
        renderAdminTable();
    });
}

// Event listener untuk reset filter
if (btnResetFilter) {
    btnResetFilter.addEventListener('click', function() {
        currentFilters.tanggal = '';
        currentFilters.hari = '';
        if (filterTanggal) filterTanggal.value = '';
        if (filterHari) filterHari.value = '';
        updateFilterStatus();
        renderAdminTable();
    });
}

function renderAdminTable() {
    if (!tabelAdminBody) return; // Check if admin page elements exist
    
    tabelAdminBody.innerHTML = '';
    
    // Gunakan filtered data
    const displayData = getFilteredData();
    
    let hitungTotal = displayData.length;
    let hitungPending = 0;
    let hitungApproved = 0;

    if (displayData.length === 0) {
        tabelAdminBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem;">Tidak ada data yang sesuai filter.</td></tr>`;
    } else {
        // Balik array agar data terbaru di atas
        const dataReversed = [...displayData].reverse(); 

        dataReversed.forEach((data, reversedIndex) => {
            // Cari index asli dari data di array dataAbsen
            const originalIndex = dataAbsen.findIndex(item => item === data);

            const tr = document.createElement('tr');

            // Set Warna Kategori
            let kategoriClass = '';
            if(data.status === 'Hadir') kategoriClass = 'bg-hadir';
            else if(data.status === 'Sakit') kategoriClass = 'bg-sakit';
            else kategoriClass = 'bg-izin';

            // Set UI Approval
            let approvalClass = '';
            let approvalText = data.approval || 'Menunggu';
            let tombolAksi = '';

            if(approvalText === 'Menunggu') {
                approvalClass = 'app-menunggu';
                hitungPending++;
                // Tombol aksi hanya muncul jika statusnya menunggu
                tombolAksi = `
                    <div class="aksi-grup">
                        <button class="btn btn-setuju" onclick="prosesIzin(${originalIndex}, 'Disetujui')">Setujui</button>
                        <button class="btn btn-tolak" onclick="prosesIzin(${originalIndex}, 'Ditolak')">Tolak</button>
                    </div>
                `;
            } else if (approvalText === 'Disetujui') {
                approvalClass = 'app-disetujui';
                hitungApproved++;
                tombolAksi = `<span style="color:#a0aec0; font-size:0.85rem;">Telah diproses</span>`;
            } else if (approvalText === 'Ditolak') {
                approvalClass = 'app-ditolak';
                tombolAksi = `<span style="color:#a0aec0; font-size:0.85rem;">Telah diproses</span>`;
            } else {
                approvalClass = 'app-selesai';
                tombolAksi = `<span style="color:#a0aec0; font-size:0.85rem;">-</span>`;
            }

            // Render Detail Izin
            let detailHTML = '-';
            if (data.status !== 'Hadir') {
                detailHTML = `
                    <span class="detail-teks"><strong>Alasan:</strong> ${data.alasan}</span>
                    <span class="detail-teks"><strong>Tgl:</strong> ${data.tglMulai} ${data.tglSelesai ? ' s/d ' + data.tglSelesai : ''}</span>
                    ${data.namaFile ? `<span class="detail-teks" style="color:#3182ce;">📎 ${data.namaFile}</span>` : ''}
                `;
            }

            tr.innerHTML = `
                <td>
                    <span class="nama-teks">${data.nama}</span>
                    <span class="waktu-teks">🕒 ${data.waktu}</span>
                </td>
                <td>${detailHTML}</td>
                <td><span class="badge ${kategoriClass}">${data.status}</span></td>
                <td><div class="badge-approval ${approvalClass}">${approvalText}</div></td>
                <td>${tombolAksi}</td>
            `;
            tabelAdminBody.appendChild(tr);
        });
    }

    // Update Statistik
    if (statTotal) statTotal.textContent = hitungTotal;
    if (statPending) statPending.textContent = hitungPending;
    if (statApproved) statApproved.textContent = hitungApproved;
}

// Fungsi untuk admin Setuju / Tolak
window.prosesIzin = function(index, hasil) {
    let konfirmasi = confirm(`Anda yakin ingin memberikan status "${hasil}" pada izin ini?`);
    if(konfirmasi) {
        dataAbsen[index].approval = hasil;
        localStorage.setItem('dataAbsen', JSON.stringify(dataAbsen));
        renderAdminTable();
    }
}

// Fitur hapus semua data (Hard Reset)
if (btnBersihkan) {
    btnBersihkan.addEventListener('click', function() {
        if(dataAbsen.length === 0) return alert('Data sudah kosong!');
        if(confirm('BAHAYA: Seluruh data akan terhapus secara permanen. Lanjutkan?')) {
            localStorage.removeItem('dataAbsen');
            dataAbsen = [];
            renderAdminTable();
        }
    });
}

// --- FITUR DOWNLOAD EXCEL (CSV) ---
const btnExport = document.getElementById('btnExport');

if (btnExport) {
    btnExport.addEventListener('click', function() {
        if(dataAbsen.length === 0) {
        return alert('Tidak ada data untuk didownload!');
    }

    // 1. Membuat Header (Judul Kolom) untuk Excel
    let csvContent = "Waktu Input,Nama Lengkap,Kategori,Alasan,Tanggal Mulai,Tanggal Selesai,File Bukti,Status Approval\n";

    // 2. Memasukkan data baris demi baris
    dataAbsen.forEach(row => {
        let waktu = row.waktu || '';
        let nama = row.nama || '';
        let status = row.status || '';
        let alasan = row.alasan || '-';
        let tglMulai = row.tglMulai || '-';
        let tglSelesai = row.tglSelesai || '-';
        let namaFile = row.namaFile || '-';
        let approval = row.approval || 'Menunggu';

        // Membersihkan tanda kutip ganda dan koma dalam teks (misal pada input alasan) 
        // agar tidak merusak format kolom Excel
        nama = `"${nama.replace(/"/g, '""')}"`;
        alasan = `"${alasan.replace(/"/g, '""')}"`;

        // Menggabungkan data menjadi satu baris dipisah dengan koma
        let barisData = `${waktu},${nama},${status},${alasan},${tglMulai},${tglSelesai},${namaFile},${approval}`;
        csvContent += barisData + "\n";
    });

    // 3. Membuat file virtual (Blob) dan memicu unduhan
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", "Rekap_Kehadiran_dan_Izin.csv");
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    });
}

// --- FITUR JAM & HARI REAL-TIME ---
function updateClock() {
    const clockElement = document.getElementById('liveClock');
    if (!clockElement) return; // Only run on admin page
    
    // Format hari dan tanggal bahasa Indonesia
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    
    const now = new Date();
    const tanggalString = now.toLocaleDateString('id-ID', options);
    
    // Format jam (HH:MM:SS)
    const jam = String(now.getHours()).padStart(2, '0');
    const menit = String(now.getMinutes()).padStart(2, '0');
    const detik = String(now.getSeconds()).padStart(2, '0');
    const jamString = `${jam}:${menit}:${detik}`;
    
    // Tampilkan ke elemen HTML
    clockElement.innerHTML = `📅 ${tanggalString} | ⏰ ${jamString} WIB`;
}

// Jalankan fungsi jam setiap 1 detik sekali (only if admin page)
if (document.getElementById('liveClock')) {
    setInterval(updateClock, 1000);
    // Panggil sekali langsung saat halaman dimuat agar tidak ada jeda 1 detik
    updateClock();
}

// Jalankan saat dibuka (only if admin page)
if (tabelAdminBody) {
    renderAdminTable();
    updateFilterStatus();
}