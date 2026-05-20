'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Tv, Send, Copy, Check, MessageSquare, Video, VideoOff, 
  Mic, MicOff, Play, Pause, RefreshCw, Users, AlertCircle, ArrowLeft, Loader2, UploadCloud, Paperclip, Maximize, Minimize, Film, Trash2, Smile 
} from 'lucide-react';

interface ChatMsg {
  id: number;
  sender_name: string;
  sender_email: string;
  content: string;
  timestamp: string;
}

interface RoomMediaItem {
  id: number;
  room: string;
  added_by: number;
  added_by_name: string;
  video_url: string;
  title: string;
  added_at: string;
}

interface RoomData {
  id: string;
  created_by?: number;
  created_by_detail?: {
    id: number;
    username: string;
    email: string;
  };
  joined_by_detail?: {
    id: number;
    username: string;
    email: string;
  };
  current_video_url?: string;
  is_playing: boolean;
  current_time: number;
}

const EMOJI_CATEGORIES = [
  {
    name: 'Smileys',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🫣', '🤭', '🫢', '🤫', '😶', '😐', '😑', '😬', '🫠', '🙄', '😴', '🤤', '😪', '😵', '😵‍💫', '🤢', '🤮', '🤒', '🤕']
  },
  {
    name: 'Hearts & Fun',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '💥', '🌟', '✨', '🔥', '💯', '🎉', '🎈', '🍻', '🥂', '🍾', '🍕', '🍿', '🍩', '🍪', '🍫']
  },
  {
    name: 'Hands & Actions',
    emojis: ['👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '☝️', '👋', '🤚', '🖐️', '🖖', '👏', '🙌', '👐', '🤲', '🙏', '✍️', '🤳', '💪', '🧠', '👀', '🗣️', '👤']
  }
];

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;

  // UI state
  const [user, setUser] = useState<any>(null);
  const [room, setRoom] = useState<RoomData | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'library' | 'call'>('chat');
  const [copied, setCopied] = useState(false);
  const [connected, setConnected] = useState(false);
  const [partnerUsername, setPartnerUsername] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Dynamic network host parameters
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const wsBase = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
  
  // Persistent Room Media Library state
  const [sharedMedia, setSharedMedia] = useState<RoomMediaItem[]>([]);

  // Video syncing states
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [currentVideoUrl, setCurrentVideoUrl] = useState('');
  
  // File upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Partner typing state
  const [partnerIsTyping, setPartnerIsTyping] = useState(false);

  // WebRTC Call state
  const [inCall, setInCall] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [callStatus, setCallStatus] = useState<string>('Idle');

  // Dynamic Viewport Height & Mobile Controls toggle
  const [viewportHeight, setViewportHeight] = useState('100dvh');
  const [showControlsMobile, setShowControlsMobile] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'both' | 'chat_only'>('both');
  const [showFullscreenChat, setShowFullscreenChat] = useState(true);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  // References
  const wsRef = useRef<WebSocket | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  const chatInputRef = useRef<HTMLInputElement | null>(null);
  const fullscreenChatInputRef = useRef<HTMLInputElement | null>(null);
  
  // Queue to ignore programmatic events and prevent recursion loops
  const ignoreNextEvents = useRef({ play: 0, pause: 0, seek: 0 });
  
  // YouTube Player reference & Time Poller
  const ytPlayerRef = useRef<any>(null);
  const lastYtTimeRef = useRef<number>(0);

  const localStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Typing state control refs
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const amITypingRef = useRef<boolean>(false);
  const partnerTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // YouTube Link Checker with Shorts support
  const getYouTubeId = (url: string) => {
    if (!url) return null;
    const trimmed = url.trim();
    
    // Direct 11-char ID matching
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }

    try {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
      const match = trimmed.match(regExp);
      if (match && match[2].length === 11) {
        return match[2];
      }
    } catch (e) {
      // Fallback
    }
    return null;
  };

  // Embed URL Checker (MovieBox, vidsrc, custom iframes)
  const isEmbedUrl = (url: string) => {
    if (!url) return false;
    const trimmed = url.trim().toLowerCase();
    
    if (getYouTubeId(url)) return false;
    
    const isDirectVideo = trimmed.includes('.mp4') || 
                          trimmed.includes('.webm') || 
                          trimmed.includes('.ogg') || 
                          trimmed.includes('.m3u8') || 
                          trimmed.startsWith('data:video');
                          
    return trimmed.startsWith('http') && !isDirectVideo;
  };

  // Convert watch URLs to ad-blocked player-only embed URLs (YouTube, MovieBox) with SSL Upgrades
  const getCleanEmbedUrl = (url: string) => {
    if (!url) return '';
    let trimmed = url.trim();
    
    // Auto-upgrade protocol to HTTPS to prevent Mixed Content security blocks
    if (trimmed.startsWith('http://')) {
      trimmed = trimmed.replace('http://', 'https://');
    }
    
    // YouTube handler
    const ytId = getYouTubeId(trimmed);
    if (ytId) {
      return `https://www.youtube.com/embed/${ytId}?autoplay=1&enablejsapi=1`;
    }
    
    // MovieBox Watch page to Embed page converter
    if (trimmed.includes('moviebox') && trimmed.includes('/watch/')) {
      return trimmed.replace('/watch/', '/embed/');
    }
    
    return trimmed;
  };

  // YouTube ID resolver
  const ytVideoId = getYouTubeId(currentVideoUrl);

  // Determine if the current client is the creator (Host) of the watch cinema room
  const isHost = room && user && (
    room.created_by === user.id || 
    (room.created_by_detail && room.created_by_detail.id === user.id) ||
    (room.created_by_detail && room.created_by_detail.username === user.username)
  );

  // Active Playback Time-Drift Heartbeat Broadcaster (Only Host broadcasts, protecting client load)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentVideoUrl || getYouTubeId(currentVideoUrl) || isEmbedUrl(currentVideoUrl)) return;

    let interval: any = null;
    if (isHost && room?.is_playing) {
      interval = setInterval(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && video && !video.paused) {
          broadcastVideoSync('heartbeat', video.currentTime);
        }
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isHost, room?.is_playing, currentVideoUrl]);

  // YouTube Active Playback Time-Drift Heartbeat Broadcaster
  useEffect(() => {
    if (!ytVideoId || !isHost) return;

    let interval: any = null;
    if (room?.is_playing) {
      interval = setInterval(() => {
        const player = ytPlayerRef.current;
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && player && typeof player.getCurrentTime === 'function' && player.getPlayerState() === 1) {
          broadcastVideoSync('heartbeat', player.getCurrentTime());
        }
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [ytVideoId, isHost, room?.is_playing]);

  // Load external player APIs once globally
  const [hlsReady, setHlsReady] = useState(false);

  useEffect(() => {
    // Load YouTube API
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    // Load Hls.js API
    if ((window as any).Hls) {
      setHlsReady(true);
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
      script.onload = () => setHlsReady(true);
      document.head.appendChild(script);
    }
  }, []);

  // Authenticate & Load profile
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) {
      router.push('/login');
    } else {
      setUser(JSON.parse(userData));
    }
  }, [router]);

  // Track Fullscreen state natively & handle landscape orientation lock
  useEffect(() => {
    const handleFullscreenChange = async () => {
      const isFS = !!document.fullscreenElement;
      setIsFullscreen(isFS);
      
      if (isFS) {
        // Auto-show fullscreen chat drawer initially
        setShowFullscreenChat(true);
        
        // Force screen orientation lock to landscape
        const screenAny = screen as any;
        if (screenAny.orientation && typeof screenAny.orientation.lock === 'function') {
          try {
            await screenAny.orientation.lock('landscape');
          } catch (err) {
            console.log('Screen orientation lock is not supported or was rejected:', err);
          }
        }
      } else {
        // Unlock orientation when exiting fullscreen
        const screenAny = screen as any;
        if (screenAny.orientation && typeof screenAny.orientation.unlock === 'function') {
          try {
            screenAny.orientation.unlock();
          } catch (err) {
            console.log('Screen orientation unlock error:', err);
          }
        }
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Global click & touch handler to dismiss virtual keyboard when tapping outside inputs/forms/buttons
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        if (
          !target.closest('input') && 
          !target.closest('button') && 
          !target.closest('form') && 
          !target.closest('.emoji-picker-container') &&
          !target.closest('[role="button"]')
        ) {
          (activeEl as HTMLElement).blur();
        }
      }
    };
    
    document.addEventListener('mouseup', handleGlobalClick);
    document.addEventListener('touchstart', handleGlobalClick);
    return () => {
      document.removeEventListener('mouseup', handleGlobalClick);
      document.removeEventListener('touchstart', handleGlobalClick);
    };
  }, []);

  // Track visual viewport height dynamically & lock scroll position (fixes virtual keyboard overlay & scroll shifts)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const resetScroll = () => {
      window.scrollTo(0, 0);
      if (document.body) document.body.scrollTop = 0;
      if (document.documentElement) document.documentElement.scrollTop = 0;
    };

    const handleResize = () => {
      if (window.visualViewport) {
        const isMobile = window.visualViewport.width < 768;
        const isKeyboard = window.visualViewport.height < 500 && isMobile;
        setIsKeyboardOpen(isKeyboard);
        
        if (isKeyboard) {
          // On mobile keyboard open, keep height as 100% (or 100dvh) to avoid empty black space when Chrome scrolls the viewport
          setViewportHeight('100%');
        } else {
          setViewportHeight(`${window.visualViewport.height}px`);
        }
      } else {
        setViewportHeight('100dvh');
        setIsKeyboardOpen(false);
      }
      
      // Force scroll reset instantly and staggered to combat keyboard animation shifts
      resetScroll();
      const timeouts = [10, 50, 100, 150, 200, 300, 400, 600];
      timeouts.forEach(delay => {
        setTimeout(resetScroll, delay);
      });
    };

    const handleFocusIn = (e: FocusEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') {
        resetScroll();
        const timeouts = [10, 50, 100, 150, 200, 300, 400, 600];
        timeouts.forEach(delay => {
          setTimeout(resetScroll, delay);
        });
      }
    };

    const handleWindowScroll = () => {
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        resetScroll();
      }
    };

    window.visualViewport?.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('scroll', handleResize);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    document.addEventListener('focusin', handleFocusIn);
    
    handleResize();

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleWindowScroll);
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, []);

  // Keep activeTab set to 'chat' when in chat_only layout mode
  useEffect(() => {
    if (layoutMode === 'chat_only') {
      setActiveTab('chat');
    }
  }, [layoutMode]);

  // Fetch Room Media History List API
  const fetchRoomMediaHistory = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      const res = await fetch(`${apiBase}/api/rooms/${roomId}/media/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSharedMedia(data);
      }
    } catch (err) {
      console.error('Error fetching room media library', err);
    }
  };

  // Load Room REST API Detail & Chat History
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('access_token');

    const fetchRoomDetail = async () => {
      try {
        const res = await fetch(`${apiBase}/api/rooms/${roomId}/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setRoom(data);
        if (data.current_video_url) {
          setCurrentVideoUrl(data.current_video_url);
          setVideoUrlInput(data.current_video_url);
        }
        
        // Pre-populate partner's username dynamically from room details
        const partner = data.created_by_detail?.id === user.id ? data.joined_by_detail : data.created_by_detail;
        if (partner) {
          setPartnerUsername(partner.username);
        }
      } catch {
        router.push('/');
      }
    };

    const fetchChatHistory = async () => {
      try {
        const res = await fetch(`${apiBase}/api/rooms/${roomId}/chat/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        }
      } catch (err) {
        console.error('Error fetching chat history', err);
      }
    };

    fetchRoomDetail();
    fetchChatHistory();
    fetchRoomMediaHistory();
  }, [roomId, user, router]);

  // Proactive video loader for direct MP4 and HLS (.m3u8) streams inside React
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentVideoUrl || getYouTubeId(currentVideoUrl) || isEmbedUrl(currentVideoUrl)) return;

    // Check if the URL is an HLS (.m3u8) stream
    const isHls = currentVideoUrl.toLowerCase().includes('.m3u8');

    if (isHls && (window as any).Hls) {
      if ((window as any).Hls.isSupported()) {
        const hls = new (window as any).Hls();
        hls.loadSource(currentVideoUrl);
        hls.attachMedia(video);
        
        return () => {
          hls.destroy();
        };
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS fallback (Safari/iOS)
        video.src = currentVideoUrl;
        video.load();
      }
    } else {
      // Standard direct streaming files
      video.src = currentVideoUrl;
      video.load();
    }
  }, [currentVideoUrl, hlsReady]);

  // WebSocket Connection Lifecycle
  useEffect(() => {
    if (!user || !wsBase) return;
    const token = localStorage.getItem('access_token');
    const wsUrl = `${wsBase}/ws/room/${roomId}/?token=${token}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setCallStatus('Connected to Server');
    };

    ws.onclose = () => {
      setConnected(false);
      setCallStatus('Disconnected');
    };

    ws.onmessage = async (e) => {
      const data = JSON.parse(e.data);
      
      switch (data.type) {
        case 'notification':
          if (data.action === 'join') {
            setPartnerUsername(data.username);
            setMessages(prev => [...prev, {
              id: Date.now(),
              sender_name: 'System',
              sender_email: '',
              content: `${data.username} joined the cinema room.`,
              timestamp: new Date().toISOString()
            } as ChatMsg]);
          } else if (data.action === 'leave') {
            setPartnerUsername(null);
            setPartnerIsTyping(false);
            if (partnerTypingTimeoutRef.current) {
              clearTimeout(partnerTypingTimeoutRef.current);
              partnerTypingTimeoutRef.current = null;
            }
            setMessages(prev => [...prev, {
              id: Date.now(),
              sender_name: 'System',
              sender_email: '',
              content: `${data.username} left the cinema room.`,
              timestamp: new Date().toISOString()
            } as ChatMsg]);
            endCall();
          }
          break;

        case 'chat':
          setMessages(prev => [...prev, {
            id: Date.now(),
            sender_name: data.sender_name,
            sender_email: data.sender_email,
            content: data.message,
            timestamp: new Date().toISOString()
          } as ChatMsg]);
          break;

        case 'video_sync':
          handleRemoteSyncEvent(data);
          // Auto-refresh the persistent shared media playlist library list
          fetchRoomMediaHistory();
          break;

        case 'webrtc':
          handleRemoteSignaling(data.payload);
          break;

        case 'typing':
          setPartnerIsTyping(data.is_typing);
          if (data.username) {
            setPartnerUsername(data.username);
          }
          
          // Safety timeout logic for typing event on receiver
          if (partnerTypingTimeoutRef.current) {
            clearTimeout(partnerTypingTimeoutRef.current);
            partnerTypingTimeoutRef.current = null;
          }
          
          if (data.is_typing) {
            partnerTypingTimeoutRef.current = setTimeout(() => {
              setPartnerIsTyping(false);
              partnerTypingTimeoutRef.current = null;
            }, 4000);
          }
          break;
      }
    };

    return () => {
      ws.close();
      endCall();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (partnerTypingTimeoutRef.current) {
        clearTimeout(partnerTypingTimeoutRef.current);
      }
    };
  }, [roomId, user, wsBase]);

  // Scroll Chat to bottom helper
  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    chatEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages]);

  useEffect(() => {
    if (activeTab === 'chat') {
      // Delay slightly to allow keyboard or tab layout transitions to complete
      const timer = setTimeout(() => scrollToBottom('auto'), 150);
      return () => clearTimeout(timer);
    }
  }, [viewportHeight, activeTab]);

  // HTML5 Video Action Broadcast
  const broadcastVideoSync = (action: string, time: number, url?: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'video_sync',
      action,
      currentTime: time,
      videoUrl: url
    }));
  };

  // Video Sync Action Handlers with deterministic ignore queue
  const handleRemoteSyncEvent = (data: any) => {
    const video = videoRef.current;
    
    if (data.action === 'change_video') {
      setCurrentVideoUrl(data.videoUrl);
      setVideoUrlInput(data.videoUrl);
      
      // If cleared, display system alert
      if (!data.videoUrl) {
        setMessages(prev => [...prev, {
          id: Date.now(),
          sender_name: 'System',
          sender_email: '',
          content: `${data.username} cleared the theater player.`,
          timestamp: new Date().toISOString()
        } as ChatMsg]);
      } else {
        setMessages(prev => [...prev, {
          id: Date.now(),
          sender_name: 'System',
          sender_email: '',
          content: `${data.username} loaded a new video.`,
          timestamp: new Date().toISOString()
        } as ChatMsg]);
      }
      return;
    }

    // Direct Video Playback Sync
    if (video) {
      if (data.action === 'play') {
        if (video.paused) {
          ignoreNextEvents.current.play += 1;
          video.play().catch(() => {});
        }
        if (Math.abs(video.currentTime - data.currentTime) > 1.2) {
          ignoreNextEvents.current.seek += 1;
          video.currentTime = data.currentTime;
        }
      } else if (data.action === 'pause') {
        if (!video.paused) {
          ignoreNextEvents.current.pause += 1;
          video.pause();
        }
        if (Math.abs(video.currentTime - data.currentTime) > 1.2) {
          ignoreNextEvents.current.seek += 1;
          video.currentTime = data.currentTime;
        }
      } else if (data.action === 'seek') {
        ignoreNextEvents.current.seek += 1;
        video.currentTime = data.currentTime;
      } else if (data.action === 'heartbeat') {
        // Drift corrector: snap guest player to match host if they drift by > 1.0 second
        if (Math.abs(video.currentTime - data.currentTime) > 1.0) {
          ignoreNextEvents.current.seek += 1;
          video.currentTime = data.currentTime;
        }
      }
    }

    // YouTube Video Playback Sync
    const ytPlayer = ytPlayerRef.current;
    if (ytPlayer && typeof ytPlayer.getPlayerState === 'function') {
      const state = ytPlayer.getPlayerState();
      
      if (data.action === 'play') {
        if (state !== 1) {
          ignoreNextEvents.current.play += 1;
          ytPlayer.playVideo();
        }
        if (Math.abs(ytPlayer.getCurrentTime() - data.currentTime) > 1.5) {
          ignoreNextEvents.current.seek += 1;
          ytPlayer.seekTo(data.currentTime, true);
        }
      } else if (data.action === 'pause') {
        if (state !== 2) {
          ignoreNextEvents.current.pause += 1;
          ytPlayer.pauseVideo();
        }
        if (Math.abs(ytPlayer.getCurrentTime() - data.currentTime) > 1.5) {
          ignoreNextEvents.current.seek += 1;
          ytPlayer.seekTo(data.currentTime, true);
        }
      } else if (data.action === 'seek') {
        ignoreNextEvents.current.seek += 1;
        ytPlayer.seekTo(data.currentTime, true);
      } else if (data.action === 'heartbeat') {
        // YouTube Drift corrector: snap guest player to match host if they drift by > 1.2 seconds
        if (Math.abs(ytPlayer.getCurrentTime() - data.currentTime) > 1.2) {
          ignoreNextEvents.current.seek += 1;
          ytPlayer.seekTo(data.currentTime, true);
        }
      }
    }
  };

  // HTML5 Native Video Tag Events Listeners (with ignore queue check)
  const onVideoPlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (ignoreNextEvents.current.play > 0) {
      ignoreNextEvents.current.play -= 1;
      return;
    }
    broadcastVideoSync('play', video.currentTime);
  };

  const onVideoPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (ignoreNextEvents.current.pause > 0) {
      ignoreNextEvents.current.pause -= 1;
      return;
    }
    broadcastVideoSync('pause', video.currentTime);
  };

  const onVideoSeeked = () => {
    const video = videoRef.current;
    if (!video) return;

    if (ignoreNextEvents.current.seek > 0) {
      ignoreNextEvents.current.seek -= 1;
      return;
    }
    broadcastVideoSync('seek', video.currentTime);
  };

  // YouTube Dynamic API Instantiation (Using elevated global declaration)

  useEffect(() => {
    if (!ytVideoId) return;

    let player: any = null;
    const checkInterval = setInterval(() => {
      if ((window as any).YT && (window as any).YT.Player) {
        clearInterval(checkInterval);
        
        player = new (window as any).YT.Player('yt-player', {
          height: '100%',
          width: '100%',
          videoId: ytVideoId,
          playerVars: {
            autoplay: 1,
            controls: 1,
            enablejsapi: 1,
            origin: window.location.origin,
            rel: 0,
          },
          events: {
            onStateChange: (event: any) => {
              const state = event.data;
              const currTime = event.target.getCurrentTime();
              
              if (state === 1) { // Playing
                if (ignoreNextEvents.current.play > 0) {
                  ignoreNextEvents.current.play -= 1;
                  return;
                }
                broadcastVideoSync('play', currTime);
              } else if (state === 2) { // Paused
                if (ignoreNextEvents.current.pause > 0) {
                  ignoreNextEvents.current.pause -= 1;
                  return;
                }
                broadcastVideoSync('pause', currTime);
              }
            }
          }
        });
        
        ytPlayerRef.current = player;
      }
    }, 100);

    return () => {
      clearInterval(checkInterval);
      if (player && typeof player.destroy === 'function') {
        player.destroy();
      }
      ytPlayerRef.current = null;
    };
  }, [ytVideoId]);

  // YouTube Time-Drift Polling to capture seeking
  useEffect(() => {
    if (!ytVideoId) return;

    const interval = setInterval(() => {
      const player = ytPlayerRef.current;
      if (player && typeof player.getCurrentTime === 'function' && player.getPlayerState() === 1) {
        const currTime = player.getCurrentTime();
        
        // If playhead jumps by more than 2 seconds, it was dragged manually (seek)
        if (Math.abs(currTime - lastYtTimeRef.current) > 2) {
          if (ignoreNextEvents.current.seek > 0) {
            ignoreNextEvents.current.seek -= 1;
          } else {
            broadcastVideoSync('seek', currTime);
          }
        }
        lastYtTimeRef.current = currTime;
      }
    }, 500);

    return () => clearInterval(interval);
  }, [ytVideoId]);

  // Trigger loading a new direct MP4 or YouTube video url
  const handleLoadNewVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrlInput.trim()) return;

    setCurrentVideoUrl(videoUrlInput);
    broadcastVideoSync('change_video', 0.0, videoUrlInput);

    // Refresh playlist database history list locally
    setTimeout(() => {
      fetchRoomMediaHistory();
    }, 500);
  };

  // Hardened Local File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || uploading) return;

    // Disallow massive files (150MB limit to save server disk space)
    if (file.size > 150 * 1024 * 1024) {
      alert('File size exceeds the 150MB server security limit.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    const token = localStorage.getItem('access_token');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${apiBase}/api/rooms/upload/`, true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 201) {
          const data = JSON.parse(xhr.responseText);
          const uploadedUrl = data.url;
          
          setCurrentVideoUrl(uploadedUrl);
          setVideoUrlInput(uploadedUrl);
          broadcastVideoSync('change_video', 0.0, uploadedUrl);
          
          setMessages(prev => [...prev, {
            id: Date.now(),
            sender_name: 'System',
            sender_email: '',
            content: `${user.username} uploaded a new video/image file.`,
            timestamp: new Date().toISOString()
          } as ChatMsg]);

          // Refresh playlist database history list locally
          setTimeout(() => {
            fetchRoomMediaHistory();
          }, 500);
        } else {
          alert('Upload failed. Please ensure the file is a playable format.');
        }
        setUploading(false);
        // Clear file input buffer so the same file can be successfully re-selected
        if (fileInputRef.current) fileInputRef.current.value = '';
      };

      xhr.onerror = () => {
        alert('Network connection error during upload.');
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      };

      xhr.send(formData);
    } catch (err) {
      console.error(err);
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Chat message submission
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !wsRef.current) return;

    wsRef.current.send(JSON.stringify({
      type: 'chat',
      message: chatInput.trim()
    }));

    // Reset typing states and clear any active keystroke timeout locally
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    
    if (amITypingRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        is_typing: false
      }));
      amITypingRef.current = false;
    }

    setChatInput('');

    // Focus preservation: Keep the input focused so virtual keyboard doesn't close
    setTimeout(() => {
      if (isFullscreen) {
        fullscreenChatInputRef.current?.focus();
      } else {
        chatInputRef.current?.focus();
      }
    }, 30);
  };

  // Dynamic chat input change tracker to broadcast typing alerts with debounce/throttle protection
  const handleChatInputChange = (val: string) => {
    setChatInput(val);
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const hasContent = val.trim().length > 0;

    if (hasContent) {
      // If we weren't flagged as typing previously, send the typing start event immediately
      if (!amITypingRef.current) {
        amITypingRef.current = true;
        wsRef.current.send(JSON.stringify({
          type: 'typing',
          is_typing: true
        }));
      }

      // Refresh the idle typing indicator timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // If inactive for 2.5 seconds, automatically send typing stop notification
      typingTimeoutRef.current = setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'typing',
            is_typing: false
          }));
        }
        amITypingRef.current = false;
        typingTimeoutRef.current = null;
      }, 2500);

    } else {
      // Input cleared out completely: trigger stopped-typing immediately
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (amITypingRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'typing',
          is_typing: false
        }));
        amITypingRef.current = false;
      }
    }
  };

  // Toggle custom Cinema Fullscreen
  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch((err) => {
        console.error('Error enabling fullscreen', err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Fullscreen touch gesture handlers (swipe to close/open chat drawer)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchEndX - touchStartX.current;
    
    // Swipe right (close panel)
    if (diffX > 60) {
      setShowFullscreenChat(false);
    }
    touchStartX.current = null;
  };

  const handlePlayerTouchStart = (e: React.TouchEvent) => {
    if (!isFullscreen) return;
    touchStartX.current = e.touches[0].clientX;
  };

  const handlePlayerTouchEnd = (e: React.TouchEvent) => {
    if (!isFullscreen || touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchEndX - touchStartX.current;
    
    // Swipe right to close open chat
    if (showFullscreenChat && diffX > 60) {
      setShowFullscreenChat(false);
    }
    // Swipe left from right 35% edge of screen to open chat
    else if (!showFullscreenChat && diffX < -60) {
      const containerWidth = playerContainerRef.current?.clientWidth || window.innerWidth;
      const startXFromRight = containerWidth - touchStartX.current;
      if (startXFromRight < containerWidth * 0.35) {
        setShowFullscreenChat(true);
      }
    }
    touchStartX.current = null;
  };

  // WebRTC Calling Engine
  const startCall = async () => {
    if (!wsRef.current) return;
    setInCall(true);
    setCallStatus('Setting up media device...');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCallStatus('Insecure Context Blocked camera access.');
      setInCall(false);
      alert('Camera & microphone access is blocked because you are using insecure HTTP connection. To test this on mobile, open chrome://flags/#unsafely-treat-insecure-origin-as-secure in Chrome and add "http://192.168.0.102:3000" to enable WebRTC.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      pcRef.current = pc;

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: 'webrtc',
            payload: { type: 'candidate', candidate: event.candidate }
          }));
        }
      };

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        setCallStatus('Active Call');
      };

      setCallStatus('Creating offer...');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      wsRef.current.send(JSON.stringify({
        type: 'webrtc',
        payload: offer
      }));

      setCallStatus('Ringing partner...');
    } catch (err) {
      console.error(err);
      setCallStatus('Media access denied.');
      setInCall(false);
    }
  };

  const handleRemoteSignaling = async (payload: any) => {
    if (!wsRef.current) return;

    try {
      if (payload.type === 'offer') {
        setInCall(true);
        setCallStatus('Receiving video call...');
        
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCallStatus('Insecure Context Blocked camera access.');
          setInCall(false);
          alert('Cannot accept video call in insecure HTTP context.');
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        });
        pcRef.current = pc;

        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });

        pc.onicecandidate = (event) => {
          if (event.candidate && wsRef.current) {
            wsRef.current.send(JSON.stringify({
              type: 'webrtc',
              payload: { type: 'candidate', candidate: event.candidate }
            }));
          }
        };

        pc.ontrack = (event) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
          setCallStatus('Active Call');
        };

        await pc.setRemoteDescription(new RTCSessionDescription(payload));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        wsRef.current.send(JSON.stringify({
          type: 'webrtc',
          payload: answer
        }));

        setCallStatus('Active Call');
      } else if (payload.type === 'answer') {
        if (pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload));
          setCallStatus('Active Call');
        }
      } else if (payload.type === 'candidate') {
        if (pcRef.current) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
        }
      }
    } catch (err) {
      console.error('Signaling error', err);
    }
  };

  const endCall = () => {
    setInCall(false);
    setCallStatus('Idle');
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = micMuted;
        setMicMuted(!micMuted);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = videoMuted;
        setVideoMuted(!videoMuted);
      }
    }
  };

  // Copy Room Link to clipboard with secure context clipboard API fallback
  const handleCopyLink = () => {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(roomId).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch((err) => {
        console.error('Failed to copy using clipboard API', err);
        fallbackCopyText(roomId);
      });
    } else {
      fallbackCopyText(roomId);
    }
  };

  const fallbackCopyText = (text: string) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      
      // Place off-screen so it's not visible
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.opacity = '0';
      
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        alert('Failed to copy code. Please copy it manually: ' + text);
      }
    } catch (err) {
      console.error('Fallback copy failed', err);
      alert('Failed to copy code. Please copy it manually: ' + text);
    }
  };



  if (!user || !room) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-[#0a0a0c]">
        <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
        <span className="text-gray-400 text-sm">Opening Cinema Theater...</span>
      </div>
    );
  }

  return (
    <div 
      className="flex-1 flex flex-col bg-[#0a0a0c] overflow-hidden fixed inset-0 w-full"
      style={{ height: viewportHeight }}
    >
      <style dangerouslySetInnerHTML={{__html: `
        body, html {
          overflow: hidden !important;
          height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        ::-webkit-scrollbar {
          display: none !important;
        }
        * {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
      `}} />
      {/* Hidden local file uploader input element */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="video/*,image/*"
        className="hidden"
      />

      {/* Upper header */}
      <header className="px-6 py-3.5 bg-black/40 border-b border-white/5 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-purple-600/10 border border-purple-500/20 rounded-xl relative">
            <Tv className="w-5 h-5 text-purple-400" />
            {connected ? (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            ) : (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 inline-block"></span>
            )}
          </div>
        </div>

        {/* Dynamic Layout Mode Selector */}
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 select-none gap-1 shrink-0">
          <button
            onClick={() => setLayoutMode('both')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
              layoutMode === 'both'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Video + Chat</span>
            <span className="sm:hidden">Both</span>
          </button>
          <button
            onClick={() => {
              setLayoutMode('chat_only');
              setActiveTab('chat');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
              layoutMode === 'chat_only'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Chat Only</span>
            <span className="sm:hidden">Chat</span>
          </button>
        </div>
      </header>

      {/* Main Split workspace - Ultra Responsive stacked on mobile, side-by-side on desktop */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Column (Desktop Right): Synced Video Player. Stacked top on mobile (order 1), fills right side on desktop (order 2) */}
        {layoutMode === 'both' && (
          <div className={`w-full lg:flex-1 order-1 lg:order-2 flex flex-col lg:justify-between overflow-hidden relative transition-all duration-300 ${
            isKeyboardOpen ? 'h-0 opacity-0 pointer-events-none p-0 overflow-hidden shrink-0' : 'p-3 sm:p-5 shrink-0 lg:shrink'
          }`}>
          {/* Ambient Cinema Hue Backlight Glow */}
          <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] aspect-video bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 rounded-[50px] filter blur-[100px] transition-all duration-1000 -z-10 ${
            room?.is_playing ? 'opacity-30 scale-105 animate-pulse' : 'opacity-10 scale-100'
          }`} />

          {/* Compact Toggle for Media Controls on Mobile */}
          <div className="flex lg:hidden items-center justify-between mb-2 shrink-0">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              {room?.is_playing ? 'Playing synced video' : 'Screen Idle'}
            </span>
            <button
              onClick={() => setShowControlsMobile(!showControlsMobile)}
              className="px-3 py-1.5 bg-purple-600/10 border border-purple-500/30 text-purple-400 hover:text-purple-300 text-[10px] font-bold rounded-lg transition-all active:scale-95 flex items-center gap-1"
            >
              <Film className="w-3 h-3" />
              <span>{showControlsMobile ? 'Hide Controls' : 'Change Video / Upload'}</span>
            </button>
          </div>

          {/* Load Video form input & File Uploader */}
          <div className={`${showControlsMobile ? 'flex' : 'hidden lg:flex'} mb-3 shrink-0 flex flex-col sm:flex-row gap-2.5`}>
            <form onSubmit={handleLoadNewVideo} className="flex-1 flex gap-2">
              <input
                type="text"
                value={videoUrlInput}
                onChange={(e) => setVideoUrlInput(e.target.value)}
                placeholder="Paste direct MP4 video link or YouTube video URL"
                className="flex-1 px-4 py-2.5 bg-black/30 border border-white/10 rounded-xl text-white text-base sm:text-xs placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Load URL</span>
              </button>
            </form>

            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/30 text-white text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UploadCloud className="w-4 h-4" />
                )}
                <span>{uploading ? `Uploading ${uploadProgress}%` : 'Upload'}</span>
              </button>

              <button
                onClick={toggleFullscreen}
                className="px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                title="Cinema Fullscreen"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                <span className="hidden sm:inline">Cinema Mode</span>
              </button>
            </div>
          </div>

          {/* Core Player display box. On mobile has aspect-video ratio, on desktop scales relative to space */}
          <div 
            ref={playerContainerRef} 
            onTouchStart={handlePlayerTouchStart}
            onTouchEnd={handlePlayerTouchEnd}
            className="flex-1 flex items-center justify-center bg-black rounded-2xl border border-white/5 relative overflow-hidden aspect-video w-full lg:max-h-[85%] mx-auto shadow-2xl animate-fade-in shrink-0 lg:shrink"
          >
            {uploading && (
              <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-20">
                <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mb-4" />
                <h4 className="text-white text-sm font-bold mb-2">Uploading File to Server...</h4>
                <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-400 transition-all duration-100" 
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-500 mt-2">{uploadProgress}% Complete</span>
              </div>
            )}

            {currentVideoUrl ? (
              ytVideoId ? (
                /* YouTube Official Iframe API integration wrapper */
                <div key={ytVideoId} className="w-full h-full rounded-2xl overflow-hidden">
                  <div id="yt-player" className="w-full h-full"></div>
                </div>
              ) : isEmbedUrl(currentVideoUrl) ? (
                /* General Website Iframe Embed Mode (MovieBox, xHamster, custom embeds) */
                <div key={currentVideoUrl} className="w-full h-full rounded-2xl overflow-hidden bg-black relative">
                  <iframe
                    src={getCleanEmbedUrl(currentVideoUrl)}
                    className="w-full h-full border-0 absolute inset-0 bg-[#060608]"
                    allow="autoplay; encrypted-media; gyroscope; picture-in-picture; clipboard-write"
                    allowFullScreen
                    sandbox="allow-same-origin allow-scripts allow-forms allow-pointer-lock allow-popups allow-presentation"
                  ></iframe>
                </div>
              ) : (
                /* HTML5 Direct Video streaming mode (Fixed source React rendering) */
                <video
                  ref={videoRef}
                  src={currentVideoUrl}
                  controls
                  playsInline
                  preload="auto"
                  controlsList="nodownload"
                  onContextMenu={(e) => e.preventDefault()}
                  onPlay={onVideoPlay}
                  onPause={onVideoPause}
                  onSeeked={onVideoSeeked}
                  className="w-full h-full object-contain"
                >
                  Your browser does not support the video tag.
                </video>
              )
            ) : (
              /* Landing display when player is empty - Ultra Premium Clean Lounge Screen */
              <div className="flex flex-col items-center p-6 text-center max-w-lg mx-auto animate-fade-in">
                <div className="p-4 bg-purple-600/10 border border-purple-500/25 rounded-2xl mb-4 animate-pulse shrink-0">
                  <Tv className="w-10 h-10 text-purple-400" />
                </div>
                <h3 className="text-sm font-extrabold text-white mb-2 tracking-wide shrink-0">Lounge Screen Idle</h3>
                <p className="text-gray-400 text-xs max-w-xs leading-relaxed shrink-0">
                  Paste a video link or upload a file above to start watching in perfect real-time sync with your partner.
                </p>
              </div>
            )}

            {/* FULLSCREEN CHAT OVERLAY */}
            {isFullscreen && (
              <div 
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                className={`absolute right-4 top-4 bottom-4 w-80 bg-black/75 backdrop-blur-md border border-white/10 rounded-2xl flex flex-col z-30 shadow-2xl overflow-hidden transition-all duration-300 ease-in-out transform ${
                  showFullscreenChat ? 'translate-x-0 opacity-100' : 'translate-x-[calc(100%+16px)] opacity-0 pointer-events-none'
                }`}
              >
                <div className="px-4 py-3 bg-black/40 border-b border-white/5 flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-purple-400" />
                    Cinema Chat
                  </span>
                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={() => setShowFullscreenChat(false)} 
                      className="p-1 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded transition-all cursor-pointer"
                      title="Hide Chat (Swipe right to close)"
                    >
                      <Minimize className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      type="button"
                      onClick={toggleFullscreen} 
                      className="text-[10px] bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-gray-400 hover:text-white cursor-pointer"
                    >
                      Exit
                    </button>
                  </div>
                </div>
                
                {/* Floating Chat Message Scroll */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {messages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4 my-auto min-h-[150px]">
                      <p className="text-gray-500 text-[10px]">No messages yet.</p>
                    </div>
                  ) : (
                    messages.map((msg, index) => {
                      const isSelf = msg.sender_name === user.username;
                      const isSystem = msg.sender_name === 'System';

                      if (isSystem) {
                        return (
                          <div key={index} className="flex justify-center">
                            <span className="px-2 py-0.5 bg-white/5 text-gray-500 text-[8px] rounded-full">
                              {msg.content}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div key={index} className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                          <span className="text-[8px] text-gray-500 font-semibold px-1 mb-0.5">{msg.sender_name}</span>
                          <div className={`px-3 py-1.5 max-w-[90%] rounded-xl text-[10px] leading-relaxed ${
                            isSelf 
                              ? 'bg-purple-600 text-white rounded-tr-none' 
                              : 'bg-white/10 text-gray-200 rounded-tl-none border border-white/5'
                          }`}>
                            {msg.content}
                          </div>
                        </div>
                      );
                    })
                  )}
                  {partnerIsTyping && (
                    <div className="flex flex-col animate-fade-in items-start py-1 shrink-0">
                      <div className="flex items-center gap-1 mb-0.5 px-0.5">
                        <span className="text-[9px] text-purple-400 font-bold">{partnerUsername || 'Partner'}</span>
                        <span className="text-[8px] text-gray-500 italic">is typing...</span>
                      </div>
                      <div className="px-3 py-2 bg-white/5 border border-white/5 rounded-xl rounded-tl-none flex items-center gap-1">
                        <span className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Floating Chat Input form */}
                <form onSubmit={handleSendChat} className="p-2 border-t border-white/5 bg-black/40 flex gap-1.5">
                  <input
                    ref={fullscreenChatInputRef}
                    type="text"
                    value={chatInput}
                    onChange={(e) => handleChatInputChange(e.target.value)}
                    placeholder="Type in fullscreen..."
                    className="flex-1 px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-white text-base sm:text-[10px] placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="p-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/30 text-white rounded-xl active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}

            {/* Floating Chat Button for fullscreen when drawer is closed */}
            {isFullscreen && !showFullscreenChat && (
              <button
                type="button"
                onClick={() => setShowFullscreenChat(true)}
                className="absolute right-4 top-4 p-3.5 bg-purple-600/85 hover:bg-purple-600 hover:scale-105 active:scale-95 text-white rounded-full z-30 shadow-2xl backdrop-blur-sm transition-all flex items-center justify-center cursor-pointer animate-fade-in border border-white/10"
                title="Open Cinema Chat (Swipe left from right edge to open)"
              >
                <MessageSquare className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500"></span>
                </span>
              </button>
            )}
          </div>
        </div>
        )}

        {/* Left Column (Desktop Left): Tabbed Sidebar Panel (Responsive inline-stacked bottom on mobile (order 2), side-aligned on desktop (order 1)) */}
        <aside className={`w-full order-2 lg:order-1 border-white/5 bg-[#121217] flex flex-col flex-1 min-h-0 overflow-hidden transition-all duration-300 ${
          layoutMode === 'both' 
            ? 'lg:w-96 border-t lg:border-t-0 lg:border-r lg:flex-none lg:h-full' 
            : 'w-full lg:w-full border-t-0 border-r-0 lg:h-full'
        }`}>
          {/* Tab Selector */}
          {layoutMode === 'both' && (
            <div className="flex border-b border-white/5 bg-black/20 shrink-0">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer relative ${
                  activeTab === 'chat' 
                    ? 'border-purple-500 text-white bg-white/5' 
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat</span>
                {partnerIsTyping && activeTab !== 'chat' && (
                  <span className="absolute right-4 top-3.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('library')}
                className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'library' 
                    ? 'border-purple-500 text-white bg-white/5' 
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Library</span>
              </button>
              <button
                onClick={() => setActiveTab('call')}
                className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'call' 
                    ? 'border-purple-500 text-white bg-white/5' 
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Call</span>
              </button>
            </div>
          )}

          {/* TAB CONTENT: Chat panel */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col overflow-hidden h-full">
              {/* Chat Message Scroll */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 my-auto min-h-[200px]">
                    <MessageSquare className="w-8 h-8 text-gray-600 mb-2" />
                    <p className="text-gray-500 text-xs">No messages yet.</p>
                    <p className="text-gray-600 text-[10px]">Your messages are securely recorded in the database.</p>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isSelf = msg.sender_name === user.username;
                    const isSystem = msg.sender_name === 'System';

                    if (isSystem) {
                      return (
                        <div key={index} className="flex justify-center">
                          <span className="px-3 py-1 bg-white/5 border border-white/5 text-gray-500 text-[10px] rounded-full animate-fade-in">
                            {msg.content}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div key={index} className={`flex flex-col animate-fade-in ${isSelf ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          <span className="text-[10px] text-gray-500 font-semibold">{msg.sender_name}</span>
                        </div>
                        <div className={`px-4 py-2.5 max-w-[85%] rounded-2xl text-xs leading-relaxed ${
                          isSelf 
                            ? 'bg-purple-600 text-white rounded-tr-none' 
                            : 'bg-white/5 text-gray-200 border border-white/5 rounded-tl-none'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    );
                  })
                )}
                {partnerIsTyping && (
                  <div className="flex flex-col animate-fade-in items-start py-1 shrink-0">
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span className="text-[10px] text-purple-400 font-bold">{partnerUsername || 'Partner'}</span>
                      <span className="text-[9px] text-gray-500 italic">is typing...</span>
                    </div>
                    <div className="px-4 py-3 bg-white/5 border border-white/5 rounded-2xl rounded-tl-none flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleSendChat} className="p-3 border-t border-white/5 bg-black/20 shrink-0 flex gap-2 relative">
                {/* Emoji Picker Drawer */}
                {showEmojiPicker && (
                  <div className="emoji-picker-container absolute bottom-16 left-3 right-3 bg-[#16161f]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-30 p-3 h-64 flex flex-col overflow-hidden animate-fade-in">
                    <div className="flex justify-between items-center pb-2 border-b border-white/5 mb-2 shrink-0">
                      <span className="text-[10px] font-extrabold tracking-wider text-purple-400 uppercase">Express Yourself</span>
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(false)}
                        className="text-[10px] text-gray-500 hover:text-white px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 transition-all"
                      >
                        Close
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin">
                      {EMOJI_CATEGORIES.map((category, catIndex) => (
                        <div key={catIndex} className="space-y-1">
                          <h4 className="text-[9px] font-bold text-gray-500 px-1">{category.name}</h4>
                          <div className="grid grid-cols-8 gap-1.5">
                            {category.emojis.map((emoji, emojiIndex) => (
                              <button
                                key={emojiIndex}
                                type="button"
                                onClick={() => {
                                  setChatInput(prev => prev + emoji);
                                  handleChatInputChange(chatInput + emoji);
                                }}
                                className="w-8 h-8 flex items-center justify-center text-lg hover:bg-white/10 rounded-lg active:scale-90 transition-all cursor-pointer"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <input
                  ref={chatInputRef}
                  type="text"
                  value={chatInput}
                  onChange={(e) => handleChatInputChange(e.target.value)}
                  placeholder="Type message..."
                  className="flex-1 px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white text-base sm:text-xs placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-all"
                />

                {/* Emoji toggle button */}
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`p-2.5 rounded-xl border border-white/5 transition-all cursor-pointer shrink-0 active:scale-95 flex items-center justify-center ${
                    showEmojiPicker 
                      ? 'bg-purple-600/20 border-purple-500/30 text-purple-400' 
                      : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                  title="Insert Emoji"
                >
                  <Smile className="w-4 h-4" />
                </button>

                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="p-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/30 text-white rounded-xl transition-all cursor-pointer shrink-0 active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* TAB CONTENT: Persistent Room Media Library history (with DELETE operations) */}
          {activeTab === 'library' && (
            <div className="flex-1 flex flex-col overflow-hidden h-full bg-black/5">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white/80 text-[10px] font-bold uppercase tracking-wider">
                    Room Shared Playlist
                  </h4>
                  <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-[9px] text-gray-400 font-semibold rounded-full">
                    {sharedMedia.length} Videos
                  </span>
                </div>

                {sharedMedia.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/5 rounded-2xl bg-black/20">
                    <Film className="w-8 h-8 text-gray-600 mb-2 animate-pulse" />
                    <p className="text-gray-400 text-xs font-semibold">Playlist is empty</p>
                    <p className="text-gray-500 text-[9px] max-w-[180px] leading-relaxed mt-1">
                      Paste a video URL or click <strong>"Upload"</strong> above. All shared media will be recorded here forever!
                    </p>
                  </div>
                ) : (
                  sharedMedia.map((media) => {
                    const isCurrent = media.video_url === currentVideoUrl;
                    return (
                      <div 
                        key={media.id}
                        className={`p-3.5 rounded-2xl border transition-all relative flex flex-col gap-1.5 group overflow-hidden ${
                          isCurrent
                            ? 'bg-purple-600/10 border-purple-500/35 hover:bg-purple-600/15 shadow-md shadow-purple-600/5'
                            : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10 shadow-sm'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 relative z-10">
                          {/* Left area click to load video in sync */}
                          <div 
                            onClick={() => {
                              if (media.video_url === currentVideoUrl) return;
                              setCurrentVideoUrl(media.video_url);
                              setVideoUrlInput(media.video_url);
                              broadcastVideoSync('change_video', 0.0, media.video_url);
                            }}
                            className="flex-1 cursor-pointer"
                          >
                            <span className={`text-xs font-semibold leading-snug line-clamp-2 ${isCurrent ? 'text-purple-400 font-bold' : 'text-gray-200'}`} title={media.title}>
                              {media.title}
                            </span>
                          </div>

                          {/* Delete Playlist Row Button (Hover state activated) */}
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!confirm(`Do you want to delete "${media.title}" from the cinema playlist?`)) return;
                              
                              const token = localStorage.getItem('access_token');
                              try {
                                const res = await fetch(`${apiBase}/api/rooms/${roomId}/media/${media.id}/`, {
                                  method: 'DELETE',
                                  headers: { 'Authorization': `Bearer ${token}` }
                                });
                                
                                if (res.ok) {
                                  // If the active playing video is deleted, reset the playhead and unload players
                                  if (media.video_url === currentVideoUrl) {
                                    setCurrentVideoUrl('');
                                    setVideoUrlInput('');
                                    broadcastVideoSync('change_video', 0.0, '');
                                  }
                                  
                                  // Refresh media list locally
                                  fetchRoomMediaHistory();
                                }
                              } catch (err) {
                                console.error('Error deleting media', err);
                              }
                            }}
                            className="p-1.5 bg-red-500/10 hover:bg-red-500/25 border border-transparent hover:border-red-500/20 text-red-400 hover:text-red-300 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 flex items-center justify-center shrink-0 active:scale-95 cursor-pointer"
                            title="Delete Video"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-gray-500 mt-1">
                          <span className="font-semibold">By {media.added_by_name}</span>
                          <span>{new Date(media.added_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB CONTENT: Live WebRTC Video Call */}
          {activeTab === 'call' && (
            <div className="flex-1 p-4 flex flex-col justify-between overflow-y-auto h-full bg-black/10">
              {/* Feeds Viewbox */}
              <div className="flex-1 flex flex-col gap-4 items-stretch mb-4 justify-center">
                {inCall ? (
                  <div className="grid grid-cols-1 gap-4 w-full">
                    {/* Remote Stream Video */}
                    <div className="bg-black border border-white/5 rounded-2xl overflow-hidden aspect-video relative shadow-2xl">
                      <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-black/60 rounded-lg border border-white/10 text-[10px] text-gray-300 font-semibold uppercase tracking-wider backdrop-blur-md">
                        {partnerUsername ? partnerUsername : 'Remote Feed'}
                      </div>
                    </div>

                    {/* Local Feed Pip */}
                    <div className="bg-black border border-white/5 rounded-2xl overflow-hidden aspect-video relative max-w-[150px] self-end shadow-xl">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-purple-600/80 rounded-md text-[8px] text-white font-bold uppercase backdrop-blur-sm">
                        You
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-8 border border-dashed border-white/10 rounded-2xl">
                    <Video className="w-10 h-10 text-gray-700 mx-auto mb-3 animate-pulse" />
                    <h4 className="text-white text-sm font-bold mb-1">Start Private Stream</h4>
                    <p className="text-gray-500 text-xs leading-relaxed max-w-[200px] mx-auto">
                      Initiate a low-latency WebRTC P2P direct voice/video call with your connected partner.
                    </p>
                  </div>
                )}
              </div>

              {/* Status Indicator */}
              <div className="mb-4 shrink-0 flex items-center justify-center gap-2 p-2 bg-white/5 border border-white/5 rounded-xl text-[10px] text-gray-400 font-semibold tracking-wide">
                <AlertCircle className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="truncate">Call Status: {callStatus}</span>
              </div>

              {/* Controls panel */}
              <div className="shrink-0 space-y-3">
                {inCall ? (
                  <div className="flex gap-2">
                    <button
                      onClick={toggleMic}
                      className={`flex-1 py-3 border rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer ${
                        micMuted 
                          ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                          : 'bg-white/5 border-white/5 hover:bg-white/10 text-white'
                      }`}
                    >
                      {micMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      <span>{micMuted ? 'Unmute' : 'Mute'}</span>
                    </button>
                    
                    <button
                      onClick={toggleVideo}
                      className={`flex-1 py-3 border rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer ${
                        videoMuted 
                          ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                          : 'bg-white/5 border-white/5 hover:bg-white/10 text-white'
                      }`}
                    >
                      {videoMuted ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                      <span>{videoMuted ? 'Show Cam' : 'Hide Cam'}</span>
                    </button>

                    <button
                      onClick={endCall}
                      className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs active:scale-95 cursor-pointer"
                    >
                      End
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={startCall}
                    disabled={!partnerUsername}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/30 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <Video className="w-4 h-4" />
                    <span>Start Video Call</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
