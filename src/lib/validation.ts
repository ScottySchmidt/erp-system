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
