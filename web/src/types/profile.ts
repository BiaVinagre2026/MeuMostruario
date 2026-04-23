import type { Address } from "./auth";

export interface ProfileUpdatePayload {
  full_name?: string;
  email?: string;
  phone?: string;
  birthdate?: string;
  gender?: string;
  address?: Address;
}

export interface PasswordChangePayload {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
}

export interface PasswordResetRequest {
  cpf: string;
}

export interface PasswordResetPayload {
  token: string;
  password: string;
  password_confirmation: string;
}
