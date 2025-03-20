import { ContactsBook } from "./contactsBookRepository";

interface UserRepository {
  getUserWithCredentials(email: string, password: string): Promise<User | null>;
  createUser(user: UserData): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | null>;
}

export interface UserData {
  email: string;
  name: string;
  password: string;
}

export interface User {
  contactsBook: ContactsBook;
  data: { id: string } & Omit<UserData, "password">;
}

export default UserRepository;
