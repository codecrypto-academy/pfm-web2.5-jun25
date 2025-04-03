import { PrismaClient } from "@prisma/client";
import { compare, encrypt } from "../../password-cypher";
import UserRepository, { User, UserData } from "../userRepository";
import PrismaContactsBookRepository from "./contactsBookPrismaRepository";

class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {
    this.prisma = prisma;
  }

  static create() {
    return new PrismaUserRepository(new PrismaClient());
  }

  async getUser(id: string): Promise<User | null> {
    try {
      const userDetails = await this.prisma.user.findUnique({
        where: {
          id: id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          contactsBook: {
            select: {
              id: true,
              contacts: true,
            },
          },
        },
      });

      return userDetails
        ? {
            data: {
              id: userDetails.id,
              name: userDetails.name,
              email: userDetails.email,
            },
            contactsBook: {
              contactsBookId: userDetails.contactsBook?.id ?? "",
              contacts: userDetails.contactsBook?.contacts ?? [],
            },
          }
        : null;
    } catch (error) {
      throw new Error(
        `An error occurred while getting the user ${id} information`
      );
    }
  }

  async getUserWithCredentials(
    email: string,
    password: string
  ): Promise<User | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          email: email,
        },
        select: {
          id: true,
          name: true,
          email: true,
          password: true,
          contactsBook: {
            select: {
              id: true,
              contacts: true,
            },
          },
        },
      });

      const isValidCredentials = compare(password, user?.password ?? "");

      return isValidCredentials
        ? {
            data: {
              id: user?.id ?? "",
              name: user?.name ?? "",
              email: user?.email ?? "",
            },
            contactsBook: {
              contactsBookId: user?.contactsBook?.id ?? "",
              contacts: user?.contactsBook?.contacts ?? [],
            },
          }
        : null;
    } catch (error) {
      throw new Error(`An error occurred while checking the user credentials`);
    }
  }

  async isUserCreated(email: string): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          email,
        },
      });

      return !!user;
    } catch (error) {
      throw new Error("An error occurred while fetching the user");
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const users = await this.prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          contactsBook: {
            select: {
              id: true,
              contacts: true,
            },
          },
        },
      });

      return users.map((u) => ({
        data: {
          id: u.id,
          name: u.name,
          email: u.email,
        },
        contactsBook: {
          contactsBookId: u.contactsBook?.id ?? "",
          contacts: u.contactsBook?.contacts ?? [],
        },
      }));
    } catch (error) {
      throw new Error(`An error occurred while getting the list of usera`);
    }
  }

  async createUser(user: UserData): Promise<User> {
    try {
      const newUser = await this.prisma.user.create({
        data: {
          name: user.name,
          email: user.email,
          password: encrypt(user.password),
        },
      });

      const contactsBookRepository = PrismaContactsBookRepository.create();

      return {
        data: newUser,
        contactsBook: await contactsBookRepository.createContactsBookRepository(
          newUser.id
        ),
      };
    } catch (error) {
      throw new Error("An error occurred while fetching the user");
    }
  }
}

export default PrismaUserRepository;
