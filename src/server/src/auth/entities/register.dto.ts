import { IsEmail, IsNotEmpty, Validate } from "class-validator";

import { Register } from "../../../../shared/entities";
import { PasswordValidator } from "../validators/password.validator";

export class RegisterDto implements Register {
  @IsNotEmpty({ message: "Please enter an email address" })
  @IsEmail({}, { message: "Invalid email address" })
  readonly email: string;
  @IsNotEmpty({ message: "Please enter a password" })
  @Validate(PasswordValidator, { message: "Invalid password" })
  readonly password: string;
  @IsNotEmpty({ message: "Please enter a name" })
  readonly name: string;
}
