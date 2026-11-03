import { useRef, useState } from 'react';
import { decodeUtf8 } from './csv.ts';

export interface FileText {
  readonly name: string | null;
  readonly text: string | null;
  readonly problem: 'read' | 'encoding' | null;
  readonly nonce: number;
}

const NO_FILE: FileText = { name: null, text: null, problem: null, nonce: 0 };

export function useFileText() {
  const [file, setFile] = useState<FileText>(NO_FILE);
  const latest = useRef<File | null>(null);
  const nonce = useRef(0);
  const pick = (picked: File) => {
    latest.current = picked;
    nonce.current += 1;
    const pickNonce = nonce.current;
    const settle = (text: string | null, problem: FileText['problem']) => {
      if (latest.current !== picked) return;
      setFile({ name: picked.name, text, problem, nonce: pickNonce });
    };
    picked.arrayBuffer().then(
      (bytes) => {
        const text = decodeUtf8(bytes);
        settle(text, text === null ? 'encoding' : null);
      },
      () => settle(null, 'read'),
    );
  };
  return { file, pick };
}
