import { Prisma, PrismaClient, User as PrismaUserModel } from "@prisma/client";
import { encrypt } from "../infraestructure/password-cypher";

interface UserData {
  name: string;
  email: string;
  password: string;
}

const prisma = new PrismaClient();

class User {
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

    const userCreated = await this.save(userData);
    return new User(userCreated.id, name, email);
  }

  private static async save(userData: UserData): Promise<PrismaUserModel> {
    const { name, email, password } = userData;
    try {
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: encrypt(password),
        },
      });

      return user;
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
