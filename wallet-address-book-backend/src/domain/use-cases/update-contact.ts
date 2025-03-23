import PrismaContactsRepository from "../../infraestructure/data-layer/prisma/contactsPrismaRepository";
import Contact from "../entities/contact";

export const updateContact = (
  contactsRepository: PrismaContactsRepository,
  contact: { id: string } & Contact
) => {
  return contactsRepository.updateContact(contact.id, contact);
};
