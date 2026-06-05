// ============================================================
// useConvert — 两阶段转换状态机
// ============================================================

'use client';

import { useState, useCallback, useRef } from 'react';
import type { ConvertRequest, ConvertPhase1, ConvertPhase2, ConvertState, ConvertStatus } from '@/types';

interface UseConvertReturn {
  state: ConvertState;
  startConvert: (request: ConvertRequest) => void;
  reset: () => void;
}

const initialState: ConvertState = {
  status: 'idle',
  phase1: null,
  phase2: null,
  error: null,
};

export function useConvert(): UseConvertReturn {
  const [state, setState] = useState<ConvertState>(initialState);
  const abortRef = useRef<AbortController | null>(null);

  const setStatus = useCallback((status: ConvertStatus) => {
    setState(prev => ({ ...prev, status }));
  }, []);

  const startConvert = useCallback(async (request: ConvertRequest) => {
    // 取消之前的请求
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ status: 'validating_input', phase1: null, phase2: null, error: null });

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: '未知错误' }));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      // 读取流式 NDJSON（两阶段返回）
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取响应流');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            if (event.phase === 'characters') {
              setState(prev => ({
                ...prev,
                status: 'generating_scenes',
                phase1: event as ConvertPhase1,
              }));
            } else if (event.phase === 'complete') {
              const phase2 = event as ConvertPhase2;
              setState(prev => ({
                ...prev,
                status: 'complete',
                phase2,
                phase1: prev.phase1, // 保留 phase1 数据
              }));
            }
          } catch {
            // 跳过无法解析的行
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setState(prev => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : '转换失败，请重试',
      }));
    }
  }, []);

  const reset = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setState(initialState);
  }, []);

  return { state, startConvert, reset };
}
