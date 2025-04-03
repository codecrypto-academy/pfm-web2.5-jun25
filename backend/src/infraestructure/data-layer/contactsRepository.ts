
interface ContactRepository {
  createContact(contact: Contact, contactsBook: string): void;
  deleteContact(contactId: string): void;
  updateContact(contactId: string, contact: Contact): void;
}

export interface Contact {
  name: string;
  walletAddress: string;
}

export default ContactRepository;