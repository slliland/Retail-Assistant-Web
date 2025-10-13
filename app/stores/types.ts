export interface StoreLocation {
  id: number;
  postal_code: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  store_name: string;
  address: string;
  region: string;
}

export interface StoreStatistics extends StoreLocation {
  store_id: number;
  total_transactions: number;
  total_sales: number;
  total_profit: number;
  avg_discount: number;
  categories_available: number;
  subcategories_available: number;
}

export interface StorePost {
  id: number;
  store_id: number;
  user_name: string;
  content: string;
  post_type: string;
  rating?: number;
  is_verified: boolean;
  created_at: string;
  store_name?: string;
  city?: string;
  state?: string;
}

export interface PostFormData {
  user_name: string;
  content: string;
  post_type: 'comment' | 'review' | 'question' | 'tip';
  rating?: number;
}

export type MapMode = 'region' | 'profit';
export type SortOrder = 'asc' | 'desc';
