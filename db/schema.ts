/** Business schemas are added by their owning phase after the storage/restore gate. */
export const storageBindings = { database: "DB", privateLearningFiles: "LEARNING_FILES" } as const;
