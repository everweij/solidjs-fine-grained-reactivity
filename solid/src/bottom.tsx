import { For } from "solid-js";
import type { Filter } from "./index";

const allFilters: Filter[] = ["all", "completed", "active"];

type Props = {
  filter: Filter;
  numberOfActiveTodos: number;
  onFilterChange: (filter: Filter) => void;
  onRemoveCompleted: () => void;
};

export function Bottom(props: Props) {
  return (
    <div class="bottom">
      <div>
        {props.numberOfActiveTodos} item
        {props.numberOfActiveTodos === 1 ? "" : "s"} left
      </div>
      <div class="filters">
        <For each={allFilters}>
          {(filter) => (
            <button
              data-active={filter === props.filter}
              onClick={() => props.onFilterChange(filter)}
            >
              {filter}
            </button>
          )}
        </For>
      </div>
      <div>
        {props.numberOfActiveTodos === 0 && (
          <button class="clear-completed-btn" onClick={props.onRemoveCompleted}>
            Clear completed
          </button>
        )}
      </div>
    </div>
  );
}
