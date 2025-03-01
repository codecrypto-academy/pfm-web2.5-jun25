import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class UserContactsBook {
  constructor(private readonly id: string) {}

  static async create(userId: string) {
    const contactsBook = await prisma.contactsBook.create({
      data: {
        ownerId: userId,
      },
    });

    return new UserContactsBook(contactsBook.id);
  }
}

export default UserContactsBook;
