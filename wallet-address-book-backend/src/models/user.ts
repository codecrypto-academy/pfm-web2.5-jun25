import { Prisma, PrismaClient } from "@prisma/client";
import { encrypt } from "../plugins/password-cypher";

interface UserData {
  name: string;
  email: string;
  password: string;
}

const prisma = new PrismaClient();

class User {
  private static db: Prisma.UserDelegate;
  constructor(
    private readonly id: string,
    private readonly name: string,
    private readonly email: string
  ) {}

  static async create(userData: UserData) {
    const { name, email, password } = userData;
    if (!name || !email || !password) {
      throw new Error("Missing required fields");
    }

    if (await this.isUserCreated(email)) {
      throw new Error("User already exists");
    }

    try {
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: encrypt(password),
        },
      });

      return new User(user.id, name, email);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new Error(`${error.code}: ${error.message}`);
      }
      throw new Error("An error occurred while creating the user");
    }
  }

  get userId(): string {
    return this.id;
  }

  private static async isUserCreated(email: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    return !!user;
  }
}

export default User;
