import { PrismaClient } from "@prisma/client";
import ContactsBookRepository, { ContactsBook } from "../contactsBookRepository";


class PrismaContactsBookRepository implements ContactsBookRepository {
  constructor(private prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async createContactsBookRepository(userId: string): Promise<ContactsBook> {
    await this.prisma.contactsBook.create({
      data: {
        ownerId: userId,
      },
    });

    return {
      contacts: []
    };

  }
}

function createContactsBookRepository(prisma: PrismaClient) {
  return new PrismaContactsBookRepository(prisma);
}

export default createContactsBookRepository;