"use client";

import { useEffect, useRef } from "react";
import type { MetricsTick } from "@/lib/architecture/types";

type MetricKey = keyof Pick<
  MetricsTick,
  "rps" | "successRate" | "avgLatency" | "p99Latency"
>;

interface Props {
  data: MetricsTick[];
  metric: MetricKey;
  color?: string;
  height?: number;
  /** Optional second metric to overlay (e.g. p99 over avg) */
  overlayMetric?: MetricKey;
  overlayColor?: string;
}

function resolveColor(input: string, el: Element): string {
  const match = input.match(/^var\((--[\w-]+)\)$/);
  if (!match) return input;
  const value = getComputedStyle(el).getPropertyValue(match[1]).trim();
  return value || input;
}

const METRIC_RANGES: Record<MetricKey, { min: number; max: number }> = {
  rps: { min: 0, max: 0 },
  successRate: { min: 0, max: 1 },
  avgLatency: { min: 0, max: 0 },
  p99Latency: { min: 0, max: 0 },
};

export function MetricsChart({
  data,
  metric,
  color = "var(--primary)",
  height = 80,
  overlayMetric,
  overlayColor = "var(--destructive)",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, height);
    if (data.length < 2) {
      ctx.fillStyle = "rgba(120,120,120,0.6)";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Waiting for data…", rect.width / 2, height / 2 + 4);
      return;
    }

    const values = data.map((d) => d[metric]);
    const overlayValues = overlayMetric ? data.map((d) => d[overlayMetric]) : [];
    const range = METRIC_RANGES[metric];
    const min = range.min;
    const computedMax = Math.max(
      ...values,
      ...overlayValues,
      range.max || 1
    );
    const max = range.max || computedMax;
    const padX = 4;
    const padY = 6;
    const drawableW = rect.width - padX * 2;
    const drawableH = height - padY * 2;

    const xStep = drawableW / Math.max(1, data.length - 1);

    const computePoints = (vals: number[]) =>
      vals.map((v, i) => ({
        x: padX + i * xStep,
        y:
          padY +
          drawableH -
          ((v - min) / (max - min || 1)) * drawableH,
      }));

    const points = computePoints(values);
    const resolved = resolveColor(color, container);
    const gradient = ctx.createLinearGradient(0, padY, 0, height);
    gradient.addColorStop(0, resolved);
    gradient.addColorStop(1, "rgba(0,0,0,0)");

    ctx.beginPath();
    ctx.moveTo(points[0].x, height);
    for (const p of points) {
      ctx.lineTo(p.x, p.y);
    }
    ctx.lineTo(points[points.length - 1].x, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.globalAlpha = 0.25;
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.strokeStyle = resolved;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.stroke();

    const last = points[points.length - 1];
    ctx.beginPath();
    ctx.arc(last.x, last.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = resolved;
    ctx.fill();

    if (overlayMetric && overlayValues.length > 0) {
      const overlayPoints = computePoints(overlayValues);
      const overlayResolved = resolveColor(overlayColor, container);
      ctx.beginPath();
      ctx.moveTo(overlayPoints[0].x, overlayPoints[0].y);
      for (let i = 1; i < overlayPoints.length; i++) {
        ctx.lineTo(overlayPoints[i].x, overlayPoints[i].y);
      }
      ctx.strokeStyle = overlayResolved;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [data, metric, color, height, overlayMetric, overlayColor]);

  return (
    <div ref={containerRef} className="relative w-full" style={{ height }}>
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
