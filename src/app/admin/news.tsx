import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { auth, database } from '../../../firebaseConfig';
import { ref, push, set, onValue, remove } from 'firebase/database';

export default function AdminNewsScreen() {
  const router = useRouter();
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  const isAdmin = auth.currentUser?.email === 'admin@gmail.com';

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/(tabs)/home');
      return;
    }

    const newsRef = ref(database, 'news');
    const unsubscribe = onValue(newsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const parsed = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setNews(parsed.sort((a, b) => b.timestamp - a.timestamp));
      } else {
        setNews([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Izin Ditolak', 'Harap izinkan akses galeri untuk memilih foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0] && result.assets[0].base64) {
      setImageBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handlePublish = async () => {
    if (!title || !content) {
      Alert.alert('Data Belum Lengkap', 'Harap isi judul dan konten berita.');
      return;
    }

    setSubmitting(true);
    try {
      const newRef = push(ref(database, 'news'));
      await set(newRef, {
        title,
        content,
        imageUrl: imageBase64 || null,
        timestamp: Date.now(),
        author: 'Admin Kelurahan',
        readCount: 0
      });

      Alert.alert('Sukses', 'Berita berhasil dipublikasikan!');
      setTitle('');
      setContent('');
      setImageBase64(null);
    } catch (e: any) {
      Alert.alert('Gagal', e.message);
    }
    setSubmitting(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert("Hapus Berita", "Yakin ingin menghapus berita ini?", [
      { text: "Batal", style: "cancel" },
      { 
        text: "Hapus", 
        style: "destructive",
        onPress: async () => {
          await remove(ref(database, `news/${id}`));
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kelola Portal Berita</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Tulis Berita Baru</Text>
          
          <Text style={styles.label}>Foto Sampul (Opsional)</Text>
          {imageBase64 ? (
            <View style={styles.imagePreview}>
              <Image source={{ uri: imageBase64 }} style={styles.previewImg} />
              <TouchableOpacity style={styles.removeImgBtn} onPress={() => setImageBase64(null)}>
                <Ionicons name="close-circle" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
              <Ionicons name="image-outline" size={24} color="#64748B" />
              <Text style={styles.uploadText}>Upload Gambar (16:9)</Text>
            </TouchableOpacity>
          )}

          <Text style={[styles.label, { marginTop: 16 }]}>Judul Berita</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Ketik judul berita..." 
            value={title} 
            onChangeText={setTitle} 
          />

          <Text style={[styles.label, { marginTop: 16 }]}>Isi Konten</Text>
          <TextInput 
            style={[styles.input, styles.textArea]} 
            placeholder="Tulis detail informasi di sini..." 
            value={content} 
            onChangeText={setContent} 
            multiline 
            textAlignVertical="top"
          />

          <TouchableOpacity style={styles.publishBtn} onPress={handlePublish} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#FFF" /> : (
              <>
                <Ionicons name="send" size={18} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.publishBtnText}>Publikasikan Berita</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 12 }]}>Daftar Berita Aktif</Text>
        
        {loading ? (
          <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 20 }} />
        ) : news.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="newspaper-outline" size={40} color="#CBD5E1" />
            <Text style={styles.emptyText}>Belum ada berita dipublikasikan.</Text>
          </View>
        ) : (
          news.map((item) => (
            <View key={item.id} style={styles.newsCard}>
              {item.imageUrl && (
                <Image source={{ uri: item.imageUrl }} style={styles.newsThumb} />
              )}
              <View style={styles.newsInfo}>
                <Text style={styles.newsTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.newsDate}>
                  {new Date(item.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </View>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 20 : 0, paddingBottom: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  
  scrollContent: { padding: 20, paddingBottom: 60 },
  formCard: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 16 },
  
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#0F172A' },
  textArea: { minHeight: 120, paddingTop: 14 },
  
  uploadBtn: { borderStyle: 'dashed', borderWidth: 2, borderColor: '#CBD5E1', borderRadius: 12, height: 100, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  uploadText: { fontSize: 13, color: '#64748B', marginTop: 8, fontWeight: '500' },
  imagePreview: { height: 160, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  previewImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  removeImgBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: '#FFF', borderRadius: 12 },
  
  publishBtn: { flexDirection: 'row', backgroundColor: '#10B981', paddingVertical: 16, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  publishBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  
  emptyBox: { alignItems: 'center', paddingVertical: 40, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  emptyText: { fontSize: 14, color: '#94A3B8', marginTop: 12 },
  
  newsCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  newsThumb: { width: 60, height: 60, borderRadius: 8, marginRight: 12 },
  newsInfo: { flex: 1 },
  newsTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 4 },
  newsDate: { fontSize: 12, color: '#64748B' },
  deleteBtn: { padding: 10, backgroundColor: '#FEF2F2', borderRadius: 8, marginLeft: 12 }
});
