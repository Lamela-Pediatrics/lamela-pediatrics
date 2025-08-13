import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  MessageCircle, 
  User, 
  Clock, 
  Send,
  Baby,
  Stethoscope
} from 'lucide-react-native';
import type { Message } from '@/types/database';

interface MessageWithSender extends Message {
  sender: {
    first_name: string;
    last_name: string;
    role: string;
  };
  baby?: {
    first_name: string;
    last_name: string;
  };
}

export default function MessagesScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMessages();
    
    // Subscribe to real-time message updates
    const subscription = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user?.id}`,
        },
        () => {
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey (first_name, last_name, role),
          baby:babies (first_name, last_name)
        `)
        .eq('recipient_id', user?.id)
        .order('sent_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMessages();
    setRefreshing(false);
  };

  const markAsRead = async (messageId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId);
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId ? { ...msg, is_read: true } : msg
        )
      );
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getSenderIcon = (role: string) => {
    switch (role) {
      case 'doctor':
        return Stethoscope;
      case 'admin':
      case 'staff':
        return User;
      default:
        return User;
    }
  };

  const renderMessageCard = (message: MessageWithSender) => {
    const SenderIcon = getSenderIcon(message.sender.role);
    
    return (
      <TouchableOpacity 
        key={message.id} 
        style={[styles.messageCard, !message.is_read && styles.unreadCard]}
        onPress={() => markAsRead(message.id)}
      >
        <View style={styles.messageHeader}>
          <View style={styles.senderInfo}>
            <View style={styles.senderAvatar}>
              <SenderIcon size={20} color="#0ea5e9" strokeWidth={2} />
            </View>
            <View style={styles.senderDetails}>
              <Text style={styles.senderName}>
                {message.sender.role === 'doctor' ? 'Dr. ' : ''}
                {message.sender.first_name} {message.sender.last_name}
              </Text>
              <Text style={styles.senderRole}>{message.sender.role}</Text>
            </View>
          </View>
          <Text style={styles.messageTime}>{formatTime(message.sent_at)}</Text>
        </View>

        {message.baby && (
          <View style={styles.babyInfo}>
            <Baby size={16} color="#64748b" strokeWidth={2} />
            <Text style={styles.babyName}>
              Regarding {message.baby.first_name} {message.baby.last_name}
            </Text>
          </View>
        )}

        <Text style={styles.messageContent} numberOfLines={3}>
          {message.content}
        </Text>

        {!message.is_read && (
          <View style={styles.unreadIndicator} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.composeButton}>
          <Send size={24} color="#ffffff" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MessageCircle size={64} color="#94a3b8" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptyText}>
              Messages from your healthcare team will appear here
            </Text>
          </View>
        ) : (
          <View style={styles.messagesList}>
            {messages.map(renderMessageCard)}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#1e293b',
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  composeButton: {
    backgroundColor: '#0ea5e9',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
  },
  messagesList: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  messageCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  senderAvatar: {
    width: 40,
    height: 40,
    backgroundColor: '#e0f2fe',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  senderDetails: {
    flex: 1,
  },
  senderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  senderRole: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'capitalize',
  },
  messageTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  babyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  babyName: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  messageContent: {
    fontSize: 16,
    color: '#1e293b',
    lineHeight: 24,
  },
  unreadIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    backgroundColor: '#0ea5e9',
    borderRadius: 4,
  },
});