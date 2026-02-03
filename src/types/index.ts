export interface User {
  id: number;
  name: string;
  username?: string;
  email?: string;
  phone?: string;
  website?: string;
}

export interface Post {
  id: number;
  title: string;
  body: string;
  userId: number;
}

export interface Comment {
  id: number;
  name: string;
  email: string;
  body: string;
  postId: number;
}

export interface Todo {
  id: number;
  title: string;
  completed: boolean;
  userId: number;
}

export interface SelectBoxProps {
  users: User[];
  selectedUser: number;
  setSelectedUser: (userId: number) => void;
}

export interface UseCommentReturn {
  comments: Comment[];
  isLoading: boolean;
}

export interface UsePostReturn {
  posts: Post[];
  isLoading: boolean;
}

export interface UseTodoReturn {
  todos: Todo[];
  isLoading: boolean;
  getTodos: () => void;
}

export interface UseUsersReturn {
  users: User[];
  isLoading: boolean;
}
