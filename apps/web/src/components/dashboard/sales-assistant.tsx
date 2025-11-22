"use client";

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Zap, TrendingUp, FileText, PhoneCall, Clock, Target } from 'lucide-react'
import { Line, LineChart, Pie, PieChart, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { Progress } from '@/components/ui/progress'
import { CallDetailDialog } from './call-detail-dialog'

// Personal performance data
const myCallsData = [
  { name: 'Mon', calls: 3, converted: 1, winRate: 33 },
  { name: 'Tue', calls: 5, converted: 3, winRate: 60 },
  { name: 'Wed', calls: 4, converted: 2, winRate: 50 },
  { name: 'Thu', calls: 6, converted: 4, winRate: 67 },
  { name: 'Fri', calls: 7, converted: 5, winRate: 71 },
  { name: 'Sat', calls: 2, converted: 1, winRate: 50 },
  { name: 'Sun', calls: 1, converted: 0, winRate: 0 },
]

// Call outcomes distribution - brighter colors for dark mode
const callOutcomes = [
  { name: 'Won', value: 16, color: '#22c55e' }, // bright green
  { name: 'Lost', value: 6, color: '#ef4444' }, // bright red
  { name: 'Follow-up', value: 6, color: '#f59e0b' }, // bright amber
]

// My recent calls
const myRecentCalls = [
  { company: 'Acme Corp', duration: '28m', suggestions: 12, outcome: 'Won' as const, time: '2h ago', dealValue: '$45K' },
  { company: 'TechStart Inc', duration: '18m', suggestions: 8, outcome: 'Follow-up' as const, time: '3h ago', dealValue: '$32K' },
  { company: 'Global Solutions', duration: '35m', suggestions: 15, outcome: 'Won' as const, time: '4h ago', dealValue: '$67K' },
  { company: 'Innovation Labs', duration: '22m', suggestions: 9, outcome: 'Lost' as const, time: '5h ago', dealValue: '$28K' },
  { company: 'Future Systems', duration: '31m', suggestions: 14, outcome: 'Won' as const, time: '6h ago', dealValue: '$52K' },
  { company: 'Quantum Corp', duration: '25m', suggestions: 11, outcome: 'Won' as const, time: '1d ago', dealValue: '$38K' },
  { company: 'DataSync Ltd', duration: '19m', suggestions: 7, outcome: 'Follow-up' as const, time: '1d ago', dealValue: '$41K' },
]

// Personal goals
const personalGoals = [
  { goal: 'Monthly Calls', current: 28, target: 40, unit: 'calls' },
  { goal: 'Win Rate', current: 57, target: 65, unit: '%' },
  { goal: 'Revenue', current: 224000, target: 300000, unit: '$' },
  { goal: 'AI Acceptance', current: 87, target: 90, unit: '%' },
]

export function SalesAssistant() {
  const [selectedCall, setSelectedCall] = useState<typeof myRecentCalls[0] | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleCallClick = (call: typeof myRecentCalls[0]) => {
    setSelectedCall(call)
    setDialogOpen(true)
  }

  return (
    <div className='space-y-4'>
      {/* Stat Cards Row */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {/* My Calls Today */}
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>My Calls Today</CardTitle>
            <PhoneCall className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-foreground'>7</div>
            <p className='text-xs text-muted-foreground'>
              <span className='text-green-600 dark:text-green-400'>+2</span> from yesterday
            </p>
          </CardContent>
        </Card>

        {/* AI Acceptance Rate */}
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>AI Acceptance</CardTitle>
            <Zap className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-foreground'>87%</div>
            <p className='text-xs text-muted-foreground'>
              <span className='text-green-600 dark:text-green-400'>+5.2%</span> from last week
            </p>
          </CardContent>
        </Card>

        {/* My Revenue */}
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>My Revenue</CardTitle>
            <TrendingUp className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-foreground'>$224K</div>
            <p className='text-xs text-muted-foreground'>
              <span className='text-green-600 dark:text-green-400'>+18%</span> this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Second Row - More Stats */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        {/* Avg Call Duration */}
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Avg Call Duration</CardTitle>
            <Clock className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-foreground'>26m</div>
            <p className='text-xs text-muted-foreground'>
              Optimal range
            </p>
          </CardContent>
        </Card>

        {/* Suggestions Generated */}
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Suggestions Today</CardTitle>
            <Zap className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-foreground'>32</div>
            <p className='text-xs text-muted-foreground'>
              Avg 4.6 per call
            </p>
          </CardContent>
        </Card>

        {/* Conversion Rate */}
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Conversion Rate</CardTitle>
            <Target className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-foreground'>57%</div>
            <p className='text-xs text-muted-foreground'>
              <span className='text-green-600 dark:text-green-400'>+12%</span> with AI
            </p>
          </CardContent>
        </Card>

        {/* Documents Indexed */}
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Documents</CardTitle>
            <FileText className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-foreground'>156</div>
            <p className='text-xs text-muted-foreground'>
              Last synced 2h ago
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className='grid gap-4 md:grid-cols-2'>
        {/* My Performance Trend */}
        <Card>
          <CardHeader>
            <CardTitle>My Performance Trend</CardTitle>
            <p className='text-sm text-muted-foreground'>
              Weekly win rate and call volume
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width='100%' height={300}>
              <LineChart data={myCallsData}>
                <CartesianGrid strokeDasharray='3 3' stroke='hsl(var(--border))' opacity={0.5} />
                <XAxis 
                  dataKey='name' 
                  stroke='#888888'
                  tick={{ fill: '#888888' }}
                  style={{ fontSize: '12px' }}
                  axisLine={{ stroke: '#888888', strokeWidth: 1.5 }}
                  tickLine={{ stroke: '#888888' }}
                />
                <YAxis 
                  stroke='#888888'
                  tick={{ fill: '#888888' }}
                  style={{ fontSize: '12px' }}
                  axisLine={{ stroke: '#888888', strokeWidth: 1.5 }}
                  tickLine={{ stroke: '#888888' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--popover-foreground))',
                  }}
                  labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                />
                <Line 
                  type='monotone' 
                  dataKey='winRate' 
                  stroke='#3b82f6' 
                  strokeWidth={4}
                  dot={{ fill: '#3b82f6', r: 5, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 7 }}
                  name='Win Rate %'
                />
                <Line 
                  type='monotone' 
                  dataKey='calls' 
                  stroke='#10b981' 
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 4, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                  name='Calls'
                />
              </LineChart>
            </ResponsiveContainer>
            <div className='mt-4 flex justify-center gap-6 text-sm'>
              <div className='flex items-center gap-2'>
                <div className='h-3 w-3 rounded-full' style={{ backgroundColor: '#3b82f6' }} />
                <span className='text-foreground font-medium'>Win Rate %</span>
              </div>
              <div className='flex items-center gap-2'>
                <div className='h-3 w-3 rounded-full' style={{ backgroundColor: '#10b981' }} />
                <span className='text-foreground font-medium'>Calls</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call Outcomes Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Call Outcomes</CardTitle>
            <p className='text-sm text-muted-foreground'>
              Distribution of my call results
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width='100%' height={300}>
              <PieChart>
                <Pie
                  data={callOutcomes}
                  cx='50%'
                  cy='50%'
                  labelLine={false}
                  label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill='#8884d8'
                  dataKey='value'
                  stroke='#1f2937'
                  strokeWidth={3}
                >
                  {callOutcomes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--popover-foreground))',
                  }}
                  labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className='mt-4 flex justify-center gap-4 text-sm'>
              {callOutcomes.map((outcome) => (
                <div key={outcome.name} className='flex items-center gap-2'>
                  <div className='h-3 w-3 rounded-full' style={{ backgroundColor: outcome.color }} />
                  <span className='text-foreground font-medium'>{outcome.name}: {outcome.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Personal Goals */}
      <Card>
          <CardHeader>
            <CardTitle>My Goals Progress</CardTitle>
            <p className='text-sm text-muted-foreground'>
              Track your monthly targets
            </p>
          </CardHeader>
          <CardContent>
            <div className='space-y-6'>
              {personalGoals.map((goal, index) => {
                const percentage = (goal.current / goal.target) * 100
                const displayCurrent = goal.unit === '$' ? `$${(goal.current / 1000).toFixed(0)}K` : `${goal.current}${goal.unit === '%' ? '%' : ''}`
                const displayTarget = goal.unit === '$' ? `$${(goal.target / 1000).toFixed(0)}K` : `${goal.target}${goal.unit === '%' ? '%' : ''}`
                
                return (
                  <div key={index} className='space-y-2'>
                    <div className='flex items-center justify-between'>
                      <p className='text-sm font-medium text-foreground'>{goal.goal}</p>
                      <p className='text-sm text-muted-foreground'>
                        {displayCurrent} / {displayTarget}
                      </p>
                    </div>
                    <Progress value={percentage} className='h-2' />
                    <p className='text-xs text-muted-foreground'>
                      {percentage.toFixed(0)}% complete
                    </p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

      {/* My Recent Calls */}
      <Card>
        <CardHeader>
          <CardTitle>My Recent Calls</CardTitle>
          <p className='text-sm text-muted-foreground'>
            Your latest call history and outcomes
          </p>
        </CardHeader>
        <CardContent>
          <div className='rounded-md border'>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead>
                  <tr className='border-b bg-muted/50'>
                    <th className='h-12 px-4 text-left align-middle font-medium text-muted-foreground'>
                      Company
                    </th>
                    <th className='h-12 px-4 text-left align-middle font-medium text-muted-foreground'>
                      Duration
                    </th>
                    <th className='h-12 px-4 text-left align-middle font-medium text-muted-foreground'>
                      AI Suggestions
                    </th>
                    <th className='h-12 px-4 text-left align-middle font-medium text-muted-foreground'>
                      Deal Value
                    </th>
                    <th className='h-12 px-4 text-left align-middle font-medium text-muted-foreground'>
                      Outcome
                    </th>
                    <th className='h-12 px-4 text-left align-middle font-medium text-muted-foreground'>
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {myRecentCalls.map((call, index) => (
                    <tr 
                      key={index} 
                      className='border-b transition-colors hover:bg-muted/50 cursor-pointer'
                      onClick={() => handleCallClick(call)}
                    >
                      <td className='p-4 align-middle'>
                        <div className='font-medium text-foreground'>{call.company}</div>
                      </td>
                      <td className='p-4 align-middle'>
                        <div className='flex items-center gap-1.5'>
                          <Clock className='h-3.5 w-3.5 text-muted-foreground' />
                          <span className='text-sm'>{call.duration}</span>
                        </div>
                      </td>
                      <td className='p-4 align-middle'>
                        <div className='flex items-center gap-1.5'>
                          <Zap className='h-3.5 w-3.5 text-primary' />
                          <span className='text-sm'>{call.suggestions} used</span>
                        </div>
                      </td>
                      <td className='p-4 align-middle'>
                        <span className='text-sm font-medium text-foreground'>{call.dealValue}</span>
                      </td>
                      <td className='p-4 align-middle'>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          call.outcome === 'Won' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : call.outcome === 'Lost'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                          {call.outcome}
                        </span>
                      </td>
                      <td className='p-4 align-middle'>
                        <span className='text-sm text-muted-foreground'>{call.time}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      <CallDetailDialog 
        call={selectedCall}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}
