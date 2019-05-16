// The type for an API object's ID or primary key.
export type ID = number;

export interface SaveableAPIObject extends Refreshable {
    pk: ID;
    save(): Promise<void>;
}

export interface Refreshable {
    refresh(): Promise<void>;
}

export interface Deletable {
    delete(): Promise<void>;
}
