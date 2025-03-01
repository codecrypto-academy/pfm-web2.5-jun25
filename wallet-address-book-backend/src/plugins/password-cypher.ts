import bcrypt from "bcrypt";

const saltRounds = 10;

export const encrypt = (password: string) => {
  const salt = bcrypt.genSaltSync(saltRounds);
  const hash = bcrypt.hashSync(password, salt);

  return hash;
}

