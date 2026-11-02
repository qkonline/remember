// What the app's frame shows for every page: the Add sheet (opened from the tab bar, the
// sidebar or a page) and the one short note at the bottom ("Next check-in tomorrow. Undo").

export interface Note {
  message: string;
  undo?: () => void;
}

export const ui = $state({
  /** The Add sheet is open. */
  adding: false,
  /** The shelf the Add sheet starts on (a shelf page opens it on its own shelf). */
  addOnShelf: null as string | null,
  note: null as Note | null,
});

/** Opens the Add sheet, on a shelf or the last one used. */
export function startAdding(shelf: string | null = null): void {
  ui.addOnShelf = shelf;
  ui.adding = true;
}

/** Shows a short note at the bottom, with Undo when given. */
export function say(message: string, undo?: () => void): void {
  ui.note = { message, undo };
}
