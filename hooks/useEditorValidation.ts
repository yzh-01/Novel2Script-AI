// ============================================================
// useEditorValidation — CodeMirror 内容 + Zod 实时校验
// ============================================================

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ValidationResult } from '@/types';

interface UseEditorValidationReturn {
  yaml: string;
  setYaml: (value: string) => void;
  validation: ValidationResult;
  revalidate: () => void;
  isDirty: boolean;
  markClean: () => void;
}

export function useEditorValidation(initialYaml: string = ''): UseEditorValidationReturn {
  const [yaml, setYamlState] = useState(initialYaml);
  const [isDirty, setIsDirty] = useState(false);
  const [validation, setValidation] = useState<ValidationResult>({ valid: true, issues: [] });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const setYaml = useCallback((value: string) => {
    setYamlState(value);
    setIsDirty(true);

    // 防抖校验（300ms）
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      // 动态导入校验逻辑以避免循环依赖警告
      import('@/lib/validators').then(({ validateYamlInEditor }) => {
        setValidation(validateYamlInEditor(value));
      });
    }, 300);
  }, []);

  const revalidate = useCallback(() => {
    import('@/lib/validators').then(({ validateYamlInEditor }) => {
      setValidation(validateYamlInEditor(yaml));
    });
  }, [yaml]);

  const markClean = useCallback(() => {
    setIsDirty(false);
  }, []);

  // 清理防抖
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return { yaml, setYaml, validation, revalidate, isDirty, markClean };
}
