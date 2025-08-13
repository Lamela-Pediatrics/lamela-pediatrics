import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { ChartBar as BarChart3, TrendingUp, Users, Calendar, Download, Baby, Activity } from 'lucide-react-native';

const screenWidth = Dimensions.get('window').width;

interface ReportStats {
  totalPatients: number;
  newPatientsThisMonth: number;
  appointmentsThisWeek: number;
  activeMonitoring: number;
  ageDistribution: { name: string; population: number; color: string; legendFontColor: string }[];
  weeklyAppointments: number[];
}

export default function ReportsScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ReportStats>({
    totalPatients: 0,
    newPatientsThisMonth: 0,
    appointmentsThisWeek: 0,
    activeMonitoring: 0,
    ageDistribution: [],
    weeklyAppointments: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    try {
      // Get total patients
      const { data: babies } = await supabase
        .from('babies')
        .select('*');

      // Get new patients this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: newPatients } = await supabase
        .from('babies')
        .select('*')
        .gte('created_at', startOfMonth.toISOString());

      // Get appointments this week
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const { data: weeklyAppointments } = await supabase
        .from('appointments')
        .select('*')
        .gte('appointment_date', startOfWeek.toISOString());

      // Calculate age distribution
      const ageGroups = { '0-6m': 0, '6m-1y': 0, '1-2y': 0, '2y+': 0 };
      
      babies?.forEach(baby => {
        const ageInMonths = Math.floor(
          (Date.now() - new Date(baby.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44)
        );
        
        if (ageInMonths <= 6) ageGroups['0-6m']++;
        else if (ageInMonths <= 12) ageGroups['6m-1y']++;
        else if (ageInMonths <= 24) ageGroups['1-2y']++;
        else ageGroups['2y+']++;
      });

      const ageDistribution = [
        { name: '0-6 months', population: ageGroups['0-6m'], color: '#0ea5e9', legendFontColor: '#1e293b' },
        { name: '6m-1 year', population: ageGroups['6m-1y'], color: '#10b981', legendFontColor: '#1e293b' },
        { name: '1-2 years', population: ageGroups['1-2y'], color: '#f59e0b', legendFontColor: '#1e293b' },
        { name: '2+ years', population: ageGroups['2y+'], color: '#ef4444', legendFontColor: '#1e293b' },
      ];

      // Weekly appointments data
      const weeklyData = Array(7).fill(0);
      weeklyAppointments?.forEach(appointment => {
        const day = new Date(appointment.appointment_date).getDay();
        weeklyData[day]++;
      });

      setStats({
        totalPatients: babies?.length || 0,
        newPatientsThisMonth: newPatients?.length || 0,
        appointmentsThisWeek: weeklyAppointments?.length || 0,
        activeMonitoring: babies?.length || 0,
        ageDistribution,
        weeklyAppointments: weeklyData,
      });
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReportData();
    setRefreshing(false);
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(14, 165, 233, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForLabels: {
      fontSize: 12,
    },
  };

  const weeklyAppointmentsData = {
    labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    datasets: [{
      data: stats.weeklyAppointments.length > 0 ? stats.weeklyAppointments : [0],
    }],
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reports & Analytics</Text>
        <TouchableOpacity style={styles.downloadButton}>
          <Download size={24} color="#ffffff" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading reports...</Text>
          </View>
        ) : (
          <>
            <View style={styles.overviewCards}>
              <View style={styles.statCard}>
                <View style={styles.statIcon}>
                  <Baby size={24} color="#0ea5e9" strokeWidth={2} />
                </View>
                <Text style={styles.statNumber}>{stats.totalPatients}</Text>
                <Text style={styles.statLabel}>Total Patients</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIcon}>
                  <TrendingUp size={24} color="#10b981" strokeWidth={2} />
                </View>
                <Text style={styles.statNumber}>{stats.newPatientsThisMonth}</Text>
                <Text style={styles.statLabel}>New This Month</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIcon}>
                  <Calendar size={24} color="#f59e0b" strokeWidth={2} />
                </View>
                <Text style={styles.statNumber}>{stats.appointmentsThisWeek}</Text>
                <Text style={styles.statLabel}>This Week</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIcon}>
                  <Activity size={24} color="#ef4444" strokeWidth={2} />
                </View>
                <Text style={styles.statNumber}>{stats.activeMonitoring}</Text>
                <Text style={styles.statLabel}>Active Monitoring</Text>
              </View>
            </View>

            <View style={styles.chartsContainer}>
              <View style={styles.chartSection}>
                <Text style={styles.chartTitle}>Weekly Appointments</Text>
                <View style={styles.chartWrapper}>
                  <BarChart
                    data={weeklyAppointmentsData}
                    width={screenWidth - 48}
                    height={220}
                    chartConfig={chartConfig}
                    style={styles.chart}
                    showValuesOnTopOfBars
                  />
                </View>
              </View>

              {stats.ageDistribution.some(item => item.population > 0) && (
                <View style={styles.chartSection}>
                  <Text style={styles.chartTitle}>Age Distribution</Text>
                  <View style={styles.chartWrapper}>
                    <PieChart
                      data={stats.ageDistribution.filter(item => item.population > 0)}
                      width={screenWidth - 48}
                      height={220}
                      chartConfig={chartConfig}
                      accessor="population"
                      backgroundColor="transparent"
                      paddingLeft="15"
                      style={styles.chart}
                    />
                  </View>
                </View>
              )}
            </View>

            <View style={styles.insightsContainer}>
              <Text style={styles.sectionTitle}>Key Insights</Text>
              
              <View style={styles.insightCard}>
                <View style={styles.insightHeader}>
                  <TrendingUp size={20} color="#10b981" strokeWidth={2} />
                  <Text style={styles.insightTitle}>Growth Trends</Text>
                </View>
                <Text style={styles.insightDescription}>
                  Patient base has grown by {stats.newPatientsThisMonth} new registrations this month.
                </Text>
              </View>

              <View style={styles.insightCard}>
                <View style={styles.insightHeader}>
                  <Calendar size={20} color="#0ea5e9" strokeWidth={2} />
                  <Text style={styles.insightTitle}>Appointment Activity</Text>
                </View>
                <Text style={styles.insightDescription}>
                  {stats.appointmentsThisWeek} appointments scheduled this week. 
                  Peak activity on weekdays.
                </Text>
              </View>
            </View>
          </>
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
  downloadButton: {
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
  overviewCards: {
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
  statIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#f1f5f9',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  chartsContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  chartSection: {
    marginBottom: 32,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  chartWrapper: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  insightsContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  insightCard: {
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
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  insightDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
});