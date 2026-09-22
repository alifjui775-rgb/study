import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Italic,
  Code,
  List,
  ListOrdered,
  Link as LinkIcon,
  Quote,
  Undo,
  Redo,
  Eye,
  Code2,
} from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface TiptapEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function TiptapEditor({ value, onChange, placeholder }: TiptapEditorProps) {
  const [activeTab, setActiveTab] = useState<"visual" | "html">("visual");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[150px] max-h-[300px] overflow-y-auto w-full bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 prose prose-sm max-w-none dark:prose-invert",
      },
    },
  });

  // Sync value if it changes outside (e.g. form reset or initial load or html tab edit)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  const toggleLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    if (previousUrl) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    const url = window.prompt("URL প্রবেশ করুন:");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="border rounded-md overflow-hidden bg-background">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b bg-muted/40 p-1 gap-1">
        {activeTab === "visual" ? (
          <div className="flex flex-wrap items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={cn("h-8 w-8", editor.isActive("bold") && "bg-muted")}
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={cn("h-8 w-8", editor.isActive("italic") && "bg-muted")}
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().toggleCode().run()}
              className={cn("h-8 w-8", editor.isActive("code") && "bg-muted")}
              title="Code (Mono)"
            >
              <Code className="h-4 w-4" />
            </Button>

            <div className="w-[1px] h-4 bg-border mx-1" />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={cn("h-8 w-8", editor.isActive("bulletList") && "bg-muted")}
              title="Unordered List"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={cn("h-8 w-8", editor.isActive("orderedList") && "bg-muted")}
              title="Ordered List"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>

            <div className="w-[1px] h-4 bg-border mx-1" />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleLink}
              className={cn("h-8 w-8", editor.isActive("link") && "bg-muted")}
              title="Link"
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={cn("h-8 w-8", editor.isActive("blockquote") && "bg-muted")}
              title="Blockquote"
            >
              <Quote className="h-4 w-4" />
            </Button>

            <div className="w-[1px] h-4 bg-border mx-1" />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="h-8 w-8"
              title="Undo"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="h-8 w-8"
              title="Redo"
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="px-2 py-1 text-xs text-muted-foreground font-medium flex items-center gap-1.5">
            <Code2 className="h-3.5 w-3.5 text-primary" /> HTML সোর্স মোড
          </div>
        )}

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 ml-auto bg-muted p-0.5 rounded-md shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("visual")}
            className={cn(
              "px-2 py-1 text-xs font-medium rounded flex items-center gap-1 transition-colors",
              activeTab === "visual"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Eye className="h-3.5 w-3.5" />
            ভিজ্যুয়াল
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("html")}
            className={cn(
              "px-2 py-1 text-xs font-medium rounded flex items-center gap-1 transition-colors",
              activeTab === "html"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Code2 className="h-3.5 w-3.5" />
            HTML
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-2">
        {activeTab === "visual" ? (
          <EditorContent editor={editor} />
        ) : (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="HTML কোড এখানে পেস্ট বা টাইপ করুন..."
            className="min-h-[150px] max-h-[300px] overflow-y-auto w-full font-mono text-xs p-2 bg-transparent focus:outline-none resize-y border-0"
          />
        )}
      </div>
    </div>
  );
}
