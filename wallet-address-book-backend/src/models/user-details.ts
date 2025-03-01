import { PrismaClient, User } from "@prisma/client";

const prisma = new PrismaClient();
class UserDetails {
  constructor(private readonly user: Omit<User, "password">) {}

  static async create(userId: string) {
    const userDetails = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        ContactsBook: true,
      },
    });

    if (!userDetails) {
      throw new Error("User not found");
    }

    return new UserDetails(userDetails);
  }
}

export default UserDetails;
