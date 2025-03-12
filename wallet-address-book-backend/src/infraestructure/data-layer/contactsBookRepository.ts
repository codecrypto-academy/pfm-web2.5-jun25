import { Contact } from "./contactsRepository";

interface ContactsBookRepository {
  createContactsBookRepository(userId: string): Promise<ContactsBook>;
}

export interface ContactsBook {
  contacts: Contact[];
}

export default ContactsBookRepository;