"use client";

import { useEffect, useRef, useState } from "react";
import {
  EditorContent,
  useEditor,
  type Editor,
  type Extensions,
} from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Heading3 as Heading3Icon,
  List as ListIcon,
  ListOrdered as ListOrderedIcon,
  Link as LinkIcon,
  Unlink as UnlinkIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

// tiptap-markdown augments editor.storage with a `markdown` namespace but
// does not ship ambient type augmentations, so we access it via a narrow
// helper that casts locally.
interface MarkdownStorage {
  markdown: { getMarkdown: () => string };
}
function getMarkdown(editor: Editor): string {
  return (editor.storage as unknown as MarkdownStorage).markdown.getMarkdown();
}

interface RichTextEditorProps {
  name: string;
  defaultValue?: string;
  value?: string;
  onChange?: (markdown: string) => void;
  placeholder?: string;
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  disabled?: boolean;
}

function buildExtensions(placeholder?: string): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [3] },
      codeBlock: false,
      code: false,
      blockquote: false,
      horizontalRule: false,
      strike: false,
      underline: false,
      link: {
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
        },
      },
    }),
    Placeholder.configure({
      placeholder: placeholder ?? "",
    }),
    Markdown.configure({
      html: false,
      tightLists: true,
      linkify: false,
      breaks: true,
    }),
  ];
}

export function RichTextEditor({
  name,
  defaultValue,
  value,
  onChange,
  placeholder,
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  disabled,
}: RichTextEditorProps) {
  const isControlled = value !== undefined;
  const initialContent = isControlled ? value : defaultValue ?? "";
  const hiddenRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: buildExtensions(placeholder),
    content: initialContent,
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const md = getMarkdown(editor);
      if (hiddenRef.current) hiddenRef.current.value = md;
      onChange?.(md);
    },
  });

  useEffect(() => {
    if (!editor || !isControlled || value === undefined) return;
    const current = getMarkdown(editor);
    if (current !== value) {
      editor.commands.setContent(value, { emitUpdate: false });
      if (hiddenRef.current) hiddenRef.current.value = value;
    }
  }, [editor, isControlled, value]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  return (
    <div
      className={cn(
        "rounded-lg bg-secondary text-foreground transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-4 focus-within:ring-offset-background",
        ariaInvalid && "ring-2 ring-destructive",
        disabled && "cursor-not-allowed opacity-50"
      )}
      aria-invalid={ariaInvalid}
    >
      <Toolbar editor={editor} disabled={disabled} />
      <EditorContent
        editor={editor}
        id={id}
        aria-describedby={ariaDescribedBy}
        className="min-h-20 px-3 py-2 text-base md:text-sm [&_.ProseMirror]:min-h-16 [&_.ProseMirror]:outline-none [&_.ProseMirror>*+*]:mt-2 [&_.ProseMirror_a]:text-primary [&_.ProseMirror_a]:underline [&_.ProseMirror_a]:underline-offset-4 [&_.ProseMirror_h3]:font-heading [&_.ProseMirror_h3]:text-base [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:tracking-tight [&_.ProseMirror_ol]:ml-5 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_ul]:ml-5 [&_.ProseMirror_ul]:list-disc"
      />
      <input
        ref={hiddenRef}
        type="hidden"
        name={name}
        defaultValue={initialContent}
      />
    </div>
  );
}

interface ToolbarProps {
  editor: Editor | null;
  disabled?: boolean;
}

function Toolbar({ editor, disabled }: ToolbarProps) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  if (!editor) {
    return <div className="h-9 border-b border-background" aria-hidden />;
  }

  function openLinkEditor() {
    if (!editor) return;
    const current = editor.getAttributes("link").href ?? "";
    setLinkUrl(current);
    setLinkOpen(true);
  }

  function applyLink() {
    if (!editor) return;
    const url = linkUrl.trim();
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    }
    setLinkOpen(false);
    setLinkUrl("");
  }

  const buttonCls =
    "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground aria-pressed:bg-background aria-pressed:text-foreground disabled:pointer-events-none disabled:opacity-50";

  return (
    <>
      <div
        role="toolbar"
        aria-label="Formatting"
        className="flex flex-wrap items-center gap-0.5 border-b border-background px-2 py-1"
      >
        <button
          type="button"
          aria-label="Bold"
          aria-pressed={editor.isActive("bold")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={buttonCls}
        >
          <BoldIcon className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label="Italic"
          aria-pressed={editor.isActive("italic")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={buttonCls}
        >
          <ItalicIcon className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label="Heading"
          aria-pressed={editor.isActive("heading", { level: 3 })}
          disabled={disabled}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          className={buttonCls}
        >
          <Heading3Icon className="size-3.5" />
        </button>
        <span className="mx-1 h-4 w-px bg-background" aria-hidden />
        <button
          type="button"
          aria-label="Bulleted list"
          aria-pressed={editor.isActive("bulletList")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={buttonCls}
        >
          <ListIcon className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label="Numbered list"
          aria-pressed={editor.isActive("orderedList")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={buttonCls}
        >
          <ListOrderedIcon className="size-3.5" />
        </button>
        <span className="mx-1 h-4 w-px bg-background" aria-hidden />
        <button
          type="button"
          aria-label={editor.isActive("link") ? "Edit link" : "Add link"}
          aria-pressed={editor.isActive("link")}
          disabled={disabled}
          onClick={openLinkEditor}
          className={buttonCls}
        >
          <LinkIcon className="size-3.5" />
        </button>
        {editor.isActive("link") && (
          <button
            type="button"
            aria-label="Remove link"
            disabled={disabled}
            onClick={() =>
              editor.chain().focus().extendMarkRange("link").unsetLink().run()
            }
            className={buttonCls}
          >
            <UnlinkIcon className="size-3.5" />
          </button>
        )}
      </div>
      {linkOpen && (
        <div className="flex items-center gap-2 border-b border-background px-2 py-1.5">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setLinkOpen(false);
              }
            }}
            placeholder="https://example.com"
            aria-label="Link URL"
            className="h-7 flex-1 rounded-md border-0 bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            autoFocus
          />
          <button
            type="button"
            onClick={applyLink}
            className="inline-flex h-7 items-center rounded-md bg-primary px-2 text-xs font-medium text-primary-foreground hover:brightness-110"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => setLinkOpen(false)}
            className="inline-flex h-7 items-center rounded-md px-2 text-xs text-muted-foreground hover:bg-background hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}
    </>
  );
}
