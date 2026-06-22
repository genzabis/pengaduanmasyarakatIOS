import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Modal, Pressable, Alert, TextInput, KeyboardAvoidingView, Animated, Image, useColorScheme, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth, database } from '../../../firebaseConfig';
import { ref, onValue, update, push, set, remove } from 'firebase/database';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Colors } from '../../constants/Colors';

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
  const [selectedMessageForAction, setSelectedMessageForAction] = useState<any>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [pendingDeletes, setPendingDeletes] = useState<Record<string, {type: 'me' | 'everyone', timeoutId: any}>>({});
  
  // Voice Note Playback State
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlayingVN, setIsPlayingVN] = useState(false);

  const isAdmin = auth.currentUser?.email === 'admin@gmail.com';

  const isDark = false;
  const theme = Colors.light;

  const CUSTOM_LOW_QUALITY_M4A = {
    isMeteringEnabled: true,
    android: {
      extension: '.m4a',
      outputFormat: Audio.AndroidOutputFormat.MPEG_4,
      audioEncoder: Audio.AndroidAudioEncoder.AAC,
      sampleRate: 16000,
      numberOfChannels: 1,
      bitRate: 16000,
    },
    ios: {
      extension: '.m4a',
      outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
      audioQuality: Audio.IOSAudioQuality.LOW,
      sampleRate: 16000,
      numberOfChannels: 1,
      bitRate: 16000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    web: {
      mimeType: 'audio/mp4',
      bitsPerSecond: 16000,
    },
  };

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

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const togglePlayVN = async () => {
    if (!report?.audioBase64) return;
    
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      if (sound) {
        if (isPlayingVN) {
          await sound.pauseAsync();
          setIsPlayingVN(false);
        } else {
          await sound.playAsync();
          setIsPlayingVN(true);
        }
      } else {
        // Write base64 to temp file to play
        const base64Data = report.audioBase64.split(',')[1];
        if (!base64Data) return;
        
        const tempUri = FileSystem.cacheDirectory + 'temp_report_vn.m4a';
        await FileSystem.writeAsStringAsync(tempUri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
        
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: tempUri },
          { shouldPlay: true }
        );
        
        newSound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.didJustFinish) {
            setIsPlayingVN(false);
            newSound.setPositionAsync(0);
          }
        });
        
        setSound(newSound);
        setIsPlayingVN(true);
      }
    } catch (error) {
      console.log('Error playing VN:', error);
    }
  };

  useEffect(() => {
    if (!messages.length || !auth.currentUser) return;
    messages.forEach(msg => {
      if (msg.senderEmail !== auth.currentUser?.email && !msg.read) {
        update(ref(database, `pengaduan/${id}/messages/${msg.id}`), { read: true });
      }
    });
  }, [messages, id]);

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
    } catch (e) {
      console.log('Update status error', e);
    }
  };

  const handleDeleteReport = () => {
    Alert.alert(
      "Hapus Laporan",
      "Yakin ingin menghapus laporan ini secara permanen?",
      [
        { text: "Batal", style: "cancel" },
        { 
          text: "Hapus", 
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await remove(ref(database, `pengaduan/${id}`));
              Alert.alert("Dihapus", "Laporan berhasil dihapus.");
              router.replace('/(tabs)/list');
            } catch (err: any) {
              Alert.alert("Gagal", err.message);
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleExportPDF = async () => {
    if (!report) return;
    try {
      const getStatusClass = (status: string) => {
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
  };

  const handleDeleteForMe = () => {
    if (!selectedMessageForAction) return;
    const msg = selectedMessageForAction;
    setActionModalVisible(false);
    
    const timeoutId = setTimeout(async () => {
      try {
        const deletedFor = msg.deletedFor || [];
        if (!deletedFor.includes(auth.currentUser?.email)) {
          deletedFor.push(auth.currentUser?.email);
          await update(ref(database, `pengaduan/${id}/messages/${msg.id}`), { deletedFor });
        }
      } catch (e) {
        console.error('Delete for me error:', e);
      }
      setPendingDeletes(prev => {
        const newDels = {...prev};
        delete newDels[msg.id];
        return newDels;
      });
    }, 5000);

    setPendingDeletes(prev => ({
      ...prev,
      [msg.id]: { type: 'me', timeoutId }
    }));
  };

  const handleDeleteForEveryone = () => {
    if (!selectedMessageForAction) return;
    const msg = selectedMessageForAction;
    setActionModalVisible(false);

    const timeoutId = setTimeout(async () => {
      try {
        await update(ref(database, `pengaduan/${id}/messages/${msg.id}`), { 
          isDeletedForEveryone: true,
          text: '',
          audioUrl: null
        });
      } catch (e) {
        console.error('Delete for everyone error:', e);
      }
      setPendingDeletes(prev => {
        const newDels = {...prev};
        delete newDels[msg.id];
        return newDels;
      });
    }, 5000);

    setPendingDeletes(prev => ({
      ...prev,
      [msg.id]: { type: 'everyone', timeoutId }
    }));
  };

  const handleUndo = (msgId: string) => {
    const pending = pendingDeletes[msgId];
    if (pending) {
      clearTimeout(pending.timeoutId);
      setPendingDeletes(prev => {
        const newDels = {...prev};
        delete newDels[msgId];
        return newDels;
      });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !auth.currentUser) return;
    const msgRef = push(ref(database, `pengaduan/${id}/messages`));
    await set(msgRef, {
      text: newMessage.trim(),
      senderEmail: auth.currentUser.email,
      isAdmin: isAdmin,
      timestamp: Date.now(),
      read: false
    });
    setNewMessage('');
  };

  const startRecording = async () => {
    try {
      if (recording) {
        try {
          await recording.stopAndUnloadAsync();
        } catch (e) {}
        setRecording(null);
      }
      
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording: newRec } = await Audio.Recording.createAsync(CUSTOM_LOW_QUALITY_M4A);
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
      const base64Audio = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      const audioUrl = `data:audio/m4a;base64,${base64Audio}`;

      const msgRef = push(ref(database, `pengaduan/${id}/messages`));
      await set(msgRef, {
        text: '🎵 Pesan Suara',
        audioUrl: audioUrl,
        senderEmail: auth.currentUser.email,
        isAdmin: isAdmin,
        timestamp: Date.now(),
        read: false
      });
      
      if (isAdmin && report?.status === 'Menunggu') {
        update(ref(database, `pengaduan/${id}`), { status: 'Diproses' });
      }
    } catch (err: any) {
      console.error('Upload VN Error:', err);
      Alert.alert('Gagal', 'Tidak dapat mengirim voice note: ' + err.message);
    }
    setUploadingVN(false);
  };

  const getStatusColor = (status: string) => {
    if (status === 'Selesai') return { bg: isDark ? '#14532D' : '#F0FDF4', color: isDark ? '#4ADE80' : '#16A34A', border: isDark ? '#166534' : '#DCFCE7' };
    if (status === 'Diproses') return { bg: isDark ? '#1E3A8A' : '#EFF6FF', color: isDark ? '#60A5FA' : '#2563EB', border: isDark ? '#1D4ED8' : '#DBEAFE' };
    return { bg: isDark ? '#713F12' : '#FEFCE8', color: isDark ? '#FACC15' : '#CA8A04', border: isDark ? '#854D0E' : '#FEF08A' };
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="small" color={theme.tint} />
      </SafeAreaView>
    );
  }

  if (!report) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.textSecondary }]}>Laporan tidak ditemukan.</Text>
        <TouchableOpacity style={[styles.backBtnError, { backgroundColor: theme.inputBackground }]} onPress={() => router.back()}>
          <Text style={[styles.backBtnErrorText, { color: theme.text }]}>Kembali</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const statusCfg = getStatusColor(report.status);
  const isMenunggu = report.status === 'Menunggu' || report.status === 'Diproses' || report.status === 'Selesai';
  const isDiproses = report.status === 'Diproses' || report.status === 'Selesai';
  const isSelesai = report.status === 'Selesai';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        
        <View style={[styles.header, { borderBottomColor: theme.divider }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Detail Laporan</Text>
          <View style={styles.headerRight}>
          </View>
        </View>

        <ScrollView 
          ref={scrollViewRef}
          style={{ flex: 1 }} 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
        
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg, borderColor: statusCfg.border }]}>
              <Text style={[styles.statusText, { color: statusCfg.color }]}>{report.status}</Text>
            </View>
            <Text style={[styles.dateText, { color: theme.textSecondary }]}>
              {new Date(report.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>

          <View style={styles.cardBody}>
            {report.kategori && (
              <View style={[styles.catBadge, { backgroundColor: theme.inputBackground }]}>
                <Text style={[styles.catText, { color: theme.textSecondary }]}>{report.kategori}</Text>
              </View>
            )}
            <Text style={[styles.title, { color: theme.text }]}>{report.judul}</Text>
            
            <View style={[styles.reporterBox, { backgroundColor: theme.inputBackground }]}>
              <Text style={[styles.reporterLabel, { color: theme.textSecondary }]}>Dilaporkan oleh</Text>
              <Text style={[styles.reporterName, { color: theme.text }]}>{report.nama}</Text>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.divider }]} />
            
            <Text style={[styles.descLabel, { color: theme.textSecondary }]}>DESKRIPSI</Text>
            <Text style={[styles.description, { color: theme.text }]}>{report.isi}</Text>

            {report.imageUrl && (
              <View style={styles.proofImageContainer}>
                <Text style={[styles.descLabel, { color: theme.textSecondary }]}>FOTO BUKTI</Text>
                <Image source={{ uri: report.imageUrl }} style={[styles.proofImage, { borderColor: theme.border }]} />
              </View>
            )}

            {report.location && (
              <View style={styles.locationContainer}>
                <Text style={[styles.descLabel, { color: theme.textSecondary }]}>LOKASI KEJADIAN (GPS)</Text>
                <View style={[styles.locationCard, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5', borderColor: isDark ? '#047857' : '#D1FAE5' }]}>
                  <View style={styles.locationInfo}>
                    <Ionicons name="location" size={24} color="#10B981" />
                    <View style={{ marginLeft: 12 }}>
                      <Text style={[styles.locationText, { color: isDark ? '#6EE7B7' : '#047857' }]}>Titik Kordinat</Text>
                      <Text style={[styles.locationSubText, { color: isDark ? '#A7F3D0' : '#059669' }]}>{report.location.latitude.toFixed(5)}, {report.location.longitude.toFixed(5)}</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={[styles.locationBtn, { backgroundColor: isDark ? '#047857' : '#10B981' }]} 
                    onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${report.location.latitude},${report.location.longitude}`)}
                  >
                    <Text style={styles.locationBtnText}>Buka Maps</Text>
                    <Ionicons name="open-outline" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {report.audioBase64 && (
              <View style={styles.locationContainer}>
                <Text style={[styles.descLabel, { color: theme.textSecondary }]}>BUKTI REKAMAN SUARA</Text>
                <View style={[styles.locationCard, { backgroundColor: isDark ? '#4C1D95' : '#F5F3FF', borderColor: isDark ? '#5B21B6' : '#EDE9FE' }]}>
                  <View style={styles.locationInfo}>
                    <Ionicons name="mic" size={24} color="#8B5CF6" />
                    <View style={{ marginLeft: 12 }}>
                      <Text style={[styles.locationText, { color: isDark ? '#C4B5FD' : '#6D28D9' }]}>Voice Note Warga</Text>
                      <Text style={[styles.locationSubText, { color: isDark ? '#DDD6FE' : '#8B5CF6' }]}>Audio berdurasi singkat</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={[styles.locationBtn, { backgroundColor: isDark ? '#5B21B6' : '#8B5CF6' }]} 
                    onPress={togglePlayVN}
                  >
                    <Text style={styles.locationBtnText}>{isPlayingVN ? 'Stop' : 'Play'}</Text>
                    <Ionicons name={isPlayingVN ? "stop" : "play"} size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {report.tanggapan && (
              <View style={[styles.adminTanggapanBox, { backgroundColor: isDark ? '#072E5A' : '#F0F9FF', borderColor: isDark ? '#0F529E' : '#E0F2FE' }]}>
                <View style={styles.adminTanggapanHeader}>
                  <Ionicons name="chatbubble-ellipses" size={16} color={isDark ? '#60A5FA' : '#0284C7'} style={{marginRight: 6}} />
                  <Text style={[styles.adminTanggapanTitle, { color: isDark ? '#60A5FA' : '#0284C7' }]}>Tanggapan Petugas</Text>
                </View>
                <Text style={[styles.adminTanggapanText, { color: isDark ? '#93C5FD' : '#0369A1' }]}>{report.tanggapan}</Text>
              </View>
            )}

            <View style={[styles.divider, { backgroundColor: theme.divider }]} />
            
            <View style={{ gap: 10 }}>
              <TouchableOpacity style={[styles.actionBtnFull, { backgroundColor: isDark ? '#1E3A8A' : '#EFF6FF', borderColor: isDark ? '#1D4ED8' : '#BFDBFE' }]} onPress={handleExportPDF}>
                <Ionicons name="download-outline" size={18} color={theme.tint} style={{marginRight: 8}} />
                <Text style={[styles.actionBtnFullText, { color: theme.tint }]}>Download Bukti Laporan (PDF)</Text>
              </TouchableOpacity>

              {isAdmin && (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity style={styles.adminActionBtnPrimary} onPress={() => setModalVisible(true)}>
                    <Ionicons name="create-outline" size={18} color="#FFFFFF" style={{marginRight: 6}} />
                    <Text style={styles.adminActionBtnPrimaryText}>Kelola Status</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={[styles.adminActionBtnDanger, { backgroundColor: theme.dangerBg, borderColor: theme.dangerBorder }]} onPress={handleDeleteReport}>
                    <Ionicons name="trash-outline" size={18} color={theme.errorText} style={{marginRight: 6}} />
                    <Text style={[styles.adminActionBtnDangerText, { color: theme.errorText }]}>Hapus</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>

        <Text style={[styles.timelineTitle, { color: theme.text }]}>Riwayat Status</Text>
        <View style={[styles.timelineCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          
          {/* Step 1 */}
          <View style={styles.timelineItem}>
            <View style={styles.timelineIconContainer}>
              <View style={[styles.timelineIcon, { backgroundColor: theme.inputBackground }, isMenunggu ? styles.timelineIconActive : {}]}>
                <Ionicons name="document-text" size={14} color={isMenunggu ? "#FFFFFF" : theme.icon} />
              </View>
              <View style={[styles.timelineLine, { backgroundColor: theme.inputBackground }, isDiproses ? styles.timelineLineActive : {}]} />
            </View>
            <View style={styles.timelineContent}>
              <Text style={[styles.timelineState, { color: theme.textSecondary }, isMenunggu ? styles.textActive : {}]}>Diterima</Text>
              <Text style={[styles.timelineDesc, { color: theme.textSecondary }]}>Laporan masuk ke dalam sistem antrean.</Text>
            </View>
          </View>

          {/* Step 2 */}
          <View style={styles.timelineItem}>
            <View style={styles.timelineIconContainer}>
              <View style={[styles.timelineIcon, { backgroundColor: theme.inputBackground }, isDiproses ? styles.timelineIconActive : {}]}>
                <Ionicons name="sync" size={14} color={isDiproses ? "#FFFFFF" : theme.icon} />
              </View>
              <View style={[styles.timelineLine, { backgroundColor: theme.inputBackground }, isSelesai ? styles.timelineLineActive : {}]} />
            </View>
            <View style={styles.timelineContent}>
              <Text style={[styles.timelineState, { color: theme.textSecondary }, isDiproses ? styles.textActive : {}]}>Sedang Diproses</Text>
              <Text style={[styles.timelineDesc, { color: theme.textSecondary }]}>Petugas sedang meninjau dan menindaklanjuti.</Text>
            </View>
          </View>

          {/* Step 3 */}
          <View style={[styles.timelineItem, { paddingBottom: 0 }]}>
            <View style={styles.timelineIconContainer}>
              <View style={[styles.timelineIcon, { backgroundColor: theme.inputBackground }, isSelesai ? styles.timelineIconSuccess : {}]}>
                <Ionicons name="checkmark" size={14} color={isSelesai ? "#FFFFFF" : theme.icon} />
              </View>
            </View>
            <View style={styles.timelineContent}>
              <Text style={[styles.timelineState, { color: theme.textSecondary }, isSelesai ? styles.textSuccess : {}]}>Selesai</Text>
              <Text style={[styles.timelineDesc, { color: theme.textSecondary }]}>Tindak lanjut telah diselesaikan.</Text>
            </View>
          </View>

        </View>

        <Text style={[styles.timelineTitle, { color: theme.text }]}>Diskusi Laporan</Text>
        <View style={styles.chatContainer}>
          {messages.length === 0 ? (
            <Text style={[styles.emptyChatText, { color: theme.textSecondary }]}>Belum ada diskusi. Kirim pesan untuk bertanya ke petugas.</Text>
          ) : (
            messages.map(msg => {
              if (msg.deletedFor && msg.deletedFor.includes(auth.currentUser?.email)) return null;
              if (pendingDeletes[msg.id]) return null;

              const isMe = msg.senderEmail === auth.currentUser?.email;
              return (
                <AnimatedChatBubble 
                  key={msg.id} 
                  msg={msg} 
                  isMe={isMe} 
                  onLongPress={() => {
                    setSelectedMessageForAction(msg);
                    setActionModalVisible(true);
                  }}
                  theme={theme}
                  isDark={isDark}
                />
              );
            })
          )}
        </View>

      </ScrollView>

      <View style={[styles.chatInputContainer, { backgroundColor: theme.card, borderTopColor: theme.divider }]}>
        <TextInput
          style={[styles.chatInput, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text }]}
          placeholder={isRecording ? "Merekam suara..." : "Tulis pesan..."}
          placeholderTextColor={isRecording ? theme.errorText : theme.icon}
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          editable={!isRecording && !uploadingVN}
        />
        {uploadingVN ? (
          <ActivityIndicator color={theme.tint} style={{ marginHorizontal: 12, marginBottom: 12 }} />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity 
              style={[styles.chatMicBtn, { backgroundColor: theme.inputBackground }, isRecording ? { backgroundColor: theme.errorText, transform: [{ scale: 1.1 }] } : {}]} 
              onPressIn={startRecording}
              onPressOut={stopRecording}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={isRecording ? "mic" : "mic-outline"} 
                size={20} 
                color={isRecording ? "#FFFFFF" : theme.icon} 
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
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Perbarui Status</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeModalBtn}>
                <Ionicons name="close" size={24} color={theme.icon} />
              </TouchableOpacity>
            </View>

            {['Menunggu', 'Diproses', 'Selesai'].map(statusOption => {
              const isActive = (selectedStatus || report.status) === statusOption;
              return (
                <TouchableOpacity key={statusOption} style={[styles.statusOption, { borderBottomColor: theme.divider }]} onPress={() => setSelectedStatus(statusOption)}>
                  <View style={styles.statusOptionTextWrap}>
                    <Text style={[styles.statusOptionTitle, { color: theme.text }]}>{statusOption}</Text>
                    <Text style={[styles.statusOptionDesc, { color: theme.textSecondary }]}>
                      {statusOption === 'Menunggu' ? 'Kembalikan ke antrean awal' : statusOption === 'Diproses' ? 'Sedang ditindaklanjuti' : 'Laporan tuntas'}
                    </Text>
                  </View>
                  {isActive && <Ionicons name="checkmark" size={20} color={theme.text} />}
                </TouchableOpacity>
              )
            })}

            {selectedStatus && (
              <View style={styles.tanggapanInputContainer}>
                <Text style={[styles.tanggapanLabel, { color: theme.textSecondary }]}>CATATAN PETUGAS (Opsional)</Text>
                <TextInput
                  style={[styles.tanggapanInput, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text }]}
                  placeholder="Ketik pesan untuk pelapor..."
                  placeholderTextColor={theme.icon}
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

      {/* Action Modal untuk Hapus */}
      <Modal animationType="fade" transparent={true} visible={actionModalVisible} onRequestClose={() => setActionModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setActionModalVisible(false)} />
          <View style={[styles.actionModalContent, { backgroundColor: theme.card }]}>
            <TouchableOpacity style={styles.actionOption} onPress={handleDeleteForMe}>
              <Ionicons name="trash-outline" size={20} color={theme.text} />
              <Text style={[styles.actionOptionText, { color: theme.text }]}>Hapus untuk saya</Text>
            </TouchableOpacity>
            
            {(selectedMessageForAction?.senderEmail === auth.currentUser?.email || isAdmin) && !selectedMessageForAction?.isDeletedForEveryone && (
              <TouchableOpacity style={[styles.actionOption, { borderTopWidth: 1, borderTopColor: theme.divider }]} onPress={handleDeleteForEveryone}>
                <Ionicons name="trash-bin-outline" size={20} color={theme.errorText} />
                <Text style={[styles.actionOptionText, { color: theme.errorText }]}>Hapus untuk semua</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Snackbar Undo */}
      {Object.keys(pendingDeletes).length > 0 && (
        <View style={styles.snackbarContainer}>
          <Text style={styles.snackbarText}>Pesan dihapus</Text>
          <TouchableOpacity onPress={() => handleUndo(Object.keys(pendingDeletes)[0])}>
            <Text style={styles.snackbarUndoText}>UNDO</Text>
          </TouchableOpacity>
        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 15, marginBottom: 16 },
  backBtnError: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  backBtnErrorText: { fontWeight: '600', fontSize: 14 },

  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 16, 
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 16, fontWeight: '600' },
  headerRight: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', minWidth: 60 },
  
  scrollContent: { padding: 24, paddingBottom: 40 },
  
  card: { borderRadius: 16, padding: 20, borderWidth: 1, marginBottom: 32 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '600' },
  dateText: { fontSize: 12 },
  
  cardBody: {},
  catBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 12 },
  catText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 16, lineHeight: 28 },
  
  reporterBox: { padding: 12, borderRadius: 8 },
  reporterLabel: { fontSize: 11, fontWeight: '500', marginBottom: 2 },
  reporterName: { fontSize: 14, fontWeight: '600' },
  
  divider: { height: 1, marginVertical: 20 },
  
  descLabel: { fontSize: 11, fontWeight: '600', marginBottom: 8 },
  description: { fontSize: 15, lineHeight: 24 },

  proofImageContainer: { marginTop: 24 },
  proofImage: { width: '100%', height: 200, borderRadius: 12, borderWidth: 1, marginTop: 8 },

  locationContainer: { marginTop: 24 },
  locationCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, borderWidth: 1, marginTop: 8 },
  locationInfo: { flexDirection: 'row', alignItems: 'center' },
  locationText: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  locationSubText: { fontSize: 12 },
  locationBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  locationBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  
  adminTanggapanBox: { padding: 16, borderRadius: 12, marginTop: 24, borderWidth: 1 },
  adminTanggapanHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  adminTanggapanTitle: { fontSize: 13, fontWeight: '700' },
  adminTanggapanText: { fontSize: 14, lineHeight: 22 },

  timelineTitle: { fontSize: 16, fontWeight: '600', marginBottom: 16 },
  timelineCard: { borderRadius: 16, padding: 24, borderWidth: 1, marginBottom: 32 },
  timelineItem: { flexDirection: 'row', paddingBottom: 24 },
  timelineIconContainer: { alignItems: 'center', width: 24, marginRight: 16 },
  timelineIcon: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  timelineIconActive: { backgroundColor: '#2563EB' },
  timelineIconSuccess: { backgroundColor: '#16A34A' },
  timelineLine: { width: 2, flex: 1, marginTop: -4, marginBottom: -4, zIndex: 1 },
  timelineLineActive: { backgroundColor: '#2563EB' },
  
  timelineContent: { flex: 1, paddingTop: 2 },
  timelineState: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  textActive: { color: '#2563EB' },
  textSuccess: { color: '#16A34A' },
  timelineDesc: { fontSize: 13, lineHeight: 20 },

  chatContainer: { paddingBottom: 16, marginTop: 12, paddingHorizontal: 4 },
  emptyChatText: { textAlign: 'center', fontStyle: 'italic', marginVertical: 16, fontSize: 13, color: '#94A3B8' },
  chatBubbleWrap: { marginBottom: 10, maxWidth: '82%' },
  chatBubbleRight: { alignSelf: 'flex-end' },
  chatBubbleLeft: { alignSelf: 'flex-start' },
  chatSenderName: { fontSize: 11, fontWeight: '700', marginBottom: 2, marginLeft: 6, color: '#64748B' },
  chatBubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  chatBubbleMe: { backgroundColor: '#2563EB', borderBottomRightRadius: 4 },
  chatBubbleThem: { backgroundColor: '#F1F5F9', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  chatTextMe: { fontSize: 15, lineHeight: 21, color: '#FFFFFF' },
  chatTextThem: { fontSize: 15, lineHeight: 21, color: '#0F172A' },
  chatTimeContainer: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 4 },
  chatTimeMe: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  chatTimeThem: { fontSize: 10, color: '#94A3B8' },

  chatInputContainer: { 
    flexDirection: 'row', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderTopWidth: 1, 
    alignItems: 'flex-end',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5
  },
  chatInput: { flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, maxHeight: 100, minHeight: 44, borderWidth: 1, fontSize: 14 },
  chatMicBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  chatSendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center', marginLeft: 8, marginBottom: 0 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.4)' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  closeModalBtn: { padding: 4 },
  
  statusOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  statusOptionTextWrap: { flex: 1 },
  statusOptionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  statusOptionDesc: { fontSize: 13 },
  
  tanggapanInputContainer: { marginTop: 24 },
  tanggapanLabel: { fontSize: 11, fontWeight: '600', marginBottom: 8 },
  tanggapanInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
  saveModalBtn: { backgroundColor: '#2563EB', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  saveModalBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },

  actionModalContent: { borderRadius: 16, paddingVertical: 8, marginHorizontal: 24, marginBottom: Platform.OS === 'ios' ? 40 : 24, shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 },
  actionOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 24 },
  actionOptionText: { fontSize: 16, fontWeight: '500', marginLeft: 16 },
  
  snackbarContainer: { position: 'absolute', bottom: 90, left: 24, right: 24, backgroundColor: '#334155', borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  snackbarText: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  snackbarUndoText: { color: '#60A5FA', fontSize: 14, fontWeight: '700' },
  
  actionBtnFull: { flexDirection: 'row', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8, borderWidth: 1 },
  actionBtnFullText: { fontWeight: '600', fontSize: 14 },
  adminActionBtnPrimary: { flex: 1, flexDirection: 'row', backgroundColor: '#2563EB', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  adminActionBtnPrimaryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  adminActionBtnDanger: { flex: 1, flexDirection: 'row', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  adminActionBtnDangerText: { fontWeight: '600', fontSize: 14 }
});

const AnimatedChatBubble = ({ msg, isMe, onLongPress, theme, isDark }: { msg: any, isMe: boolean, onLongPress: () => void, theme: any, isDark: boolean }) => {
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
      <TouchableOpacity 
        activeOpacity={0.8}
        onLongPress={onLongPress}
        style={[
          styles.chatBubble, 
          isMe ? styles.chatBubbleMe : styles.chatBubbleThem,
          msg.isDeletedForEveryone ? { backgroundColor: theme.inputBackground, borderWidth: 1, borderColor: theme.border } : {}
        ]}
      >
        
        {msg.isDeletedForEveryone ? (
          <Text style={[isMe ? styles.chatTextMe : styles.chatTextThem, { color: theme.textSecondary, fontStyle: 'italic' }]}>
            🚫 Pesan ini telah dihapus
          </Text>
        ) : msg.audioUrl ? (
          <AudioPlayer url={msg.audioUrl} isMe={isMe} isDark={isDark} />
        ) : (
          <Text style={isMe ? styles.chatTextMe : styles.chatTextThem}>{msg.text}</Text>
        )}

        <View style={styles.chatTimeContainer}>
          <Text style={isMe && !msg.isDeletedForEveryone ? styles.chatTimeMe : styles.chatTimeThem}>
            {new Date(msg.timestamp).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}
          </Text>
          {isMe && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 4 }}>
              <Ionicons 
                name={msg.read ? "checkmark-done" : "checkmark"} 
                size={14} 
                color={msg.read ? "#60A5FA" : "rgba(255,255,255,0.7)"} 
              />
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const AudioPlayer = ({ url, isMe, isDark }: { url: string, isMe: boolean, isDark: boolean }) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(1);

  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  const loadSound = async () => {
    try {
      let playableUri = url;
      if (url.startsWith('data:audio')) {
        const base64Data = url.split(',')[1];
        playableUri = FileSystem.cacheDirectory + 'temp_play_' + Date.now() + '.m4a';
        await FileSystem.writeAsStringAsync(playableUri, base64Data, { encoding: 'base64' });
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: playableUri },
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
    } catch (e) {
      console.log('Error loading sound:', e);
    }
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
        <Ionicons name={isPlaying ? "pause-circle" : "play-circle"} size={32} color={isMe ? "#FFFFFF" : (isDark ? "#60A5FA" : "#2563EB")} />
      </TouchableOpacity>
      <View style={{ flex: 1, height: 4, backgroundColor: isMe ? 'rgba(255,255,255,0.3)' : (isDark ? '#334155' : '#E2E8F0'), borderRadius: 2 }}>
        <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: isMe ? '#FFFFFF' : (isDark ? '#60A5FA' : '#2563EB'), borderRadius: 2 }} />
      </View>
    </View>
  );
};
