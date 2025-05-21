import { useContext } from "react";
import { ModuleContext } from "../contexts/ModuleContext";

export function useModule() {
  const context = useContext(ModuleContext);

  if (!context) {
    throw new Error("useModule must be used within a ModuleProvider");
  }

  return context;
}
