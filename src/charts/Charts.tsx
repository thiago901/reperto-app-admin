import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Dot } from '../components/ui';

/*
 * Gráficos em SVG puro: poucos, legíveis, com hover. Marcas finas, pontas
 * arredondadas só no lado do dado, grade discreta, uma escala só por gráfico.
 */

export const SERIES = ['#3987e5', '#d95926', '#199e70'] as const;

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** 0, metade e topo "redondos" para a grade; `floor` é o topo mínimo. */
function niceMax(v: number, floor = 4): number {
  if (v <= floor) return floor;
  const mag = 10 ** Math.floor(Math.log10(v));
  const n = v / mag;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * mag;
}

function Tooltip({ x, width, children }: { x: number; width: number; children: ReactNode }) {
  // Fica dentro do gráfico: vira para a esquerda perto da borda direita.
  const left = Math.min(Math.max(x, 70), Math.max(70, width - 70));
  return (
    <div
      role="status"
      className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/[0.1] bg-ink-800/95 px-2.5 py-1.5 text-xs shadow-xl shadow-black/40 backdrop-blur"
      style={{ left }}
    >
      {children}
    </div>
  );
}

const PAD = { top: 28, right: 4, bottom: 24, left: 48 };

interface BarDatum {
  key: string;
  axis: string;
  title: string;
  value: number;
}

/** Uma série em barras (dias, meses). */
export function BarChart({
  data,
  color = SERIES[0],
  format = String,
  axisFormat = format,
  floor = 4,
  height = 200,
  label,
  axisEvery = 1,
}: {
  data: BarDatum[];
  color?: string;
  format?: (v: number) => string;
  /** Rótulos da grade (mais curtos que o do tooltip). */
  axisFormat?: (v: number) => string;
  /** Topo mínimo da escala (contagens: 4; dinheiro: centavos). */
  floor?: number;
  height?: number;
  label: string;
  /** Mostra o rótulo do eixo a cada N barras. */
  axisEvery?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)), floor);
  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = height - PAD.top - PAD.bottom;
  const slot = data.length ? innerW / data.length : 0;
  const barW = Math.max(2, Math.min(28, slot - Math.max(2, slot * 0.35)));
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const ticks = [0, max / 2, max];

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={label} onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,0.06)" />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-zinc-500 text-[11px] tabular-nums">
                {axisFormat(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = PAD.left + slot * i + slot / 2;
            const h = Math.max(0, y(0) - y(d.value));
            const x0 = cx - barW / 2;
            const r = Math.min(4, barW / 2, h);
            const top = y(0) - h;
            return (
              <g key={d.key}>
                {h > 0 && (
                  <path
                    d={`M${x0},${y(0)} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + barW - r} Q${x0 + barW},${top} ${x0 + barW},${top + r} V${y(0)} Z`}
                    fill={color}
                    opacity={hover == null || hover === i ? 1 : 0.45}
                  />
                )}
                {i % axisEvery === 0 && (
                  <text x={cx} y={height - 6} textAnchor="middle" className="fill-zinc-500 text-[11px]">
                    {d.axis}
                  </text>
                )}
                {/* Alvo maior que a barra. */}
                <rect
                  x={PAD.left + slot * i}
                  y={PAD.top}
                  width={slot}
                  height={innerH}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                />
              </g>
            );
          })}
        </svg>
      )}
      {hover != null && data[hover] && (
        <Tooltip x={PAD.left + slot * hover + slot / 2} width={width}>
          <p className="text-zinc-400">{data[hover].title}</p>
          <p className="mt-0.5 font-semibold tabular-nums text-white">{format(data[hover].value)}</p>
        </Tooltip>
      )}
    </div>
  );
}

