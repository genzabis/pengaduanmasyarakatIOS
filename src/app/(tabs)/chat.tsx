import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { auth, database } from '../../../firebaseConfig';
import { ref, onValue } from 'firebase/database';

const AnimatedChatCard = ({ item, index, isAdmin, currentUser, onPress }: any) => {
  const translateY = useRef(new Animated.Value(15)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, delay: Math.min(index * 40, 400), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, delay: Math.min(index * 40, 400), useNativeDriver: true })
    ]).start();
  }, []);

  const timeString = new Date(item.lastMessage.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const isUnread = item.lastMessage.senderEmail !== currentUser?.email && !item.lastMessage.read;

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <TouchableOpacity 
        style={[styles.chatCard, isUnread && styles.chatCardUnread]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={isUnread ? "chatbubble-ellipses" : "chatbubbles-outline"} size={22} color={isUnread ? "#2563EB" : "#64748B"} />
          {isUnread && <View style={styles.unreadDot} />}
        </View>
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={[styles.chatTitle, isUnread && styles.highlightTitle]} numberOfLines={1}>{item.judul}</Text>
            <Text style={[styles.chatTime, isUnread && styles.highlightTime]}>{timeString}</Text>
          </View>
          <Text style={[styles.chatSnippet, isUnread && styles.highlightSnippet]} numberOfLines={1}>
            <Text style={{ fontWeight: isUnread ? '700' : '600', color: isUnread ? '#2563EB' : '#64748B' }}>
              {item.lastMessage.isAdmin ? 'Admin' : item.lastMessage.senderEmail.split('@')[0]}
            </Text>
            : {item.lastMessage.text}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#CBD5E1" style={{ marginLeft: 8 }} />
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function ChatInboxScreen() {
  const router = useRouter();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const currentUser = auth.currentUser;
  const isAdmin = currentUser?.email === 'admin@gmail.com';

  const headerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();

    if (!currentUser) return;
    const pengaduanRef = ref(database, 'pengaduan');
    const unsubscribe = onValue(pengaduanRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const parsed: any[] = [];
        Object.keys(data).forEach(key => {
          const item = data[key];
          if (isAdmin || item.nama === currentUser.email) {
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
        parsed.sort((a, b) => b.lastMessage.timestamp - a.lastMessage.timestamp);
        setChats(parsed);
      } else {
        setChats([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <Text style={styles.title}>Kotak Masuk</Text>
        <Text style={styles.subtitle}>Pusat diskusi dan pemberitahuan laporan Anda.</Text>
      </Animated.View>

      {loading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 60 }} />
      ) : chats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color="#E2E8F0" />
          <Text style={styles.emptyTitle}>Belum ada Diskusi</Text>
          <Text style={styles.emptySubtitle}>Pesan atau balasan dari petugas akan muncul di sini.</Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <AnimatedChatCard 
              item={item} 
              index={index} 
              isAdmin={isAdmin} 
              currentUser={currentUser} 
              onPress={() => router.push(`/report/${item.id}`)} 
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 24, paddingTop: Platform.OS === 'android' ? 40 : 24, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#64748B', fontWeight: '400', lineHeight: 22 },
  
  listContent: { paddingHorizontal: 24, paddingBottom: 120 },
  
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  chatCardUnread: {
    borderColor: '#DBEAFE',
    backgroundColor: '#EFF6FF',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF'
  },
  chatInfo: { flex: 1, justifyContent: 'center' },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  chatTitle: { fontSize: 16, fontWeight: '600', color: '#334155', flex: 1, marginRight: 12, letterSpacing: -0.3 },
  chatTime: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  chatSnippet: { fontSize: 14, color: '#64748B', lineHeight: 20 },
  
  highlightTitle: { fontWeight: '800', color: '#0F172A' },
  highlightTime: { color: '#2563EB', fontWeight: '800' },
  highlightSnippet: { color: '#0F172A', fontWeight: '500' },

  emptyContainer: { flex: 1, justifyContent: 'flex-start', alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22 }
});
