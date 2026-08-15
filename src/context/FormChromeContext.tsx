import { createContext, useContext, type ReactNode } from "react";
import { defaultFormChrome, type FormChrome } from "../lib/i18n/chromeTypes";

const FormChromeContext = createContext<FormChrome>(defaultFormChrome);

export function FormChromeProvider({
  chrome,
  children,
}: {
  chrome: FormChrome;
  children: ReactNode;
}) {
  return (
    <FormChromeContext.Provider value={chrome}>
      {children}
    </FormChromeContext.Provider>
  );
}

export function useFormChrome() {
  return useContext(FormChromeContext);
}
