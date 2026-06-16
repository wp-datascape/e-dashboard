// src/types/auth.ts
export interface User {
  id: string
  name: string
  email: string
  role: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  success: boolean
  csrf_token: string;
  data: {
    token: string
    user: User
    permissions: string[]
  }
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
  }
}