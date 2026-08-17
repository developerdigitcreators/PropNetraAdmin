import type { JSONContent } from '@tiptap/core';
import { normalizeHex, wrapColorMarkers } from './text-color';

/**
 * Bridges the rich editor and the wire format. The app renders WhatsApp markers
 * (`*bold*`, `_italic_`, `~strike~`, `{#rrggbb}color{/#}`, `[label](https://…)`, `-` / `1.` lists), so the
 * editor shows real formatting while everything stored and sent stays marker text.
 */

const MARK_MARKER: Record<string, string> = {
  bold: '*',
  italic: '_',
  strike: '~',
};

/** Keep surrounding whitespace outside the markers so `*text*` stays tight. */
function wrapCore(text: string, marker: string): string {
  const leading = /^\s*/.exec(text)?.[0] ?? '';
  const trailing = /\s*$/.exec(text)?.[0] ?? '';
  const core = text.slice(leading.length, text.length - trailing.length);
  if (!core) return text;
  return `${leading}${marker}${core}${marker}${trailing}`;
}

function inlineToMarkers(nodes: JSONContent[] = []): string {
  return nodes
    .map((node) => {
      if (node.type === 'hardBreak') return '\n';
      if (node.type !== 'text' || !node.text) return '';

      let out = node.text;
      const marks = node.marks ?? [];
      for (const mark of marks) {
        const marker = MARK_MARKER[mark.type];
        if (marker) out = wrapCore(out, marker);
      }
      const color = normalizeHex(
        marks.find((m) => m.type === 'textColor')?.attrs?.color,
      );
      if (color) out = wrapColorMarkers(out, color);
      const href = marks.find((m) => m.type === 'link')?.attrs?.href;
      if (typeof href === 'string' && href) out = `[${out}](${href})`;
      return out;
    })
    .join('');
}

function listItemText(item: JSONContent): string {
  return (item.content ?? [])
    .map((block) => inlineToMarkers(block.content))
    .join(' ')
    .trim();
}

export function docToMarkers(doc?: JSONContent | null): string {
  const lines: string[] = [];

  for (const block of doc?.content ?? []) {
    if (block.type === 'bulletList' || block.type === 'orderedList') {
      const ordered = block.type === 'orderedList';
      (block.content ?? []).forEach((item, index) => {
        lines.push(`${ordered ? `${index + 1}.` : '-'} ${listItemText(item)}`);
      });
      continue;
    }
    lines.push(inlineToMarkers(block.content));
  }

  return lines.join('\n');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function applyMarks(value: string): string {
  return value
    .replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>')
    .replace(/_([^_\n]+)_/g, '<em>$1</em>')
    .replace(/~([^~\n]+)~/g, '<s>$1</s>');
}

const COLOR_MARK = /\{#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\}([^\n]*?)\{\/#\}/g;

function applyColorAndMarks(value: string): string {
  const colors: string[] = [];
  const withTokens = value.replace(
    COLOR_MARK,
    (_match, hex: string, inner: string) => {
      const token = `\u0001${colors.length}\u0001`;
      const color = normalizeHex(`#${hex}`);
      if (!color) return inner;
      colors.push(
        `<span data-color="${color}" style="color:${color}">${applyMarks(inner)}</span>`,
      );
      return token;
    },
  );

  return applyMarks(withTokens).replace(
    /\u0001(\d+)\u0001/g,
    (_match, index: string) => colors[Number(index)] ?? '',
  );
}

function inlineToHtml(raw: string): string {
  const links: string[] = [];
  // Pull links out first so underscores or asterisks inside a URL are left alone.
  const withTokens = escapeHtml(raw).replace(
    /\[([^\]\n]+)\]\((https:[^)\s]*)\)/g,
    (_match, label: string, href: string) => {
      const token = `\u0000${links.length}\u0000`;
      links.push(`<a href="${href}">${applyColorAndMarks(label)}</a>`);
      return token;
    },
  );

  return applyColorAndMarks(withTokens).replace(
    /\u0000(\d+)\u0000/g,
    (_match, index: string) => links[Number(index)] ?? '',
  );
}

export function markersToHtml(text: string): string {
  const blocks: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushList = () => {
    if (!list) return;
    const tag = list.ordered ? 'ol' : 'ul';
    const items = list.items.map((item) => `<li><p>${item || '<br>'}</p></li>`).join('');
    blocks.push(`<${tag}>${items}</${tag}>`);
    list = null;
  };

  for (const line of String(text ?? '').split('\n')) {
    const bullet = /^\s*-\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+\.\s+(.*)$/.exec(line);

    if (bullet || numbered) {
      const ordered = !!numbered;
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push(inlineToHtml(bullet?.[1] ?? numbered?.[1] ?? ''));
      continue;
    }

    flushList();
    blocks.push(`<p>${inlineToHtml(line) || '<br>'}</p>`);
  }

  flushList();
  return blocks.join('') || '<p></p>';
}
