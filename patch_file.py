import sys

with open('src/app/report/[id].tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import_str = "import * as FileSystem from 'expo-file-system/legacy';"
new_import = "import * as FileSystem from 'expo-file-system/legacy';\nimport * as Print from 'expo-print';\nimport * as Sharing from 'expo-sharing';"
content = content.replace(import_str, new_import)

header_str = """        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detail Laporan</Text>
          {isAdmin ? (
            <TouchableOpacity style={styles.headerAdminBtn} onPress={() => setModalVisible(true)}>
              <Text style={styles.headerAdminBtnText}>Kelola Status</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 60 }} />
          )}
        </View>"""
new_header = """        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detail Laporan</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconBtn} onPress={handleExportPDF}>
              <Ionicons name="download-outline" size={22} color="#0F172A" />
            </TouchableOpacity>
            {isAdmin && (
              <TouchableOpacity style={styles.headerAdminBtn} onPress={() => setModalVisible(true)}>
                <Text style={styles.headerAdminBtnText}>Kelola Status</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>"""
content = content.replace(header_str, new_header)

styles_str = """  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', flex: 1, textAlign: 'center' },
  headerAdminBtn: { backgroundColor: '#2563EB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },"""
new_styles = """  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', flex: 1, textAlign: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', minWidth: 60 },
  iconBtn: { padding: 8, marginRight: 4, backgroundColor: '#F1F5F9', borderRadius: 20 },
  headerAdminBtn: { backgroundColor: '#2563EB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },"""
content = content.replace(styles_str, new_styles)

catch_str = """    } catch (e) {
      console.log('Update status error', e);
    }
  };"""

func_str = """    } catch (e) {
      console.log('Update status error', e);
    }
  };

  const handleExportPDF = async () => {
    if (!report) return;
    try {
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
              .header { text-align: center; border-bottom: 2px solid #2563EB; padding-bottom: 20px; margin-bottom: 30px; }
              .title { font-size: 24px; font-weight: bold; color: #1E3A8A; margin: 0 0 10px 0; }
              .subtitle { font-size: 14px; color: #64748B; margin: 0; }
              .content { line-height: 1.6; font-size: 14px; }
              .row { margin-bottom: 15px; }
              .label { font-weight: bold; color: #475569; width: 150px; display: inline-block; }
              .value { color: #0F172A; }
              .description-box { background-color: #F8FAFC; padding: 20px; border-radius: 8px; border: 1px solid #E2E8F0; margin-top: 10px; }
              .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #94A3B8; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 class="title">BUKTI LAPORAN PENGADUAN</h1>
              <p class="subtitle">Platform Lapor Warga - Pengaduan Masyarakat</p>
            </div>
            <div class="content">
              <div class="row"><span class="label">ID Laporan:</span> <span class="value">${report.id}</span></div>
              <div class="row"><span class="label">Tanggal Lapor:</span> <span class="value">${new Date(report.tanggal).toLocaleString('id-ID')}</span></div>
              <div class="row"><span class="label">Nama Pelapor:</span> <span class="value">${report.nama}</span></div>
              <div class="row"><span class="label">Kategori:</span> <span class="value">${report.kategori || '-'}</span></div>
              <div class="row"><span class="label">Status Saat Ini:</span> <span style="font-weight: bold; color: ${report.status === 'Selesai' ? '#16A34A' : report.status === 'Diproses' ? '#2563EB' : '#CA8A04'};">${report.status}</span></div>
              
              <div style="margin-top: 30px;">
                <span class="label" style="display: block; margin-bottom: 5px;">Judul Laporan:</span>
                <div class="value" style="font-weight: bold; font-size: 16px;">${report.judul}</div>
              </div>

              <div style="margin-top: 20px;">
                <span class="label" style="display: block; margin-bottom: 5px;">Rincian Laporan:</span>
                <div class="description-box">
                  ${report.isi ? report.isi.replace(/\\n/g, '<br/>') : ''}
                </div>
              </div>
              
              ${report.tanggapan ? '<div style="margin-top: 20px;"><span class="label" style="display: block; margin-bottom: 5px;">Tanggapan Petugas:</span><div class="description-box" style="background-color: #F0F9FF; border-color: #BAE6FD;">' + report.tanggapan.replace(/\\n/g, '<br/>') + '</div></div>' : ''}
              
              ${report.imageUrl ? '<div style="margin-top: 20px;"><span class="label" style="display: block; margin-bottom: 5px;">Foto Bukti:</span><img src="' + report.imageUrl + '" style="max-width: 100%; border-radius: 8px; margin-top: 10px; max-height: 400px; object-fit: contain;" /></div>' : ''}

            </div>
            <div class="footer">
              <p>Dokumen ini dicetak otomatis oleh sistem Lapor Warga pada ${new Date().toLocaleString('id-ID')}.</p>
              <p>Terima kasih atas partisipasi Anda dalam membangun lingkungan yang lebih baik.</p>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (e) {
      console.log('PDF Error', e);
    }
  };"""
content = content.replace(catch_str, func_str)

with open('src/app/report/[id].tsx', 'w', encoding='utf-8') as f:
    f.write(content)
