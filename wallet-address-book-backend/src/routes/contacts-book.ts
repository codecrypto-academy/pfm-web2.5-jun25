import express from "express";

import {
  contactsBookIdSchema,
  createContactSchema,
} from "../infraestructure/zod-validation";

import { createContact } from "../domain/use-cases/create-contact";
import PrismaContactsBookRepository from "../infraestructure/data-layer/prisma/contactsBookPrismaRepository";
import PrismaContactsRepository from "../infraestructure/data-layer/prisma/contactsPrismaRepository";

const contactsBookRepostitory = PrismaContactsBookRepository.create();
const contactsRepository = PrismaContactsRepository.create();

const router = express.Router();
router.use(express.json());

router.get("/:contactsBookId/contacts", async (req, res) => {
  const { contactsBookId } = req.params;
  // TODO: Create an abstraction to validate the contactsBookId
  const parseContactsBookIdResult =
    contactsBookIdSchema.safeParse(contactsBookId);
  if (!parseContactsBookIdResult.success) {
    res
      .status(400)
      .send({ message: parseContactsBookIdResult.error.errors[0].message });
    return;
  }

  try {
    const contacts = await contactsBookRepostitory.getAllContacts(
      contactsBookId
    );

    res.status(200).send(contacts);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).send({ message: error.message });
      return;
    }
    console.error(error);
    throw new Error(
      `An error occurred while creating the contact ${name} in the contacts book ${contactsBookId}`
    );
  }
});

router.post("/:contactsBookId/contact", async (req, res) => {
  const { contactsBookId } = req.params;
  // TODO: Create an abstraction to validate the contactsBookId
  const parseContactsBookIdResult =
    contactsBookIdSchema.safeParse(contactsBookId);
  if (!parseContactsBookIdResult.success) {
    res
      .status(400)
      .send({ message: parseContactsBookIdResult.error.errors[0].message });
    return;
  }

  // TODO: Create an abstraction to validate the request body
  const parseCreateContactResult = createContactSchema.safeParse(req.body);
  if (!parseCreateContactResult.success) {
    const errors = parseCreateContactResult.error.errors.map((error) => ({
      field: error.path[0],
      message: error.message,
    }));
    res.status(400).send({ message: errors });
    return;
  }
  const { name, walletAddress } = req.body;

  try {
    const contact = await createContact(contactsRepository, contactsBookId, {
      name,
      walletAddress,
    });

    res.status(201).send(contact);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).send({ message: error.message });
      return;
    }
    console.error(error);
    throw new Error(
      `An error occurred while creating the contact ${name} in the contacts book ${contactsBookId}`
    );
  }
});

export default router;
