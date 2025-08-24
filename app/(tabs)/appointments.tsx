import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Calendar, Clock, User, Baby, CircleCheck as CheckCircle, Circle as XCircle, CircleAlert as AlertCircle, Plus } from 'lucide-react-native';
import type { Appointment } from '@/types/database';

export default function AppointmentsScreen() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    loadAppointments();
    
    return () => {
      mounted.current = false;
    };
  }, []);

  const loadAppointments = async () => {
    try {
      let query = supabase
        .from('appointments')
        .select(`
          *,
          babies (*),
          users!appointments_doctor_id_fkey (*),
          parents:users!appointments_parent_id_fkey (*)
        `)
        .order('appointment_date', { ascending: true });

      if (user?.role === 'parent') {
        query = query.eq('parent_id', user.id);
      } else if (user?.role === 'doctor') {
        query = query.eq('doctor_id', user.id);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      if (mounted.current) {
        setAppointments(data || []);
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
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
    await loadAppointments();
    if (mounted.current) {
      setRefreshing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#10b981';
      case 'completed':
        return '#0ea5e9';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#f59e0b';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return CheckCircle;
      case 'completed':
        return CheckCircle;
      case 'cancelled':
        return XCircle;
      default:
        return AlertCircle;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const isToday = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isPast = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    return date < now;
  };

  const renderAppointmentCard = (appointment: Appointment) => {
    const StatusIcon = getStatusIcon(appointment.status);
    const isAppointmentToday = isToday(appointment.appointment_date);
    const isAppointmentPast = isPast(appointment.appointment_date);

    return (
      <TouchableOpacity 
        key={appointment.id} 
        style={[
          styles.appointmentCard,
          isAppointmentToday && styles.todayCard,
          isAppointmentPast && appointment.status !== 'completed' && styles.pastCard,
        ]}
      >
        <View style={styles.appointmentHeader}>
          <View style={styles.dateTimeContainer}>
            <View style={styles.dateContainer}>
              <Calendar size={16} color="#64748b" strokeWidth={2} />
              <Text style={styles.dateText}>{formatDate(appointment.appointment_date)}</Text>
            </View>
            <View style={styles.timeContainer}>
              <Clock size={16} color="#64748b" strokeWidth={2} />
              <Text style={styles.timeText}>{formatTime(appointment.appointment_date)}</Text>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) }]}>
            <StatusIcon size={16} color="#ffffff" strokeWidth={2} />
            <Text style={styles.statusText}>{appointment.status}</Text>
          </View>
        </View>

        <View style={styles.appointmentInfo}>
          <View style={styles.participantInfo}>
            <Baby size={20} color="#0ea5e9" strokeWidth={2} />
            <Text style={styles.participantName}>
              {appointment.babies?.first_name} {appointment.babies?.last_name}
            </Text>
          </View>

          {user?.role !== 'parent' && (
            <View style={styles.participantInfo}>
              <User size={20} color="#64748b" strokeWidth={2} />
              <Text style={styles.participantName}>
                {appointment.parents?.first_name} {appointment.parents?.last_name}
              </Text>
            </View>
          )}

          {user?.role === 'parent' && (
            <View style={styles.participantInfo}>
              <User size={20} color="#64748b" strokeWidth={2} />
              <Text style={styles.participantName}>
                Dr. {appointment.users?.first_name} {appointment.users?.last_name}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.appointmentFooter}>
          <Text style={styles.appointmentType}>{appointment.type}</Text>
          <Text style={styles.duration}>{appointment.duration_minutes} min</Text>
        </View>

        {appointment.notes && (
          <Text style={styles.notes}>{appointment.notes}</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Appointments</Text>
        {user?.role === 'parent' && (
          <TouchableOpacity style={styles.addButton}>
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
            <Text style={styles.loadingText}>Loading appointments...</Text>
          </View>
        ) : appointments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Calendar size={64} color="#94a3b8" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No appointments scheduled</Text>
            <Text style={styles.emptyText}>
              {user?.role === 'parent' 
                ? 'Book your first appointment with your doctor'
                : 'No appointments scheduled for today'
              }
            </Text>
          </View>
        ) : (
          <View style={styles.appointmentsList}>
            {appointments.map(renderAppointmentCard)}
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
  appointmentsList: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  appointmentCard: {
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
  todayCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9',
  },
  pastCard: {
    opacity: 0.7,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  dateTimeContainer: {
    flex: 1,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  timeText: {
    fontSize: 14,
    color: '#64748b',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'capitalize',
  },
  appointmentInfo: {
    marginBottom: 16,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  participantName: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  appointmentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  appointmentType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0ea5e9',
    textTransform: 'capitalize',
  },
  duration: {
    fontSize: 14,
    color: '#64748b',
  },
  notes: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 12,
    fontStyle: 'italic',
  },
});