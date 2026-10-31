'use client';

import { useEffect } from 'react';
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extensions';
import { cn } from '@/lib/utils';
import {
  Bold,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Strikethrough,
  Underline,
} from 'lucide-react';

type RichHtmlEditorProps = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  className?: string;
  /** Minimum height of the editable area */
  minHeightClassName?: string;
};

export function RichHtmlEditor({
  value,
  onChange,
  disabled = false,
  label,
  placeholder = 'Write content…',
  className,
  minHeightClassName = 'min-h-[280px]',
}: RichHtmlEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        underline: {},
        link: { openOnClick: false, autolink: false },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        role: 'textbox',
        class: cn(
          'leading-relaxed outline-none [&_p]:my-2 [&_p:first-child]:mt-0',
          '[&_strong]:font-semibold [&_a]:text-primary [&_a]:underline',
          '[&_ul]:my-2 [&_ol]:my-2 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5',
          '[&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold',
          minHeightClassName,
        ),
      },
    },
    onUpdate: ({ editor: instance }) => {
      onChange(instance.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value === current) return;
    editor.commands.setContent(value || '', { emitUpdate: false });
  }, [editor, value]);

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label ? (
        <span className="text-sm font-medium text-gray-900">{label}</span>
      ) : null}
      <Toolbar editor={editor} disabled={disabled} />
      <EditorContent
        editor={editor}
        className={cn(
          'w-full cursor-text rounded-lg border border-input bg-gray-50 px-3 py-2 text-sm transition-colors',
          'focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
          disabled && 'cursor-not-allowed opacity-60',
          '[&_.tiptap]:w-full',
        )}
      />
    </div>
  );
}

function Toolbar({ editor, disabled }: { editor: Editor | null; disabled?: boolean }) {
  const active = useEditorState({
    editor,
    selector: ({ editor: instance }) => ({
      bold: !!instance?.isActive('bold'),
      italic: !!instance?.isActive('italic'),
      strike: !!instance?.isActive('strike'),
      underline: !!instance?.isActive('underline'),
      bulletList: !!instance?.isActive('bulletList'),
      orderedList: !!instance?.isActive('orderedList'),
      link: !!instance?.isActive('link'),
      heading2: !!instance?.isActive('heading', { level: 2 }),
      paragraph: !!instance?.isActive('paragraph'),
    }),
  });

  if (!editor) return <div className="h-7" />;

  const run = (fn: () => void) => {
    if (disabled) return;
    fn();
  };

  const toggleLink = () => {
    if (editor.isActive('link')) {
      run(() => editor.chain().focus().unsetLink().run());
      return;
    }
    const href = window.prompt('Link URL (https://…)');
    if (!href) return;
    if (!/^https:\/\//i.test(href)) {
      window.alert('Only https links are supported.');
      return;
    }
    run(() =>
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run(),
    );
  };

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-0.5 rounded-lg border border-gray-200 bg-white px-1 py-0.5',
        disabled && 'pointer-events-none opacity-60',
      )}
    >
      <ToolbarButton
        label="Bold (Ctrl+B)"
        icon={Bold}
        active={active?.bold}
        onClick={() => run(() => editor.chain().focus().toggleBold().run())}
      />
      <ToolbarButton
        label="Italic (Ctrl+I)"
        icon={Italic}
        active={active?.italic}
        onClick={() => run(() => editor.chain().focus().toggleItalic().run())}
      />
      <ToolbarButton
        label="Strikethrough"
        icon={Strikethrough}
        active={active?.strike}
        onClick={() => run(() => editor.chain().focus().toggleStrike().run())}
      />
      <ToolbarButton
        label="Underline"
        icon={Underline}
        active={active?.underline}
        onClick={() => run(() => editor.chain().focus().toggleUnderline().run())}
      />
      <span className="mx-0.5 h-4 w-px bg-gray-200" />
      <ToolbarButton
        label="Heading"
        icon={Heading2}
        active={active?.heading2}
        onClick={() =>
          run(() => editor.chain().focus().toggleHeading({ level: 2 }).run())
        }
      />
      <ToolbarButton
        label="Paragraph"
        icon={Pilcrow}
        active={active?.paragraph}
        onClick={() => run(() => editor.chain().focus().setParagraph().run())}
      />
      <span className="mx-0.5 h-4 w-px bg-gray-200" />
      <ToolbarButton
        label="Bulleted list"
        icon={List}
        active={active?.bulletList}
        onClick={() => run(() => editor.chain().focus().toggleBulletList().run())}
      />
      <ToolbarButton
        label="Numbered list"
        icon={ListOrdered}
        active={active?.orderedList}
        onClick={() => run(() => editor.chain().focus().toggleOrderedList().run())}
      />
      <ToolbarButton
        label="Insert link"
        icon={Link2}
        active={active?.link}
        onClick={toggleLink}
      />
    </div>
  );
}

function ToolbarButton({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: typeof Bold;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={!!active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'flex size-7 items-center justify-center rounded transition-colors',
        active
          ? 'bg-primary-light text-primary'
          : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700',
      )}
    >
      <Icon className="size-3.5" />
    </button>
  );
}
