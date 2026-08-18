# Absensi App

Website absensi berbasis HTML, CSS, dan JavaScript untuk mencatat kehadiran, izin, dan sakit. Project ini terdiri dari halaman user untuk input absensi dan halaman admin untuk mengelola data absensi.

##Link Webiste

https://absensiapp-kilatam-workspace.vibehost.space/index.html

## Fitur Utama

### Halaman User
- Mengisi data kehadiran harian
- Pilihan status: Hadir, Sakit, atau Izin
- Input tanggal absensi
- Form izin/sakit dengan alasan, rentang tanggal, dan upload bukti
- Validasi input dan sanitasi untuk keamanan dasar
- Penyimpanan data di localStorage browser
- Tombol admin login untuk masuk ke halaman admin

### Halaman Admin
- Login admin dengan username dan password
- Rate limiting dan lockout untuk mencegah brute force
- Session timeout otomatis dan monitoring aktivitas
- Dashboard untuk melihat data absensi
- Filter berdasarkan tanggal dan hari
- Menyetujui atau menolak data absensi
- Logout aman dan redirect ke halaman login

## Kredensial Admin
- Username: `admin`
- Password: `admin123`

## Struktur Project

- `index.html` - halaman utama user
- `login.html` - halaman login admin
- `admin.html` - dashboard admin
- `style.css` - styling halaman user
- `admin.css` - styling halaman admin dan login
- `script.js` - logika halaman user, validasi, sanitasi, dan data
- `admin.js` - logika login admin, session, dashboard, dan keamanan

## Cara Menjalankan

1. Pastikan project berada di folder lokal web server seperti XAMPP/Laragon.
2. Letakkan folder project di direktori web server Anda.
3. Buka browser dan akses:
   - `http://localhost/absensi-app/` untuk halaman user
   - `http://localhost/absensi-app/login.html` untuk halaman admin

Jika menggunakan Laragon, biasanya folder proyek diletakkan di `D:\laragon\www\...` lalu dibuka melalui browser dengan URL `http://localhost/<nama-folder>/`.

## Catatan Keamanan

Website ini sudah dilengkapi dengan beberapa lapisan keamanan dasar, seperti:
- validasi input
- sanitasi data
- CSRF token
- rate limiting login
- session timeout
- monitoring aktivitas admin
- pencegahan XSS dan file upload berbahaya

## Developer Notes

Project ini dibuat sebagai aplikasi frontend statis dengan localStorage untuk penyimpanan data. Oleh karena itu, data bersifat lokal di browser dan bukan database server.

## Lisensi

Project ini dibuat untuk kebutuhan absensi atau demonstrasi dan dapat dimodifikasi sesuai kebutuhan.
