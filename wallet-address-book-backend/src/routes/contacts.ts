import express from "express";
import UserContact from "../models/user-contact";

const router = express.Router();
router.use(express.json());

router.put("/:contactsBookId", async (req, res) => {
  const { contactsBookId } = req.params;
  const { name, walletAddress } = req.body;

  const contact = await UserContact.create({ name, walletAddress }, contactsBookId);
  
  res.send({ message: contact });
});

export default router;
