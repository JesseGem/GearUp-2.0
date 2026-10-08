import { useEffect, useState } from 'react';
import { messageService } from '../services/messageService';

export function useUnreadMessagesCount(userId: number | undefined) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let channel: any;

    // Reset immediately on account switch so a stale count from whichever
    // account was previously logged in never briefly (or permanently) shows
    // for the new one.
    setCount(0);

    if (!userId) return;

    const fetchCount = async () => {
      try {
        const c = await messageService.getUnreadCount(userId);
        // If a newer effect run has already started (account switched again),
        // this result belongs to a stale request — ignore it rather than
        // overwrite the current, correct count.
        if (!cancelled) setCount(c);
      } catch {
        // silent — a badge failing to update isn't worth surfacing an error for
      }
    };

    fetchCount();
    channel = messageService.subscribeToUnreadCount(userId, fetchCount);

    return () => {
      cancelled = true;
      if (channel) messageService.unsubscribe(channel);
    };
  }, [userId]);

  return count;
}