import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, 
  User, 
  MessageSquare, 
  Paperclip, 
  Image,
  Send,
  Calendar,
  CheckCircle
} from 'lucide-react';

interface TicketDetailViewProps {
  ticket: any;
  onAddComment: (comment: string) => void;
  onClose: () => void;
}

export function TicketDetailView({ ticket, onAddComment, onClose }: TicketDetailViewProps) {
  const [newComment, setNewComment] = useState('');

  const handleSubmitComment = () => {
    if (newComment.trim()) {
      onAddComment(newComment);
      setNewComment('');
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{ticket.title}</h2>
          <p className="text-muted-foreground">Ticket #{ticket.ticket_number}</p>
        </div>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Issue Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{ticket.description}</p>
              
              {ticket.attachments && ticket.attachments.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Attachments</h4>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {ticket.attachments.map((attachment: string, index: number) => (
                      <div key={index} className="flex items-center gap-2 p-2 border rounded">
                        <Image className="h-4 w-4" />
                        <span className="text-sm">{attachment}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Communication History</CardTitle>
              <CardDescription>Updates and comments on this ticket</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {ticket.comments && ticket.comments.length > 0 ? (
                ticket.comments.map((comment: any) => (
                  <div key={comment.id} className="flex gap-3 p-3 border rounded-lg">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{comment.author}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{comment.message}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <MessageSquare className="mx-auto h-8 w-8 mb-2" />
                  <p>No comments yet</p>
                </div>
              )}

              {ticket.status !== 'resolved' && (
                <div className="border-t pt-4">
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Add a comment or provide additional information..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={3}
                    />
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button variant="outline" size="sm">
                          <Paperclip className="h-4 w-4 mr-1" />
                          Attach File
                        </Button>
                        <Button variant="outline" size="sm">
                          <Image className="h-4 w-4 mr-1" />
                          Add Image
                        </Button>
                      </div>
                      <Button onClick={handleSubmitComment} disabled={!newComment.trim()}>
                        <Send className="h-4 w-4 mr-1" />
                        Send Comment
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ticket Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge className={getStatusColor(ticket.status)}>
                    {ticket.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Priority</label>
                <div className="mt-1">
                  <Badge className={getPriorityColor(ticket.priority)}>
                    {ticket.priority.toUpperCase()}
                  </Badge>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created</label>
                <div className="mt-1 flex items-center text-sm">
                  <Calendar className="h-4 w-4 mr-1" />
                  {new Date(ticket.created_at).toLocaleString()}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                <div className="mt-1 flex items-center text-sm">
                  <Clock className="h-4 w-4 mr-1" />
                  {new Date(ticket.updated_at).toLocaleDateString()}
                </div>
              </div>
              
              {(ticket.status === 'resolved' || ticket.status === 'closed') && ticket.resolved_at && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Resolved</label>
                  <div className="mt-1 flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    {new Date(ticket.resolved_at).toLocaleString()}
                  </div>
                </div>
              )}
              
              {ticket.work_started_at && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Work Started</label>
                  <div className="mt-1 flex items-center text-sm">
                    <Clock className="h-4 w-4 mr-1" />
                    {new Date(ticket.work_started_at).toLocaleString()}
                  </div>
                </div>
              )}
              
              {ticket.work_completed_at && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Work Completed</label>
                  <div className="mt-1 flex items-center text-sm">
                    <Clock className="h-4 w-4 mr-1" />
                    {new Date(ticket.work_completed_at).toLocaleString()}
                  </div>
                </div>
              )}
              
              {ticket.sla_hours && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">SLA Hours</label>
                  <div className="mt-1 text-sm">
                    {ticket.sla_hours} hours
                  </div>
                </div>
              )}
              
              {ticket.work_duration_hours && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Work Duration</label>
                  <div className="mt-1 text-sm">
                    {ticket.work_duration_hours.toFixed(2)} hours
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <MessageSquare className="h-4 w-4 mr-2" />
                Email Updates
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Paperclip className="h-4 w-4 mr-2" />
                Add Attachment
              </Button>
              {ticket.status !== 'resolved' && (
                <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700">
                  Cancel Request
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}