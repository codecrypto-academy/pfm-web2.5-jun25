import {ContactsBook} from "./contactsBookRepository";

interface UserRepository {
  createUser(user: UserData): Promise<User>;
  getUser(id: string): Promise<User | null>;
  isUserCreated(email: string): Promise<boolean>;

  getAllUsers(): Promise<User[]>;
}

export interface UserData {
  name: string;
  email: string;
  password: string;
}

export interface User {
  data: {id: string} & Omit<UserData, "password">;
  contactsBook: ContactsBook;
}

export default UserRepository;