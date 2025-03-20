import bcrypt from "bcrypt";

const saltRounds = 10;

export const encrypt = (password: string) => {
  const salt = bcrypt.genSaltSync(saltRounds);
  const hash = bcrypt.hashSync(password, salt);

  return hash;
};

export const compare = (password: string, hash: string) =>
  bcrypt.compareSync(password, hash);
