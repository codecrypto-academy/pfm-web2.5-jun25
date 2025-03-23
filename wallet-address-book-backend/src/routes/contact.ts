import express, { Request, Response } from "express";
import { deleteContact } from "../domain/use-cases/detele-contact";
import { updateContact } from "../domain/use-cases/update-contact";
import PrismaContactsRepository from "../infraestructure/data-layer/prisma/contactsPrismaRepository";
import {
    createContactSchema,
    objectIdSchema,
} from "../infraestructure/zod-validation";

const contactsRepository = PrismaContactsRepository.create();

const router = express.Router();
router.use(express.json());

router.delete("/:contactId", async (req: Request, res: Response) => {
  const { contactId } = req.params;
  // TODO: Create an abstraction to validate the contactId
  const parseResult = objectIdSchema.safeParse(contactId);
  if (!parseResult.success) {
    res.status(400).send({ message: parseResult.error.errors[0].message });
    return;
  }

  try {
    await deleteContact(contactsRepository, contactId);
    res.status(204).send();
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).send({ message: error.message });
      return;
    }
    throw new Error(`An error occurred while deleting the user ${contactId}`);
  }
});

router.put("/:contactId", async (req: Request, res: Response) => {
  const { contactId } = req.params;
  // TODO: Create an abstraction to validate the contactsBookId
  const parseContactIdResult = objectIdSchema.safeParse(contactId);
  if (!parseContactIdResult.success) {
    res
      .status(400)
      .send({ message: parseContactIdResult.error.errors[0].message });
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
    const contact = await updateContact(contactsRepository, {
      id: contactId,
      name,
      walletAddress,
    });

    res.status(200).send(contact);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).send({ message: error.message });
      return;
    }
    throw new Error(
      `An error occurred while updating the contact ${contactId}`
    );
  }
});

export default router;
