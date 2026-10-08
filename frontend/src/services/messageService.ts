import { supabase } from './supabaseClient';
export interface Message {
  id: string;
  job_id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  message_type: 'text' | 'job_card' | 'image' | 'audio' | 'part_card';
  metadata: JobCardMetadata | AttachmentMetadata | PartCardMetadata | null;
  created_at: string;
  is_read: boolean;
}
export interface AttachmentMetadata {
  durationSeconds?: number;
}
export interface PartCardMetadata {
  orderId: number;
  partId: number;
  partName: string;
  imageUrl?: string | null;
  price: number;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'COMPLETED';
  buyerId: number;
  sellerId: number;
  proposedPrice?: number | null;
  proposedByUserId?: number | null;
  isPaid?: boolean;
}
export interface JobCardMetadata {
  jobId: number;
  title: string;
  description: string;
  jobType: string;
  location?: string;
  scheduledDate?: string | null;
  estimatedCost?: number | null;
  finalCost?: number | null;
  status: string;
  proposedCost?: number | null;
  proposedScheduledDate?: string | null;
  proposedNote?: string | null;
  proposedByMechanicId?: number | null;
  mechanicId?: number | null;
  isPaid?: boolean;
  biddingCost?: number | null;
  biddingNote?: string | null;
  biddingByUserId?: number | null;
}

const buildJobCardSummary = (meta: JobCardMetadata): string => {
  switch (meta.status) {
    case 'PENDING':
      return meta.proposedByMechanicId ? `🔧 Proposed changes: ${meta.title}` : `📋 New Job Request: ${meta.title}`;
    case 'ACCEPTED':
      return `✅ Job accepted: ${meta.title}`;
    case 'IN_PROGRESS':
      return `🔧 Job in progress: ${meta.title}`;
    case 'COMPLETED':
      return meta.isPaid ? `💰 Paid: ${meta.title}` : `✔️ Job completed: ${meta.title}`;
    case 'CANCELLED':
      return `❌ Job cancelled: ${meta.title}`;
    default:
      return `📋 Job update: ${meta.title}`;
  }
};
const buildPartCardSummary = (meta: PartCardMetadata): string => {
  switch (meta.status) {
    case 'PENDING':
      return meta.proposedByUserId ? `💬 Price offer: ${meta.partName}` : `🛒 Order Request: ${meta.partName}`;
    case 'ACCEPTED':
      return `✅ Reserved: ${meta.partName}`;
    case 'DECLINED':
      return `❌ Order declined: ${meta.partName}`;
    case 'CANCELLED':
      return `❌ Order cancelled: ${meta.partName}`;
    case 'COMPLETED':
      return meta.isPaid ? `💰 Paid: ${meta.partName}` : `✔️ Sold: ${meta.partName}`;
    default:
      return `🛒 Order update: ${meta.partName}`;
  }
};
const ATTACHMENTS_BUCKET = 'chat-attachments';
export const messageService = {
  sendMessage: async (jobId: number, senderId: number, receiverId: number, content: string): Promise<Message> => {
    const { data, error } = await supabase
      .from('messages')
      .insert([{ job_id: jobId, sender_id: senderId, receiver_id: receiverId, content, message_type: 'text' }])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },
// Uploads a local file (image or audio) to Supabase Storage and returns its public URL.
  // Uses fetch->blob->arrayBuffer rather than expo-file-system's base64 APIs, since that
  // path is simpler, has no extra dependency, and avoids SDK-version-specific quirks.
  uploadAttachment: async (localUri: string, kind: 'image' | 'audio'): Promise<string> => {
    const response = await fetch(localUri);
    const blob = await response.blob();
    const arrayBuffer = await new Response(blob).arrayBuffer();
    const extension = kind === 'image' ? (localUri.split('.').pop() || 'jpg') : (localUri.split('.').pop() || 'm4a');
    const contentType = kind === 'image' ? `image/${extension === 'jpg' ? 'jpeg' : extension}` : 'audio/m4a';
    const path = `${kind}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .upload(path, arrayBuffer, { contentType });
    if (uploadError) throw new Error(uploadError.message);

    const { data } = supabase.storage.from(ATTACHMENTS_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  },

  sendAttachmentMessage: async (
    jobId: number,
    senderId: number,
    receiverId: number,
    url: string,
    kind: 'image' | 'audio',
    metadata?: AttachmentMetadata
  ): Promise<Message> => {
    const { data, error } = await supabase
      .from('messages')
      .insert([{
        job_id: jobId,
        sender_id: senderId,
        receiver_id: receiverId,
        content: url,
        message_type: kind,
        metadata: metadata || null,
      }])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },
  // Sends (or replaces) the single "job card" message for a given job within a specific
  // conversation thread (chatJobId — may differ from the real jobId if the thread was
  // reused). Deletes any prior job_card rows for that job so only the latest state shows.
  sendJobCard: async (chatJobId: number, senderId: number, receiverId: number, meta: JobCardMetadata): Promise<Message> => {
    await supabase
      .from('messages')
      .delete()
      .eq('job_id', chatJobId)
      .eq('message_type', 'job_card')
      .contains('metadata', { jobId: meta.jobId });
    const { data, error } = await supabase
      .from('messages')
      .insert([{
        job_id: chatJobId,
        sender_id: senderId,
        receiver_id: receiverId,
        content: buildJobCardSummary(meta),
        message_type: 'job_card',
        metadata: meta,
      }])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },
  // Mirrors sendJobCard, matched on orderId instead of jobId — deletes any prior
  // part_card row for this order within the thread so only the latest state shows.
  sendPartCard: async (chatJobId: number, senderId: number, receiverId: number, meta: PartCardMetadata): Promise<Message> => {
    await supabase
      .from('messages')
      .delete()
      .eq('job_id', chatJobId)
      .eq('message_type', 'part_card')
      .contains('metadata', { orderId: meta.orderId });
    const { data, error } = await supabase
      .from('messages')
      .insert([{
        job_id: chatJobId,
        sender_id: senderId,
        receiver_id: receiverId,
        content: buildPartCardSummary(meta),
        message_type: 'part_card',
        metadata: meta,
      }])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },
  getMessages: async (jobId: number): Promise<Message[]> => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  },

  getConversations: async (userId: number): Promise<any[]> => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    // Group by job_id and get latest message per conversation
    const conversations: Record<number, any> = {};
    (data || []).forEach((msg: any) => {
      if (!conversations[msg.job_id]) {
        conversations[msg.job_id] = msg;
      }
    });

    return Object.values(conversations);
  },

  getConversationWithUser: async (myId: number, otherUserId: number): Promise<Message | null> => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${myId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${myId})`)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw new Error(error.message);
    return data && data.length > 0 ? data[0] : null;
  },
