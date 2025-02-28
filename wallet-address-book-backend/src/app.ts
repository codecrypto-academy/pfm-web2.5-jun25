import cors from "cors";
import express from "express";

import contactsRoutes from "./routes/contacts";
import contactsBookRoutes from "./routes/contacts-book";
import userRoutes from "./routes/user";

const app = express();
app.use(cors());

app.use("/user", userRoutes);
app.use("/contacts_book", contactsBookRoutes);
app.use("/contacts", contactsRoutes);

app.listen(process.env.PORT ?? 3000, () => {
  console.log(`Server running at port ${process.env.PORT ?? 3000}`);
});
