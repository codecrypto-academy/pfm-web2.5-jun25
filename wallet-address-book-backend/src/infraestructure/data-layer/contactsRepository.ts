import { ContactsBook } from "./contactsBookRepository";

interface ContactRepository {
  createContact(contact: Contact, contactsBook: ContactsBook): void;
}

export interface Contact {
  name: string;
  walletAddress: string;
}

export default ContactRepository;