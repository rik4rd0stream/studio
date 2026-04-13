export type UserProfile = 'normal' | 'master';

export interface User {
  id: string;
  name: string;
  email: string;
  profile: UserProfile;
}

export interface Courier {
  id: string;
  nome: string;
  id_motoboy: string;
  createdAt?: string;
}

export interface Order {
  id: string;
  items: string[];
  status: 'pending' | 'accepted' | 'delivering' | 'completed';
  deliveryAddress: string;
  pickupAddress: string;
  specialInstructions?: string;
  courierId?: string;
  createdAt: string;
  categories?: string[];
}

export type AppView = 'home' | 'send-order' | 'request-order' | 'active-orders' | 'admin-users' | 'admin-couriers';