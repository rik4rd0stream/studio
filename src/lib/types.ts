
export type UserRole = 'normal' | 'master';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  notificationsEnabled?: boolean;
  hasRequestAccess?: boolean;
}

export interface Courier {
  id: string;
  nome: string;
  id_motoboy: string;
  updatedAt: string;
}

export interface OrderRequest {
  id?: string;
  orderId: string;
  storeName: string;
  command: string;
  targetUserEmail: string; // Mudado de targetUserId para targetUserEmail para maior precisão
  senderName: string;
  status: 'pending' | 'accepted';
  createdAt: string;
}

export type AppView = 'send-order' | 'request-order' | 'active-orders' | 'admin-users' | 'admin-couriers';
