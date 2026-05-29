import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { PASTE_COMMAND } from 'lexical';
import { COMMAND_PRIORITY_CRITICAL } from 'lexical';
import * as cheerio from 'cheerio';

export default function BrToParagraphPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      PASTE_COMMAND,
      (event: ClipboardEvent) => {
        const clipboardData = event.clipboardData;
        if (!clipboardData) return false;

        const htmlContent = clipboardData.getData('text/html');
        const $ = cheerio.load(htmlContent);
        const firstSpan = $('body').first();
        const parsedContent = firstSpan.text().trim() || '';
        if (parsedContent) {
          event.preventDefault();
          const plainDataTransfer = new DataTransfer();
          plainDataTransfer.setData('text/plain', parsedContent);
          const plainPasteEvent = new ClipboardEvent('paste', {
            clipboardData: plainDataTransfer,
            bubbles: event.bubbles,
            cancelable: event.cancelable,
          });
          editor.dispatchCommand(PASTE_COMMAND, plainPasteEvent);
          return true;
        }

        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    );
  }, [editor]);

  return null;
}
