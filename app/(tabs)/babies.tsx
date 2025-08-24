import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { Plus, Baby, Calendar, Weight, Ruler } from 'lucide-react-native';
import type { Baby as BabyType } from '@/types/database';

export default function BabiesScreen() {
  const { user } = useAuth();
  const [babies, setBabies] = useState<BabyType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    loadBabies();
    
    return () => {
      mounted.current = false;
    };
  }, []);

  const loadBabies = async () => {
    try {
      if (user?.role === 'parent') {
        // Load babies for parent
        const { data: parentBabies } = await supabase
          .from('parent_babies')
          .select(`
            baby_id,
            babies (*)
          `)
          .eq('parent_id', user.id);

        const babyData = parentBabies?.map(pb => pb.babies).filter(Boolean) || [];
        setBabies(babyData as BabyType[]);
      } else {
        // Load all babies for staff/doctors/admin
        const { data } = await supabase
          .from('babies')
          .select('*')
          .order('created_at', { ascending: false });

        if (mounted.current) {
          setBabies(data || []);
        }
      }
    } catch (error) {
      console.error('Error loading babies:', error);
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  };

  const onRefresh = async () => {
    if (mounted.current) {
      setRefreshing(true);
    }
    await loadBabies();
    if (mounted.current) {
      setRefreshing(false);
    }
  };

  const calculateAge = (birthDate: string) => {
    const birth = new Date(birthDate);
    const now = new Date();
    const ageInMonths = (now.getFullYear() - birth.getFullYear()) * 12 + 
                       (now.getMonth() - birth.getMonth());
    
    if (ageInMonths < 12) {
      return `${ageInMonths} months`;
    } else {
      const years = Math.floor(ageInMonths / 12);
      const months = ageInMonths % 12;
      return months > 0 ? `${years}y ${months}m` : `${years} years`;
    }
  };

  const renderBabyCard = (baby: BabyType) => (
    <TouchableOpacity 
      key={baby.id} 
      style={styles.babyCard}
      onPress={() => router.push(`/baby/${baby.id}`)}
    >
      <View style={styles.babyAvatar}>
        <Baby size={32} color="#0ea5e9" strokeWidth={2} />
      </View>
      
      <View style={styles.babyInfo}>
        <Text style={styles.babyName}>
          {baby.first_name} {baby.last_name}
        </Text>
        <Text style={styles.babyAge}>
          {calculateAge(baby.birth_date)}
        </Text>
        
        <View style={styles.babyStats}>
          {baby.current_weight && (
            <View style={styles.statItem}>
              <Weight size={14} color="#64748b" strokeWidth={2} />
              <Text style={styles.statText}>{baby.current_weight} kg</Text>
            </View>
          )}
          {baby.current_height && (
            <View style={styles.statItem}>
              <Ruler size={14} color="#64748b" strokeWidth={2} />
              <Text style={styles.statText}>{baby.current_height} cm</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.genderBadge}>
        <Text style={styles.genderText}>
          {baby.gender.charAt(0).toUpperCase()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {user?.role === 'parent' ? 'My Babies' : 'Patients'}
        </Text>
        {(user?.role === 'admin' || user?.role === 'doctor' || user?.role === 'staff') && (
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => router.push('/add-baby')}
          >
            <Plus size={24} color="#ffffff" strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading babies...</Text>
          </View>
        ) : babies.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Baby size={64} color="#94a3b8" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No babies found</Text>
            <Text style={styles.emptyText}>
              {user?.role === 'parent' 
                ? 'Contact your doctor to add your baby to the system'
                : 'Start by adding a new patient'
              }
            </Text>
          </View>
        ) : (
          <View style={styles.babiesList}>
            {babies.map(renderBabyCard)}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#1e293b',
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  addButton: {
    backgroundColor: '#0ea5e9',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
  },
  babiesList: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  babyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  babyAvatar: {
    width: 60,
    height: 60,
    backgroundColor: '#e0f2fe',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  babyInfo: {
    flex: 1,
  },
  babyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  babyAge: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  babyStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#64748b',
  },
  genderBadge: {
    width: 32,
    height: 32,
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
});