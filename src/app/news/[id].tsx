import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Platform, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { database } from '../../../firebaseConfig';
import { ref, onValue, update } from 'firebase/database';

export default function NewsDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [news, setNews] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    const newsRef = ref(database, `news/${id}`);
    const unsubscribe = onValue(newsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setNews({ id: snapshot.key, ...data });
      } else {
        setNews(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    if (news && news.readCount !== undefined) {
      // Increment read count when user opens it (just a simple implementation)
      const hasIncrementedLocally = (global as any).readNews?.includes(id);
      if (!hasIncrementedLocally) {
        if (!(global as any).readNews) (global as any).readNews = [];
        (global as any).readNews.push(id);
        
        update(ref(database, `news/${id}`), { readCount: news.readCount + 1 });
      }
    }
  }, [news?.id]);

  const handleShare = async () => {
    if (!news) return;
    try {
      await Share.share({
        message: `*${news.title}*\n\nBaca info selengkapnya di aplikasi Lapor Warga!`,
      });
    } catch (error: any) {
      console.log(error.message);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  if (!news) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.errorText}>Berita tidak ditemukan atau telah dihapus.</Text>
        <TouchableOpacity style={styles.backBtnError} onPress={() => router.back()}>
          <Text style={styles.backBtnErrorText}>Kembali</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={22} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <Text style={styles.title}>{news.title}</Text>
        
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color="#64748B" style={{marginRight: 6}} />
            <Text style={styles.metaText}>
              {new Date(news.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="eye-outline" size={14} color="#64748B" style={{marginRight: 6}} />
            <Text style={styles.metaText}>Dibaca {news.readCount || 0} kali</Text>
          </View>
        </View>

        {news.imageUrl ? (
          <Image source={{ uri: news.imageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, { backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name="newspaper-outline" size={48} color="#CBD5E1" />
          </View>
        )}

        <View style={styles.contentBox}>
          <Text style={styles.authorBadge}>
            Ditulis oleh: <Text style={{fontWeight: '700', color: '#2563EB'}}>{news.author}</Text>
          </Text>
          
          <Text style={styles.contentText}>{news.content}</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  errorText: { fontSize: 16, color: '#64748B', marginBottom: 16 },
  backBtnError: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#F1F5F9', borderRadius: 8 },
  backBtnErrorText: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 20 : 0, paddingBottom: 16, backgroundColor: '#FFFFFF' },
  backButton: { padding: 4 },
  shareButton: { padding: 4, backgroundColor: '#F8FAFC', borderRadius: 8 },
  
  scrollContent: { paddingHorizontal: 20, paddingBottom: 60 },
  
  title: { fontSize: 24, fontWeight: '800', color: '#0F172A', lineHeight: 32, marginBottom: 12, marginTop: 8 },
  
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  metaItem: { flexDirection: 'row', alignItems: 'center', marginRight: 16, backgroundColor: '#F8FAFC', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  metaText: { fontSize: 12, color: '#475569', fontWeight: '500' },
  
  image: { width: '100%', height: 220, borderRadius: 16, marginBottom: 24 },
  
  contentBox: { flex: 1 },
  authorBadge: { fontSize: 13, color: '#475569', marginBottom: 16, backgroundColor: '#EFF6FF', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  contentText: { fontSize: 16, lineHeight: 26, color: '#334155' }
});
