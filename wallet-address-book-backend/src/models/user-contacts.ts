import { Contacts, PrismaClient } from "@prisma/client";

interface ContactData {
  name: string;
  walletAddress: string;
}

const prisma = new PrismaClient();
class UserContact {
  constructor(private readonly contact: Contacts) {}

  static async create(contactData: ContactData, contactsBookId: string) {
    const contact = await prisma.contacts.create({
      data: {
        name: contactData.name,
        walletAddress: contactData.walletAddress,
        contactsBookId: contactsBookId,
      },
    });

    console.log(contact);
    

    return new UserContact(contact);
  }
}

export default UserContact;