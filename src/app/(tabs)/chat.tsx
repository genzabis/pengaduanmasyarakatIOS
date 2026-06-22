import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { auth, database } from '../../../firebaseConfig';
import { ref, onValue } from 'firebase/database';

export default function ChatInboxScreen() {
  const router = useRouter();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const currentUser = auth.currentUser;
  const isAdmin = currentUser?.email === 'admin@gmail.com';

  useEffect(() => {
    if (!currentUser) return;
    const pengaduanRef = ref(database, 'pengaduan');
    const unsubscribe = onValue(pengaduanRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const parsed: any[] = [];
        Object.keys(data).forEach(key => {
          const item = data[key];
          // Validasi Akses
          if (isAdmin || item.nama === currentUser.email) {
            // Hanya ambil yang punya objek 'messages'
            if (item.messages) {
              const msgValues = Object.values(item.messages) as any[];
              const sortedMsgs = msgValues.sort((a, b) => b.timestamp - a.timestamp);
              const lastMessage = sortedMsgs[0];
              
              parsed.push({
                id: key,
                ...item,
                lastMessage: lastMessage
              });
            }
          }
        });
        // Sort by latest message timestamp
        parsed.sort((a, b) => b.lastMessage.timestamp - a.lastMessage.timestamp);
        setChats(parsed);
      } else {
        setChats([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const renderItem = ({ item }: { item: any }) => {
    const timeString = new Date(item.lastMessage.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const isUnreadForAdmin = isAdmin && item.lastMessage.senderEmail !== 'admin@gmail.com';
    const isUnreadForUser = !isAdmin && item.lastMessage.isAdmin;
    const highlight = isUnreadForAdmin || isUnreadForUser;

    return (
      <TouchableOpacity 
        style={styles.chatCard}
        onPress={() => router.push(`/report/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="chatbubbles" size={24} color="#2563EB" />
        </View>
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle} numberOfLines={1}>{item.judul}</Text>
            <Text style={[styles.chatTime, highlight && styles.highlightTime]}>{timeString}</Text>
          </View>
          <Text style={[styles.chatSnippet, highlight && styles.highlightSnippet]} numberOfLines={1}>
            {item.lastMessage.senderEmail.split('@')[0]}: {item.lastMessage.text}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Kotak Masuk</Text>
        <Text style={styles.subtitle}>Pesan diskusi laporan Anda</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} />
      ) : chats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbox-ellipses-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>Belum ada Pesan</Text>
          <Text style={styles.emptySubtitle}>Diskusi tentang laporan akan muncul di sini.</Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#0F172A', letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#64748B', fontWeight: '400' },
  
  listContent: { paddingHorizontal: 24, paddingBottom: 120 },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  chatInfo: { flex: 1, justifyContent: 'center' },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  chatTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A', flex: 1, marginRight: 12 },
  chatTime: { fontSize: 12, color: '#94A3B8' },
  chatSnippet: { fontSize: 14, color: '#64748B', lineHeight: 20 },
  
  highlightTime: { color: '#2563EB', fontWeight: '600' },
  highlightSnippet: { color: '#0F172A', fontWeight: '500' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, paddingBottom: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#0F172A', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22 }
});
