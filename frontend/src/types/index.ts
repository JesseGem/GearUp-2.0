export type UserRole = 'CAR_OWNER' | 'MECHANIC' | 'PARTS_DEALER';

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  isVerified: boolean;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export type FuelType = 'PETROL' | 'DIESEL' | 'ELECTRIC' | 'HYBRID';

export interface Vehicle {
  id: string;
  ownerId: string;
  make: string;
  model: string;
  year: number;
  color: string;
  regNumber: string;
  fuelType: FuelType;
  isPrimary: boolean;
}

export type Specialization =
  | 'ENGINE' | 'ELECTRICAL' | 'TYRES'
  | 'AC' | 'BODYWORK' | 'BRAKES'
  | 'TRANSMISSION' | 'GENERAL';

export interface MechanicProfile {
  id: string;
  userId: string;
  name: string;
  bio?: string;
  specializations: Specialization[];
  latitude: number;
  longitude: number;
  address: string;
  isAvailable: boolean;
  isSosAvailable: boolean;
  isVerified: boolean;
  averageRating: number;
  totalReviews: number;
  distanceKm?: number;
}

export type JobType = 'STANDARD' | 'SOS';
export type JobStatus =
  | 'PENDING' | 'ACCEPTED'
  | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface JobRequest {
  id: string;
  ownerId: string;
  mechanicId?: string;
  vehicleId: string;
  type: JobType;
  title: string;
  description: string;
  photoUrls: string[];
  ownerLatitude: number;
  ownerLongitude: number;
  estimatedCost?: number;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceRecord {
  id: string;
  vehicleId: string;
  jobId?: string;
  mechanicId?: string;
  description: string;
  partsUsed: string[];
  cost: number;
  serviceDate: string;
  nextServiceDate?: string;
  mileage?: number;
}

export type PaymentMethod = 'PAYSTACK' | 'MTN_MOMO';
export type TransactionStatus = 'PENDING' | 'HELD' | 'RELEASED' | 'REFUNDED';

export interface Transaction {
  id: string;
  jobId: string;
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  netAmount: number;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  paidAt?: string;
  releasedAt?: string;
}

export interface Review {
  id: string;
  jobId: string;
  reviewerId: string;
  mechanicId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  jobId: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  sentAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}