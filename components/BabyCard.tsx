import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Baby, Calendar, Weight, Ruler } from 'lucide-react-native';
import type { Baby as BabyType } from '@/types/database';

interface BabyCardProps {
  baby: BabyType;
  onPress: () => void;
  showDoctor?: boolean;
}

export default function BabyCard({ baby, onPress, showDoctor = false }: BabyCardProps) {
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

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Baby size={32} color="#0ea5e9" strokeWidth={2} />
        </View>
        
        <View style={styles.info}>
          <Text style={styles.name}>
            {baby.first_name} {baby.last_name}
          </Text>
          <Text style={styles.age}>
            {calculateAge(baby.birth_date)}
          </Text>
        </View>

        <View style={styles.genderBadge}>
          <Text style={styles.genderText}>
            {baby.gender.charAt(0).toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.stats}>
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

      {baby.allergies && baby.allergies.length > 0 && (
        <View style={styles.allergies}>
          <Text style={styles.allergiesText}>
            Allergies: {baby.allergies.join(', ')}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    backgroundColor: '#e0f2fe',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  age: {
    fontSize: 14,
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
  stats: {
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
  allergies: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
  },
  allergiesText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '500',
  },
});