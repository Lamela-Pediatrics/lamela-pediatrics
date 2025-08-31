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
import { Baby, Calendar, MessageCircle, TrendingUp, Clock, Users, Activity, Heart, ChartBar as BarChart3 } from 'lucide-react-native';

interface DashboardStats {
  totalBabies: number;
  todayAppointments: number;
  unreadMessages: number;
  activeMonitoring: number;
}

export default function DashboardScreen() {
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalBabies: 0,
    todayAppointments: 0,
    unreadMessages: 0,
    activeMonitoring: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    loadDashboardData();
    
    return () => {
      mounted.current = false;
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load stats based on user role
      if (user?.role === 'parent') {
        await loadParentStats();
      } else {
        await loadStaffStats();
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const loadParentStats = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    // Get parent's babies
    const { data: babies } = await supabase
      .from('parent_babies')
      .select('baby_id')
      .eq('parent_id', user?.id);

    // Get today's appointments
    const { data: appointments } = await supabase
      .from('appointments')
      .select('*')
      .eq('parent_id', user?.id)
      .gte('appointment_date', today)
      .lt('appointment_date', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());

    // Get unread messages
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('recipient_id', user?.id)
      .eq('is_read', false);

    if (mounted.current) {
      setStats({
      totalBabies: babies?.length || 0,
      todayAppointments: appointments?.length || 0,
      unreadMessages: messages?.length || 0,
      activeMonitoring: babies?.length || 0,
      });
    }
  };

  const loadStaffStats = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    // Get total babies
    const { data: babies } = await supabase
      .from('babies')
      .select('*');

    // Get today's appointments
    const { data: appointments } = await supabase
      .from('appointments')
      .select('*')
      .gte('appointment_date', today)
      .lt('appointment_date', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());

    // Get unread messages (if doctor)
    let unreadCount = 0;
    if (user?.role === 'doctor') {
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('recipient_id', user?.id)
        .eq('is_read', false);
      unreadCount = messages?.length || 0;
    }

    if (mounted.current) {
      setStats({
      totalBabies: babies?.length || 0,
      todayAppointments: appointments?.length || 0,
      unreadMessages: unreadCount,
      activeMonitoring: babies?.length || 0,
      });
    }
  };

  const onRefresh = async () => {
    if (mounted.current) {
      setRefreshing(true);
    }
    await loadDashboardData();
    if (mounted.current) {
      setRefreshing(false);
    }
  };

  const getDashboardTitle = () => {
    switch (user?.role) {
      case 'admin':
        return 'Admin Dashboard';
      case 'doctor':
        return 'Doctor Dashboard';
      case 'staff':
        return 'Staff Dashboard';
      case 'parent':
      default:
        return 'Your Dashboard';
    }
  };

  const getWelcomeMessage = () => {
    const timeOfDay = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening';
    return `Good ${timeOfDay}, ${user?.first_name}!`;
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.welcomeText}>{getWelcomeMessage()}</Text>
            <Text style={styles.dashboardTitle}>{getDashboardTitle()}</Text>
          </View>
          <TouchableOpacity onPress={signOut} style={styles.signOutButton}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Baby size={24} color="#0ea5e9" strokeWidth={2} />
          </View>
          <Text style={styles.statNumber}>{stats.totalBabies}</Text>
          <Text style={styles.statLabel}>
            {user?.role === 'parent' ? 'My Babies' : 'Total Patients'}
          </Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Calendar size={24} color="#10b981" strokeWidth={2} />
          </View>
          <Text style={styles.statNumber}>{stats.todayAppointments}</Text>
          <Text style={styles.statLabel}>Today's Appointments</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <MessageCircle size={24} color="#f59e0b" strokeWidth={2} />
          </View>
          <Text style={styles.statNumber}>{stats.unreadMessages}</Text>
          <Text style={styles.statLabel}>Unread Messages</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Activity size={24} color="#ef4444" strokeWidth={2} />
          </View>
          <Text style={styles.statNumber}>{stats.activeMonitoring}</Text>
          <Text style={styles.statLabel}>Active Monitoring</Text>
        </View>
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        {user?.role === 'parent' ? (
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionCard}>
              <Baby size={32} color="#0ea5e9" strokeWidth={2} />
              <Text style={styles.actionTitle}>View Babies</Text>
              <Text style={styles.actionSubtitle}>Check growth & health</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <Calendar size={32} color="#10b981" strokeWidth={2} />
              <Text style={styles.actionTitle}>Book Appointment</Text>
              <Text style={styles.actionSubtitle}>Schedule a visit</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <MessageCircle size={32} color="#f59e0b" strokeWidth={2} />
              <Text style={styles.actionTitle}>Message Doctor</Text>
              <Text style={styles.actionSubtitle}>Ask questions</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <TrendingUp size={32} color="#8b5cf6" strokeWidth={2} />
              <Text style={styles.actionTitle}>Growth Charts</Text>
              <Text style={styles.actionSubtitle}>Track progress</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionCard}>
              <Baby size={32} color="#0ea5e9" strokeWidth={2} />
              <Text style={styles.actionTitle}>Patient Records</Text>
              <Text style={styles.actionSubtitle}>Manage patients</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <Calendar size={32} color="#10b981" strokeWidth={2} />
              <Text style={styles.actionTitle}>Schedule</Text>
              <Text style={styles.actionSubtitle}>View appointments</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <Activity size={32} color="#ef4444" strokeWidth={2} />
              <Text style={styles.actionTitle}>Vital Signs</Text>
              <Text style={styles.actionSubtitle}>Monitor health</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <BarChart3 size={32} color="#8b5cf6" strokeWidth={2} />
              <Text style={styles.actionTitle}>Analytics</Text>
              <Text style={styles.actionSubtitle}>View reports</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.recentActivity}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityCard}>
          <View style={styles.activityIcon}>
            <Heart size={20} color="#ef4444" strokeWidth={2} />
          </View>
          <View style={styles.activityContent}>
            <Text style={styles.activityTitle}>System Online</Text>
            <Text style={styles.activityTime}>Monitoring all patients</Text>
          </View>
        </View>
      </View>
    </ScrollView>
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
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  welcomeText: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 4,
  },
  dashboardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  signOutButton: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  signOutText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 12,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    width: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#f1f5f9',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  quickActions: {
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  actionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    width: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  recentActivity: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
  },
  activityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#fef2f2',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 14,
    color: '#64748b',
  },
});