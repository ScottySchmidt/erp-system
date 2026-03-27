import type { StandardSchemaV1Issue } from "@tanstack/react-form";

interface FieldErrorProps {
  className?: string;
  meta: {
    isPristine: boolean;
    isValid: boolean;
    errors: (StandardSchemaV1Issue | undefined)[];
  };
}

export function FieldError(props: FieldErrorProps) {
  if (props.meta.isPristine || props.meta.isValid) {
    return null;
  }

  return <span className={props.className}>{props.meta.errors[0]?.message}</span>;
}
