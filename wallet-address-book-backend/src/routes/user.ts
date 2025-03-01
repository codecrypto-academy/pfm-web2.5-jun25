import express, { Request, Response } from "express";
import User from "../models/user";
import UserContactsBook from "../models/user-contacts-book";
import UserDetails from "../models/user-details";

const router = express.Router();
router.use(express.json());

router.get("/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const userDetails = await UserDetails.create(userId);

    res.send({ message: userDetails });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).send({ message: error.message });
      return;
    }
  }
});

router.post("/", async (req: Request, res: Response) => {
  const { email, name, password } = req.body;

  try {
    const user = await User.create({ email, name, password });
    await UserContactsBook.create(user.userId);
    const userDetails = await UserDetails.create(user.userId);

    res.send({ message: userDetails });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).send({ message: error.message });
      return;
    }
  }
});

export default router;
