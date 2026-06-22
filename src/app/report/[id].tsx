import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, Platform, Modal, Pressable, Alert, TextInput, KeyboardAvoidingView, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth, database, storage } from '../../../firebaseConfig';
import { ref, onValue, update, push, set } from 'firebase/database';
import { Audio } from 'expo-av';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [adminTanggapan, setAdminTanggapan] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [uploadingVN, setUploadingVN] = useState(false);
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

    const msgRef = ref(database, `pengaduan/${id}/messages`);
    const unsubscribeMsg = onValue(msgRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const parsedMsgs = Object.keys(data).map(k => ({ id: k, ...data[k] }));
        setMessages(parsedMsgs.sort((a, b) => a.timestamp - b.timestamp));
      } else {
        setMessages([]);
      }
    });

    return () => {
      unsubscribe();
      unsubscribeMsg();
    };
  }, [id]);

  const handleSaveStatus = async () => {
    if (!report || !selectedStatus) return;
    setModalVisible(false);
    try {
      await update(ref(database, `pengaduan/${report.id}`), { 
        status: selectedStatus,
        ...(adminTanggapan ? { tanggapan: adminTanggapan } : {})
      });
      
      let notifType = 'info';
      let title = 'Status Diperbarui';
      if (selectedStatus === 'Selesai') { notifType = 'success'; title = 'Laporan Selesai!'; }
      if (selectedStatus === 'Diproses') { notifType = 'processing'; title = 'Sedang Diproses'; }
      if (selectedStatus === 'Menunggu') { notifType = 'system'; title = 'Menunggu Antrean'; }

      const notifRef = push(ref(database, 'notifications'));
      await set(notifRef, {
        userId: report.nama,
        title: title,
        message: `Laporan Anda "${report.judul}" kini berstatus: ${selectedStatus}.`,
        time: Date.now(),
        type: notifType,
        read: false
      });
    } catch (error) {
      Alert.alert('Gagal', 'Gagal memperbarui status');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !auth.currentUser) return;
    const msgRef = push(ref(database, `pengaduan/${id}/messages`));
    await set(msgRef, {
      text: newMessage.trim(),
      senderEmail: auth.currentUser.email,
      isAdmin: isAdmin,
      timestamp: Date.now()
    });
    setNewMessage('');
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording: newRec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        setRecording(newRec);
        setIsRecording(true);
      } else {
        Alert.alert("Izin Ditolak", "Tolong izinkan akses mikrofon.");
      }
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    setRecording(null);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (uri) {
        uploadVoiceNote(uri);
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  };

  const uploadVoiceNote = async (uri: string) => {
    if (!auth.currentUser) return;
    setUploadingVN(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = `vn_${Date.now()}.m4a`;
      const sRef = storageRef(storage, `voice_notes/${id}/${filename}`);
      await uploadBytes(sRef, blob);
      const downloadURL = await getDownloadURL(sRef);

      const msgRef = push(ref(database, `pengaduan/${id}/messages`));
      await set(msgRef, {
        text: '🎵 Pesan Suara',
        audioUrl: downloadURL,
        senderEmail: auth.currentUser.email,
        isAdmin: isAdmin,
        timestamp: Date.now()
      });
    } catch (err) {
      Alert.alert('Gagal', 'Gagal mengunggah pesan suara.');
      console.error(err);
    }
    setUploadingVN(false);
  };

  const getStatusColor = (status: string) => {
    if (status === 'Selesai') return { bg: '#F0FDF4', color: '#16A34A', border: '#DCFCE7' };
    if (status === 'Diproses') return { bg: '#EFF6FF', color: '#2563EB', border: '#DBEAFE' };
    return { bg: '#FEFCE8', color: '#CA8A04', border: '#FEF08A' };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#2563EB" />
      </SafeAreaView>
    );
  }

  if (!report) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.errorText}>Laporan tidak ditemukan.</Text>
        <TouchableOpacity style={styles.backBtnError} onPress={() => router.back()}>
          <Text style={styles.backBtnErrorText}>Kembali</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const statusCfg = getStatusColor(report.status);
  const isMenunggu = report.status === 'Menunggu' || report.status === 'Diproses' || report.status === 'Selesai';
  const isDiproses = report.status === 'Diproses' || report.status === 'Selesai';
  const isSelesai = report.status === 'Selesai';

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        
        <View style={styles.header}>
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
        </View>

        <ScrollView 
          ref={scrollViewRef}
          style={{ flex: 1 }} 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
        
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg, borderColor: statusCfg.border }]}>
              <Text style={[styles.statusText, { color: statusCfg.color }]}>{report.status}</Text>
            </View>
            <Text style={styles.dateText}>
              {new Date(report.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>

          <View style={styles.cardBody}>
            {report.kategori && (
              <View style={styles.catBadge}>
                <Text style={styles.catText}>{report.kategori}</Text>
              </View>
            )}
            <Text style={styles.title}>{report.judul}</Text>
            
            <View style={styles.reporterBox}>
              <Text style={styles.reporterLabel}>Dilaporkan oleh</Text>
              <Text style={styles.reporterName}>{report.nama}</Text>
            </View>

            <View style={styles.divider} />
            
            <Text style={styles.descLabel}>DESKRIPSI</Text>
            <Text style={styles.description}>{report.isi}</Text>

            {report.tanggapan && (
              <View style={styles.adminTanggapanBox}>
                <View style={styles.adminTanggapanHeader}>
                  <Ionicons name="chatbubble-ellipses" size={16} color="#0284C7" style={{marginRight: 6}} />
                  <Text style={styles.adminTanggapanTitle}>Tanggapan Petugas</Text>
                </View>
                <Text style={styles.adminTanggapanText}>{report.tanggapan}</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.timelineTitle}>Riwayat Status</Text>
        <View style={styles.timelineCard}>
          
          {/* Step 1 */}
          <View style={styles.timelineItem}>
            <View style={styles.timelineIconContainer}>
              <View style={[styles.timelineIcon, isMenunggu ? styles.timelineIconActive : {}]}>
                <Ionicons name="document-text" size={14} color={isMenunggu ? "#FFFFFF" : "#CBD5E1"} />
              </View>
              <View style={[styles.timelineLine, isDiproses ? styles.timelineLineActive : {}]} />
            </View>
            <View style={styles.timelineContent}>
              <Text style={[styles.timelineState, isMenunggu ? styles.textActive : {}]}>Diterima</Text>
              <Text style={styles.timelineDesc}>Laporan masuk ke dalam sistem antrean.</Text>
            </View>
          </View>

          {/* Step 2 */}
          <View style={styles.timelineItem}>
            <View style={styles.timelineIconContainer}>
              <View style={[styles.timelineIcon, isDiproses ? styles.timelineIconActive : {}]}>
                <Ionicons name="sync" size={14} color={isDiproses ? "#FFFFFF" : "#CBD5E1"} />
              </View>
              <View style={[styles.timelineLine, isSelesai ? styles.timelineLineActive : {}]} />
            </View>
            <View style={styles.timelineContent}>
              <Text style={[styles.timelineState, isDiproses ? styles.textActive : {}]}>Sedang Diproses</Text>
              <Text style={styles.timelineDesc}>Petugas sedang meninjau dan menindaklanjuti.</Text>
            </View>
          </View>

          {/* Step 3 */}
          <View style={[styles.timelineItem, { paddingBottom: 0 }]}>
            <View style={styles.timelineIconContainer}>
              <View style={[styles.timelineIcon, isSelesai ? styles.timelineIconSuccess : {}]}>
                <Ionicons name="checkmark" size={14} color={isSelesai ? "#FFFFFF" : "#CBD5E1"} />
              </View>
            </View>
            <View style={styles.timelineContent}>
              <Text style={[styles.timelineState, isSelesai ? styles.textSuccess : {}]}>Selesai</Text>
              <Text style={styles.timelineDesc}>Tindak lanjut telah diselesaikan.</Text>
            </View>
          </View>

        </View>

        <Text style={styles.timelineTitle}>Diskusi Laporan</Text>
        <View style={styles.chatContainer}>
          {messages.length === 0 ? (
            <Text style={styles.emptyChatText}>Belum ada diskusi. Kirim pesan untuk bertanya ke petugas.</Text>
          ) : (
            messages.map(msg => {
              const isMe = msg.senderEmail === auth.currentUser?.email;
              return <AnimatedChatBubble key={msg.id} msg={msg} isMe={isMe} />;
            })
          )}
        </View>

      </ScrollView>

      <View style={styles.chatInputContainer}>
        <TextInput
          style={styles.chatInput}
          placeholder={isRecording ? "Merekam suara..." : "Tulis pesan..."}
          placeholderTextColor={isRecording ? "#DC2626" : "#94A3B8"}
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          editable={!isRecording && !uploadingVN}
        />
        {uploadingVN ? (
          <ActivityIndicator color="#2563EB" style={{ marginHorizontal: 12, marginBottom: 12 }} />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity 
              style={[styles.chatMicBtn, isRecording ? { backgroundColor: '#DC2626', transform: [{ scale: 1.1 }] } : {}]} 
              onPressIn={startRecording}
              onPressOut={stopRecording}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={isRecording ? "mic" : "mic-outline"} 
                size={20} 
                color={isRecording ? "#FFFFFF" : "#64748B"} 
              />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.chatSendBtn, !newMessage.trim() ? { opacity: 0.5 } : {}]} 
              onPress={sendMessage}
              disabled={!newMessage.trim()}
            >
              <Ionicons name="send" size={16} color="#FFFFFF" style={{ marginLeft: 3 }} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      </KeyboardAvoidingView>

      {/* Modal Minimalist */}
      <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView 
          style={styles.modalOverlay} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Perbarui Status</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeModalBtn}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {['Menunggu', 'Diproses', 'Selesai'].map(statusOption => {
              const isActive = (selectedStatus || report.status) === statusOption;
              return (
                <TouchableOpacity key={statusOption} style={styles.statusOption} onPress={() => setSelectedStatus(statusOption)}>
                  <View style={styles.statusOptionTextWrap}>
                    <Text style={styles.statusOptionTitle}>{statusOption}</Text>
                    <Text style={styles.statusOptionDesc}>
                      {statusOption === 'Menunggu' ? 'Kembalikan ke antrean awal' : statusOption === 'Diproses' ? 'Sedang ditindaklanjuti' : 'Laporan tuntas'}
                    </Text>
                  </View>
                  {isActive && <Ionicons name="checkmark" size={20} color="#0F172A" />}
                </TouchableOpacity>
              )
            })}

            {selectedStatus && (
              <View style={styles.tanggapanInputContainer}>
                <Text style={styles.tanggapanLabel}>CATATAN PETUGAS (Opsional)</Text>
                <TextInput
                  style={styles.tanggapanInput}
                  placeholder="Ketik pesan untuk pelapor..."
                  placeholderTextColor="#94A3B8"
                  value={adminTanggapan}
                  onChangeText={setAdminTanggapan}
                  multiline
                />
                <TouchableOpacity style={styles.saveModalBtn} onPress={handleSaveStatus}>
                  <Text style={styles.saveModalBtnText}>Simpan Pembaruan</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  errorText: { fontSize: 15, color: '#64748B', marginBottom: 16 },
  backBtnError: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#F1F5F9', borderRadius: 8 },
  backBtnErrorText: { color: '#0F172A', fontWeight: '600', fontSize: 14 },

  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 16, 
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC'
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  headerAdminBtn: { backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  headerAdminBtnText: { color: '#2563EB', fontSize: 12, fontWeight: '700' },
  
  scrollContent: { padding: 24, paddingBottom: 40 },
  
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 32
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '600' },
  dateText: { fontSize: 12, color: '#94A3B8' },
  
  cardBody: {},
  catBadge: { alignSelf: 'flex-start', backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 12 },
  catText: { fontSize: 11, fontWeight: '600', color: '#64748B', textTransform: 'uppercase' },
  title: { fontSize: 20, fontWeight: '700', color: '#0F172A', marginBottom: 16, lineHeight: 28 },
  
  reporterBox: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8 },
  reporterLabel: { fontSize: 11, color: '#64748B', fontWeight: '500', marginBottom: 2 },
  reporterName: { fontSize: 14, color: '#0F172A', fontWeight: '600' },
  
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 20 },
  
  descLabel: { fontSize: 11, fontWeight: '600', color: '#94A3B8', marginBottom: 8 },
  description: { fontSize: 15, color: '#475569', lineHeight: 24 },

  adminTanggapanBox: {
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E0F2FE'
  },
  adminTanggapanHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  adminTanggapanTitle: { fontSize: 13, fontWeight: '700', color: '#0284C7' },
  adminTanggapanText: { fontSize: 14, color: '#0369A1', lineHeight: 22 },

  timelineTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 16 },
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 32
  },
  timelineItem: { flexDirection: 'row', paddingBottom: 24 },
  timelineIconContainer: { alignItems: 'center', width: 24, marginRight: 16 },
  timelineIcon: { 
    width: 24, height: 24, borderRadius: 12, 
    backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center',
    zIndex: 2
  },
  timelineIconActive: { backgroundColor: '#2563EB' },
  timelineIconSuccess: { backgroundColor: '#16A34A' },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#F1F5F9', marginTop: -4, marginBottom: -4, zIndex: 1 },
  timelineLineActive: { backgroundColor: '#2563EB' },
  
  timelineContent: { flex: 1, paddingTop: 2 },
  timelineState: { fontSize: 14, fontWeight: '600', color: '#64748B', marginBottom: 4 },
  textActive: { color: '#2563EB' },
  textSuccess: { color: '#16A34A' },
  timelineDesc: { fontSize: 13, color: '#94A3B8', lineHeight: 20 },

  chatContainer: { 
    paddingBottom: 8,
    marginTop: 8
  },
  emptyChatText: { textAlign: 'center', color: '#94A3B8', fontStyle: 'italic', marginVertical: 16, fontSize: 13 },
  chatBubbleWrap: { marginBottom: 12, maxWidth: '85%' },
  chatBubbleRight: { alignSelf: 'flex-end' },
  chatBubbleLeft: { alignSelf: 'flex-start' },
  chatSenderName: { fontSize: 11, fontWeight: '600', color: '#64748B', marginBottom: 4, marginLeft: 8 },
  chatBubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  chatBubbleMe: { backgroundColor: '#2563EB', borderBottomRightRadius: 4 },
  chatBubbleThem: { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  chatText: { fontSize: 14, lineHeight: 20 },
  chatTimeContainer: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 4 },
  chatTime: { fontSize: 10 },

  chatInputContainer: { 
    flexDirection: 'row', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderTopWidth: 1, 
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'flex-end',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    maxHeight: 100,
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontSize: 14,
    color: '#0F172A'
  },
  chatMicBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  chatSendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    marginBottom: 0
  },

  // Modal Minimalist
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  closeModalBtn: { padding: 4 },
  
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9'
  },
  statusOptionTextWrap: { flex: 1 },
  statusOptionTitle: { fontSize: 15, fontWeight: '600', color: '#0F172A', marginBottom: 2 },
  statusOptionDesc: { fontSize: 13, color: '#64748B' },
  
  tanggapanInputContainer: { marginTop: 24 },
  tanggapanLabel: { fontSize: 11, fontWeight: '600', color: '#64748B', marginBottom: 8 },
  tanggapanInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 80,
    textAlignVertical: 'top'
  },
  saveModalBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16
  },
  saveModalBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 }
});

