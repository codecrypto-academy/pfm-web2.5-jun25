import ContactsBook from "../entities/contacts-book";

interface User {
  id: string;
  name: string;
  email: string;
  contactsBook: ContactsBook;
}

export default User;