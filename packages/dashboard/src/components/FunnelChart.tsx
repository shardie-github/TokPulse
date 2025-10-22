import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from 'recharts';
import { useStore } from '../state/store';
export const FunnelChart = () => {
  const funnel = useStore((s) => s.funnel);
  return (
    <div className="card p-4">
      <div className="font-medium mb-2">Sales Funnel</div>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={funnel}>
            <XAxis dataKey="stage" />
            <Tooltip />
            <Bar dataKey="value" radius={[10, 10, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
