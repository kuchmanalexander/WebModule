
export enum UserStatus {
  UNKNOWN = 'UNKNOWN',
  ANONYMOUS = 'ANONYMOUS',
  AUTHORIZED = 'AUTHORIZED'
}

export enum Role {
  STUDENT = 'Student',
  TEACHER = 'Teacher',
  ADMIN = 'Admin'
}

export interface User {
  id: string;
  fullName: string;
  roles: Role[];
  email: string;
}

export interface Session {
  status: UserStatus;
  sessionToken?: string;
  loginToken?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: User;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  teacherId: string;
}

export interface Test {
  id: string;
  courseId: string;
  title: string;
  isActive: boolean;
  authorId: string;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
  version: number;
}
