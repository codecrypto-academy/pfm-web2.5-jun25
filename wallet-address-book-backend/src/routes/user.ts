import { PrismaClient } from "@prisma/client";
import express from "express";

const router = express.Router();
router.use(express.json());

const prisma = new PrismaClient();

router.get("/", (req, res) => {
  res.send({ message: "todo correcto" });
});

router.post("/", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await prisma.user.create({
      data: {
        email,
      },
    });
    res.send({ message: user });
  } catch (error) {
    res.status(500).send({ message: error });
  }
});

export default router;
