export function filter_keys<T, Key extends keyof T>(data: T, include_keys: Key[]): Partial<T> {
    let result: Partial<T> = {};
    for (let key of include_keys) {
        result[key] = data[key];
    }
    return result;
}

// A wrapper around Object.assign that adds type checking to enforce
// that "to" and "from" are the same type.
// Also limits "from" to a single value.
// Note: Typescript has covariant arrays. For this reason, we've restricted this
// function to require "to" and "from" to be the same type rather than "to"
// deriving from "from".
// BEWARE: TYPESCRIPT HAS COVARIANT ARRAYS. You may need to add a private member variable
// to your classes if you want them to behave like nominal types. For example:
//      class Spam {
//          private _spam_brand: string = '';
//      }
export function safe_assign<ToType extends FromType, FromType>(to: ToType, from: FromType) {
    Object.assign(to, from);
}

// Sorts the given array in place by the "name" attribute of its elements.
export function sort_by_name<T extends {name: string}>(to_sort: T[]) {
    to_sort.sort((first: T, second: T) => first.name.localeCompare(second.name));
}
