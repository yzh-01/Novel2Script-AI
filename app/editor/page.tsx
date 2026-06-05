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
  const startedRef = useRef(false);

  // 从 sessionStorage 读取请求并发起转换
  // useRef 守卫防止 React 18 Strict Mode 双次挂载导致 sessionStorage 被误删
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const stored = sessionStorage.getItem('novel2script:request');
    if (!stored) {
      router.push('/');
      return;
    }

    let request: ConvertRequest;
    try {
      request = JSON.parse(stored);
    } catch {
      router.push('/');
      return;
    }

    // 读完立即删除，避免残留
    sessionStorage.removeItem('novel2script:request');
    convert.startConvert(request);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 转换完成后将 YAML 装入编辑器
  useEffect(() => {
    if (convert.state.phase2 && !isDirty) {
      setYaml(convert.state.phase2.yaml);
      markClean();
    }
  }, [convert.state.phase2, isDirty, setYaml, markClean]);

  // 用户手动修改 YAML 后重新校验
  const handleYamlChange = (newYaml: string) => {
    setYaml(newYaml);
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
            <div className="flex rounded border text-sm">
              {(['split', 'yaml', 'preview'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 ${
                    activeTab === tab
                      ? 'bg-amber-100 text-amber-800'
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
            <span className="text-xs text-amber-600" title="YAML 已被编辑，可通过下载按钮保存到本地">已编辑</span>
          )}
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
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">转换失败</p>
          <p className="mt-1 text-sm text-red-600">{convert.state.error}</p>
          <button
            onClick={() => convert.reset()}
            className="mt-3 rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
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
        <div className="flex min-h-[400px] items-center justify-center rounded-lg border-2 border-dashed border-stone-200 py-20 text-center text-stone-400">
          <div>
            <p className="text-lg">等待转换...</p>
            <p className="mt-1 text-sm">请先在首页粘贴小说章节，点击转换后跳转至此</p>
          </div>
        </div>
      )}
    </div>
  );
}
