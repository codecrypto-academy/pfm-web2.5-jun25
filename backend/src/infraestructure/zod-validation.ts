import { z } from "zod";

// Define a schema for mongo ObjectId
const objectIdSchema = z.string().refine(
  (val) => {
    // Add your MongoDB ObjectId validation logic here
    return /^[0-9a-fA-F]{24}$/.test(val);
  },
  {
    message: "Invalid userId format",
  }
);

// Define a schema for creating a user
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(3).max(30),
  password: z.string().min(6),
});

// Define a schame for checking if a user exists and login a user
const loginUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Define a schema for contactsBookId
const contactsBookIdSchema = z.string().refine(
  (val) => {
    // Add your MongoDB ObjectId validation logic here
    return /^[0-9a-fA-F]{24}$/.test(val);
  },
  {
    message: "Invalid contactsBookId format",
  }
);

// Define a schema for creating a contact
const createContactSchema = z.object({
  name: z.string().min(3).max(30),
  walletAddress: z.string().min(42).max(42), // ^0x[0-9a-fA-F]{40}$
});

// Define a schema for checking the balance of a wallet address
const balanceInputSchema = z.object({
  chainid: z.coerce.number().int().positive(),
  address: z.string()
});

const faucetInputsSchema = z.object({
  chainid: z.coerce.number().int().positive(),
  address: z.string(),
  amount: z.coerce.number().int().positive(),
});

export {
  balanceInputSchema,
  contactsBookIdSchema,
  createContactSchema,
  createUserSchema,
  faucetInputsSchema,
  loginUserSchema,
  objectIdSchema
};

