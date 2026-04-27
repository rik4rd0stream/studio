
export type UserRole = 'normal' | 'master';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  notificationsEnabled?: boolean;
  hasRequestAccess?: boolean;
  fcmTokens?: string[]; // Lista de tokens de dispositivos do usuário
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

export type AppView = 'send-order' | 'request-order' | 'active-orders' | 'admin-users' | 'admin-couriers' | 'operation-logs';
