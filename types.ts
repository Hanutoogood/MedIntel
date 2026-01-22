
export enum RecordType {
  LAB_RESULT = 'Lab Result',
  CONSULTATION = 'Consultation',
  PRESCRIPTION = 'Prescription',
  IMAGING = 'Imaging',
  DISCHARGE = 'Discharge Summary',
  VITAL_LOG = 'Vital Log'
}

export interface MedicalRecord {
  id: string;
  date: string;
  type: RecordType;
  provider: string;
  facility: string;
  summary?: string;
  rawContent: string;
  status: 'synced' | 'pending' | 'error';
}

export interface Medication {
  id: string;
  name: string;
  dosagePerIntake: string;
  timesPerDay: string;
  frequency: string;
  startDate: string;
  purpose: string;
}

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  content: string;
  isThinking?: boolean;
}

export interface HealthMetric {
  date: string;
  value: number;
  unit: string;
  label: string;
}

export interface BloodPressureLog {
  id: string;
  date: string;
  systolic: number;
  diastolic: number;
}
