import UserRepository from "../../infraestructure/data-layer/userRepository";

export const isUserCreated = (
  userRepository: UserRepository,
  email: string
) => {
  return userRepository.isUserCreated(email);
};
