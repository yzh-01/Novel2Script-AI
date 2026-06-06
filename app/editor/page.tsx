// ============================================================
// 编辑器页 — 核心编辑界面
// 左栏：CodeMirror YAML 编辑器（可编辑源码）
// 右栏：可读剧本预览（降低非程序员使用门槛）
// 底部：校验面板 + 下载按钮 + 溯源映射表
// ============================================================

'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ScreenplayEditor } from '@/components/editor/ScreenplayEditor';
import { ScreenplayPreview } from '@/components/editor/ScreenplayPreview';
import { ValidationPanel } from '@/components/editor/ValidationPanel';
import { DownloadButton } from '@/components/editor/DownloadButton';
import { ConversionProgress } from '@/components/editor/ConversionProgress';
import { SceneChapterMap } from '@/components/editor/SceneChapterMap';
import { useConvert } from '@/hooks/useConvert';
import { useEditorValidation } from '@/hooks/useEditorValidation';
import type { ConvertRequest } from '@/types';

export default function EditorPage() {
  const router = useRouter();
  const convert = useConvert();
  const {
    yaml,
    setYaml,
    validation,
    isDirty,
    markClean,
  } = useEditorValidation('');

  const [activeTab, setActiveTab] = useState<'split' | 'yaml' | 'preview'>('split');
  const [showMap, setShowMap] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const startedRef = useRef(false);
  const savedRef = useRef(false);
  const requestRef = useRef<ConvertRequest | null>(null);

  // ── 入口分流 ──────────────────────────────────────────
  // 入口 A：首页「转换为剧本」→ sessionStorage 中有 novel2script:request
  // 入口 B：历史记录「在编辑器中打开」→ sessionStorage 中有 novel2script:history
  // useRef 守卫防止 React 18 Strict Mode 双次挂载导致 sessionStorage 被误删
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    // 入口 A：发起 AI 转换
    const stored = sessionStorage.getItem('novel2script:request');
    if (stored) {
      let request: ConvertRequest;
      try {
        request = JSON.parse(stored);
      } catch {
        router.push('/');
        return;
      }

      requestRef.current = request;
      sessionStorage.removeItem('novel2script:request');
      convert.startConvert(request);
      return;
    }

    // 入口 B：从历史记录加载已有 YAML（支持旧格式纯字符串 + 新格式 JSON）
    const historyRaw = sessionStorage.getItem('novel2script:history');
    if (historyRaw) {
      sessionStorage.removeItem('novel2script:history');
      let yamlText = historyRaw;
      try {
        const parsed = JSON.parse(historyRaw);
        if (parsed && typeof parsed === 'object' && parsed.yaml) {
          yamlText = parsed.yaml;
          // 将元数据存入 requestRef，供保存按钮使用
          requestRef.current = {
            title: parsed.title || '',
            genre: parsed.genre || 'other',
            format: parsed.format || 'movie',
            author: parsed.author || undefined,
            chapters: typeof parsed.novel === 'string'
              ? (() => { try { return JSON.parse(parsed.novel); } catch { return []; } })()
              : [],
          };
        }
      } catch {
        // 旧格式：纯 YAML 字符串
      }
      setYaml(yamlText);
      markClean();
      return;
    }

    // 无入口数据 → 回首页
    router.push('/');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 转换完成后将 YAML 装入编辑器，并保存到历史记录
  useEffect(() => {
    if (convert.state.phase2 && !isDirty) {
      setYaml(convert.state.phase2.yaml);
      markClean();

      // 保存转换记录到数据库
      if (!savedRef.current && requestRef.current) {
        savedRef.current = true;
        const req = requestRef.current;
        fetch('/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: req.title,
            novel: req.chapters,
            yaml: convert.state.phase2.yaml,
            genre: req.genre,
            format: req.format,
            author: req.author,
          }),
        }).catch(() => {
          // 保存失败不影响主流程
        });
      }
    }
  }, [convert.state.phase2, isDirty, setYaml, markClean]);

  // 用户手动修改 YAML 后重新校验（同时重置保存状态）
  const handleYamlChange = (newYaml: string) => {
    setYaml(newYaml);
    if (saveState === 'saved') setSaveState('idle');
  };

  // 保存当前 YAML 到历史记录（支持编辑后保存）
  const handleSaveToHistory = async () => {
    if (!yaml.trim() || saveState === 'saving') return;
    setSaveState('saving');

    // 优先用原始请求的元数据，否则从 YAML 中解析
    let title = requestRef.current?.title || '';
    let genre = requestRef.current?.genre || 'other';
    let format = requestRef.current?.format || 'movie';
    const author = requestRef.current?.author;
    const novel = requestRef.current?.chapters || [];

    // 从 YAML meta 段补充/覆盖缺失字段（YAML 解析更准确）
    try {
      const { load: yamlLoad } = await import('js-yaml');
      const parsed: any = yamlLoad(yaml);
      if (parsed?.meta) {
        if (!title && parsed.meta.title) title = parsed.meta.title;
        if (parsed.meta.genre) {
          const g = Array.isArray(parsed.meta.genre) ? parsed.meta.genre[0] : parsed.meta.genre;
          if (g && !requestRef.current?.genre) genre = g;
        }
        if (parsed.meta.format && !requestRef.current?.format) {
          format = parsed.meta.format;
        }
      }
    } catch {
      // YAML 解析失败不阻断保存，使用已有元数据
    }

    if (!title) title = '未命名';

    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, novel, yaml, genre, format, author }),
      });
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch {
      setSaveState('idle');
    }
  };

  return (
    <div className="space-y-6">
      {/* 顶栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="text-sm text-stone-500 transition-colors hover:text-stone-800"
          >
            ← 返回输入
          </button>

          {/* 视图切换 */}
          {convert.state.status === 'complete' && (
            <div className="flex overflow-hidden rounded-lg border border-stone-200 text-sm shadow-sm">
              {(['split', 'yaml', 'preview'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 transition-colors ${
                    activeTab === tab
                      ? 'bg-brand-100 text-brand-800 font-medium'
                      : 'text-stone-500 hover:bg-stone-50'
                  }`}
                >
                  {{ split: '分栏', yaml: 'YAML', preview: '预览' }[tab]}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isDirty && (
            <span className="text-xs text-amber-600" title="YAML 已被编辑">已编辑</span>
          )}
          <button
            onClick={handleSaveToHistory}
            disabled={!yaml.trim() || saveState === 'saving'}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              saveState === 'saved'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-stone-50 text-stone-600 hover:bg-amber-50 hover:text-amber-700 border border-stone-200'
            }`}
          >
            {saveState === 'saving' ? '保存中…' : saveState === 'saved' ? '✓ 已保存' : '保存到历史'}
          </button>
          <DownloadButton
            yaml={yaml}
            disabled={!yaml.trim()}
          />
        </div>
      </div>

      {/* 转换进度 */}
      {(convert.state.status !== 'idle' && convert.state.status !== 'complete') && (
        <ConversionProgress state={convert.state} />
      )}

      {/* 转换错误 */}
      {convert.state.status === 'error' && (
        <div className="animate-scale-in rounded-xl border border-red-200 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-500">!</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-700">转换失败</p>
              <p className="mt-1 text-sm text-red-600">{convert.state.error}</p>
            </div>
          </div>
          <button
            onClick={() => convert.reset()}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            重新开始
          </button>
        </div>
      )}

      {/* 编辑器 + 预览（仅在转换完成或已有内容时显示） */}
      {yaml && (
        <>
          {/* 主编辑区 */}
          <div className={`grid gap-4 ${
            activeTab === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
          }`}>
            {/* YAML 编辑器 */}
            {(activeTab === 'split' || activeTab === 'yaml') && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-stone-600">YAML 源码</h3>
                <ScreenplayEditor
                  value={yaml}
                  onChange={handleYamlChange}
                  validationIssues={validation.issues}
                />
              </div>
            )}

            {/* 预览面板 */}
            {(activeTab === 'split' || activeTab === 'preview') && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-stone-600">剧本预览</h3>
                <div className="h-full min-h-[500px]">
                  <ScreenplayPreview yaml={yaml} />
                </div>
              </div>
            )}
          </div>

          {/* 底部：校验 + 溯源 */}
          <div className="grid gap-4 lg:grid-cols-2">
            <ValidationPanel validation={validation} />

            <div className="space-y-2">
              <button
                onClick={() => setShowMap(!showMap)}
                className="text-sm text-stone-500 underline transition-colors hover:text-stone-800"
              >
                {showMap ? '收起' : '展开'}章节 → 场景溯源
              </button>
              {showMap && <SceneChapterMap yaml={yaml} />}
            </div>
          </div>
        </>
      )}

      {/* 空状态 */}
      {!yaml && convert.state.status === 'idle' && (
        <div className="animate-fade-in flex min-h-[400px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-200 py-20 text-center">
          <span className="text-5xl animate-float">📝</span>
          <p className="mt-4 text-lg font-medium text-stone-500">等待转换</p>
          <p className="mt-1 text-sm text-stone-500">请先在首页粘贴小说章节，点击转换后跳转至此</p>
        </div>
      )}
    </div>
  );
}
