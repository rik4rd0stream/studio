
export type UserProfile = 'normal' | 'master';

export interface User {
  id: string;
  name: string;
  email: string;
  profile: UserProfile;
  notificationsEnabled?: boolean;
  hasRequestAccess?: boolean;
  fcmToken?: string;
}

export interface Courier {
  id: string;
  nome: string;
  id_motoboy: string;
  createdAt?: string;
}

export interface OrderRequest {
  id?: string;
  orderId: string;
  storeName: string;
  command: string;
  targetUserId: string;
  senderName: string;
  status: 'pending' | 'accepted';
  createdAt: string;
}

export type AppView = 'send-order' | 'request-order' | 'active-orders' | 'admin-users' | 'admin-couriers';
