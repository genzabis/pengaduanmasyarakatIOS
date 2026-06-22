import sys

with open('src/app/report/[id].tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# We will use regex to find the handleExportPDF function and replace it.
pattern = re.compile(r'const handleExportPDF = async \(\) => \{.*?catch \(e\) \{\n\s*console\.log\(\'PDF Error\', e\);\n\s*\}\n  \};', re.DOTALL)

new_func = """const handleExportPDF = async () => {
    if (!report) return;
    try {
      const getStatusClass = (status) => {
        if (status === 'Selesai') return 'status-selesai';
        if (status === 'Diproses') return 'status-diproses';
        return 'status-menunggu';
      };

      const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Bukti Laporan Pengaduan</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 40px;
      color: #222;
      line-height: 1.5;
    }
    .kop-surat {
      text-align: center;
      border-bottom: 3px solid #000;
      padding-bottom: 5px;
      margin-bottom: 5px;
    }
    .kop-surat-inner {
      border-bottom: 1px solid #000;
      padding-bottom: 15px;
      margin-bottom: 30px;
    }
    .instansi {
      font-size: 22px;
      font-weight: bold;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #000;
    }
    .alamat {
      font-size: 13px;
      margin: 5px 0 0 0;
      color: #444;
    }
    h2.title {
      text-align: center;
      font-size: 16px;
      text-transform: uppercase;
      margin: 20px 0 30px 0;
      text-decoration: underline;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    td {
      padding: 8px 0;
      vertical-align: top;
      font-size: 14px;
    }
    .label-cell {
      width: 160px;
      font-weight: bold;
    }
    .colon-cell {
      width: 20px;
      text-align: center;
    }
    .value-cell {
      padding-left: 10px;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-weight: bold;
      font-size: 12px;
      color: #fff;
    }
    .status-selesai { background-color: #16A34A; }
    .status-diproses { background-color: #2563EB; }
    .status-menunggu { background-color: #CA8A04; }
    
    .box-content {
      border: 1px solid #ddd;
      padding: 15px;
      margin-top: 8px;
      border-radius: 4px;
      background-color: #fafafa;
      min-height: 60px;
      font-size: 14px;
    }
    .tanggapan-box {
      background-color: #f0f9ff;
      border-color: #bae6fd;
    }
    .image-container {
      margin-top: 10px;
      text-align: center;
      border: 1px dashed #ccc;
      padding: 10px;
    }
    .image-container img {
      max-width: 100%;
      max-height: 350px;
      object-fit: contain;
    }
    .footer {
      margin-top: 50px;
      width: 100%;
      page-break-inside: avoid;
    }
    .ttd-container {
      float: right;
      text-align: center;
      width: 250px;
    }
    .ttd-title {
      margin-bottom: 70px;
      font-size: 14px;
    }
    .ttd-name {
      font-weight: bold;
      text-decoration: underline;
      font-size: 14px;
    }
    .clear { clear: both; }
    .system-note {
      margin-top: 60px;
      font-size: 11px;
      color: #888;
      text-align: center;
      border-top: 1px solid #eee;
      padding-top: 10px;
    }
  </style>
</head>
<body>
  <div class="kop-surat">
    <div class="kop-surat-inner">
      <h1 class="instansi">PLATFORM LAPOR WARGA</h1>
      <p class="alamat">Layanan Pengaduan dan Aspirasi Masyarakat Secara Elektronik<br>Dokumen Resmi Tercetak</p>
    </div>
  </div>

  <h2 class="title">Tanda Bukti Laporan Pengaduan</h2>

  <table>
    <tr>
      <td class="label-cell">Nomor Registrasi</td>
      <td class="colon-cell">:</td>
      <td class="value-cell"><strong>${report.id}</strong></td>
    </tr>
    <tr>
      <td class="label-cell">Tanggal Laporan</td>
      <td class="colon-cell">:</td>
      <td class="value-cell">${new Date(report.tanggal).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}</td>
    </tr>
    <tr>
      <td class="label-cell">Nama Pelapor</td>
      <td class="colon-cell">:</td>
      <td class="value-cell">${report.nama}</td>
    </tr>
    <tr>
      <td class="label-cell">Kategori Pengaduan</td>
      <td class="colon-cell">:</td>
      <td class="value-cell">${report.kategori || '-'}</td>
    </tr>
    <tr>
      <td class="label-cell">Status Saat Ini</td>
      <td class="colon-cell">:</td>
      <td class="value-cell">
        <span class="status-badge ${getStatusClass(report.status)}">${report.status}</span>
      </td>
    </tr>
  </table>

  <div style="margin-top: 20px;">
    <strong style="font-size: 14px;">Judul Laporan:</strong><br>
    <div style="font-size: 16px; margin-top: 5px; font-weight: bold;">${report.judul}</div>
  </div>

  <div style="margin-top: 20px;">
    <strong style="font-size: 14px;">Rincian Laporan:</strong><br>
    <div class="box-content">
      ${report.isi ? report.isi.replace(/\\n/g, '<br/>') : '-'}
    </div>
  </div>

  ${report.tanggapan ? `<div style="margin-top: 20px;"><strong style="font-size: 14px;">Tanggapan Petugas:</strong><br><div class="box-content tanggapan-box">${report.tanggapan.replace(/\\n/g, '<br/>')}</div></div>` : ''}

  ${report.imageUrl ? `<div style="margin-top: 20px;"><strong style="font-size: 14px;">Lampiran Foto Bukti:</strong><br><div class="image-container"><img src="${report.imageUrl}" /></div></div>` : ''}

  <div class="footer">
    <div class="ttd-container">
      <div class="ttd-title">Dikeluarkan pada:<br>${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</div>
      <div class="ttd-name">Sistem Lapor Warga</div>
      <div>(Tervalidasi Otomatis)</div>
    </div>
    <div class="clear"></div>
  </div>

  <div class="system-note">
    Dokumen ini adalah tanda bukti yang sah yang diterbitkan oleh sistem elektronik Lapor Warga.<br>
    Harap simpan dokumen ini sebagai referensi pelaporan Anda.
  </div>
</body>
</html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Simpan Bukti Laporan' });
    } catch (e) {
      console.log('PDF Error', e);
    }
  };"""

content = pattern.sub(new_func, content)

with open('src/app/report/[id].tsx', 'w', encoding='utf-8') as f:
    f.write(content)
