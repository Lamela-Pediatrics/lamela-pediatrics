import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { Search, Plus, Baby, Calendar, Weight, Ruler, Activity, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import type { Baby } from '@/types/database';

interface BabyWithDoctor extends Baby {
  assigned_doctor?: {
    first_name: string;
    last_name: string;
  };
  latest_vitals?: {
    weight?: number;
    height?: number;
    temperature?: number;
    recorded_at: string;
  };
}

export default function PatientsScreen() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<BabyWithDoctor[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<BabyWithDoctor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    filterPatients();
  }, [searchQuery, patients]);

  const loadPatients = async () => {
    try {
      let query = supabase
        .from('babies')
        .select(`
          *,
          assigned_doctor:users!babies_assigned_doctor_id_fkey (first_name, last_name),
          vital_records (weight, height, temperature, recorded_at)
        `)
        .order('created_at', { ascending: false });

      // For doctors, only show their assigned patients
      if (user?.role === 'doctor') {
        query = query.eq('assigned_doctor_id', user.id);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      // Process data to get latest vitals
      const processedData = data?.map(baby => ({
        ...baby,
        latest_vitals: baby.vital_records
          ?.sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0]
      })) || [];

      setPatients(processedData);
    } catch (error) {
      console.error('Error loading patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterPatients = () => {
    if (!searchQuery.trim()) {
      setFilteredPatients(patients);
      return;
    }

    const filtered = patients.filter(patient =>
      `${patient.first_name} ${patient.last_name}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    );
    setFilteredPatients(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPatients();
    setRefreshing(false);
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

  const getVitalStatus = (patient: BabyWithDoctor) => {
    if (!patient.latest_vitals) return 'No data';
    
    const lastRecorded = new Date(patient.latest_vitals.recorded_at);
    const daysSince = Math.floor((Date.now() - lastRecorded.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSince === 0) return 'Today';
    if (daysSince === 1) return 'Yesterday';
    if (daysSince < 7) return `${daysSince} days ago`;
    return 'Needs update';
  };

  const getVitalStatusColor = (patient: BabyWithDoctor) => {
    if (!patient.latest_vitals) return '#ef4444';
    
    const daysSince = Math.floor((Date.now() - new Date(patient.latest_vitals.recorded_at).getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSince <= 1) return '#10b981';
    if (daysSince <= 7) return '#f59e0b';
    return '#ef4444';
  };

  const renderPatientCard = (patient: BabyWithDoctor) => (
    <TouchableOpacity 
      key={patient.id} 
      style={styles.patientCard}
      onPress={() => router.push(`/patient/${patient.id}`)}
    >
      <View style={styles.patientHeader}>
        <View style={styles.patientAvatar}>
          <Baby size={24} color="#0ea5e9" strokeWidth={2} />
        </View>
        
        <View style={styles.patientBasicInfo}>
          <Text style={styles.patientName}>
            {patient.first_name} {patient.last_name}
          </Text>
          <Text style={styles.patientAge}>
            {calculateAge(patient.birth_date)} • {patient.gender}
          </Text>
          {patient.assigned_doctor && (
            <Text style={styles.doctorName}>
              Dr. {patient.assigned_doctor.first_name} {patient.assigned_doctor.last_name}
            </Text>
          )}
        </View>

        <View style={[styles.vitalStatus, { backgroundColor: getVitalStatusColor(patient) }]}>
          <Activity size={16} color="#ffffff" strokeWidth={2} />
        </View>
      </View>

      <View style={styles.patientVitals}>
        <View style={styles.vitalItem}>
          <Weight size={16} color="#64748b" strokeWidth={2} />
          <Text style={styles.vitalText}>
            {patient.latest_vitals?.weight || '--'} kg
          </Text>
        </View>

        <View style={styles.vitalItem}>
          <Ruler size={16} color="#64748b" strokeWidth={2} />
          <Text style={styles.vitalText}>
            {patient.latest_vitals?.height || '--'} cm
          </Text>
        </View>

        <View style={styles.vitalItem}>
          <Calendar size={16} color="#64748b" strokeWidth={2} />
          <Text style={styles.vitalText}>
            {getVitalStatus(patient)}
          </Text>
        </View>
      </View>

      {patient.allergies && patient.allergies.length > 0 && (
        <View style={styles.alertsContainer}>
          <AlertTriangle size={16} color="#f59e0b" strokeWidth={2} />
          <Text style={styles.allergyText}>
            Allergies: {patient.allergies.join(', ')}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {user?.role === 'doctor' ? 'My Patients' : 'All Patients'}
        </Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => router.push('/add-patient')}
        >
          <Plus size={24} color="#ffffff" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#64748b" strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search patients..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading patients...</Text>
          </View>
        ) : filteredPatients.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Baby size={64} color="#94a3b8" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No patients found' : 'No patients yet'}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery 
                ? 'Try adjusting your search terms'
                : 'Start by adding your first patient'
              }
            </Text>
          </View>
        ) : (
          <View style={styles.patientsList}>
            {filteredPatients.map(renderPatientCard)}
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
  searchContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
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
  patientsList: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  patientCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  patientAvatar: {
    width: 50,
    height: 50,
    backgroundColor: '#e0f2fe',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  patientBasicInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  patientAge: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  doctorName: {
    fontSize: 12,
    color: '#0ea5e9',
    fontWeight: '500',
  },
  vitalStatus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientVitals: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  vitalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vitalText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  alertsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
  },
  allergyText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '500',
  },
});