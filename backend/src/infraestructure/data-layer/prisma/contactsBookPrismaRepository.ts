import { PrismaClient } from "@prisma/client";
import ContactsBookRepository, {
  ContactsBook,
} from "../contactsBookRepository";
import { Contact } from "../contactsRepository";

class PrismaContactsBookRepository implements ContactsBookRepository {
  constructor(private prisma: PrismaClient) {
    this.prisma = prisma;
  }

  static create() {
    return new PrismaContactsBookRepository(new PrismaClient());
  }

  async getAllContacts(contactsBookId: string): Promise<Contact[]> {
    const contacts = await this.prisma.contacts.findMany({
      where: {
        contactsBookId,
      },
    });

    return contacts;
  }

  async createContactsBookRepository(userId: string): Promise<ContactsBook> {
    const contactsBook = await this.prisma.contactsBook.create({
      data: {
        ownerId: userId,
      },
    });

    return {
      contactsBookId: contactsBook.id,
      contacts: [],
    };
  }
}

export default PrismaContactsBookRepository;
