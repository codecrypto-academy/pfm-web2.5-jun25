import UserRepository, {
  UserData,
} from "../../infraestructure/data-layer/userRepository";

export const createUser = (
  userRepository: UserRepository,
  userData: UserData
) => {
  return userRepository.createUser(userData);
};
