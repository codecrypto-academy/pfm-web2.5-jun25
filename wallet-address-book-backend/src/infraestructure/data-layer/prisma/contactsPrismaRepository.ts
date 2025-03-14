import { PrismaClient } from "@prisma/client";
import ContactRepository, { Contact } from "../contactsRepository";

const prisma = new PrismaClient();

class PrismaContactsRepository implements ContactRepository {
  constructor(private prisma: PrismaClient) {
    this.prisma = prisma;
  }
  async createContact(contact: Contact, contactsBookId: string): Promise<any> {
    const newContact = await this.prisma.contacts.create({
      data: {
        name: contact.name,
        walletAddress: contact.walletAddress,
        contactsBookId: contactsBookId,
      },
    });

    return newContact;
  }
}

function createContactsRepository(prisma: PrismaClient) {
  return new PrismaContactsRepository(prisma);
}

export default createContactsRepository;
