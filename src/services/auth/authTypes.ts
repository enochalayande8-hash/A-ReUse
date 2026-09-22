import { User } from '../../types';

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isTopAdmin: boolean;
  isAdmin: boolean;
}

export interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  signup: (fullName: string, email: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<string>;
  claimTopAdmin: (bootstrapKey: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (fullName?: string, profileImageUrl?: string) => Promise<void>;
}
