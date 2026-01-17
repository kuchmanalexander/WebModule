
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
  isBlocked?: boolean;
  createdAt?: string; // ISO
}

export interface UserData {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  isBlocked: boolean;
  roles: string[];
  coursesCount: number;
  attemptsCount: number;
}

export interface Session {
  status: UserStatus;
  sessionToken?: string;
  loginToken?: string;
  accessToken?: string;
  accessTokenExpiresAt?: number; // epoch ms
  refreshToken?: string;
  refreshTokenExpiresAt?: number; // epoch ms
  user?: User;
  permissions?: string[];
}

// Permissions — упрощённая модель прав из JWT (task-flow)
export type Permission = string;

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


export enum AttemptStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}

export interface AttemptAnswer {
  questionId: string;
  selectedOptionIndex: number | null;
}

export interface Attempt {
  id: string;
  testId: string;
  userId: string;
  status: AttemptStatus;
  startedAt: string; // ISO
  finishedAt?: string; // ISO
  // snapshot of question versions at start
  questions: Question[];
  answers: Record<string, AttemptAnswer>;
  score?: number;
  maxScore?: number;
}