const AnimatedChatBubble = ({ msg, isMe }: { msg: any, isMe: boolean }) => {
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  return (
    <Animated.View style={[
      styles.chatBubbleWrap, 
      isMe ? styles.chatBubbleRight : styles.chatBubbleLeft,
      { transform: [{ scale: scaleAnim }], opacity: opacityAnim }
    ]}>
      {!isMe && <Text style={styles.chatSenderName}>{msg.isAdmin ? 'Petugas Admin' : msg.senderEmail.split('@')[0]}</Text>}
      <View style={[styles.chatBubble, isMe ? styles.chatBubbleMe : styles.chatBubbleThem]}>
        
        {msg.audioUrl ? (
          <AudioPlayer url={msg.audioUrl} isMe={isMe} />
        ) : (
          <Text style={[styles.chatText, isMe ? {color: '#FFF'} : {color: '#0F172A'}]}>{msg.text}</Text>
        )}

        <View style={styles.chatTimeContainer}>
          <Text style={[styles.chatTime, isMe ? {color: 'rgba(255,255,255,0.8)'} : {color: '#94A3B8'}]}>
            {new Date(msg.timestamp).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}
          </Text>
          {isMe && (
            <Ionicons 
              name="checkmark-done" 
              size={14} 
              color="#93C5FD" 
              style={{ marginLeft: 4 }} 
            />
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const AudioPlayer = ({ url, isMe }: { url: string, isMe: boolean }) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(1);

  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  const loadSound = async () => {
    const { sound: newSound } = await Audio.Sound.createAsync(
      { uri: url },
      { shouldPlay: true },
      (status: any) => {
        if (status.isLoaded) {
          setPosition(status.positionMillis);
          setDuration(status.durationMillis || 1);
          setIsPlaying(status.isPlaying);
          if (status.didJustFinish) {
            setIsPlaying(false);
            setPosition(0);
          }
        }
      }
    );
    setSound(newSound);
    setIsPlaying(true);
  };

  const playPause = async () => {
    if (!sound) {
      await loadSound();
    } else {
      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        if (position >= duration) {
          await sound.playFromPositionAsync(0);
        } else {
          await sound.playAsync();
        }
      }
    }
  };

  const progress = position / duration;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', width: 160, paddingVertical: 4 }}>
      <TouchableOpacity onPress={playPause} style={{ marginRight: 8 }}>
        <Ionicons name={isPlaying ? "pause-circle" : "play-circle"} size={32} color={isMe ? "#FFFFFF" : "#2563EB"} />
      </TouchableOpacity>
      <View style={{ flex: 1, height: 4, backgroundColor: isMe ? 'rgba(255,255,255,0.3)' : '#E2E8F0', borderRadius: 2 }}>
        <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: isMe ? '#FFFFFF' : '#2563EB', borderRadius: 2 }} />
      </View>
    </View>
  );
};
