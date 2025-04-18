import cors from "cors";
import express, { Request, Response } from "express";
import pg from "pg";

const { Client } = pg;
const client = new Client({
  database: "northwind",
  host: "localhost",
  password: "postgres",
  port: 55432,
  user: "postgres",
});
await client.connect();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/products", async (req: Request, res: Response) => {
  try {
    const query = "SELECT * FROM products LIMIT 10;";
    const result = await client.query(query);
    res.send({ result: result.rows });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});
app.get("/product/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const query = "SELECT * FROM products WHERE product_id = $1;";
    const result = await client.query(query, [id]);
    res.send({ result: result.rows.at(0) });
  } catch (error) {
    console.error("Error fetching product details.", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
