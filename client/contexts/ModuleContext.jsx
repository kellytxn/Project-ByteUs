import { createContext, useEffect, useState } from "react";
import { databases } from "../lib/appwrite";
import { ID, Permission, Query, Role } from "react-native-appwrite";
import { useUser } from "../hooks/useUser";

const DATABASE_ID = "6829990f0023ed9f3a30";
const COLLECTION_ID = "68299950001cf658da6a";

export const ModuleContext = createContext();

export function ModuleProvider({ children }) {
  const [module, setModule] = useState([]);
  const { user } = useUser();

  async function fetchModule() {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [Query.equal("userId", user.$id)]
      );
      setModule(response.documents);
      console.log(response.documents);
    } catch (error) {
      console.error(error.message);
    }
  }
  async function fetchModuleById(id) {
    try {
    } catch (error) {
      console.error(error.message);
    }
  }
  async function createModule(data) {
    try {
      const newModule = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_ID,
        ID.unique(),
        { ...data, userId: user.$id },
        [
          Permission.read(Role.user(user.$id)),
          Permission.update(Role.user(user.$id)),
          Permission.delete(Role.user(user.$id)),
          Permission.write(Role.user(user.$id)),
        ]
      );
      await fetchModule();
    } catch (error) {
      console.error(error.message);
    }
  }
  async function deleteModule(id) {
    try {
      await databases.deleteDocument(DATABASE_ID, COLLECTION_ID, id);
      await fetchModule();
    } catch (error) {
      console.error(error.message);
    }
  }
  async function editModule(id, updatedData) {
    try {
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_ID,
        id,
        updatedData
      );
      await fetchModule();
    } catch (error) {
      console.error(error.message);
    }
  }

  useEffect(() => {
    if (user) {
      fetchModule();
    } else {
      setModule([]);
    }
  }, [user]);
  return (
    <ModuleContext.Provider
      value={{
        module,
        fetchModule,
        fetchModuleById,
        createModule,
        deleteModule,
        editModule,
      }}
    >
      {children}
    </ModuleContext.Provider>
  );
}
