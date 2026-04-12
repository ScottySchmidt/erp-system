import * as v from "valibot";

export const IntStrSchema = v.pipe(
  v.string(),
  v.nonEmpty("An integer is required"),
  v.digits("Must be an integer"),
  v.transform(Number),
);

export const NumStrSchema = v.pipe(
  v.string(),
  v.nonEmpty("A number is required"),
  v.decimal("Must be a number"),
  v.transform(Number),
);

export const MoneySchema = v.pipe(
  v.string(),
  v.nonEmpty("A number is required"),
  v.decimal("Must be a number"),
  v.regex(/^\d+(\.\d{1,2})?$/, "Can only have up to 2 decimal places"),
);

export const PasswordSchema = v.pipe(
  v.string(),
  v.minLength(8, "Your password is too short (minimum 8 characters)."),
  v.maxLength(30, "Your password is too long (maximum 30 characters)."),
  v.regex(/[a-z]/, "Your password must contain a lowercase letter."),
  v.regex(/[A-Z]/, "Your password must contain a uppercase letter."),
  v.regex(/[0-9]/, "Your password must contain a number."),
);
