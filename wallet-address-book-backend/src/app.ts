import cors from "cors";
import express from "express";

import contactRoutes from "./routes/contact";
import contactsBookRoutes from "./routes/contacts-book";
import userRoutes from "./routes/user";
import usersRoutes from "./routes/users";

const app = express();
app.use(cors());

app.use("/contact", contactRoutes);
app.use("/contacts_book", contactsBookRoutes);
app.use("/user", userRoutes);
app.use("/users", usersRoutes);

app.listen(process.env.PORT ?? 3000, () => {
  console.log(`Server running at port ${process.env.PORT ?? 3000}`);
});
