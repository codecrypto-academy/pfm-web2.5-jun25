import express, { Request, Response } from "express";

import {
    createUserSchema,
    loginUserSchema,
    userIdSchema,
} from "../infraestructure/zod-validation";

import { createUser } from "../domain/use-cases/create-user";
import { getUserDetails } from "../domain/use-cases/get-user-details";
import { getUserWithCredentials } from "../domain/use-cases/get-user-with-credentials";

import PrismaUserRepository from "../infraestructure/data-layer/prisma/userPrismaRepository";

const userRepository = PrismaUserRepository.create();

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
    const user = await getUserDetails(userRepository, userId);
    if (!user) {
      res.status(404).send({ message: "User not found" });
      return;
    }

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
router.post("/login", async (req: Request, res: Response) => {
  // TODO: Create an abstraction to validate the request body
  const parseResult = loginUserSchema.safeParse(req.body);
  if (!parseResult.success) {
    const errors = parseResult.error.errors.map((error) => ({
      field: error.path[0],
      message: error.message,
    }));
    res.status(400).send({ message: errors });
    return;
  }

  const { email, password } = req.body;

  try {
    const user = await getUserWithCredentials(userRepository, {
      email,
      password,
    });
    if (!user) {
      res
        .status(404)
        .send({ message: "User not found or invalid credentials" });
      return;
    }
    res.status(200).send(user);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).send({ message: error.message });
      return;
    }
    throw new Error(`An error occurred while checking the user credentials.`);
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
    throw new Error("An error occurred while checking if the user exists");
  }

  try {
    const user = await createUser(userRepository, { email, name, password });
    const userCreated = await getUserDetails(userRepository, user.data.id);

    res.status(201).send(userCreated);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).send({ message: error.message });
      return;
    }
    throw new Error("An error occurred while creating the user");
  }
});

export default router;
