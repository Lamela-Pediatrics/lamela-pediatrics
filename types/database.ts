export interface User {
  id: string;
  email: string;
  role: 'admin' | 'doctor' | 'staff' | 'parent';
  first_name: string;
  last_name: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface Baby {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  gender: 'male' | 'female' | 'other';
  current_weight?: number;
  current_height?: number;
  blood_type?: string;
  allergies?: string[];
  medical_notes?: string;
  assigned_doctor_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ParentBaby {
  id: string;
  parent_id: string;
  baby_id: string;
  relationship: 'mother' | 'father' | 'guardian';
  created_at: string;
}

export interface VitalRecord {
  id: string;
  baby_id: string;
  weight?: number;
  height?: number;
  temperature?: number;
  heart_rate?: number;
  feeding_time?: string;
  notes?: string;
  recorded_by: string;
  recorded_at: string;
}

export interface Appointment {
  id: string;
  baby_id: string;
  doctor_id: string;
  parent_id: string;
  appointment_date: string;
  duration_minutes: number;
  type: 'checkup' | 'vaccination' | 'consultation' | 'emergency';
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  baby_id?: string;
  content: string;
  message_type: 'text' | 'image' | 'document';
  is_read: boolean;
  sent_at: string;
}