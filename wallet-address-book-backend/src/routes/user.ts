import { PrismaClient } from "@prisma/client";
import express, { Request, Response } from "express";
import { createUser } from "../domain/use-cases/create-user";
import createUserRepository from "../infraestructure/data-layer/prisma/userPrismaRepository";
import {
  createUserSchema,
  userIdSchema,
} from "../infraestructure/zod-validation";

const router = express.Router();
router.use(express.json());

router.get("/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;
  // TODO: Create an abstraction to validate the userId
  const parseResult = userIdSchema.safeParse(userId);
  if (!parseResult.success) {
    res.status(400).send({ message: parseResult.error.errors[0].message });
    return;
  }

  try {
    const userRepository = createUserRepository(new PrismaClient());
    const user = await userRepository.getUser(userId);

    res.status(200).send(user);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).send({ message: error.message });
      return;
    }
    console.error(error);
    throw new Error(
      `An error occurred while getting the user ${userId} information`
    );
  }
});

router.post("/", async (req: Request, res: Response) => {
  // TODO: Create an abstraction to validate the request body
  const parseResult = createUserSchema.safeParse(req.body);
  if (!parseResult.success) {
    const errors = parseResult.error.errors.map((error) => ({
      field: error.path[0],
      message: error.message,
    }));
    res.status(400).send({ message: errors });
    return;
  }

  const { email, name, password } = req.body;

  const userRepository = createUserRepository(new PrismaClient());

  try {
    const isUserCreated = await userRepository.isUserCreated(email);
    if (isUserCreated) {
      res.status(400).send({ message: "User already exists" });
      return;
    }
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).send({ message: error.message });
      return;
    }
    console.error(error);
    throw new Error("An error occurred while checking if the user exists");
  }

  try {
    const user = await createUser(userRepository, { email, name, password });
    const userCreatedPayload = { ...user.data, password: undefined };

    res.status(201).send(userCreatedPayload);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).send({ message: error.message });
      return;
    }
    console.error(error);
    throw new Error("An error occurred while creating the user");
  }
});

export default router;
