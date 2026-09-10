'use client';

import { Fragment, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

const MARKER_HINT =
  /(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|\{#[0-9a-fA-F]{3,6}\}[^\n]*\{\/#\}|\[[^\]\n]+\]\(https:[^)\s]+\)|^\s*-\s+|^\s*\d+\.\s+)/m;

function shouldRenderMarkers(value: string, format?: string | null) {
  if (format === 'markdown') return true;
  return MARKER_HINT.test(value);
}

type ParseOpts = { keyPrefix: string };

function parseInline(text: string, { keyPrefix }: ParseOpts): ReactNode[] {
  if (!text) return [];

  const link = /\[([^\]\n]+)\]\((https:[^)\s]+)\)/.exec(text);
  if (link?.index != null) {
    const [full, label, href] = link;
    const before = text.slice(0, link.index);
    const after = text.slice(link.index + full.length);
    return [
      ...parseInline(before, { keyPrefix: `${keyPrefix}-lb` }),
      <a
        key={`${keyPrefix}-link`}
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-primary underline"
      >
        {parseInline(label, { keyPrefix: `${keyPrefix}-ll` })}
      </a>,
      ...parseInline(after, { keyPrefix: `${keyPrefix}-la` }),
    ];
  }

  const color = /\{#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\}([^\n]*?)\{\/#\}/.exec(text);
  if (color?.index != null) {
    const [full, hex, inner] = color;
    const before = text.slice(0, color.index);
    const after = text.slice(color.index + full.length);
    const expanded =
      hex.length === 3
        ? hex
            .split('')
            .map((ch) => `${ch}${ch}`)
            .join('')
        : hex;
    return [
      ...parseInline(before, { keyPrefix: `${keyPrefix}-cb` }),
      <span key={`${keyPrefix}-color`} style={{ color: `#${expanded}` }}>
        {parseInline(inner, { keyPrefix: `${keyPrefix}-ci` })}
      </span>,
      ...parseInline(after, { keyPrefix: `${keyPrefix}-ca` }),
    ];
  }

  type Match = { index: number; len: number; inner: string; kind: 'strong' | 'em' | 's' };
  const patterns: { re: RegExp; kind: Match['kind'] }[] = [
    { re: /\*([^*\n]+)\*/, kind: 'strong' },
    { re: /_([^_\n]+)_/, kind: 'em' },
    { re: /~([^~\n]+)~/, kind: 's' },
  ];

  let hit: Match | null = null;
  for (const { re, kind } of patterns) {
    const m = re.exec(text);
    if (!m?.index && m?.index !== 0) continue;
    if (!hit || m.index < hit.index) {
      hit = { index: m.index, len: m[0].length, inner: m[1], kind };
    }
  }

  if (hit) {
    const before = text.slice(0, hit.index);
    const after = text.slice(hit.index + hit.len);
    const inner = parseInline(hit.inner, { keyPrefix: `${keyPrefix}-i` });
    const wrapped =
      hit.kind === 'strong' ? (
        <strong key={`${keyPrefix}-m`}>{inner}</strong>
      ) : hit.kind === 'em' ? (
        <em key={`${keyPrefix}-m`}>{inner}</em>
      ) : (
        <s key={`${keyPrefix}-m`}>{inner}</s>
      );
    return [
      ...parseInline(before, { keyPrefix: `${keyPrefix}-b` }),
      wrapped,
      ...parseInline(after, { keyPrefix: `${keyPrefix}-a` }),
    ];
  }

  return [text];
}

function renderLine(line: string, keyPrefix: string) {
  return parseInline(line, { keyPrefix });
}

type MarkdownTextProps = {
  value: string;
  format?: string | null;
  className?: string;
};

export function MarkdownText({ value, format, className }: MarkdownTextProps) {
  const text = value || '';
  const useMarkers = shouldRenderMarkers(text, format);
  const lines = text.split('\n');
  const wrapClass = cn('break-words [overflow-wrap:anywhere]', className);

  if (!useMarkers) {
    return (
      <span className={wrapClass}>
        {lines.map((line, i) => (
          <Fragment key={i}>
            {i > 0 && <br />}
            {line}
          </Fragment>
        ))}
      </span>
    );
  }

  return (
    <span className={wrapClass}>
      {lines.map((line, i) => {
        const bullet = /^\s*-\s+(.*)$/.exec(line);
        const numbered = /^\s*(\d+)\.\s+(.*)$/.exec(line);
        const content = bullet?.[1] ?? numbered?.[2] ?? line;
        const prefix = bullet ? '• ' : numbered ? `${numbered[1]}. ` : '';

        return (
          <Fragment key={i}>
            {i > 0 && <br />}
            {prefix}
            {renderLine(content, String(i))}
          </Fragment>
        );
      })}
    </span>
  );
}
