// ============================================================
// ScreenplayEditor — CodeMirror 6 封装
// YAML 语法高亮 + 行号 + 折叠 + lint 集成
// ============================================================

'use client';

import { useEffect, useRef, memo } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldGutter } from '@codemirror/language';
import { yaml as yamlLang } from '@codemirror/lang-yaml';
import { lintGutter, setDiagnostics } from '@codemirror/lint';
import type { ValidationIssue } from '@/types';

interface ScreenplayEditorProps {
  value: string;
  onChange: (value: string) => void;
  validationIssues: ValidationIssue[];
}

export const ScreenplayEditor = memo(function ScreenplayEditor({
  value,
  onChange,
  validationIssues,
}: ScreenplayEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  // 初始化编辑器
  useEffect(() => {
    if (!editorRef.current || viewRef.current) return;

    const updateListener = EditorView.updateListener.of(update => {
      if (update.docChanged) {
        onChange(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        history(),
        foldGutter(),
        bracketMatching(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        yamlLang(),
        lintGutter(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        updateListener,
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 同步外部 value 变化（仅在外部更新时）
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentDoc = view.state.doc.toString();
    if (value !== currentDoc) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: value },
      });
    }
  }, [value]);

  // 同步校验问题到编辑器 lint
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const diagnostics = validationIssues
      .filter(issue => issue.path)
      .map(issue => {
        // 尝试从 path 推断行号
        const lineMatch = issue.path.match(/scenes\.(\d+)/);
        return {
          from: 0,
          to: view.state.doc.length,
          message: issue.message,
          severity: issue.severity as 'error' | 'warning',
        };
      });

    view.dispatch(setDiagnostics(view.state, diagnostics));
  }, [validationIssues]);

  return (
    <div
      ref={editorRef}
      className="h-full min-h-[500px] overflow-auto rounded-lg border bg-white"
    />
  );
});
