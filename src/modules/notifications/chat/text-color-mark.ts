import { Mark, mergeAttributes } from '@tiptap/core';
import { normalizeHex } from './text-color';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    textColor: {
      setTextColor: (color: string) => ReturnType;
      unsetTextColor: () => ReturnType;
    };
  }
}

export const TextColor = Mark.create({
  name: 'textColor',

  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) =>
          normalizeHex(
            element.getAttribute('data-color') || element.style.color,
          ),
        renderHTML: (attributes) => {
          const color = normalizeHex(attributes.color);
          if (!color) return {};
          return {
            'data-color': color,
            style: `color: ${color}`,
          };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-color]' }, { style: 'color' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setTextColor:
        (color) =>
        ({ commands }) => {
          const hex = normalizeHex(color);
          if (!hex) return false;
          return commands.setMark(this.name, { color: hex });
        },
      unsetTextColor:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});
