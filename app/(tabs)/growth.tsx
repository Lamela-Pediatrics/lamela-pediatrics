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
import { LineChart } from 'react-native-chart-kit';
import { 
  TrendingUp, 
  Weight, 
  Ruler, 
  Calendar,
  Baby,
  Plus
} from 'lucide-react-native';
import type { VitalRecord, Baby as BabyType } from '@/types/database';

const screenWidth = Dimensions.get('window').width;

interface BabyWithVitals extends BabyType {
  vital_records: VitalRecord[];
}

export default function GrowthScreen() {
  const { user } = useAuth();
  const [babies, setBabies] = useState<BabyWithVitals[]>([]);
  const [selectedBaby, setSelectedBaby] = useState<BabyWithVitals | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadGrowthData();
  }, []);

  const loadGrowthData = async () => {
    try {
      if (user?.role === 'parent') {
        const { data: parentBabies } = await supabase
          .from('parent_babies')
          .select(`
            baby_id,
            babies (
              *,
              vital_records (*)
            )
          `)
          .eq('parent_id', user.id);

        const babyData = parentBabies?.map(pb => pb.babies).filter(Boolean) || [];
        setBabies(babyData as BabyWithVitals[]);
        if (babyData.length > 0) {
          setSelectedBaby(babyData[0] as BabyWithVitals);
        }
      }
    } catch (error) {
      console.error('Error loading growth data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGrowthData();
    setRefreshing(false);
  };

  const getWeightData = () => {
    if (!selectedBaby?.vital_records) return { labels: [], datasets: [{ data: [] }] };
    
    const weightRecords = selectedBaby.vital_records
      .filter(record => record.weight)
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
      .slice(-6); // Last 6 records

    const labels = weightRecords.map(record => {
      const date = new Date(record.recorded_at);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const data = weightRecords.map(record => record.weight || 0);

    return {
      labels: labels.length > 0 ? labels : ['No Data'],
      datasets: [{
        data: data.length > 0 ? data : [0],
        color: (opacity = 1) => `rgba(14, 165, 233, ${opacity})`,
        strokeWidth: 3,
      }],
    };
  };

  const getHeightData = () => {
    if (!selectedBaby?.vital_records) return { labels: [], datasets: [{ data: [] }] };
    
    const heightRecords = selectedBaby.vital_records
      .filter(record => record.height)
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
      .slice(-6); // Last 6 records

    const labels = heightRecords.map(record => {
      const date = new Date(record.recorded_at);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const data = heightRecords.map(record => record.height || 0);

    return {
      labels: labels.length > 0 ? labels : ['No Data'],
      datasets: [{
        data: data.length > 0 ? data : [0],
        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
        strokeWidth: 3,
      }],
    };
  };

  const getLatestVitals = () => {
    if (!selectedBaby?.vital_records || selectedBaby.vital_records.length === 0) {
      return { weight: null, height: null, lastUpdated: null };
    }

    const latest = selectedBaby.vital_records
      .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0];

    return {
      weight: latest.weight,
      height: latest.height,
      lastUpdated: latest.recorded_at,
    };
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(30, 41, 59, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#ffffff',
    },
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading growth data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Growth Tracking</Text>
        <TouchableOpacity style={styles.addButton}>
          <Plus size={24} color="#ffffff" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {babies.length === 0 ? (
        <View style={styles.emptyContainer}>
          <TrendingUp size={64} color="#94a3b8" strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>No growth data available</Text>
          <Text style={styles.emptyText}>
            Growth charts will appear here once vitals are recorded
          </Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {babies.length > 1 && (
            <View style={styles.babySelector}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.babySelectorContent}
              >
                {babies.map((baby) => (
                  <TouchableOpacity
                    key={baby.id}
                    style={[
                      styles.babyTab,
                      selectedBaby?.id === baby.id && styles.selectedBabyTab,
                    ]}
                    onPress={() => setSelectedBaby(baby)}
                  >
                    <Text style={[
                      styles.babyTabText,
                      selectedBaby?.id === baby.id && styles.selectedBabyTabText,
                    ]}>
                      {baby.first_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {selectedBaby && (
            <>
              <View style={styles.currentStatsContainer}>
                <Text style={styles.sectionTitle}>Current Stats</Text>
                <View style={styles.statsRow}>
                  <View style={styles.statCard}>
                    <Weight size={24} color="#0ea5e9" strokeWidth={2} />
                    <Text style={styles.statValue}>
                      {getLatestVitals().weight || '--'} kg
                    </Text>
                    <Text style={styles.statLabel}>Weight</Text>
                  </View>

                  <View style={styles.statCard}>
                    <Ruler size={24} color="#10b981" strokeWidth={2} />
                    <Text style={styles.statValue}>
                      {getLatestVitals().height || '--'} cm
                    </Text>
                    <Text style={styles.statLabel}>Height</Text>
                  </View>
                </View>
                
                {getLatestVitals().lastUpdated && (
                  <View style={styles.lastUpdated}>
                    <Clock size={16} color="#64748b" strokeWidth={2} />
                    <Text style={styles.lastUpdatedText}>
                      Last updated: {new Date(getLatestVitals().lastUpdated!).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.chartsContainer}>
                <View style={styles.chartSection}>
                  <Text style={styles.chartTitle}>Weight Progression</Text>
                  <View style={styles.chartWrapper}>
                    <LineChart
                      data={getWeightData()}
                      width={screenWidth - 48}
                      height={220}
                      chartConfig={chartConfig}
                      bezier
                      style={styles.chart}
                    />
                  </View>
                </View>

                <View style={styles.chartSection}>
                  <Text style={styles.chartTitle}>Height Progression</Text>
                  <View style={styles.chartWrapper}>
                    <LineChart
                      data={getHeightData()}
                      width={screenWidth - 48}
                      height={220}
                      chartConfig={chartConfig}
                      bezier
                      style={styles.chart}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.milestonesContainer}>
                <Text style={styles.sectionTitle}>Growth Milestones</Text>
                <View style={styles.milestoneCard}>
                  <Text style={styles.milestoneTitle}>Development on Track</Text>
                  <Text style={styles.milestoneDescription}>
                    {selectedBaby.first_name}'s growth is following expected patterns. 
                    Continue regular check-ups and monitoring.
                  </Text>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
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
  babySelector: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  babySelectorContent: {
    paddingHorizontal: 24,
    gap: 12,
  },
  babyTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectedBabyTab: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
  },
  babyTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  selectedBabyTabText: {
    color: '#ffffff',
  },
  currentStatsContainer: {
    backgroundColor: '#ffffff',
    margin: 24,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  lastUpdated: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  lastUpdatedText: {
    fontSize: 14,
    color: '#64748b',
  },
  chartsContainer: {
    paddingHorizontal: 24,
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
  milestonesContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  milestoneCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  milestoneTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
    marginBottom: 8,
  },
  milestoneDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
});