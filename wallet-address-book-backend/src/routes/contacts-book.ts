import { PrismaClient } from "@prisma/client";
import express from "express";
import createContactsRepository from "../infraestructure/data-layer/prisma/contactsPrismaRepository";
import {
  contactsBookIdSchema,
  createContactSchema,
} from "../infraestructure/zod-validation";

const router = express.Router();
router.use(express.json());

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
    const contactsRepostitory = createContactsRepository(new PrismaClient());
    const contact = await contactsRepostitory.createContact(
      { name, walletAddress },
      contactsBookId
    );

    res.status(201).send({ message: contact });
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
