import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, User, UserCog, FileImage, FileVideo, FileText, ExternalLink } from "lucide-react";
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
  onClose?: () => void;
}

export const TicketConversation = ({ 
  ticketId, 
  ticketStatus, 
  ticketOwnerId, 
  imageProof,
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

  const getFilePreview = (filePath: string) => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/payment-proofs/${filePath}`;
    const ext = filePath.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '')) {
      return (
        <div className="mt-3 p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <FileImage className="h-3 w-3" /> Attachment
          </p>
          <img 
            src={url} 
            alt="Attachment" 
            className="max-w-xs rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => window.open(url, '_blank')}
          />
        </div>
      );
    }
    
    if (['mp4', 'webm', 'mov'].includes(ext || '')) {
      return (
        <div className="mt-3 p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <FileVideo className="h-3 w-3" /> Video Attachment
          </p>
          <video 
            src={url} 
            controls 
            className="max-w-xs rounded-lg"
          />
        </div>
      );
    }
    
    if (ext === 'pdf') {
      return (
        <div className="mt-3 p-3 bg-muted rounded-lg">
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:underline"
          >
            <FileText className="h-4 w-4" />
            View PDF Attachment
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      );
    }

    return (
      <div className="mt-3 p-3 bg-muted rounded-lg">
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-primary hover:underline"
        >
          View Attachment
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    );
  };

  const isOpen = ticketStatus === 'open';

  return (
    <div className="flex flex-col h-full max-h-[70vh]">
      {/* Ticket attachment preview */}
      {imageProof && (
        <div className="mb-4">
          <p className="text-sm font-medium mb-2">Original Attachment:</p>
          {getFilePreview(imageProof)}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 p-2 min-h-[200px]">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isCurrentUser = msg.user_id === currentUserId;
            const isStaffMessage = staffUserIds.has(msg.user_id);
            
            return (
              <div 
                key={msg.id} 
                className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
              >
                <Card className={`max-w-[80%] p-3 ${
                  isCurrentUser 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    {isStaffMessage ? (
                      <UserCog className="h-3 w-3" />
                    ) : (
                      <User className="h-3 w-3" />
                    )}
                    <span className="text-xs font-medium">
                      {msg.profiles?.full_name || msg.profiles?.email || 'User'}
                    </span>
                    {isStaffMessage && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">
                        Staff
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  <p className={`text-[10px] mt-1 ${
                    isCurrentUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}>
                    {format(new Date(msg.created_at), 'PP p')}
                  </p>
                </Card>
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