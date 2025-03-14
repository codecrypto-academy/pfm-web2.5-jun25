
interface ContactRepository {
  createContact(contact: Contact, contactsBook: string): void;
}

export interface Contact {
  name: string;
  walletAddress: string;
}

export default ContactRepository;