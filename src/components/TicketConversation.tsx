import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, User, UserCog } from "lucide-react";
import { FilePreview } from "@/components/FilePreview";
import { format } from "date-fns";

interface Message {
  id: string;
  message: string;
  user_id: string;
  created_at: string;
  profiles?: { full_name: string | null; email: string } | null;
  isStaff?: boolean;
}

interface TicketConversationProps {
  ticketId: string;
  ticketStatus: string;
  ticketOwnerId: string;
  imageProof?: string | null;
  viewerRole?: 'owner' | 'staff'; // owner = customer viewing their ticket, staff = admin/staff viewing
  onClose?: () => void;
}

export const TicketConversation = ({ 
  ticketId, 
  ticketStatus, 
  ticketOwnerId, 
  imageProof,
  viewerRole = 'owner',
  onClose 
}: TicketConversationProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [staffUserIds, setStaffUserIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
      fetchMessages();
      fetchStaffUsers();
    };
    initData();

    // Realtime subscription
    const channel = supabase
      .channel(`ticket-messages-${ticketId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'ticket_messages',
        filter: `ticket_id=eq.${ticketId}`
      }, () => fetchMessages())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchStaffUsers = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "staff"]);
    if (data) {
      setStaffUserIds(new Set(data.map(r => r.user_id)));
    }
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("ticket_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return;
    }

    // Fetch profiles
    const userIds = [...new Set(data?.map(m => m.user_id) || [])];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    
    const enrichedMessages = (data || []).map(m => ({
      ...m,
      profiles: profileMap.get(m.user_id) || null
    }));

    setMessages(enrichedMessages);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !currentUserId) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from("ticket_messages")
        .insert({
          ticket_id: ticketId,
          user_id: currentUserId,
          message: newMessage.trim()
        });

      if (error) throw error;
      setNewMessage("");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };


  const isOpen = ticketStatus === 'open';

  return (
    <div className="flex flex-col h-full max-h-[70vh]">
      {/* Ticket attachment preview */}
      {imageProof && (
        <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-border/50">
          <p className="text-sm font-medium mb-2 text-muted-foreground">Original Attachment:</p>
          <FilePreview filePath={imageProof} />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 p-3 sm:p-4 min-h-[200px] bg-muted/30 rounded-lg border border-border/50">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-sm">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isStaffMessage = staffUserIds.has(msg.user_id);
            const isTicketOwnerMessage = msg.user_id === ticketOwnerId;
            
            // Determine alignment based on viewer role
            // If viewer is owner: owner messages on right, staff on left
            // If viewer is staff: staff messages on right, owner on left
            const isRightAligned = viewerRole === 'owner' 
              ? isTicketOwnerMessage 
              : isStaffMessage;
            
            return (
              <div 
                key={msg.id} 
                className={`flex ${isRightAligned ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] sm:max-w-[75%] p-2.5 sm:p-3 rounded-xl shadow-sm ${
                  isRightAligned 
                    ? 'bg-primary text-primary-foreground rounded-br-sm' 
                    : 'bg-card border border-border rounded-bl-sm'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    {isStaffMessage ? (
                      <UserCog className="h-3 w-3 flex-shrink-0" />
                    ) : (
                      <User className="h-3 w-3 flex-shrink-0" />
                    )}
                    <span className="text-xs font-medium truncate">
                      {msg.profiles?.full_name || msg.profiles?.email || 'User'}
                    </span>
                    {isStaffMessage && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0 flex-shrink-0">
                        Staff
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                  <p className={`text-[10px] mt-1.5 ${
                    isRightAligned ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}>
                    {format(new Date(msg.created_at), 'PP p')}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {isOpen ? (
        <div className="pt-4 border-t mt-4">
          <div className="flex gap-2">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              rows={2}
              className="resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button 
              onClick={handleSend} 
              disabled={sending || !newMessage.trim()}
              size="icon"
              className="h-auto"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      ) : (
        <div className="pt-4 border-t mt-4 text-center">
          <Badge variant="secondary">Ticket is {ticketStatus}</Badge>
          <p className="text-xs text-muted-foreground mt-2">
            This ticket is no longer accepting messages
          </p>
        </div>
      )}
    </div>
  );
};