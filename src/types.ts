export type UserRole = "student" | "teacher" | "admin";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
}

export interface Keyword {
  term: string;
  definition: string;
}

export interface Flashcard {
  question: string;
  answer: string;
}

export interface ExamQuestion {
  id: string;
  type: "mcq" | "boolean" | "fill" | "short" | "long";
  question: string;
  options?: string[];
  correctAnswer: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface InterviewQuestion {
  id: string;
  type: "technical" | "hr" | "viva";
  mode: "beginner" | "intermediate" | "advanced";
  question: string;
  targetCriteria: string;
}

export interface EduDocument {
  id: string;
  userId: string;
  name: string;
  type: string;
  size: number;
  summary: string;
  importantTopics: string;
  revisionNotes: string;
  keywords: Keyword[];
  flashcards: Flashcard[];
  examQuestions: ExamQuestion[];
  interviewQuestions: InterviewQuestion[];
  createdAt: string;
}

export interface MockExamSession {
  id: string;
  userId: string;
  documentId: string;
  documentName: string;
  score: number;
  totalQuestions: number;
  difficulty: "easy" | "medium" | "hard";
  answers: Record<string, string>; // questionId -> userAnswer
  feedback: string;
  createdAt: string;
}

export interface MockInterviewSession {
  id: string;
  userId: string;
  documentId: string;
  documentName: string;
  score: number;
  mode: "beginner" | "intermediate" | "advanced";
  type: "technical" | "hr" | "viva";
  responses: Array<{
    question: string;
    answer: string;
    score: number;
    feedback: string;
  }>;
  feedback: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}
