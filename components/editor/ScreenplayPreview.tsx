// ============================================================
// ScreenplayPreview — YAML → 可读剧本渲染
// 降低"非程序员作者"使用门槛：让他们看到的是剧本，不是代码
// ============================================================

'use client';

import { memo, useMemo } from 'react';
import { tryParseYaml } from '@/lib/yaml';
import type { Screenplay } from '@/types';

interface ScreenplayPreviewProps {
  yaml: string;
}

export const ScreenplayPreview = memo(function ScreenplayPreview({ yaml }: ScreenplayPreviewProps) {
  const screenplay = useMemo((): Screenplay | null => {
    const result = tryParseYaml(yaml);
    if (!result.success) return null;
    const data = result.data as Record<string, unknown>;
    if (!data?.scenes || !data?.characters || !data?.meta) return null;
    return data as unknown as Screenplay;
  }, [yaml]);

  if (!screenplay) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed border-stone-200 py-20 text-center text-sm text-stone-500">
        {yaml.trim()
          ? 'YAML 解析失败，请检查编辑器中的语法错误'
          : '转换完成后，此处将显示可读的剧本预览'}
      </div>
    );
  }

  // 构建角色名映射
  const nameMap = new Map(screenplay.characters.map(c => [c.id, c.name]));

  return (
    <div className="h-full overflow-y-auto rounded-lg border bg-white p-6">
      {/* 剧本标题 */}
      <h2 className="mb-1 text-center text-xl font-bold">{screenplay.meta.title}</h2>
      <p className="mb-4 text-center text-sm text-gray-500">
        {screenplay.meta.source && `改编自《${screenplay.meta.source.title}》`}
      </p>

      {/* 角色表 */}
      <details className="mb-4">
        <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
          角色表（{screenplay.characters.length} 人）
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-1 rounded bg-gray-50 p-2 text-xs">
          {screenplay.characters.map(ch => (
            <span key={ch.id} className="flex items-center gap-1 px-1 py-0.5">
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                ch.category === 'main' ? 'bg-amber-500' : ch.category === 'supporting' ? 'bg-blue-400' : 'bg-gray-300'
              }`} />
              {ch.name}
              <span className="text-gray-500">({ch.category === 'main' ? '主' : ch.category === 'supporting' ? '配' : '其他'})</span>
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-3 border-t border-stone-100 pt-2 text-xs text-stone-500">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" /> 主角
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400" /> 配角
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-gray-300" /> 其他
          </span>
        </div>
      </details>

      {/* 场景列表 */}
      <div className="space-y-6">
        {screenplay.scenes.map(scene => (
          <div key={scene.id} className="border-t pt-4">
            {/* 场景标题 */}
            <h3 className="mb-2 font-semibold text-gray-800">
              {scene.id} · {scene.heading.interior ? 'INT.' : 'EXT.'} {scene.heading.location} — {((): string => { const t = scene.heading.time_of_day; const m: Record<string, string> = { dawn: '拂晓', morning: '晨', afternoon: '午后', dusk: '黄昏', day: '日', night: '夜' }; return m[t] || t; })()}
              {scene.heading.extra && <span className="text-gray-500">（{scene.heading.extra}）</span>}
            </h3>

            {scene.summary && (
              <p className="mb-2 text-xs italic text-gray-500">{scene.summary}</p>
            )}

            {/* 内容块 */}
            <div className="space-y-2">
              {scene.blocks.map((block, i) => {
                if (block.type === 'action') {
                  return (
                    <p key={i} className="text-sm leading-relaxed text-gray-700">
                      {block.text}
                    </p>
                  );
                }
                if (block.type === 'dialogue') {
                  const characterName = nameMap.get(block.character_id) || block.character_id;
                  return (
                    <div key={i} className="ml-6 border-l-2 border-amber-200 pl-3">
                      <p className="text-sm font-medium text-amber-900">
                        {characterName}
                        {block.parenthetical && (
                          <span className="ml-2 font-normal text-gray-500">{block.parenthetical}</span>
                        )}
                        {block.delivery === 'voice_over' && <span className="ml-1 text-xs text-gray-500">(V.O.)</span>}
                        {block.delivery === 'off_screen' && <span className="ml-1 text-xs text-gray-500">(O.S.)</span>}
                      </p>
                      <p className="text-sm text-gray-800">
                        {block.text}
                        {block.continuation && <span className="ml-1 text-xs text-gray-300">（续）</span>}
                      </p>
                      {block.emotion && (
                        <p className="text-xs text-gray-500">情感：{block.emotion}</p>
                      )}
                    </div>
                  );
                }
                if (block.type === 'transition') {
                  return (
                    <p key={i} className="text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      {block.text}
                    </p>
                  );
                }
                return null;
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
