"use client";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { TrendingUp, Target, Pencil, Plus, ChevronLeft, ChevronRight } from "lucide-react";

interface RevenueGoal {
  id: string;
  yearMonth: string;
  goal: number;
  actual: number;
  notes: string | null;
}

function formatYearMonth(ym: string) {
  const [y, m] = ym.split("-");
  return `${y}年${Number(m)}月`;
}

function currentYearMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function prevMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function RevenueTracker() {
  const [goals, setGoals] = useState<RevenueGoal[]>([]);
  const [activeYM, setActiveYM] = useState(currentYearMonth());
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ goal: "", actual: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/revenue-goals");
    setGoals(await res.json());
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const current = goals.find((g) => g.yearMonth === activeYM);
  const rate = current && current.goal > 0 ? Math.min((current.actual / current.goal) * 100, 100) : 0;
  const rateRaw = current && current.goal > 0 ? (current.actual / current.goal) * 100 : 0;

  const openDialog = () => {
    setForm({
      goal: current ? String(current.goal) : "",
      actual: current ? String(current.actual) : "",
      notes: current?.notes ?? "",
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/revenue-goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        yearMonth: activeYM,
        goal: Number(form.goal),
        actual: Number(form.actual),
        notes: form.notes || null,
      }),
    });
    setSaving(false);
    setShowDialog(false);
    fetchData();
  };

  const barColor = rateRaw >= 100 ? "bg-emerald-500" : rateRaw >= 70 ? "bg-indigo-500" : rateRaw >= 40 ? "bg-yellow-400" : "bg-red-400";
  const rateText = rateRaw >= 100 ? "text-emerald-600" : rateRaw >= 70 ? "text-indigo-600" : rateRaw >= 40 ? "text-yellow-600" : "text-red-500";

  // last 6 months for mini chart
  const chartMonths: string[] = [];
  let ym = activeYM;
  for (let i = 0; i < 6; i++) { chartMonths.unshift(ym); ym = prevMonth(ym); }
  const maxGoal = Math.max(...chartMonths.map((m) => goals.find((g) => g.yearMonth === m)?.goal ?? 0), 1);

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target size={16} className="text-indigo-500" />
              <h3 className="font-semibold text-gray-900 text-sm">収益目標トラッカー</h3>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setActiveYM(prevMonth(activeYM))} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-medium text-gray-600 w-20 text-center">{formatYearMonth(activeYM)}</span>
              <button onClick={() => setActiveYM(nextMonth(activeYM))} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {current ? (
            <>
              {/* Main numbers */}
              <div className="flex items-end justify-between mb-3">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">実績</p>
                  <p className="text-2xl font-black text-gray-900">¥{current.actual.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 mb-0.5">目標</p>
                  <p className="text-base font-bold text-gray-500">¥{current.goal.toLocaleString()}</p>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mb-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-400">達成率</span>
                  <span className={`text-sm font-bold ${rateText}`}>{rateRaw.toFixed(1)}%</span>
                </div>
                <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${rate}%` }} />
                </div>
              </div>
              {rateRaw >= 100 && (
                <p className="text-xs text-emerald-600 font-medium text-center mt-1">目標達成！</p>
              )}
              {current.notes && <p className="text-xs text-gray-400 mt-2 italic">{current.notes}</p>}
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-gray-400">この月の目標が未設定です</p>
            </div>
          )}

          {/* Mini bar chart */}
          <div className="flex items-end gap-1 mt-4 h-12">
            {chartMonths.map((m) => {
              const g = goals.find((x) => x.yearMonth === m);
              const goalH = g ? (g.goal / maxGoal) * 100 : 0;
              const actualH = g ? Math.min((g.actual / maxGoal) * 100, goalH) : 0;
              const isActive = m === activeYM;
              return (
                <button
                  key={m}
                  className="flex-1 flex flex-col items-center gap-0.5 group"
                  onClick={() => setActiveYM(m)}
                  title={formatYearMonth(m)}
                >
                  <div className="w-full relative flex items-end" style={{ height: "40px" }}>
                    {/* Goal bar (lighter) */}
                    <div
                      className={`absolute bottom-0 w-full rounded-t transition-all ${isActive ? "bg-indigo-200" : "bg-gray-100"}`}
                      style={{ height: `${goalH}%` }}
                    />
                    {/* Actual bar */}
                    <div
                      className={`absolute bottom-0 w-full rounded-t transition-all ${isActive ? "bg-indigo-500" : "bg-indigo-300"}`}
                      style={{ height: `${actualH}%` }}
                    />
                  </div>
                  <span className={`text-[9px] ${isActive ? "text-indigo-600 font-bold" : "text-gray-300"}`}>
                    {m.split("-")[1]}月
                  </span>
                </button>
              );
            })}
          </div>

          <Button variant="outline" size="sm" className="w-full mt-3 text-xs" onClick={openDialog}>
            {current ? <><Pencil size={12} /> 目標・実績を編集</> : <><Plus size={12} /> 目標を設定</>}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp size={16} className="text-indigo-500" />
              {formatYearMonth(activeYM)} の収益目標
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>月間目標金額（円）</Label>
              <Input type="number" placeholder="例: 100000" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
            </div>
            <div>
              <Label>実績金額（円）</Label>
              <Input type="number" placeholder="例: 75000" value={form.actual} onChange={(e) => setForm({ ...form, actual: e.target.value })} />
            </div>
            <div>
              <Label>メモ（任意）</Label>
              <Input placeholder="例：広告収益+案件合計" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>キャンセル</Button>
            <Button onClick={handleSave} disabled={!form.goal || saving}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
