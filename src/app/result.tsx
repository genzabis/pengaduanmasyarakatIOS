import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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
            toValue: 1.5,
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
    <LinearGradient colors={['#E3F2FD', '#90CAF9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.content}>
          
          <Animated.View style={[styles.iconContainer, { transform: [{ scale: scaleAnim }] }]}>
            <Animated.View style={[
              styles.iconBgOuter, 
              { 
                position: 'absolute', 
                transform: [{ scale: pulseAnim }],
                opacity: pulseAnim.interpolate({
                  inputRange: [1, 1.5],
                  outputRange: [1, 0]
                })
              }
            ]} />
            <View style={styles.iconBgInner}>
              <Ionicons name="shield-checkmark" size={60} color="#059669" />
            </View>
          </Animated.View>
          
          <Animated.View style={[styles.textContainer, { opacity: fadeAnim }]}>
            <Text style={styles.title}>Laporan Diterima</Text>
            <Text style={styles.message}>
              Terima kasih atas kepedulian Anda. Laporan telah masuk ke sistem pusat dengan aman dan akan segera ditindaklanjuti oleh petugas berwenang.
            </Text>
          </Animated.View>

          <Animated.View style={[styles.buttonContainer, { opacity: fadeAnim }]}>
            <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/(tabs)/list')}>
              <Ionicons name="documents" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryButtonText}>PANTAU STATUS LAPORAN</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={() => router.replace('/(tabs)/main')}>
              <Text style={styles.secondaryButtonText}>Kembali ke Formulir</Text>
            </TouchableOpacity>
          </Animated.View>

        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 32, 
    paddingBottom: 60 
  },
  
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    width: 160,
    height: 160,
  },
  iconBgOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(5, 150, 105, 0.2)',
  },
  iconBgInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#DCFCE7', // Light green tailwind
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  
  textContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: { 
    fontSize: 34, 
    fontWeight: '900', 
    color: '#0A2540', 
    marginBottom: 16,
    letterSpacing: -1,
    textAlign: 'center'
  },
  message: { 
    fontSize: 15, 
    color: '#4B5563', 
    textAlign: 'center', 
    lineHeight: 24,
    paddingHorizontal: 16,
    fontWeight: '500'
  },
  
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  primaryButton: { 
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#0A2540', 
    height: 56, 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 16,
    shadowColor: '#0A2540', 
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.25, 
    shadowRadius: 12,
    elevation: 4
  },
  primaryButtonText: { 
    color: '#FFFFFF', 
    fontWeight: '800', 
    fontSize: 14, 
    letterSpacing: 1 
  },
  
  secondaryButton: { 
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  secondaryButtonText: { 
    color: '#0A2540', 
    fontWeight: '700', 
    fontSize: 15 
  }
});
