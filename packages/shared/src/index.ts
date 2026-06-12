export const USER_ROLES = ['passenger', 'driver', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const RIDE_STATUSES = ['open', 'full', 'closed'] as const;
export type RideStatus = (typeof RIDE_STATUSES)[number];

export const RESERVATION_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'cancelled',
  'completed',
] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const PAYMENT_STATUSES = ['unpaid', 'paid', 'disputed', 'waived'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const REPORT_TYPES = [
  'settlement_missing',
  'inappropriate_chat',
  'safety_issue',
  'account_auth',
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_STATUSES = ['open', 'in_review', 'resolved', 'dismissed'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export interface UserProfile {
  id: string;
  role: UserRole;
  name: string;
  nickname: string;
  schoolEmail: string;
  department: string;
  phone?: string;
  homeRegion?: string;
  photoDataUrl?: string;
  createdAt: string;
}

export interface PublicUserProfile {
  id: string;
  nickname: string;
  department: string;
  homeRegion?: string;
  photoDataUrl?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  isAdmin: boolean;
  profile: {
    name: string;
    nickname: string;
    schoolEmail: string;
    department: string;
    homeRegion?: string;
    photoDataUrl?: string;
  };
}

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface SignupRequestDto {
  email: string;
  password: string;
  role: Exclude<UserRole, 'admin'>;
  name: string;
  nickname: string;
  schoolEmail: string;
  department: string;
  homeRegion?: string;
}

export interface UpdateAuthProfileDto {
  name?: string;
  nickname?: string;
  schoolEmail?: string;
  department?: string;
  phone?: string;
  homeRegion?: string;
  photoDataUrl?: string;
}

export interface AuthSessionDto {
  accessToken: string;
  tokenType: 'Bearer';
  user: AuthUser;
}

export interface Vehicle {
  id: string;
  ownerId: string;
  model: string;
  color: string;
  capacity: number;
  plateLastFour?: string;
  photoDataUrl?: string;
}

export interface PublicVehicleSummary {
  model: string;
  color: string;
  capacity: number;
  photoDataUrl?: string;
}

export interface UpsertVehicleDto {
  model: string;
  color: string;
  capacity: number;
  plateLastFour?: string;
  photoDataUrl?: string;
}

export interface Ride {
  id: string | number;
  from: string;
  to: string;
  departureTime: string;
  time?: string;
  seats: number;
  fare: number;
  status: RideStatus;
  driverId?: string;
  driver: string;
  driverDepartment?: string;
  driverPhotoDataUrl?: string;
  avIdx?: number;
  waypoints: string[];
  vehicle?: PublicVehicleSummary;
}

export interface CreateRideDto {
  from: string;
  to: string;
  departureTime: string;
  seats: number;
  fareRegion: '전주' | '익산' | '군산';
  waypoints?: string[];
  vehicle: {
    model: string;
    color: string;
    capacity: number;
    plateLastFour?: string;
  };
}

export interface RideRequest {
  id?: string;
  passengerId?: string;
  from: string;
  to: string;
  time: string;
  content: string;
  createdAt?: string;
}

export interface CreateRideRequestDto {
  from: string;
  to: string;
  time: string;
  content: string;
}

export interface Reservation {
  id: string;
  rideId: string;
  passengerId: string;
  status: ReservationStatus;
  seatsRequested: number;
  message?: string;
  createdAt: string;
  updatedAt: string;
  ride?: Ride;
  passenger?: PublicUserProfile;
  payment?: SettlementPaymentRecord;
  approvedInfo?: {
    driver: PublicUserProfile;
    vehicle?: PublicVehicleSummary;
  };
}

export interface CreateReservationDto {
  rideId: string;
  seatsRequested: number;
  message?: string;
}

export interface UpdateReservationStatusDto {
  status: ReservationStatus;
  transferInstruction?: string;
}

export interface ChatRoom {
  id: string;
  rideId?: string;
  reservationId?: string;
  rideRequestId?: string;
  participantIds: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface ChatRoomSummary extends ChatRoom {
  ride?: Pick<Ride, 'id' | 'from' | 'to' | 'departureTime' | 'fare' | 'driver' | 'driverPhotoDataUrl' | 'vehicle'>;
  rideRequest?: RideRequest;
  requester?: PublicUserProfile;
  report?: Pick<Report, 'id' | 'type' | 'status' | 'description'>;
}

export type ChatMessage =
  | { type: 'system'; text: string; id?: string; roomId?: string; createdAt?: string }
  | { type: 'sysinfo'; text: string; id?: string; roomId?: string; createdAt?: string }
  | { type: 'other'; name: string; idx: number; text: string; id?: string; roomId?: string; senderId?: string; photoDataUrl?: string; createdAt?: string }
  | { type: 'me'; text: string; id?: string; roomId?: string; senderId?: string; createdAt?: string };

export interface CreateChatMessageDto {
  roomId: string;
  text: string;
}

export interface ChatHistoryDto {
  room: ChatRoomSummary;
  messages: ChatMessage[];
}

export interface SendChatMessageDto {
  roomId: string;
  text: string;
}

export interface SettlementPaymentRecord {
  id: string;
  rideId: string;
  reservationId: string;
  payerId: string;
  receiverId: string;
  amount: number;
  status: PaymentStatus;
  note?: string;
  updatedAt: string;
}

export interface UpdatePaymentStatusDto {
  status: PaymentStatus;
  note?: string;
}

export interface Report {
  id: string;
  type: ReportType;
  status: ReportStatus;
  reporterId: string;
  rideId?: string;
  reservationId?: string;
  chatRoomId?: string;
  operationChatRoomId?: string;
  paymentRecordId?: string;
  subjectUserId?: string;
  description: string;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReportDto {
  type: ReportType;
  rideId?: string;
  reservationId?: string;
  chatRoomId?: string;
  paymentRecordId?: string;
  subjectUserId?: string;
  description: string;
}

export interface UpdateReportStatusDto {
  status: ReportStatus;
  adminNote?: string;
}

export interface ReportOperationMessage {
  id: string;
  reportId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
}

export interface CreateReportMessageDto {
  text: string;
}

export interface AdminReportSummary extends Report {
  reporter?: PublicUserProfile;
  subjectUser?: PublicUserProfile;
  ride?: Pick<Ride, 'id' | 'from' | 'to' | 'departureTime' | 'fare' | 'driver' | 'driverPhotoDataUrl'>;
}

export interface AdminVisibleReportContext {
  report: Report;
  reporter?: UserProfile;
  subjectUser?: UserProfile;
  ride?: Ride;
  reservation?: Reservation;
  chatRoom?: ChatRoom;
  operationChatRoom?: ChatRoom;
  chatMessages?: ChatMessage[];
  operationMessages?: ReportOperationMessage[];
  paymentRecord?: SettlementPaymentRecord;
  vehicle?: PublicVehicleSummary;
}
