import { PrismaClient } from "@prisma/client";
import { encrypt } from "../../password-cypher";
import UserRepository, { User, UserData } from "../userRepository";
import createContactsBookRepository from "./contactsBookPrismaRepository";

class PrismaUserRepository implements UserRepository {
  constructor(private prisma: PrismaClient) {
    this.prisma = prisma;
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
      console.error(error);
      throw new Error("An error occurred while fetching the user");
    }
  }
  async getUser(userId: string): Promise<User | null> {
    try {
      const userDetails = await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          ContactsBook: {
            select: {
              id: true,
              contacts: true,
            },
          },
        },
      });

      return !userDetails
        ? null
        : {
            data: {
              id: userDetails.id,
              name: userDetails.name,
              email: userDetails.email,
            },
            contactsBook: {
              contacts: userDetails.ContactsBook?.contacts ?? [],
            },
          };
    } catch (error) {
      console.log(error);
      throw new Error(
        `An error occurred while getting the user ${userId} information`
      );
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

      const contactsBookRepository = createContactsBookRepository(this.prisma);

      return {
        data: newUser,
        contactsBook: await contactsBookRepository.createContactsBookRepository(
          newUser.id
        ),
      };
    } catch (error) {
      console.error(error);
      throw new Error("An error occurred while fetching the user");
    }
  }
}

function createUserRepository(prisma: PrismaClient) {
  return new PrismaUserRepository(prisma);
}

export default createUserRepository;
