export type UserRole = 'normal' | 'master';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  notificationsEnabled?: boolean;
  hasRequestAccess?: boolean;
  hasRtStatusAccess?: boolean;
  useDirectWhatsApp?: boolean;
  fcmTokens?: string[];
}

export interface Courier {
  id: string;
  nome: string;
  id_motoboy: string;
  isFavorite?: boolean; 
  updatedAt: string;
}

export interface StoreProfile {
  id: string; 
  address: string; 
  updatedAt: string;
}

export interface OrderRequest {
  id?: string;
  orderId: string;
  storeName: string;
  command: string;
  targetUserEmail: string;
  senderName: string;
  senderEmail?: string; 
  status: 'pending' | 'accepted' | 'rejected' | 'unavailable';
  createdAt: string;
  updatedAt?: string;
  statusNote?: string;
}

export interface OperationLog {
  id?: string;
  orderId: string;
  rtId: string;
  action: 'copy_id' | 'cheguei';
  userName: string;
  userEmail: string;
  timestamp: string;
}

export interface RTStatusData {
  courier_id: string;
  storekeeper_level_name: string;
  lat: number;
  lng: number;
  on_geo_queue: boolean | string | number;
  connected_on_geo_queue: boolean | string | number;
  auto_acceptance: boolean | string | number;
  [key: string]: any;
}

export type AppView = 'send-order' | 'quick-send' | 'request-order' | 'active-orders' | 'admin-users' | 'admin-couriers' | 'admin-stores' | 'admin-themes' | 'operation-logs' | 'rt-status';
