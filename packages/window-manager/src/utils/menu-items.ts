import { MenuItem } from 'electron';

/**
 * Standard context menu items for use in views
 */

export const cutMenuItem = new MenuItem({
  label: 'Cut',
  role: 'cut',
  accelerator: 'CmdOrCtrl+X',
});

export const copyMenuItem = new MenuItem({
  label: 'Copy',
  role: 'copy',
  accelerator: 'CmdOrCtrl+C',
});

export const pasteMenuItem = new MenuItem({
  label: 'Paste',
  role: 'paste',
  accelerator: 'CmdOrCtrl+V',
});

export const selectAllMenuItem = new MenuItem({
  label: 'Select All',
  role: 'selectAll',
  accelerator: 'CmdOrCtrl+A',
});

export const separatorMenuItem = new MenuItem({
  type: 'separator',
});

export const undoMenuItem = new MenuItem({
  label: 'Undo',
  role: 'undo',
  accelerator: 'CmdOrCtrl+Z',
});

export const redoMenuItem = new MenuItem({
  label: 'Redo',
  role: 'redo',
  accelerator: 'CmdOrCtrl+Shift+Z',
});

/**
 * Get a standard set of editing menu items
 */
export function getStandardEditingMenuItems(): MenuItem[] {
  return [
    undoMenuItem,
    redoMenuItem,
    separatorMenuItem,
    cutMenuItem,
    copyMenuItem,
    pasteMenuItem,
    separatorMenuItem,
    selectAllMenuItem,
  ];
}

/**
 * Get a basic set of menu items (without undo/redo)
 */
export function getBasicMenuItems(): MenuItem[] {
  return [
    cutMenuItem,
    copyMenuItem,
    pasteMenuItem,
    separatorMenuItem,
    selectAllMenuItem,
  ];
}

/**
 * Create a menu item for adding a word to the spell checker dictionary
 */
export function createAddToDictionaryMenuItem(
  word: string,
  session: Electron.Session
): MenuItem {
  return new MenuItem({
    label: `Add "${word}" to dictionary`,
    click: () => session.addWordToSpellCheckerDictionary(word),
  });
}

/**
 * Create menu items for spell checker suggestions
 */
export function createSpellingSuggestionMenuItems(
  suggestions: string[],
  webContents: Electron.WebContents
): MenuItem[] {
  if (suggestions.length === 0) {
    return [
      new MenuItem({
        label: 'No suggestions',
        enabled: false,
      }),
    ];
  }

  return suggestions.map(
    (suggestion) =>
      new MenuItem({
        label: suggestion,
        click: () => webContents.replaceMisspelling(suggestion),
      })
  );
}
