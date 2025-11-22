"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Clock, Zap, TrendingUp, FileText, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface CallDetail {
  company: string
  duration: string
  suggestions: number
  outcome: 'Won' | 'Lost' | 'Follow-up'
  time: string
  dealValue: string
}

interface CallDetailDialogProps {
  call: CallDetail | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Mock detailed data for the call
const getCallDetails = (call: CallDetail | null) => {
  if (!call) return null

  return {
    ...call,
    contactPerson: 'Sarah Johnson',
    contactEmail: 'sarah.johnson@' + call.company.toLowerCase().replace(/\s+/g, '') + '.com',
    callStartTime: '2:30 PM',
    callEndTime: '3:' + (parseInt(call.duration) + 30) + ' PM',
    aiSuggestionsUsed: [
      { time: '2:35 PM', suggestion: 'Pricing comparison with competitors', accepted: true, impact: 'High' },
      { time: '2:42 PM', suggestion: 'Technical specifications reference', accepted: true, impact: 'Medium' },
      { time: '2:48 PM', suggestion: 'ROI calculation examples', accepted: true, impact: 'High' },
      { time: '2:55 PM', suggestion: 'Implementation timeline details', accepted: false, impact: 'Low' },
      { time: '3:01 PM', suggestion: 'Case study reference', accepted: true, impact: 'High' },
    ],
    conversationHighlights: [
      { time: '2:33 PM', type: 'question', text: 'Client asked about pricing tiers' },
      { time: '2:45 PM', type: 'objection', text: 'Concerned about implementation time' },
      { time: '2:58 PM', type: 'positive', text: 'Expressed interest in enterprise plan' },
      { time: '3:05 PM', type: 'decision', text: call.outcome === 'Won' ? 'Agreed to move forward' : call.outcome === 'Lost' ? 'Decided to explore other options' : 'Requested follow-up meeting' },
    ],
    nextSteps: call.outcome === 'Won' 
      ? ['Send contract by EOD', 'Schedule onboarding call', 'Assign account manager']
      : call.outcome === 'Lost'
      ? ['Send thank you email', 'Add to nurture campaign', 'Follow up in 3 months']
      : ['Send proposal by tomorrow', 'Schedule demo for next week', 'Prepare custom ROI analysis'],
    notes: 'Client was very engaged and asked detailed questions about our enterprise features. They have a tight timeline and need implementation within 6 weeks. Budget approved, decision maker on the call.',
  }
}

export function CallDetailDialog({ call, open, onOpenChange }: CallDetailDialogProps) {
  const details = getCallDetails(call)

  if (!details) return null

  const OutcomeIcon = details.outcome === 'Won' ? CheckCircle2 : details.outcome === 'Lost' ? XCircle : AlertCircle
  const outcomeColor = details.outcome === 'Won' 
    ? 'text-green-600 dark:text-green-400' 
    : details.outcome === 'Lost' 
    ? 'text-red-600 dark:text-red-400' 
    : 'text-yellow-600 dark:text-yellow-400'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='text-2xl flex items-center gap-3'>
            <span>{details.company}</span>
            <Badge variant='outline' className={`gap-1.5 ${outcomeColor}`}>
              <OutcomeIcon className='h-3.5 w-3.5' />
              {details.outcome}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-6 mt-4'>
          {/* Call Overview */}
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            <div className='space-y-1'>
              <p className='text-sm text-muted-foreground'>Contact</p>
              <p className='text-sm font-medium text-foreground'>{details.contactPerson}</p>
            </div>
            <div className='space-y-1'>
              <p className='text-sm text-muted-foreground'>Duration</p>
              <div className='flex items-center gap-1.5'>
                <Clock className='h-4 w-4 text-muted-foreground' />
                <p className='text-sm font-medium text-foreground'>{details.duration}</p>
              </div>
              <p className='text-xs text-muted-foreground'>{details.callStartTime} - {details.callEndTime}</p>
            </div>
            <div className='space-y-1'>
              <p className='text-sm text-muted-foreground'>Deal Value</p>
              <div className='flex items-center gap-1.5'>
                <TrendingUp className='h-4 w-4 text-muted-foreground' />
                <p className='text-sm font-medium text-foreground'>{details.dealValue}</p>
              </div>
            </div>
            <div className='space-y-1'>
              <p className='text-sm text-muted-foreground'>AI Suggestions</p>
              <div className='flex items-center gap-1.5'>
                <Zap className='h-4 w-4 text-primary' />
                <p className='text-sm font-medium text-foreground'>{details.suggestions} used</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* AI Suggestions Used */}
          <Card>
            <CardHeader>
              <CardTitle className='text-lg'>AI Suggestions Used</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-3'>
                {details.aiSuggestionsUsed.map((suggestion, index) => (
                  <div key={index} className='flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors'>
                    <div className='flex-1'>
                      <div className='flex items-center gap-2 mb-1'>
                        <span className='text-xs text-muted-foreground'>{suggestion.time}</span>
                        {suggestion.accepted ? (
                          <CheckCircle2 className='h-4 w-4 text-green-600 dark:text-green-400' />
                        ) : (
                          <XCircle className='h-4 w-4 text-red-600 dark:text-red-400' />
                        )}
                      </div>
                      <p className='text-sm font-medium text-foreground'>{suggestion.suggestion}</p>
                    </div>
                    <Badge variant={suggestion.impact === 'High' ? 'default' : suggestion.impact === 'Medium' ? 'secondary' : 'outline'}>
                      {suggestion.impact} Impact
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Conversation Highlights */}
          <Card>
            <CardHeader>
              <CardTitle className='text-lg'>Conversation Highlights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-3'>
                {details.conversationHighlights.map((highlight, index) => (
                  <div key={index} className='flex gap-3 p-3 rounded-lg border bg-card'>
                    <div className='flex-shrink-0'>
                      <span className='text-xs text-muted-foreground'>{highlight.time}</span>
                    </div>
                    <div className='flex-1'>
                      <div className='flex items-center gap-2 mb-1'>
                        <Badge variant='outline' className='text-xs'>
                          {highlight.type}
                        </Badge>
                      </div>
                      <p className='text-sm text-foreground'>{highlight.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle className='text-lg'>Next Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className='space-y-2'>
                {details.nextSteps.map((step, index) => (
                  <li key={index} className='flex items-start gap-2'>
                    <CheckCircle2 className='h-4 w-4 text-primary mt-0.5 flex-shrink-0' />
                    <span className='text-sm text-foreground'>{step}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className='text-lg flex items-center gap-2'>
                <FileText className='h-5 w-5' />
                Call Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-sm text-foreground leading-relaxed'>{details.notes}</p>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
