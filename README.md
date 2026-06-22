# Pengaduan Masyarakat iOS

Pengaduan Masyarakat adalah aplikasi seluler yang terintegrasi untuk memfasilitasi pelaporan warga kepada instansi terkait. Dibangun menggunakan React Native dan Expo, aplikasi ini menyediakan platform yang lancar bagi warga untuk mengirimkan laporan dan melacak perkembangannya. Di sisi lain, aplikasi ini juga menyediakan panel kendali terpusat bagi administrator untuk mengelola dan memperbarui status laporan secara waktu nyata (real-time).

## Fitur Utama

- **Otentikasi Pengguna**: Sistem pendaftaran dan masuk (login) yang aman menggunakan Firebase Authentication.
- **Akses Berbasis Peran**: Antarmuka dan fitur yang disesuaikan secara dinamis untuk Pengguna Biasa (Warga) dan Administrator.
- **Dua Mode Pelaporan**: 
  - **Pelaporan Teks**: Memungkinkan pengguna menuliskan judul dan rincian kejadian.
  - **Pelaporan Suara (Voice Note)**: Memungkinkan pengguna merekam pesan suara hingga durasi maksimal 10 detik sebagai alternatif pengganti teks. Dilengkapi dengan fitur pratinjau (playback) sebelum laporan dikirimkan.
- **Validasi Data Laporan**: Setiap laporan diwajibkan untuk melampirkan Foto Bukti Kejadian serta Koordinat Lokasi (GPS) agar laporan bersifat valid dan mudah ditindaklanjuti.
- **Pelacakan Status Interaktif**: Pengguna dapat memantau status laporan mereka melalui tampilan linimasa (Menunggu, Diproses, Selesai, Ditolak) beserta tanggapan dari administrator.
- **Manajemen Administrator**: Administrator memiliki hak akses penuh untuk meninjau laporan, memberikan tanggapan, mengubah status pelaporan, menyiarkan pesan pengumuman (broadcast) kepada seluruh pengguna, serta mengelola portal berita.
- **Sinkronisasi Waktu Nyata (Real-time)**: Menggunakan Firebase Realtime Database untuk memastikan setiap data laporan, notifikasi, dan pembaruan status diterima seketika oleh pengguna.
- **Portal Informasi dan Berita**: Menampilkan berita atau informasi terkini pada halaman utama pengguna yang dapat diperbarui oleh administrator.

## Teknologi yang Digunakan

- **Kerangka Kerja (Framework)**: React Native / Expo
- **Navigasi (Routing)**: Expo Router (File-based routing)
- **Basis Data dan Layanan**: Firebase (Authentication & Realtime Database)
- **Komponen Perangkat Keras**: Expo AV (Audio), Expo Location (GPS), Expo Image Picker (Kamera/Galeri)
- **Antarmuka Pengguna (UI)**: Custom StyleSheet dan Expo Linear Gradient

## Panduan Pemasangan

1. Unduh atau kloning repositori ini ke dalam komputer Anda.
2. Pastikan Anda telah memasang Node.js pada sistem Anda.
3. Pasang seluruh dependensi proyek dengan menjalankan perintah berikut:
   ```bash
   npm install
   ```
4. Jalankan server pengembangan Expo:
   ```bash
   npx expo start --clear
   ```
5. Pindai kode QR yang muncul menggunakan aplikasi Expo Go pada perangkat seluler Anda (tersedia di iOS dan Android).

## Struktur Proyek

- `src/app/` - Berisi struktur utama dari Expo Router.
  - `(tabs)/` - Halaman navigasi utama berupa tab (Beranda, Lapor, Profil).
  - `report/` - Rute dinamis untuk menampilkan rincian pelaporan spesifik.
  - `admin/` - Rute khusus untuk fitur panel administrator.
- `firebaseConfig.js` - Berkas konfigurasi untuk inisialisasi Firebase.
- `assets/` - Berisi seluruh aset statis seperti ikon dan logo aplikasi.

## Persyaratan Sistem

- Node.js versi 18.x atau lebih baru
- Expo CLI
- Aplikasi Expo Go (untuk pengujian pada perangkat fisik)