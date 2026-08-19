export type Message = {
  id: string;
  role: 'user' | 'ai';
  content: string;
  isTyping?: boolean;
};

export type ChatThread = {
  id: string;
  title: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
};
