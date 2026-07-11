import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { orbitService } from '../../../shared/services/orbitService';
import { useRealtimeTopic } from '../../../shared/hooks/useRealtimeTopic';
import { REALTIME_TOPICS } from '../../../shared/constants/realtimeTopics';
import { notificationService } from '../../../shared/services/notificationService';

const OrbitChatBox = ({ roomUuid }) => {
  const { user } = useAuthContext();
  const currentUserUuid = user?.id || user?.uuid;
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [typingUser, setTypingUser] = useState(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  // Fetch chat history
  useEffect(() => {
    let active = true;
    const fetchHistory = async () => {
      try {
        const history = await orbitService.getChatMessages(roomUuid);
        if (active) {
          setMessages(history || []);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
        if (active) setLoading(false);
      }
    };
    fetchHistory();
    return () => {
      active = false;
    };
  }, [roomUuid]);

  // Clean up typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Subscribe to real-time chat updates (instant delivery, debounceMs = 0)
  useRealtimeTopic(REALTIME_TOPICS.orbitRoomChat(roomUuid), (newMessage) => {
    if (newMessage && newMessage.uuid) {
      setMessages((prev) => {
        // Prevent duplicate messages if any
        if (prev.some((m) => m.uuid === newMessage.uuid)) return prev;
        return [...prev, newMessage];
      });
    }
  }, 0);

  // Subscribe to real-time typing updates
  useRealtimeTopic(REALTIME_TOPICS.orbitRoomTyping(roomUuid), (typingData) => {
    if (typingData && typingData.senderUserUuid) {
      if (typingData.senderUserUuid === currentUserUuid) return;

      if (typingData.typing) {
        setTypingUser(typingData.displayName);
      } else {
        setTypingUser((current) => current === typingData.displayName ? null : current);
      }
    }
  }, 0);

  // Scroll to bottom on new messages inside the container
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, typingUser]);

  const sendTypingStatus = async (typing) => {
    if (isTypingRef.current === typing) return;
    isTypingRef.current = typing;
    try {
      await orbitService.sendTypingStatus(roomUuid, typing);
    } catch (err) {
      console.error('Failed to send typing status:', err);
    }
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    sendTypingStatus(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(false);
    }, 1500);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    setInputText('');
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    sendTypingStatus(false);

    try {
      await orbitService.sendChatMessage(roomUuid, text);
    } catch (err) {
      notificationService.error('Không thể gửi tin nhắn. Vui lòng thử lại.');
      setInputText(text); // Restore text on failure
    }
  };

  return (
    <div 
      className="flex flex-col rounded-2xl overflow-hidden shadow-2xl h-[400px]"
      style={{ backgroundColor: 'rgba(14, 18, 30, 0.65)', border: '1px solid rgba(255, 255, 255, 0.04)', backdropFilter: 'blur(16px)' }}
    >
      {/* Header */}
      <div 
        className="flex items-center gap-2 px-4 py-3 border-b shrink-0"
        style={{ backgroundColor: 'rgba(11, 15, 25, 0.8)', borderColor: 'rgba(255, 255, 255, 0.04)' }}
      >
        <MessageSquare className="w-4 h-4 text-red-500" />
        <span className="text-xs font-bold text-white uppercase tracking-wider">Trò chuyện nhóm</span>
      </div>

      {/* Message List */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-full text-zinc-500 text-xs font-medium">
            Đang tải cuộc trò chuyện...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-zinc-500 text-xs font-medium italic text-center px-4">
            Chưa có tin nhắn. Hãy bắt đầu trò chuyện với cả nhóm!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderUserUuid === currentUserUuid;
            if (msg.system) {
              return (
                <div key={msg.uuid} className="flex justify-center my-2">
                  <span 
                    className="text-[10px] text-zinc-400 font-semibold px-3 py-1 rounded-full text-center max-w-[80%] border"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderColor: 'rgba(255, 255, 255, 0.04)' }}
                  >
                    {msg.message}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={msg.uuid}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                {!isMe && (
                  <span className="text-[10px] text-zinc-400 font-bold mb-1 ml-1">
                    {msg.senderDisplayName}
                  </span>
                )}
                <div
                  className={`max-w-[75%] min-w-0 px-3.5 py-2.5 rounded-2xl text-xs font-semibold leading-relaxed shadow-md border break-words [overflow-wrap:anywhere] ${
                    isMe
                      ? 'bg-gradient-to-r from-red-600 to-red-700 text-white rounded-tr-none border-transparent'
                      : 'text-zinc-100 rounded-tl-none bg-zinc-800/80 border-white/10'
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
        {typingUser && (
          <div className="flex items-center gap-1.5 ml-1 text-[10px] text-zinc-400 font-medium italic animate-pulse">
            <span className="font-bold">{typingUser}</span> đang nhập...
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSend}
        className="p-3 border-t flex gap-2 shrink-0"
        style={{ backgroundColor: 'rgba(11, 15, 25, 0.4)', borderColor: 'rgba(255, 255, 255, 0.04)' }}
      >
        <input
          type="text"
          placeholder="Nhập nội dung..."
          value={inputText}
          onChange={handleInputChange}
          className="flex-grow bg-white/[0.03] border hover:border-white/10 focus:border-red-500/50 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-zinc-500 outline-none transition-colors"
          style={{ borderColor: 'rgba(255, 255, 255, 0.04)' }}
        />
        <button
          type="submit"
          className="bg-red-600 hover:bg-red-700 active:scale-95 text-white p-2.5 rounded-xl transition-all flex items-center justify-center shrink-0 cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

export default OrbitChatBox;
