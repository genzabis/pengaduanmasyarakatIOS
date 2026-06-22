import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { database } from '../../../firebaseConfig';
import { ref, push, set } from 'firebase/database';

const URGENCY_LEVELS = [
  { id: 'info', title: 'Info Biasa', desc: 'Pemberitahuan umum', color: '#2563EB', bg: '#EFF6FF', border: '#DBEAFE', icon: 'information-circle' },
  { id: 'warning', title: 'Peringatan', desc: 'Penting, harap perhatikan', color: '#D97706', bg: '#FEF3C7', border: '#FDE68A', icon: 'warning' },
  { id: 'danger', title: 'Darurat', desc: 'Keadaan kritis / Waspada', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: 'alert-circle' }
];

export default function AdminBroadcastScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [urgency, setUrgency] = useState('info');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert('Data Belum Lengkap', 'Harap isi judul dan pesan pengumuman.');
      return;
    }

    Alert.alert(
      'Kirim Pesan Siaran',
      'Pengumuman ini akan langsung terlihat oleh SEMUA warga di beranda aplikasi. Lanjutkan?',
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Kirim Sekarang', 
          onPress: async () => {
            setLoading(true);
            try {
              const newAnnouncementRef = push(ref(database, 'announcements'));
              await set(newAnnouncementRef, {
                title: title.trim(),
                message: message.trim(),
                type: urgency,
                timestamp: Date.now(),
                active: true
              });
              
              Alert.alert('Sukses', 'Pesan siaran berhasil dikirim ke seluruh warga.');
              router.back();
            } catch (error: any) {
              Alert.alert('Gagal', error.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pesan Siaran</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          <View style={styles.infoBanner}>
            <Ionicons name="megaphone" size={24} color="#2563EB" style={{ marginRight: 12 }} />
            <Text style={styles.infoBannerText}>
              Pesan yang Anda kirim di sini akan muncul sebagai <Text style={{ fontWeight: '700' }}>Banner Peringatan</Text> di Beranda seluruh pengguna aplikasi secara instan.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.label}>Judul Pengumuman</Text>
              <View style={styles.inputRow}>
                <TextInput 
                  style={styles.input} 
                  placeholder="Contoh: Perbaikan Jalan Jend. Sudirman" 
                  placeholderTextColor="#CBD5E1"
                  value={title}
                  onChangeText={setTitle}
                  maxLength={50}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Isi Pesan / Detail</Text>
              <View style={styles.textAreaWrap}>
                <TextInput 
                  style={styles.textArea} 
                  placeholder="Ketik detail informasi untuk warga di sini..." 
                  placeholderTextColor="#CBD5E1"
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  textAlignVertical="top"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Tingkat Urgensi</Text>
              <View style={styles.urgencyContainer}>
                {URGENCY_LEVELS.map((level) => {
                  const isSelected = urgency === level.id;
                  return (
                    <TouchableOpacity 
                      key={level.id}
                      style={[
                        styles.urgencyCard, 
                        isSelected ? { backgroundColor: level.bg, borderColor: level.color } : null
                      ]}
                      activeOpacity={0.7}
                      onPress={() => setUrgency(level.id)}
                    >
                      <Ionicons name={level.icon as any} size={24} color={isSelected ? level.color : '#94A3B8'} style={{ marginBottom: 8 }} />
                      <Text style={[styles.urgencyTitle, isSelected ? { color: level.color } : null]}>{level.title}</Text>
                      <Text style={styles.urgencyDesc}>{level.desc}</Text>
                      
                      {isSelected && (
                        <View style={[styles.checkBadge, { backgroundColor: level.color }]}>
                          <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.7 }]} onPress={handleSend} disabled={loading} activeOpacity={0.8}>
            {loading ? <ActivityIndicator color="#FFFFFF" /> : (
              <>
                <Ionicons name="paper-plane" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.submitBtnText}>Siarkan Sekarang</Text>
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10 },
  
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },

  // Info Banner
  infoBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#DBEAFE', marginBottom: 20 },
  infoBannerText: { flex: 1, fontSize: 13, color: '#1E3A8A', lineHeight: 20 },

  // Form Card
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 24 },
  field: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 },
  
  // Inputs
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 16, height: 50, borderWidth: 1, borderColor: '#F1F5F9' },
  input: { flex: 1, fontSize: 15, color: '#0F172A' },
  textAreaWrap: { backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9', padding: 16 },
  textArea: { fontSize: 15, color: '#0F172A', minHeight: 100, lineHeight: 22 },

  // Urgency Selection
  urgencyContainer: { flexDirection: 'row', gap: 10 },
  urgencyCard: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 2, borderColor: 'transparent', borderRadius: 12, padding: 12, position: 'relative' },
  urgencyTitle: { fontSize: 13, fontWeight: '700', color: '#64748B', marginBottom: 2 },
  urgencyDesc: { fontSize: 10, color: '#94A3B8' },
  checkBadge: { position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFFFFF' },

  // Submit Btn
  submitBtn: { flexDirection: 'row', backgroundColor: '#2563EB', height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  submitBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 }
});
