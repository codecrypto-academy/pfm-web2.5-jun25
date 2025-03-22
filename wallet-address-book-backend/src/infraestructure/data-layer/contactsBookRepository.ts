import { Contact } from "./contactsRepository";

interface ContactsBookRepository {
  createContactsBookRepository(userId: string): Promise<ContactsBook>;
  getAllContacts(contactsBookId: string): Promise<Contact[]>;
}

export interface ContactsBook {
  contactsBookId: string;
  contacts: Contact[];
}

export default ContactsBookRepository;