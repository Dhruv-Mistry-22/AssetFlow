'use client';

import React from 'react';
import { 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

// Generate dense dummy data to mimic the image
const generateDenseData = () => {
  const data = [];
  for (let i = 1; i <= 60; i++) {
    const isHighlighted = i >= 35 && i <= 45; // highlight a specific month
    data.push({
      name: `Day ${i}`,
      sales: Math.floor(Math.random() * (isHighlighted ? 40000 : 20000)) + 10000,
      isHighlighted
    });
  }
  return data;
};

const denseData = generateDenseData();

export function WeeklySalesBarChart() {
  return (
    <div className="w-full h-48 relative">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={denseData}
          margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
          barCategoryGap="10%"
        >
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={false} 
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#cbd5e1', fontSize: 10 }}
            tickFormatter={(value) => `${value / 1000}K`}
          />
          <Tooltip 
            cursor={{ fill: '#f1f5f9' }}
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
          />
          <Bar dataKey="sales" radius={[2, 2, 0, 0]} animationDuration={1000}>
            {
              denseData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.isHighlighted ? '#f97316' : '#f1f5f9'} />
              ))
            }
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      {/* Highlight Overlay Card like in the image */}
      <div className="absolute bottom-4 left-[58%] transform -translate-x-1/2 bg-orange-100/90 backdrop-blur-sm border border-orange-200 p-2 rounded-lg shadow-lg pointer-events-none">
        <p className="text-orange-900 font-bold text-sm">$25k <span className="bg-orange-500 text-white text-[8px] px-1 py-0.5 rounded ml-1">+9%</span></p>
        <p className="text-orange-700 text-[8px]">Increased this Month</p>
      </div>
    </div>
  );
}

// Minimal bar chart for the floating Total Revenue card
const revenueData = [
  { name: 'W1', value: 30 },
  { name: 'W2', value: 50 },
  { name: 'W3', value: 40 },
  { name: 'W4', value: 70 },
  { name: 'W5', value: 60 },
  { name: 'W6', value: 90 },
  { name: 'W7', value: 80 },
  { name: 'W8', value: 50 },
  { name: 'W9', value: 40 },
  { name: 'W10', value: 30 },
];

export function RevenueMinimalBarChart() {
  return (
    <div className="w-full h-16">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={revenueData} barCategoryGap="20%">
           <Bar dataKey="value" radius={[10, 10, 10, 10]}>
             {
                revenueData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index < 5 ? '#f97316' : '#e2e8f0'} />
                ))
              }
           </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
