import React from 'react';
import { Card, CardContent } from '../ui/card';

const colorClasses = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  purple: 'bg-purple-500',
  indigo: 'bg-indigo-500',
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  amber: 'bg-amber-500',
  yellow: 'bg-yellow-500'
};

export default function StatsCard({ title, value, icon: Icon, color = 'blue', trend }) {
  const bgColor = colorClasses[color] || colorClasses.blue;
  const textColor = bgColor.replace('bg-', 'text-');

  return (
    <Card className="relative overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
      <div className={`absolute top-0 right-0 w-32 h-32 ${bgColor} opacity-10 rounded-full transform translate-x-12 -translate-y-12`} />
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <h3 className="text-3xl font-bold mt-2 text-gray-900">{value}</h3>
            {trend && (
              <p className="text-xs text-gray-500 mt-2">{trend}</p>
            )}
          </div>
          <div className={`p-3 ${bgColor} bg-opacity-20 rounded-xl`}>
            <Icon className={`w-6 h-6 ${textColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}