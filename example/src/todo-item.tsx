import type { Todo } from "./index";

type Props = {
  todo: Todo;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
};

export function TodoItem({ todo, onRemove, onToggle }: Props) {
  return (
    <li class="todo-item row">
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo.id)}
      />
      <div class="center" data-completed={todo.completed}>
        {todo.title}
      </div>
      <button class="remove-btn" onClick={() => onRemove(todo.id)}>
        ✕
      </button>
    </li>
  );
}
