import UserRepository from "../../infraestructure/data-layer/userRepository";

export const getUserDetails = (
  userRepository: UserRepository,
  userId: string
) => {
  return userRepository.getUser(userId);
};
