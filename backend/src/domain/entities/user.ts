import ContactsBook from "../entities/contacts-book";

interface User {
  id: string;
  name: string;
  email: string;
  contactsBook: ContactsBook;
}

interface UserCredentials {
  email: string;
  password: string;
}

export { UserCredentials };
export default User;