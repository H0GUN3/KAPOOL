import type {
  AuthSessionDto,
  AdminReportSummary,
  AdminVisibleReportContext,
  AuthUser,
  ChatHistoryDto,
  ChatRoomSummary,
  CreateReportMessageDto,
  CreateRideRequestDto,
  CreateReportDto,
  CreateReservationDto,
  CreateRideDto,
  LoginRequestDto,
  PaymentStatus,
  Report,
  ReportStatus,
  Reservation,
  ReservationStatus,
  Ride,
  RideRequest,
  SignupRequestDto,
  UpdateAuthProfileDto,
  UpdatePaymentStatusDto,
  UpdateReportStatusDto,
  UpdateReservationStatusDto,
  UpsertVehicleDto,
  Vehicle,
} from '@kapool/shared';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3000';

export const realtimeBaseUrl = import.meta.env.VITE_REALTIME_BASE_URL
  ?? (apiBaseUrl.startsWith('/') ? window.location.origin : apiBaseUrl);

export async function loginWithCredentials(credentials: LoginRequestDto): Promise<AuthSessionDto> {
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    throw new Error('invalid_credentials');
  }

  return response.json() as Promise<AuthSessionDto>;
}

export async function signupWithCredentials(credentials: SignupRequestDto): Promise<AuthSessionDto> {
  const response = await fetch(`${apiBaseUrl}/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    throw new Error(response.status === 409 ? 'account_already_exists' : 'signup_failed');
  }

  return response.json() as Promise<AuthSessionDto>;
}

export async function fetchCurrentSession(accessToken: string): Promise<AuthSessionDto> {
  const response = await fetch(`${apiBaseUrl}/auth/me`, {
    headers: authenticatedHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error('invalid_session');
  }

  const user = await response.json() as AuthUser;

  return {
    accessToken,
    tokenType: 'Bearer',
    user,
  };
}

export async function updateCurrentUserProfile(
  accessToken: string,
  profile: UpdateAuthProfileDto,
): Promise<AuthUser> {
  const response = await fetch(`${apiBaseUrl}/auth/me/profile`, {
    method: 'PATCH',
    headers: {
      ...authenticatedHeaders(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profile),
  });

  if (!response.ok) {
    throw new Error(response.status === 409 ? 'school_email_already_exists' : 'profile_update_failed');
  }

  return response.json() as Promise<AuthUser>;
}

export async function fetchRides(accessToken: string): Promise<Ride[]> {
  const response = await fetch(`${apiBaseUrl}/rides`, {
    headers: authenticatedHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error('rides_unavailable');
  }

  return response.json() as Promise<Ride[]>;
}

export async function fetchRideDetail(accessToken: string, rideId: string | number): Promise<Ride> {
  const response = await fetch(`${apiBaseUrl}/rides/${rideId}`, {
    headers: authenticatedHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error(response.status === 404 ? 'ride_not_found' : 'ride_unavailable');
  }

  return response.json() as Promise<Ride>;
}

export async function createRide(accessToken: string, ride: CreateRideDto): Promise<Ride> {
  const response = await fetch(`${apiBaseUrl}/rides`, {
    method: 'POST',
    headers: {
      ...authenticatedHeaders(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(ride),
  });

  if (!response.ok) {
    throw new Error(response.status === 403 ? 'driver_required' : 'ride_create_failed');
  }

  return response.json() as Promise<Ride>;
}

export async function fetchRideRequests(accessToken: string): Promise<RideRequest[]> {
  const response = await fetch(`${apiBaseUrl}/ride-requests`, {
    headers: authenticatedHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error('ride_requests_unavailable');
  }

  return response.json() as Promise<RideRequest[]>;
}

export async function createRideRequest(
  accessToken: string,
  request: CreateRideRequestDto,
): Promise<RideRequest> {
  const response = await fetch(`${apiBaseUrl}/ride-requests`, {
    method: 'POST',
    headers: {
      ...authenticatedHeaders(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(response.status === 403 ? 'ride_request_forbidden' : 'ride_request_create_failed');
  }

  return response.json() as Promise<RideRequest>;
}

export async function fetchReservations(accessToken: string, rideId?: string | number): Promise<Reservation[]> {
  const query = rideId ? `?rideId=${encodeURIComponent(String(rideId))}` : '';
  const response = await fetch(`${apiBaseUrl}/reservations${query}`, {
    headers: authenticatedHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error('reservations_unavailable');
  }

  return response.json() as Promise<Reservation[]>;
}

export async function createReservation(
  accessToken: string,
  reservation: CreateReservationDto,
): Promise<Reservation> {
  const response = await fetch(`${apiBaseUrl}/reservations`, {
    method: 'POST',
    headers: {
      ...authenticatedHeaders(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(reservation),
  });

  if (!response.ok) {
    throw new Error(response.status === 409 ? 'reservation_already_exists' : 'reservation_create_failed');
  }

  return response.json() as Promise<Reservation>;
}

export async function updateReservationStatus(
  accessToken: string,
  reservationId: string,
  status: ReservationStatus,
  transferInstruction?: string,
): Promise<Reservation> {
  const payload: UpdateReservationStatusDto = { status };

  if (status === 'completed' && transferInstruction?.trim()) {
    payload.transferInstruction = transferInstruction.trim();
  }

  const response = await fetch(`${apiBaseUrl}/reservations/${reservationId}/status`, {
    method: 'PATCH',
    headers: {
      ...authenticatedHeaders(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('reservation_status_update_failed');
  }

  return response.json() as Promise<Reservation>;
}

export async function updateReservationPaymentStatus(
  accessToken: string,
  reservationId: string,
  status: PaymentStatus,
): Promise<Reservation> {
  const payload: UpdatePaymentStatusDto = { status };
  const response = await fetch(`${apiBaseUrl}/reservations/${reservationId}/payment`, {
    method: 'PATCH',
    headers: {
      ...authenticatedHeaders(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('reservation_payment_update_failed');
  }

  return response.json() as Promise<Reservation>;
}

export async function fetchChatHistory(accessToken: string, rideId?: string | number): Promise<ChatHistoryDto> {
  const endpoint = rideId
    ? `/chat/rooms/ride/${encodeURIComponent(String(rideId))}`
    : '/chat/rooms/current';
  const response = await fetch(`${apiBaseUrl}${endpoint}`, {
    headers: authenticatedHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error(response.status === 403 ? 'chat_access_denied' : 'chat_unavailable');
  }

  return response.json() as Promise<ChatHistoryDto>;
}

export async function fetchChatRooms(accessToken: string): Promise<ChatRoomSummary[]> {
  const response = await fetch(`${apiBaseUrl}/chat/rooms`, {
    headers: authenticatedHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error('chat_rooms_unavailable');
  }

  return response.json() as Promise<ChatRoomSummary[]>;
}

export async function fetchChatRoomHistory(accessToken: string, roomId: string): Promise<ChatHistoryDto> {
  const response = await fetch(`${apiBaseUrl}/chat/rooms/${encodeURIComponent(roomId)}/history`, {
    headers: authenticatedHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error(response.status === 403 ? 'chat_access_denied' : 'chat_unavailable');
  }

  return response.json() as Promise<ChatHistoryDto>;
}

export async function fetchRideRequestChatHistory(accessToken: string, rideRequestId: string): Promise<ChatHistoryDto> {
  const response = await fetch(`${apiBaseUrl}/chat/rooms/request/${encodeURIComponent(rideRequestId)}`, {
    headers: authenticatedHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error(response.status === 403 ? 'chat_access_denied' : 'chat_unavailable');
  }

  return response.json() as Promise<ChatHistoryDto>;
}

export async function createReport(accessToken: string, report: CreateReportDto): Promise<Report> {
  const response = await fetch(`${apiBaseUrl}/reports`, {
    method: 'POST',
    headers: {
      ...authenticatedHeaders(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(report),
  });

  if (!response.ok) {
    throw new Error(response.status === 403 ? 'report_context_denied' : 'report_create_failed');
  }

  return response.json() as Promise<Report>;
}

export async function fetchAdminReports(accessToken: string): Promise<AdminReportSummary[]> {
  const response = await fetch(`${apiBaseUrl}/admin/reports`, {
    headers: authenticatedHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error(response.status === 403 ? 'admin_required' : 'admin_reports_unavailable');
  }

  return response.json() as Promise<AdminReportSummary[]>;
}

export async function fetchAdminReportDetail(accessToken: string, reportId: string): Promise<AdminVisibleReportContext> {
  const response = await fetch(`${apiBaseUrl}/admin/reports/${reportId}`, {
    headers: authenticatedHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error(response.status === 404 ? 'report_not_found' : 'admin_report_unavailable');
  }

  return response.json() as Promise<AdminVisibleReportContext>;
}

export async function updateAdminReportStatus(
  accessToken: string,
  reportId: string,
  status: ReportStatus,
  adminNote: string,
): Promise<AdminVisibleReportContext> {
  const payload: UpdateReportStatusDto = { status, adminNote };
  const response = await fetch(`${apiBaseUrl}/admin/reports/${reportId}/status`, {
    method: 'PATCH',
    headers: {
      ...authenticatedHeaders(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('admin_report_update_failed');
  }

  return response.json() as Promise<AdminVisibleReportContext>;
}

export async function createAdminReportMessage(
  accessToken: string,
  reportId: string,
  message: CreateReportMessageDto,
): Promise<AdminVisibleReportContext> {
  const response = await fetch(`${apiBaseUrl}/admin/reports/${reportId}/messages`, {
    method: 'POST',
    headers: {
      ...authenticatedHeaders(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    throw new Error('admin_report_message_failed');
  }

  return response.json() as Promise<AdminVisibleReportContext>;
}

export async function fetchMyVehicle(accessToken: string): Promise<Vehicle | null> {
  const response = await fetch(`${apiBaseUrl}/vehicles/me`, {
    headers: authenticatedHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error(response.status === 403 ? 'vehicle_access_denied' : 'vehicle_unavailable');
  }

  return response.json() as Promise<Vehicle | null>;
}

export async function upsertMyVehicle(accessToken: string, vehicle: UpsertVehicleDto): Promise<Vehicle> {
  const response = await fetch(`${apiBaseUrl}/vehicles/me`, {
    method: 'PUT',
    headers: {
      ...authenticatedHeaders(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(vehicle),
  });

  if (!response.ok) {
    throw new Error(response.status === 403 ? 'vehicle_access_denied' : 'vehicle_update_failed');
  }

  return response.json() as Promise<Vehicle>;
}

function authenticatedHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}
