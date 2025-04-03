import PrismaContactsRepository from "../../infraestructure/data-layer/prisma/contactsPrismaRepository";

export const deleteContact = (
  contactsRepository: PrismaContactsRepository,
  userId: string
) => {
  return contactsRepository.deleteContact(userId);
};
