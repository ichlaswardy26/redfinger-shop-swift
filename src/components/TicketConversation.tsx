import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, User, UserCog, MessageSquare } from "lucide-react";
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
  viewerRole?: 'owner' | 'staff';
  onClose?: () => void;
}

// Helper to get initials from name/email
const getInitials = (name: string | null | undefined, email: string | undefined): string => {
  if (name) {
    const parts = name.split(' ');
    return parts.length > 1 
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() 
      : name.slice(0, 2).toUpperCase();
  }
  return email ? email.slice(0, 2).toUpperCase() : 'U';
};

export const TicketConversation = ({ 
  ticketId, 
  ticketStatus, 
  ticketOwnerId, 
  viewerRole = 'owner',
}: TicketConversationProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<{ full_name: string | null; email: string } | null>(null);
  const [staffUserIds, setStaffUserIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        // Fetch current user profile for avatar
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", user.id)
          .single();
        if (profile) setCurrentUserProfile(profile);
      }
      fetchMessages();
      fetchStaffUsers();
    };
    initData();

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
    <div className="flex flex-col h-full max-h-[60vh]">
      {/* Messages Container with Glass Effect */}
      <div className="flex-1 overflow-y-auto space-y-3 p-4 min-h-[200px] bg-gradient-to-b from-muted/20 to-muted/40 backdrop-blur-sm rounded-xl border-2 border-border/30 shadow-inner">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-muted-foreground py-12 space-y-3">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center border-2 border-border/30">
              <MessageSquare className="h-8 w-8" />
            </div>
            <div className="text-center">
              <p className="font-medium">No messages yet</p>
              <p className="text-sm">Start the conversation below!</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isStaffMessage = staffUserIds.has(msg.user_id);
            const isTicketOwnerMessage = msg.user_id === ticketOwnerId;
            const isRightAligned = viewerRole === 'owner' 
              ? isTicketOwnerMessage 
              : isStaffMessage;
            
            const initials = getInitials(msg.profiles?.full_name, msg.profiles?.email);
            
            return (
              <div 
                key={msg.id} 
                className={`flex items-end gap-2 ${isRightAligned ? 'justify-end' : 'justify-start'}`}
              >
                {/* Avatar for left-aligned messages */}
                {!isRightAligned && (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    isStaffMessage 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted border-2 border-border text-muted-foreground'
                  }`}>
                    {isStaffMessage ? <UserCog className="h-4 w-4" /> : initials}
                  </div>
                )}
                
                {/* Message Bubble */}
                <div className={`max-w-[80%] sm:max-w-[70%] ${
                  isRightAligned 
                    ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-2xl rounded-br-md shadow-brutal-sm' 
                    : 'bg-card border-2 border-border border-l-4 border-l-primary rounded-2xl rounded-bl-md shadow-brutal-sm'
                }`}>
                  <div className="p-3">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-bold truncate">
                        {msg.profiles?.full_name || msg.profiles?.email || 'User'}
                      </span>
                      {isStaffMessage && (
                        <Badge 
                          variant="secondary" 
                          className={`text-[10px] px-1.5 py-0 h-4 ${
                            isRightAligned 
                              ? 'bg-primary-foreground/20 text-primary-foreground border-0' 
                              : 'bg-primary/10 text-primary border-0'
                          }`}
                        >
                          Staff
                        </Badge>
                      )}
                    </div>
                    
                    {/* Message Content */}
                    <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.message}</p>
                    
                    {/* Timestamp */}
                    <p className={`text-[10px] mt-2 ${
                      isRightAligned ? 'text-primary-foreground/60' : 'text-muted-foreground'
                    }`}>
                      {format(new Date(msg.created_at), 'PP p')}
                    </p>
                  </div>
                </div>
                
                {/* Avatar for right-aligned messages */}
                {isRightAligned && (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    isStaffMessage 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-accent border-2 border-border text-accent-foreground'
                  }`}>
                    {isStaffMessage ? <UserCog className="h-4 w-4" /> : initials}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {isOpen ? (
        <div className="pt-4 mt-4 border-t-2 border-border/30">
          <div className="flex items-start gap-3">
            {/* Current User Avatar */}
            <div className="w-10 h-10 rounded-full bg-accent border-2 border-border flex items-center justify-center text-sm font-bold text-accent-foreground flex-shrink-0 shadow-brutal-sm">
              {currentUserProfile 
                ? getInitials(currentUserProfile.full_name, currentUserProfile.email)
                : <User className="h-5 w-5" />
              }
            </div>
            
            {/* Input + Send */}
            <div className="flex-1 flex gap-2">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                rows={2}
                className="resize-none flex-1 border-2 border-border shadow-brutal-sm focus:shadow-brutal transition-all"
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
                className="h-auto min-h-[60px] w-12 bg-gradient-to-r from-primary to-primary/80 shadow-brutal-sm hover:shadow-brutal disabled:opacity-50"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 ml-[52px]">
            Press Enter to send • Shift+Enter for new line
          </p>
        </div>
      ) : (
        <div className="pt-4 mt-4 border-t-2 border-border/30 text-center">
          <Badge variant="secondary" className="text-sm px-4 py-1.5 shadow-brutal-sm">
            Ticket is {ticketStatus}
          </Badge>
          <p className="text-xs text-muted-foreground mt-3">
            This ticket is no longer accepting messages
          </p>
        </div>
      )}
    </div>
  );
};