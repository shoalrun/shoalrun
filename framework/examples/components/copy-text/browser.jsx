import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

export function enhance({ controls, content }) {
  return new Promise((resolve, reject) => {
    function CopyButton() {
      const [message, setMessage] = useState('');
      useEffect(() => { controls.hidden = false; resolve(); }, []);
      async function copy() {
        try {
          await navigator.clipboard.writeText(content.innerText.trim());
          setMessage('Copied.');
        } catch {
          setMessage('Copy failed. Select the text and copy it manually.');
        }
      }
      return <><button type="button" onClick={copy}>Copy text</button>{' '}<span role="status">{message}</span></>;
    }
    createRoot(controls, { onUncaughtError: error => { controls.hidden = true; reject(error); } }).render(<CopyButton />);
  });
}
