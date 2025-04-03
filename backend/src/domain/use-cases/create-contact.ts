import PrismaContactsRepository from "../../infraestructure/data-layer/prisma/contactsPrismaRepository";
import Contact from "../entities/contact";

export const createContact = (
  contactRepository: PrismaContactsRepository,
  contactsBookId: string,
  contact: Contact
) => {
  return contactRepository.createContact(contact, contactsBookId);
};
