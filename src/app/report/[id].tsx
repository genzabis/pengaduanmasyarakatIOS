import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, Platform, Modal, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth, database } from '../../../firebaseConfig';
import { ref, onValue, update, push, set } from 'firebase/database';
import { LinearGradient } from 'expo-linear-gradient';

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const isAdmin = auth.currentUser?.email === 'admin@gmail.com';

  useEffect(() => {
    if (!id) return;
    const reportRef = ref(database, `pengaduan/${id}`);
    const unsubscribe = onValue(reportRef, (snapshot) => {
      if (snapshot.exists()) {
        setReport({ id: snapshot.key, ...snapshot.val() });
      } else {
        setReport(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id]);

  const updateStatus = async (newStatus: string) => {
    if (!report) return;
    setModalVisible(false); // Tutup modal dulu
    try {
      await update(ref(database, `pengaduan/${report.id}`), { status: newStatus });
      
      let notifType = 'info';
      let title = 'Status Diperbarui';
      if (newStatus === 'Selesai') { notifType = 'success'; title = 'Laporan Selesai! 🎉'; }
      if (newStatus === 'Diproses') { notifType = 'processing'; title = 'Sedang Diproses ⏳'; }
      if (newStatus === 'Menunggu') { notifType = 'system'; title = 'Menunggu Antrean ⏸️'; }

      const notifRef = push(ref(database, 'notifications'));
      await set(notifRef, {
        userId: report.nama,
        title: title,
        message: `Laporan Anda "${report.judul}" kini berstatus: ${newStatus}.`,
        time: Date.now(),
        type: notifType,
        read: false
      });
    } catch (error) {
      Alert.alert('Gagal', 'Gagal memperbarui status');
    }
  };

  const handleAdminAction = () => {
    setModalVisible(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0A2540" />
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Laporan tidak ditemukan.</Text>
        <TouchableOpacity style={styles.backBtnError} onPress={() => router.back()}>
          <Text style={styles.backBtnErrorText}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getStatusColor = (status: string) => {
    if (status === 'Selesai') return '#059669';
    if (status === 'Diproses') return '#2563EB';
    return '#D97706'; // Menunggu
  };

  const isMenunggu = report.status === 'Menunggu' || report.status === 'Diproses' || report.status === 'Selesai';
  const isDiproses = report.status === 'Diproses' || report.status === 'Selesai';
  const isSelesai = report.status === 'Selesai';

  return (
    <LinearGradient colors={['#E3F2FD', '#90CAF9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#0A2540" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detail Laporan</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) + '15' }]}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(report.status) }]} />
                <Text style={[styles.statusText, { color: getStatusColor(report.status) }]}>{report.status}</Text>
              </View>
              <Text style={styles.dateText}>
                {new Date(report.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>

            <View style={styles.cardBody}>
              <Text style={styles.title}>{report.judul}</Text>
              
              <View style={styles.reporterBox}>
                <Ionicons name="person-circle" size={32} color="#9CA3AF" />
                <View style={styles.reporterInfo}>
                  <Text style={styles.reporterLabel}>Dilaporkan oleh</Text>
                  <Text style={styles.reporterName}>{report.nama}</Text>
                </View>
              </View>

              <View style={styles.divider} />
              
              <Text style={styles.descLabel}>DESKRIPSI LAPORAN</Text>
              <Text style={styles.description}>{report.isi}</Text>
            </View>
          </View>

          <Text style={styles.timelineTitle}>Pelacakan Status</Text>
          <View style={styles.timelineCard}>
            
            {/* Step 1 */}
            <View style={styles.timelineItem}>
              <View style={styles.timelineIconContainer}>
                <View style={[styles.timelineIcon, isMenunggu ? styles.timelineIconActive : {}]}>
                  <Ionicons name="document-text" size={14} color={isMenunggu ? "#FFFFFF" : "#9CA3AF"} />
                </View>
                <View style={[styles.timelineLine, isDiproses ? styles.timelineLineActive : {}]} />
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineState, isMenunggu ? styles.textActive : {}]}>Laporan Diterima</Text>
                <Text style={styles.timelineDesc}>Laporan telah masuk ke dalam antrean sistem.</Text>
              </View>
            </View>

            {/* Step 2 */}
            <View style={styles.timelineItem}>
              <View style={styles.timelineIconContainer}>
                <View style={[styles.timelineIcon, isDiproses ? styles.timelineIconActive : {}]}>
                  <Ionicons name="sync" size={14} color={isDiproses ? "#FFFFFF" : "#9CA3AF"} />
                </View>
                <View style={[styles.timelineLine, isSelesai ? styles.timelineLineActive : {}]} />
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineState, isDiproses ? styles.textActive : {}]}>Sedang Diproses</Text>
                <Text style={styles.timelineDesc}>Petugas sedang meninjau dan menindaklanjuti laporan di lapangan.</Text>
              </View>
            </View>

            {/* Step 3 */}
            <View style={[styles.timelineItem, { paddingBottom: 0 }]}>
              <View style={styles.timelineIconContainer}>
                <View style={[styles.timelineIcon, isSelesai ? styles.timelineIconSuccess : {}]}>
                  <Ionicons name="checkmark-done" size={14} color={isSelesai ? "#FFFFFF" : "#9CA3AF"} />
                </View>
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineState, isSelesai ? styles.textSuccess : {}]}>Laporan Selesai</Text>
                <Text style={styles.timelineDesc}>Tindak lanjut telah diselesaikan. Terima kasih atas partisipasi Anda.</Text>
              </View>
            </View>

          </View>

        </ScrollView>

        {isAdmin && (
          <View style={styles.floatingButtonContainer}>
            <TouchableOpacity style={styles.adminBtn} onPress={handleAdminAction} activeOpacity={0.8}>
              <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.adminBtnText}>KELOLA STATUS LAPORAN</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Custom Premium Modal for Status Update */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Perbarui Status</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeModalBtn}>
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalSubtitle}>Pilih tahap operasional terbaru untuk laporan ini. Sistem akan otomatis memberitahu pelapor.</Text>

              <TouchableOpacity style={styles.statusOption} onPress={() => updateStatus('Menunggu')}>
                <View style={[styles.statusOptionIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="time" size={24} color="#D97706" />
                </View>
                <View style={styles.statusOptionTextWrap}>
                  <Text style={styles.statusOptionTitle}>Menunggu</Text>
                  <Text style={styles.statusOptionDesc}>Kembalikan ke antrean awal</Text>
                </View>
                {report.status === 'Menunggu' && <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />}
              </TouchableOpacity>

              <TouchableOpacity style={styles.statusOption} onPress={() => updateStatus('Diproses')}>
                <View style={[styles.statusOptionIcon, { backgroundColor: '#DBEAFE' }]}>
                  <Ionicons name="sync" size={24} color="#2563EB" />
                </View>
                <View style={styles.statusOptionTextWrap}>
                  <Text style={styles.statusOptionTitle}>Diproses</Text>
                  <Text style={styles.statusOptionDesc}>Tandai sedang ditindaklanjuti</Text>
                </View>
                {report.status === 'Diproses' && <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />}
              </TouchableOpacity>

              <TouchableOpacity style={styles.statusOption} onPress={() => updateStatus('Selesai')}>
                <View style={[styles.statusOptionIcon, { backgroundColor: '#D1FAE5' }]}>
                  <Ionicons name="checkmark-done" size={24} color="#059669" />
                </View>
                <View style={styles.statusOptionTextWrap}>
                  <Text style={styles.statusOptionTitle}>Selesai</Text>
                  <Text style={styles.statusOptionDesc}>Laporan telah ditangani tuntas</Text>
                </View>
                {report.status === 'Selesai' && <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  errorText: { fontSize: 16, color: '#64748B', marginBottom: 20 },
  backBtnError: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#0A2540', borderRadius: 8 },
  backBtnErrorText: { color: '#FFF', fontWeight: 'bold' },

  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 16, 
    paddingVertical: 12,
  },
  backButton: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center', alignItems: 'center'
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0A2540' },
  
  scrollContent: { padding: 20, paddingBottom: 40 },
  
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000', shadowOffset: {width:0, height:8}, shadowOpacity: 0.05, shadowRadius: 16, elevation: 4,
    marginBottom: 24
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  dateText: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  
  cardBody: {},
  title: { fontSize: 22, fontWeight: '900', color: '#0A2540', marginBottom: 16, lineHeight: 28 },
  
  reporterBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 16 },
  reporterInfo: { marginLeft: 12, flex: 1 },
  reporterLabel: { fontSize: 11, color: '#64748B', fontWeight: '600', marginBottom: 2 },
  reporterName: { fontSize: 14, color: '#1E293B', fontWeight: '700' },
  
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 20 },
  
  descLabel: { fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 1, marginBottom: 8 },
  description: { fontSize: 15, color: '#475569', lineHeight: 24 },

  timelineTitle: { fontSize: 18, fontWeight: '800', color: '#0A2540', marginBottom: 16, marginLeft: 4 },
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000', shadowOffset: {width:0, height:8}, shadowOpacity: 0.05, shadowRadius: 16, elevation: 4,
  },
  timelineItem: { flexDirection: 'row', paddingBottom: 24 },
  timelineIconContainer: { alignItems: 'center', width: 32, marginRight: 16 },
  timelineIcon: { 
    width: 28, height: 28, borderRadius: 14, 
    backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center',
    zIndex: 2
  },
  timelineIconActive: { backgroundColor: '#3B82F6', shadowColor: '#3B82F6', shadowOffset: {width:0, height:4}, shadowOpacity: 0.3, shadowRadius: 8 },
  timelineIconSuccess: { backgroundColor: '#10B981', shadowColor: '#10B981', shadowOffset: {width:0, height:4}, shadowOpacity: 0.3, shadowRadius: 8 },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#F1F5F9', marginTop: -4, marginBottom: -4, zIndex: 1 },
  timelineLineActive: { backgroundColor: '#3B82F6' },
  
  timelineContent: { flex: 1, paddingTop: 2 },
  timelineState: { fontSize: 15, fontWeight: '800', color: '#94A3B8', marginBottom: 4 },
  textActive: { color: '#0A2540' },
  textSuccess: { color: '#10B981' },
  timelineDesc: { fontSize: 13, color: '#64748B', lineHeight: 20 },

  floatingButtonContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 24,
    left: 20,
    right: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  adminBtn: {
    backgroundColor: '#0A2540',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    width: '100%',
    borderRadius: 28, // Make it fully rounded / pill shape for floating look
    shadowColor: '#0A2540', shadowOffset: {width:0, height:8}, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8
  },
  adminBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', letterSpacing: 1 },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(10, 37, 64, 0.4)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    shadowColor: '#000', shadowOffset: {width:0, height:-8}, shadowOpacity: 0.1, shadowRadius: 24, elevation: 20
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: { fontSize: 24, fontWeight: '900', color: '#0A2540' },
  closeModalBtn: { padding: 4 },
  modalSubtitle: { fontSize: 14, color: '#64748B', lineHeight: 22, marginBottom: 24 },
  
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  statusOptionIcon: {
    width: 48, height: 48,
    borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 16
  },
  statusOptionTextWrap: { flex: 1 },
  statusOptionTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 2 },
  statusOptionDesc: { fontSize: 13, color: '#64748B' }
});
