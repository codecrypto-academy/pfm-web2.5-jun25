import { PrismaClient } from "@prisma/client";
import ContactRepository, { Contact } from "../contactsRepository";

class PrismaContactsRepository implements ContactRepository {
  constructor(private prisma: PrismaClient) {
    this.prisma = prisma;
  }

  static create() {
    return new PrismaContactsRepository(new PrismaClient());
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

  async deleteContact(id: string): Promise<void> {
    try {
      await this.prisma.contacts.delete({
        where: {
          id: id,
        },
      });
    } catch (error) {
      throw new Error(`An error occurred while deleting the user ${id}`);
    }
  }

  async updateContact(id: string, contact: Contact): Promise<any> {
    const updatedContact = await this.prisma.contacts.update({
      where: {
        id: id,
      },
      data: {
        name: contact.name,
        walletAddress: contact.walletAddress,
      },
    });

    return updatedContact;
  }

}

export default PrismaContactsRepository;
