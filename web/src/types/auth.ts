export interface Address {
  street: string;
  street_number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
}

export interface User {
  id: number;
  cpf: string; // masked: ***.456.789-**
  full_name: string;
  email: string;
  phone: string | null;
  gender: string | null;
  role: "member" | "admin";
  status: "active" | "inactive" | "blocked";
  plan_status: "active" | "overdue" | "cancelled";
  plan_category: string | null;
  coin_balance: number;
  xp_total: number;
  level_id: number | null;
  level_name: string | null;
  referral_code: string;
  engagement_score: number;
  birthdate: string | null;
  address?: Address | null;
  profile_completed_at: string | null;
  created_at: string;
}

export interface LoginCredentials {
  cpf: string;
  password: string;
}

export interface AuthResponse {
  user: User;
}

export interface RailsAuthResponse {
  member: User;
}

export interface ApiError {
  error: string;
  details?: Record<string, string[]>;
}
