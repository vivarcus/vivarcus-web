import { createContext, useContext, type ReactNode } from "react";

/** Parent create/edit form identity — used by reference pickers for inline create typing. */
export type FormMeta = {
  objectApiName?: string;
  objectTypeApiName?: string;
};

const FormMetaContext = createContext<FormMeta>({});

export function FormMetaProvider({
  objectApiName,
  objectTypeApiName,
  children,
}: FormMeta & { children: ReactNode }) {
  return (
    <FormMetaContext.Provider value={{ objectApiName, objectTypeApiName }}>
      {children}
    </FormMetaContext.Provider>
  );
}

export function useFormMeta(): FormMeta {
  return useContext(FormMetaContext);
}
