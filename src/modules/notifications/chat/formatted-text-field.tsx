"use client";

import { useEffect, useRef } from "react";
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { cn } from "@/lib/utils";
import { docToMarkers, markersToHtml } from "./whatsapp-markup";
import { EmojiPicker } from "./emoji-picker";
import { ColorPicker } from "./color-picker";
import { TextColor } from "./text-color-mark";
import {
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Strikethrough,
} from "lucide-react";

type FormattedTextFieldProps = {
  /** WhatsApp marker text — what gets stored and sent. The editor shows it formatted. */
  value: string;
  onChange: (next: string) => void;
  /** Fired when formatting is applied, so the caller can switch the card to markdown. */
  onFormatApplied?: () => void;
  /** Visible label above the field (placeholder often hidden in TipTap). */
  label?: string;
  placeholder?: string;
  multiline?: boolean;
  autoFocus?: boolean;
  className?: string;
  /** Styles the bordered box around the editor. */
  fieldClassName?: string;
  /** Styles the editable area itself. */
  editorClassName?: string;
  ariaLabel?: string;
  /** Multiline only: Enter without Shift submits instead of adding a line. */
  onEnterSubmit?: () => void;
};

export function FormattedTextField({
  value,
  onChange,
  onFormatApplied,
  label,
  placeholder,
  multiline = false,
  autoFocus,
  className,
  fieldClassName,
  editorClassName,
  ariaLabel,
  onEnterSubmit,
}: FormattedTextFieldProps) {
  // Tiptap binds `editorProps` once, so Enter must read the latest submit via a ref.
  const submitRef = useRef(onEnterSubmit);
  useEffect(() => {
    submitRef.current = onEnterSubmit;
  }, [onEnterSubmit]);

  const editor = useEditor({
    // Next renders this on the server first; deferring avoids a hydration mismatch.
    immediatelyRender: false,
    autofocus: autoFocus,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        underline: false,
        hardBreak: multiline ? {} : false,
        bulletList: multiline ? {} : false,
        orderedList: multiline ? {} : false,
        listItem: multiline ? {} : false,
        listKeymap: multiline ? {} : false,
        link: { openOnClick: false, autolink: false },
      }),
      TextColor,
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: markersToHtml(value),
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-label": ariaLabel ?? "",
        class: cn(
          "leading-5 outline-none [&_p]:m-0 [&_p]:leading-5",
          "[&_strong]:font-semibold [&_a]:text-primary [&_a]:underline",
          "[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5",
          multiline
            ? "min-h-5 max-h-32 overflow-y-auto [&_p]:min-h-5"
            : "h-full min-h-0 overflow-x-auto overflow-y-hidden whitespace-nowrap [&_p]:min-h-0 [&_br]:hidden [&::-webkit-scrollbar]:hidden",
          editorClassName,
        ),
      },
      transformPastedText: (text) =>
        multiline ? text : text.replace(/\s*\n+\s*/g, " "),
      handleKeyDown: (_view, event) => {
        if (event.key !== "Enter") return false;
        if (multiline && event.shiftKey) return false;
        event.preventDefault();
        submitRef.current?.();
        return true;
      },
    },
    onUpdate: ({ editor: instance }) =>
      onChange(docToMarkers(instance.getJSON())),
  });

  // Pull in external changes (edit / resend prefill, reset after send) without
  // clobbering what the admin is typing.
  useEffect(() => {
    if (!editor) return;
    if (docToMarkers(editor.getJSON()) === value) return;
    editor.commands.setContent(markersToHtml(value), { emitUpdate: false });
  }, [editor, value]);

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label ? (
        <span className="text-xs font-medium text-gray-700">{label}</span>
      ) : null}
      <Toolbar
        editor={editor}
        multiline={multiline}
        onFormatApplied={onFormatApplied}
      />
      <EditorContent
        editor={editor}
        className={cn(
          "w-full cursor-text rounded-lg border border-input bg-gray-50 px-3 text-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
          multiline
            ? "py-1.5"
            : "flex h-9 min-h-9 max-h-9 items-center overflow-hidden py-0",
          "[&_.tiptap]:h-full [&_.tiptap]:w-full [&_.tiptap]:min-h-0",
          fieldClassName,
        )}
      />
    </div>
  );
}

function Toolbar({
  editor,
  multiline,
  onFormatApplied,
}: {
  editor: Editor | null;
  multiline: boolean;
  onFormatApplied?: () => void;
}) {
  const active = useEditorState({
    editor,
    selector: ({ editor: instance }) => ({
      bold: !!instance?.isActive("bold"),
      italic: !!instance?.isActive("italic"),
      strike: !!instance?.isActive("strike"),
      bulletList: !!instance?.isActive("bulletList"),
      orderedList: !!instance?.isActive("orderedList"),
      link: !!instance?.isActive("link"),
      textColor: (instance?.getAttributes("textColor")?.color as string) || null,
    }),
  });

  if (!editor) return <div className="h-6" />;

  const run = (fn: () => void) => {
    fn();
    onFormatApplied?.();
  };

  const toggleLink = () => {
    if (editor.isActive("link")) {
      run(() => editor.chain().focus().unsetLink().run());
      return;
    }
    const href = window.prompt("Link URL (https://…)");
    if (!href) return;
    if (!/^https:\/\//i.test(href)) {
      window.alert("Only https links are supported.");
      return;
    }
    run(() =>
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run(),
    );
  };

  return (
    <div className="flex shrink-0 items-center gap-0.5 px-1">
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
      {multiline && (
        <>
          <span className="mx-0.5 h-4 w-px bg-gray-200" />
          <ToolbarButton
            label="Bulleted list"
            icon={List}
            active={active?.bulletList}
            onClick={() =>
              run(() => editor.chain().focus().toggleBulletList().run())
            }
          />
          <ToolbarButton
            label="Numbered list"
            icon={ListOrdered}
            active={active?.orderedList}
            onClick={() =>
              run(() => editor.chain().focus().toggleOrderedList().run())
            }
          />
        </>
      )}
      <ToolbarButton
        label="Insert link"
        icon={Link2}
        active={active?.link}
        onClick={toggleLink}
      />
      <ColorPicker
        color={active?.textColor}
        onSelect={(next) =>
          run(() => {
            if (next) editor.chain().focus().setTextColor(next).run();
            else editor.chain().focus().unsetTextColor().run();
          })
        }
      />
      <span className="mx-0.5 h-4 w-px bg-gray-200" />
      <EmojiPicker
        onSelect={(emoji) =>
          editor.chain().focus().insertContent(emoji).run()
        }
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
      // Keep the caret and selection in the editor when the button takes the click.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex size-6 items-center justify-center rounded transition-colors",
        active
          ? "bg-primary-light text-primary"
          : "text-gray-400 hover:bg-gray-100 hover:text-gray-700",
      )}
    >
      <Icon className="size-3.5" />
    </button>
  );
}