deleteMessage: async (messageId: string): Promise<void> => {
    const { error } = await supabase.from('messages').delete().eq('id', messageId);
    if (error) throw new Error(error.message);
  },
  deleteConversation: async (jobId: number): Promise<void> => {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('job_id', jobId);

    if (error) throw new Error(error.message);
  },
getUnreadCount: async (userId: number): Promise<number> => {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('is_read', false);
    if (error) throw new Error(error.message);
    return count || 0;
  },

  // Fires on any new incoming message or read-status change for this user, so a
  // tab-bar badge can stay live without polling.
  subscribeToUnreadCount: (userId: number, onChange: () => void) => {
    const topic = `unread-count:${userId}`;
    // Defensive: if a channel with this exact topic is already registered
    // (e.g. a fast unmount/remount race leaving a stale subscription), remove
    // it first — attaching new callbacks to an already-subscribed channel
    // throws, which previously crashed the app.
    const existing = supabase.getChannels().find((c: any) => c.topic === `realtime:${topic}`);
    if (existing) {
      supabase.removeChannel(existing);
    }
    try {
      const channel = supabase
        .channel(topic)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${userId}` },
          () => onChange()
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'messages', filter: `receiver_id=eq.${userId}` },
          () => onChange()
        )
        .subscribe();
      return channel;
    } catch {
      // A badge subscription failing shouldn't take down the app — the
      // count will just stay stale until the next successful subscribe.
      return null;
    }
  },
  markAsRead: async (jobId: number, receiverId: number): Promise<void> => {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('job_id', jobId)
      .eq('receiver_id', receiverId)
      .eq('is_read', false);
  },

  subscribeToMessages: (jobId: number, onMessage: (message: Message) => void) => {
    const channel = supabase
      .channel(`messages:job_id=eq.${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          onMessage(payload.new as Message);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          onMessage(payload.new as Message);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          onMessage({ ...(payload.old as Message), _deleted: true } as any);
        }
      )
      .subscribe();

    return channel;
  },

  unsubscribe: (channel: any) => {
    if (channel) supabase.removeChannel(channel);
  },
};