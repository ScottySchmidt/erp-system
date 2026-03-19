import { twc } from "react-twc";

export const Input = twc.input`
  block w-full rounded-sm
  border-gray-300 focus:border-gray-400
  focus:ring-4 focus:ring-gray-300 focus:ring-opacity-50
  transition-shadow
`;
