import { onCleanup, Disposer, createRoot, createMemo } from "./reactive";

interface BaseProps<T> {
  each: () => T[];
}

interface ForChildrenProps<T> extends BaseProps<T> {
  children: (child: T, index: () => number) => JSX.Element;
}

interface ForRenderProps<T> extends BaseProps<T> {
  render: (child: T, index: () => number) => JSX.Element;
}

export type ForProps<T> = ForChildrenProps<T> | ForRenderProps<T>;

type Previous<T> = {
  children: JSX.Element[];
  list: T[];
};

export function For<T>(props: ForProps<T>) {
  let disposers: (Disposer | null)[] = [];
  const previous: Previous<T> = {
    children: [],
    list: [],
  };

  const children = createMemo(() => {
    const list = props.each();
    const nextDisposers: typeof disposers = [];
    const nextChildren: JSX.Element[] = [];

    for (let index = 0; index < list.length; index++) {
      const item = list[index];

      const prevIndex = previous.list.indexOf(item);

      if (prevIndex > -1) {
        // move to new position
        nextChildren[index] = previous.children[prevIndex];
        nextDisposers[index] = disposers[prevIndex];
        disposers[prevIndex] = null!;
      } else {
        // create new row
        createRoot((disposer) => {
          nextDisposers[index] = disposer;
          const render = "render" in props ? props.render : props.children;
          nextChildren[index] = render(item, () => previous.list.indexOf(item));
        });
      }
    }

    for (const dispose of disposers) dispose?.();

    disposers = nextDisposers;
    previous.children = nextChildren;
    previous.list = list;
    return nextChildren;
  }, "for");

  onCleanup(() => {
    for (const dispose of disposers) dispose?.();
  });

  return children;
}
