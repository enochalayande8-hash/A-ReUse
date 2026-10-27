import React, { useState, useEffect } from 'react';
import { AppNotification } from '../types';
import { api } from '../services/api';
import {
  fetchUserNotificationsFromFirestore,
  markNotificationReadInFirestore,
  markAllNotificationsReadInFirestore,
} from '../services/firebase/firestoreService';
import { useAuth } from '../services/auth/AuthContext';
import {
  Bell,
  X,
  CheckCheck,
  CheckCircle2,
  AlertCircle,
  Award,
  Sparkles,
  MessageSquare,
  Smartphone,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  Volume2,
} from 'lucide-react';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
  onUnreadCountChange?: (count: number) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onUnreadCountChange,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');
  const [phoneTestMessage, setPhoneTestMessage] = useState<string | null>(null);

  // Check browser Notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserPermission(Notification.permission);
    }
  }, []);

  // Fetch notifications
  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const mergedMap = new Map<string, AppNotification>();

      // 1. Try Firestore
      try {
        const fsNotifs = await fetchUserNotificationsFromFirestore(user?.id);
        fsNotifs.forEach((n) => mergedMap.set(n.id, n));
      } catch (err) {
        console.warn('[NotificationCenter] Firestore fetch note:', err);
      }

      // 2. Try Server API
      try {
        const res = await api.getNotifications();
        if (res && res.notifications) {
          res.notifications.forEach((n) => {
            if (!mergedMap.has(n.id)) {
              mergedMap.set(n.id, n);
            }
          });
        }
      } catch {
        // Backend offline or standalone client
      }

      const combined = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );

      setNotifications(combined);

      const unreadCount = combined.filter((n) => !n.read).length;
      if (onUnreadCountChange) {
        onUnreadCountChange(unreadCount);
      }
    } catch (err) {
      console.warn('[NotificationCenter] Error loading notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    // Refresh periodically every 30 seconds
    const timer = setInterval(() => {
      loadNotifications();
    }, 30000);
    return () => clearInterval(timer);
  }, [user?.id, isAuthenticated]);

  // Request browser / phone notifications permission
  const handleRequestPhonePermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPhoneTestMessage('Web notifications are not supported on this specific browser.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setBrowserPermission(permission);

      if (permission === 'granted') {
        setPhoneTestMessage('Phone alerts successfully enabled! Sending confirmation alert...');
        // Dispatch test notification to verify mobile banner
        sendMobileNotification(
          'Awareness Movement Alerts Active! 🔔',
          'You will receive verified updates on your actions, points, reviews, and community discussions on your phone.'
        );
      } else if (permission === 'denied') {
        setPhoneTestMessage('Alerts were denied. You can re-enable them anytime in your browser site settings.');
      }
    } catch (err) {
      console.warn('[NotificationCenter] Notification request error:', err);
    }
  };

  const sendMobileNotification = (title: string, body: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body,
          icon: '/InShot_20260917_104142121.png',
          badge: '/InShot_20260917_104142121.png',
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch (e) {
        console.warn('System notification trigger note:', e);
      }
    }
  };

  const handleTestNotification = () => {
    sendMobileNotification(
      'Movement Action Update 🌍',
      'This is a sample phone notification from Awareness Global Movement. Your mobile alerts are working perfectly!'
    );
    setPhoneTestMessage('Test alert sent! Check your phone notification tray or screen banner.');
    setTimeout(() => setPhoneTestMessage(null), 5000);
  };

  // Mark single notification read
  const handleMarkAsRead = async (id: string, linkTab?: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

    try {
      await markNotificationReadInFirestore(id);
      api.markNotificationRead(id).catch(() => {});
    } catch {
      // optimistic update
    }

    const newUnread = notifications.filter((n) => n.id !== id && !n.read).length;
    if (onUnreadCountChange) onUnreadCountChange(newUnread);

    if (linkTab) {
      onNavigateTab(linkTab);
      onClose();
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (onUnreadCountChange) onUnreadCountChange(0);

    try {
      if (user?.id) {
        await markAllNotificationsReadInFirestore(user.id);
      }
      await api.markAllNotificationsRead().catch(() => {});
    } catch {
      // optimistic
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-fadeIn">
      <div
        className="w-full max-w-md bg-[#fffdf8] h-full shadow-2xl flex flex-col border-l border-[#eadfce] animate-slideInRight"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#eadfce] bg-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#40281d] text-[#e2a72e] flex items-center justify-center shadow-xs">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif-heading text-lg font-bold text-[#40281d] flex items-center gap-2">
                <span>Notifications & Activity</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#e2a72e] text-[#40281d]">
                    {unreadCount} new
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-[#78675e]">Movement updates, verification, and badges</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#78675e] hover:text-[#40281d] hover:bg-[#40281d]/5 transition-colors cursor-pointer"
            aria-label="Close notifications"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile / Phone Notification Permissions Banner */}
        <div className="px-4 py-3 bg-[#fbf7ed] border-b border-[#eadfce]">
          <div className="flex items-start gap-2.5">
            <Smartphone className="w-4 h-4 text-[#46705b] mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#40281d]">Phone Alerts & Updates</span>
                {browserPermission === 'granted' ? (
                  <span className="text-[10px] font-bold text-[#46705b] bg-[#eaf2ec] px-2 py-0.5 rounded-full border border-[#d2e4d7] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Active on Phone
                  </span>
                ) : (
                  <button
                    onClick={handleRequestPhonePermission}
                    className="text-[11px] font-extrabold text-[#40281d] bg-[#e2a72e] hover:bg-[#d49924] px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-2xs"
                  >
                    Turn On Alerts
                  </button>
                )}
              </div>
              <p className="text-[11px] text-[#78675e] mt-1 leading-snug">
                {browserPermission === 'granted'
                  ? 'Your browser will push real-time alerts when your proof is approved or new challenges begin.'
                  : 'Get immediate phone notifications when admins verify your reusable bag actions or award points.'}
              </p>

              {browserPermission === 'granted' && (
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={handleTestNotification}
                    className="text-[10px] font-bold text-[#5c463b] hover:text-[#40281d] bg-white px-2 py-1 rounded-md border border-[#eadfce] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Volume2 className="w-3 h-3 text-[#e2a72e]" />
                    <span>Send Test Phone Alert</span>
                  </button>
                </div>
              )}

              {phoneTestMessage && (
                <p className="text-[10px] text-[#46705b] font-semibold mt-1.5 animate-fadeIn">
                  {phoneTestMessage}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Filter & Actions Bar */}
        <div className="px-4 py-2.5 border-b border-[#eadfce] bg-white flex items-center justify-between">
          <div className="flex items-center gap-1 bg-[#fbf7ed] p-0.5 rounded-xl border border-[#eadfce]">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-[#40281d] text-[#fffdf8] shadow-2xs'
                  : 'text-[#78675e] hover:text-[#40281d]'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === 'unread'
                  ? 'bg-[#40281d] text-[#fffdf8] shadow-2xs'
                  : 'text-[#78675e] hover:text-[#40281d]'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-[11px] font-bold text-[#46705b] hover:text-[#365646] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#eadfce]/60 p-2 space-y-1">
          {isLoading && notifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#78675e]">Loading notifications...</div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#fbf7ed] border border-[#eadfce] text-[#78675e] flex items-center justify-center mx-auto">
                <Bell className="w-6 h-6 stroke-[1.5]" />
              </div>
              <h3 className="text-sm font-bold text-[#40281d]">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </h3>
              <p className="text-xs text-[#78675e] max-w-xs mx-auto">
                {filter === 'unread'
                  ? 'You are all caught up! Switch to All to see past movement alerts.'
                  : 'New activities, verified submissions, and community discussions will be reported here.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((n) => {
              const isUnread = !n.read;
              let Icon = Bell;
              let iconColor = 'text-[#e2a72e] bg-[#e2a72e]/10';

              if (n.type === 'ACTION_APPROVED') {
                Icon = Award;
                iconColor = 'text-[#46705b] bg-[#eaf2ec]';
              } else if (n.type === 'ACTION_REJECTED') {
                Icon = AlertCircle;
                iconColor = 'text-rose-600 bg-rose-50';
              } else if (n.type === 'COMMUNITY_POST') {
                Icon = MessageSquare;
                iconColor = 'text-sky-700 bg-sky-50';
              } else if (n.type === 'NEW_CHALLENGE') {
                Icon = Sparkles;
                iconColor = 'text-[#e2a72e] bg-[#fbf7ed] border border-[#e2a72e]/30';
              }

              // Relative time formatting
              const formattedTime = (() => {
                try {
                  const ms = Date.now() - new Date(n.createdAt).getTime();
                  const mins = Math.floor(ms / 60000);
                  if (mins < 1) return 'Just now';
                  if (mins < 60) return `${mins}m ago`;
                  const hrs = Math.floor(mins / 60);
                  if (hrs < 24) return `${hrs}h ago`;
                  const days = Math.floor(hrs / 24);
                  return `${days}d ago`;
                } catch {
                  return 'Recently';
                }
              })();

              return (
                <div
                  key={n.id}
                  onClick={() => handleMarkAsRead(n.id, n.linkTab)}
                  className={`p-3.5 rounded-2xl transition-all cursor-pointer border ${
                    isUnread
                      ? 'bg-white border-[#e2a72e]/40 shadow-xs'
                      : 'bg-[#fffdf8]/60 border-transparent hover:bg-white hover:border-[#eadfce]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className={`text-xs ${isUnread ? 'font-bold text-[#40281d]' : 'font-semibold text-[#5c463b]'}`}>
                          {n.title}
                        </h4>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] text-[#78675e]">{formattedTime}</span>
                          {isUnread && <span className="w-2 h-2 rounded-full bg-[#e2a72e]" />}
                        </div>
                      </div>

                      <p className="text-[11px] text-[#5c463b] mt-1 leading-relaxed">
                        {n.message}
                      </p>

                      {n.linkTab && (
                        <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-[#46705b] hover:text-[#365646]">
                          <span>{n.actionLabel || `Go to ${n.linkTab}`}</span>
                          <ChevronRight className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-white border-t border-[#eadfce] text-center">
          <p className="text-[10px] text-[#78675e]">
            Awareness Global Movement • Verified Environmental Actions
          </p>
        </div>
      </div>
    </div>
  );
};
