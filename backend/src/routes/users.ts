import express, {Request, Response} from "express";

import PrismaUserRepository from "../infraestructure/data-layer/prisma/userPrismaRepository";

const userRepository = PrismaUserRepository.create();

const router = express.Router();
router.use(express.json());

router.get("/", async (_req: Request, res: Response) => {
    try {
        const users = await userRepository.getAllUsers();
        res.status(200).send(users);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).send({message: error.message});
            return;
        }
        console.error(error);
        throw new Error(
            `An error occurred while getting the list of users`
        );
    }
});

export default router;
