import type * as CSS from "csstype";

export type Accessor<T> = () => T;
export type Setter<T> = (value: T) => void;

export type Falsey = undefined | null | false;

export type CSSProperties = CSS.Properties;

export type Style<CSS = CSSProperties> = {
  [Key in keyof CSS]?: (() => CSS[Key]) | CSS[Key];
};

export type AnyObject = Record<string, unknown>;

export type Predicate<T = any> = (value: T) => boolean;

export type Child = string | number | false | Node;
export type Children = (Child | Accessor<Child>)[];

export type Disposer = () => void;
