import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ResultScreen() {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      })
    ]).start(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.4,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          })
        ])
      ).start();
    });
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        
        <Animated.View style={[styles.iconContainer, { transform: [{ scale: scaleAnim }] }]}>
          <Animated.View style={[
            styles.iconBgOuter, 
            { 
              position: 'absolute', 
              transform: [{ scale: pulseAnim }],
              opacity: pulseAnim.interpolate({
                inputRange: [1, 1.4],
                outputRange: [1, 0]
              })
            }
          ]} />
          <View style={styles.iconBgInner}>
            <Ionicons name="shield-checkmark" size={48} color="#16A34A" />
          </View>
        </Animated.View>
        
        <Animated.View style={[styles.textContainer, { opacity: fadeAnim }]}>
          <Text style={styles.title}>Laporan Diterima</Text>
          <Text style={styles.message}>
            Laporan Anda telah berhasil masuk ke sistem pusat. Petugas kami akan meninjau dan menindaklanjutinya.
          </Text>
        </Animated.View>

        <Animated.View style={[styles.buttonContainer, { opacity: fadeAnim }]}>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/(tabs)/list')} activeOpacity={0.8}>
            <Text style={styles.primaryButtonText}>Lacak Status Laporan</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.replace('/(tabs)/main')} activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>Buat Laporan Baru</Text>
          </TouchableOpacity>
        </Animated.View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 32, 
    paddingBottom: 40 
  },
  
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    width: 140,
    height: 140,
  },
  iconBgOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
  },
  iconBgInner: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  textContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: { 
    fontSize: 28, 
    fontWeight: '700', 
    color: '#0F172A', 
    marginBottom: 12,
    letterSpacing: -0.5,
    textAlign: 'center'
  },
  message: { 
    fontSize: 15, 
    color: '#64748B', 
    textAlign: 'center', 
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  primaryButton: { 
    width: '100%',
    backgroundColor: '#2563EB', 
    height: 56, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 16,
  },
  primaryButtonText: { 
    color: '#FFFFFF', 
    fontWeight: '600', 
    fontSize: 15, 
  },
  
  secondaryButton: { 
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  secondaryButtonText: { 
    color: '#475569', 
    fontWeight: '600', 
    fontSize: 14 
  }
});
