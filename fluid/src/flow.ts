import { onCleanup, createRoot, createMemo } from "./reactive";
import type { Disposer } from "./types";

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

/**
 * A Utility component that allows you to reactively render lists of items.
 * Note: The use of `createRoot` is key here, because this allows us to retain
 * the state of each item individually between renders. Otherwise, the whole list would
 * unmount and mount every time something inside the list changes.
 */
export function For<T>(props: ForProps<T>) {
  // Keep track of a list of disposers.
  // We need this to clean up after ourselves when the component unmounts, or
  // when items get removed from the list.
  let disposers: (Disposer | null)[] = [];

  // A place to store the last state for comparison purposes later on.
  const previous: Previous<T> = {
    children: [],
    list: [],
  };

  const children = createMemo(() => {
    // By calling each() where effectively subscribing to the list, so
    // this function will be called every time the list changes.
    const list = props.each();

    // Bootstrap our next state
    const nextDisposers: typeof disposers = [];
    const nextChildren: JSX.Element[] = [];

    // Loop through each item in the list
    for (let index = 0; index < list.length; index++) {
      const item = list[index];

      // Let's see if the item is new or not.
      const prevIndex = previous.list.indexOf(item);

      if (prevIndex > -1) {
        // Apparently this item already exists or was moved to a new location.
        nextChildren[index] = previous.children[prevIndex];
        nextDisposers[index] = disposers[prevIndex];

        // By setting the value to `null` we're essientially preventing the
        // item from being disposed later on.
        disposers[prevIndex] = null!;
      } else {
        // We should instantiate a new item with a new reactive-context
        createRoot((disposer) => {
          // obtain the correct render function from props
          const render = "render" in props ? props.render : props.children;

          nextChildren[index] = render(item, () => previous.list.indexOf(item));
          nextDisposers[index] = disposer;
        });
      }
    }

    // Dispose any loose ends -> items that were removed from the list
    for (const dispose of disposers) dispose?.();

    // update the next state for comparison the next time
    disposers = nextDisposers;
    previous.children = nextChildren;
    previous.list = list;

    // return and memo the list of children
    return nextChildren;
  });

  // When this component unmounts... also clean up all items in the list by calling
  // each disposer function.
  onCleanup(() => {
    for (const dispose of disposers) dispose?.();
  });

  return children;
}
