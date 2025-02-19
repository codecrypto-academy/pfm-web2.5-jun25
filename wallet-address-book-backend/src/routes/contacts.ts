import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  res.send({ message: "todo correcto" });
});

export default router;
