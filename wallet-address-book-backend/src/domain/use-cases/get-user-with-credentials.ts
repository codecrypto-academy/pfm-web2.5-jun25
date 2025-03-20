import UserRepository from "../../infraestructure/data-layer/userRepository";
import { UserCredentials } from "../entities/user";

export const getUserWithCredentials = async (
  userRepository: UserRepository,
  { email, password }: UserCredentials
) => {
  return await userRepository.getUserWithCredentials(email, password);
};