/** Até três séries na mesma escala, com régua vertical no hover. */
export function LineChart({
  axis,
  titles,
  series,
  height = 200,
  label,
  axisEvery = 1,
  format = String,
  axisFormat = format,
}: {
  axis: string[];
  titles: string[];
  series: { name: string; color: string; values: number[] }[];
  format?: (v: number) => string;
  axisFormat?: (v: number) => string;
  height?: number;
  label: string;
  axisEvery?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const n = axis.length;
  const max = niceMax(Math.max(0, ...series.flatMap((s) => s.values)));
  const innerW = Math.max(0, width - PAD.left - PAD.right - 8);
  const innerH = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + 8 + (n > 1 ? (innerW * i) / (n - 1) : innerW / 2);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const ticks = [0, max / 2, max];

  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - box.left) / box.width;
    setHover(Math.max(0, Math.min(n - 1, Math.round(rel * (n - 1)))));
  };

  return (
    <div>
      <ul className="mb-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400" aria-label="Legenda">
        {series.map((s) => (
          <li key={s.name} className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
            {s.name}
          </li>
        ))}
      </ul>
      <div ref={ref} className="relative w-full" style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={label} onMouseLeave={() => setHover(null)}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,0.06)" />
                <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-zinc-500 text-[11px] tabular-nums">
                  {axisFormat(t)}
                </text>
              </g>
            ))}
            {axis.map(
              (a, i) =>
                i % axisEvery === 0 && (
                  <text key={i} x={x(i)} y={height - 6} textAnchor="middle" className="fill-zinc-500 text-[11px]">
                    {a}
                  </text>
                ),
            )}
            {hover != null && (
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={y(0)} stroke="rgba(255,255,255,0.18)" />
            )}
            {series.map((s) => (
              <g key={s.name}>
                <path
                  d={s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ')}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {hover != null && (
                  <circle cx={x(hover)} cy={y(s.values[hover] ?? 0)} r={4} fill={s.color} stroke="#111114" strokeWidth={2} />
                )}
              </g>
            ))}
            <rect
              x={PAD.left}
              y={PAD.top}
              width={Math.max(0, width - PAD.left - PAD.right)}
              height={innerH}
              fill="transparent"
              onMouseMove={onMove}
            />
          </svg>
        )}
        {hover != null && (
          <Tooltip x={x(hover)} width={width}>
            <p className="text-zinc-400">{titles[hover]}</p>
            {series.map((s) => (
              <p key={s.name} className="mt-0.5 flex items-center gap-1.5 text-zinc-300">
                <Dot color={s.color} />
                {s.name}
                <span className="ml-auto pl-3 font-semibold tabular-nums text-white">{format(s.values[hover] ?? 0)}</span>
              </p>
            ))}
          </Tooltip>
        )}
      </div>
    </div>
  );
}

/** Partes de um todo numa barra só (ex.: contas por plano). */
export function SplitBar({
  parts,
  label,
}: {
  parts: { key: string; label: string; value: number; color: string }[];
  label: string;
}) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  const visible = parts.filter((p) => p.value > 0);
  return (
    <div>
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-white/[0.04]" role="img" aria-label={label}>
        {visible.map((p) => (
          <div
            key={p.key}
            title={`${p.label}: ${p.value}`}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(p.value / total) * 100}%`, background: p.color, minWidth: 4 }}
          />
        ))}
      </div>
      <ul className="mt-4 flex flex-col gap-2.5">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center gap-2 text-sm">
            <Dot color={p.color} />
            <span className="text-zinc-300">{p.label}</span>
            <span className="ml-auto tabular-nums font-medium text-white">{p.value}</span>
            <span className="w-10 text-right tabular-nums text-xs text-zinc-500">
              {total ? `${Math.round((p.value / total) * 100)}%` : '—'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Barra fina de proporção (uso, taxa de sucesso). */
export function Meter({ value, max, color = SERIES[0] }: { value: number; max: number; color?: string }) {
  const p = max ? Math.min(1, value / max) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <div className="h-full rounded-full" style={{ width: `${p * 100}%`, background: color }} />
    </div>
  );
}
