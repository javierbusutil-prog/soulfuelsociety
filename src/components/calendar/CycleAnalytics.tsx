import { useState } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { BarChart3, Droplet, TrendingUp, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { CycleEntry } from '@/hooks/useCycleTracker';

interface CycleAnalyticsProps {
  analytics: {
    totalPeriods: number;
    avgPeriodLength: number;
    periodLengths: number[];
    avgCycleLength: number | null;
    cycleLengths: number[];
    topSymptoms: [string, number][];
  } | null;
  periodClusters: { start: string; end: string; days: string[] }[];
  prediction: {
    nextPeriodStart: Date;
    nextPeriodEnd: Date;
    lastPeriodStart: Date;
    ovulationDay: Date;
    fertileWindowStart: Date;
    fertileWindowEnd: Date;
  } | null;
}

export function CycleAnalytics({ analytics, periodClusters, prediction }: CycleAnalyticsProps) {
  const [showHistory, setShowHistory] = useState(false);

  if (!analytics) {
    return (
      <Card className="p-5 text-center text-muted-foreground">
        <Droplet className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">Log period days to see cycle analytics</p>
      </Card>
    );
  }

  const maxPeriodLength = Math.max(...analytics.periodLengths, 1);
  const maxCycleLength = analytics.cycleLengths.length > 0 ? Math.max(...analytics.cycleLengths, 1) : 1;

  return (
    <div className="space-y-3">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
              </div>
              <span className="text-xs text-muted-foreground">Avg Cycle</span>
            </div>
            <p className="text-xl font-semibold font-display tracking-editorial">
              {analytics.avgCycleLength ? `${analytics.avgCycleLength}` : '—'}
              <span className="text-sm font-sans font-normal text-muted-foreground ml-1">days</span>
            </p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                <Droplet className="w-3.5 h-3.5 text-rose-500" fill="currentColor" />
              </div>
              <span className="text-xs text-muted-foreground">Avg Period</span>
            </div>
            <p className="text-xl font-semibold font-display tracking-editorial">
              {analytics.avgPeriodLength}
              <span className="text-sm font-sans font-normal text-muted-foreground ml-1">days</span>
            </p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                <Calendar className="w-3.5 h-3.5 text-rose-500" />
              </div>
              <span className="text-xs text-muted-foreground">Total Periods</span>
            </div>
            <p className="text-xl font-semibold font-display tracking-editorial">
              {analytics.totalPeriods}
            </p>
          </Card>
        </motion.div>

        {prediction && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                  <BarChart3 className="w-3.5 h-3.5 text-rose-500" />
                </div>
                <span className="text-xs text-muted-foreground">Next Period</span>
              </div>
              <p className="text-sm font-semibold">
                {format(prediction.nextPeriodStart, 'MMM d')}
              </p>
              <p className="text-xs text-muted-foreground">
                in {differenceInDays(prediction.nextPeriodStart, new Date())} days
              </p>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Fertile Window & Ovulation */}
      {prediction && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
        >
          <Card className="p-4">
            <h4 className="text-sm font-medium mb-3">Fertility Estimates</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <span className="text-xs">🥚</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Estimated Ovulation</p>
                  <p className="text-sm font-semibold">
                    {format(prediction.ovulationDay, 'MMM d')}
                    <span className="text-xs font-normal text-muted-foreground ml-1.5">
                      ({differenceInDays(prediction.ovulationDay, new Date()) > 0
                        ? `in ${differenceInDays(prediction.ovulationDay, new Date())} days`
                        : `${Math.abs(differenceInDays(prediction.ovulationDay, new Date()))} days ago`})
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                  <span className="text-xs">🌱</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Fertile Window</p>
                  <p className="text-sm font-semibold">
                    {format(prediction.fertileWindowStart, 'MMM d')} – {format(prediction.fertileWindowEnd, 'MMM d')}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Period Length Trend */}
      {analytics.periodLengths.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="p-4">
            <h4 className="text-sm font-medium mb-3">Period Length Trend</h4>
            <div className="flex items-end gap-1 h-16">
              {analytics.periodLengths.map((len, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-rose-400 dark:bg-rose-500 rounded-t-sm min-h-[4px]"
                    style={{ height: `${(len / maxPeriodLength) * 100}%` }}
                  />
                  <span className="text-[10px] text-muted-foreground">{len}d</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Cycle Length Trend */}
      {analytics.cycleLengths.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-4">
            <h4 className="text-sm font-medium mb-3">Cycle Length Trend</h4>
            <div className="flex items-end gap-1 h-16">
              {analytics.cycleLengths.map((len, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-primary/60 rounded-t-sm min-h-[4px]"
                    style={{ height: `${(len / maxCycleLength) * 100}%` }}
                  />
                  <span className="text-[10px] text-muted-foreground">{len}d</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Top Symptoms */}
      {analytics.topSymptoms.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="p-4">
            <h4 className="text-sm font-medium mb-3">Common Symptoms</h4>
            <div className="space-y-2">
              {analytics.topSymptoms.map(([symptom, count]) => {
                const maxCount = analytics.topSymptoms[0][1];
                return (
                  <div key={symptom} className="flex items-center gap-2">
                    <span className="text-xs w-28 truncate text-muted-foreground">{symptom}</span>
                    <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-rose-400 dark:bg-rose-500 rounded-full transition-all"
                        style={{ width: `${(count / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Cycle History */}
      {periodClusters.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-4">
            <button
              className="w-full flex items-center justify-between"
              onClick={() => setShowHistory(!showHistory)}
            >
              <h4 className="text-sm font-medium">Cycle History</h4>
              {showHistory ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            {showHistory && (
              <div className="mt-3 space-y-2">
                {[...periodClusters].reverse().map((cluster, i) => {
                  const startDate = parseISO(cluster.start);
                  const endDate = parseISO(cluster.end);
                  const duration = cluster.days.length;

                  return (
                    <div
                      key={cluster.start}
                      className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {format(startDate, 'MMM d')} – {format(endDate, 'MMM d, yyyy')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {duration} day{duration !== 1 ? 's' : ''}
                          {i < periodClusters.length - 1 && (
                            <> · Cycle: {differenceInDays(
                              parseISO([...periodClusters].reverse()[i > 0 ? i - 1 : 0].start),
                              startDate
                            ) * -1} days</>
                          )}
                        </p>
                      </div>
                      <div className="flex gap-0.5">
                        {cluster.days.map((_, di) => (
                          <div key={di} className="w-2 h-2 rounded-full bg-rose-400" />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </motion.div>
      )}
    </div>
  );
}
