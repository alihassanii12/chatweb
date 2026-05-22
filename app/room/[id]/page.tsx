'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Tv, Send, Copy, Check, MessageSquare, Video, VideoOff, 
  Mic, MicOff, Play, Pause, RefreshCw, Users, AlertCircle, ArrowLeft, Loader2, UploadCloud, Paperclip, Maximize, Minimize, Film, Trash2, Smile 
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { getAccessToken, getApiBase, getStoredUser, getWsBase } from '@/lib/auth';
import { getCleanEmbedUrl, getYouTubeId, isEmbedUrl } from '@/lib/video';
import { ChatMessage } from '@/components/ui/ChatMessage';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { CinemaModeToggle } from '@/components/room/CinemaModeToggle';
import { MobileRoomHeader } from '@/components/room/MobileRoomHeader';
import { MobileTabBar } from '@/components/room/MobileTabBar';
import { useIsMobile } from '@/hooks/useIsMobile';

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
  
  const apiBase = getApiBase();
  const wsBase = getWsBase();
  const isMobile = useIsMobile();
  
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
  const [viewportStyle, setViewportStyle] = useState<React.CSSProperties>({
    height: '100dvh',
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
  });
  const [showControlsMobile, setShowControlsMobile] = useState(false);
  const [cinemaMode, setCinemaMode] = useState(false);
  const [showFullscreenChat, setShowFullscreenChat] = useState(true);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);

  // Dynamic Simulated Mobile Fullscreen style selection
  const getFullscreenStyle = (): React.CSSProperties | undefined => {
    if (!isFullscreen || typeof window === 'undefined') return undefined;
    const isMobile = window.innerWidth < 1024;
    return isMobile ? viewportStyle : undefined;
  };

  // References
  const wsRef = useRef<WebSocket | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const chatInputRef = useRef<HTMLInputElement | null>(null);
  const fullscreenChatInputRef = useRef<HTMLInputElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const fullscreenChatContainerRef = useRef<HTMLDivElement | null>(null);
  
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
    const token = getAccessToken();
    const userData = getStoredUser();
    if (!token || !userData) {
      router.push('/login');
    } else {
      setUser(userData);
    }
  }, [router]);

  // Track Fullscreen state natively & handle landscape orientation lock
  useEffect(() => {
    const handleFullscreenChange = async () => {
      const isFS = !!document.fullscreenElement;
      const isMobile = window.innerWidth < 1024;
      if (!isMobile) {
        setIsFullscreen(isFS);
        if (isFS) {
          setShowFullscreenChat(true);
        }
      }
      
      if (isFS) {
        // Force screen orientation lock to landscape
        const screenAny = screen as any;
        if (screenAny.orientation && typeof screenAny.orientation.lock === 'function') {
          try {
            await screenAny.orientation.lock('landscape');
          } catch (err) {
            console.log('Screen orientation lock is not supported or was rejected:', err);
          }
        }
      } else if (!isFS && !isMobile) {
        // Unlock orientation when exiting fullscreen (desktop only)
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
      setIsPortrait(window.innerWidth < window.innerHeight);
      if (window.visualViewport) {
        const vv = window.visualViewport;
        const isMobile = vv.width < 768;
        const isKeyboard = vv.height < 500 && isMobile;
        setIsKeyboardOpen(isKeyboard);
        
        // Dynamically match visual viewport perfectly to eliminate any bouncing/shifting
        setViewportStyle({
          position: 'fixed',
          top: `${vv.offsetTop}px`,
          left: `${vv.offsetLeft}px`,
          height: `${vv.height}px`,
          width: `${vv.width}px`,
        });
      } else {
        setViewportStyle({
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100dvh',
          width: '100%',
        });
        setIsKeyboardOpen(false);
      }
      
      resetScroll();
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
    
    handleResize();

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleWindowScroll);
    };
  }, []);

  const toggleCinemaMode = () => {
    setCinemaMode((on) => {
      const next = !on;
      if (!next) {
        if (activeTab === 'library') setActiveTab('chat');
        if (isFullscreen) {
          setIsFullscreen(false);
          const screenAny = screen as { orientation?: { unlock?: () => void } };
          screenAny.orientation?.unlock?.();
        }
      }
      return next;
    });
  };

  // Fetch Room Media History List API
  const fetchRoomMediaHistory = async () => {
    if (!getAccessToken()) return;
    try {
      const res = await apiFetch(`/api/rooms/${roomId}/media/`);
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

    const fetchRoomDetail = async () => {
      try {
        const res = await apiFetch(`/api/rooms/${roomId}/`);
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
        const res = await apiFetch(`/api/rooms/${roomId}/chat/`);
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
    const token = getAccessToken();
    if (!token) return;
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

  // Scroll Chat to bottom helper (Direct container scroll avoids page-level jumping/bouncing caused by scrollIntoView)
  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior
      });
    }
    if (fullscreenChatContainerRef.current) {
      fullscreenChatContainerRef.current.scrollTo({
        top: fullscreenChatContainerRef.current.scrollHeight,
        behavior
      });
    }
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
  }, [viewportStyle.height, activeTab]);

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
    const token = getAccessToken();
    if (!token) return;
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

    // Focus preservation: Keep the input focused so virtual keyboard doesn't close.
    // If it's already focused, do not call .focus() again to avoid virtual keyboard flickering/bouncing.
    const activeInput = isFullscreen ? fullscreenChatInputRef.current : chatInputRef.current;
    if (activeInput && document.activeElement !== activeInput) {
      setTimeout(() => {
        activeInput.focus();
      }, 30);
    }
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
    
    const isMobile = window.innerWidth < 1024;
    
    if (isMobile) {
      // Mobile: Use simulated fullscreen to avoid native fullscreen virtual keyboard layout issues
      setIsFullscreen(prev => {
        const next = !prev;
        if (next) {
          setShowFullscreenChat(true);
          // Try to lock screen orientation to landscape on mobile
          const screenAny = screen as any;
          if (screenAny.orientation && typeof screenAny.orientation.lock === 'function') {
            screenAny.orientation.lock('landscape').catch(() => {});
          }
        } else {
          // Unlock orientation when exiting fullscreen
          const screenAny = screen as any;
          if (screenAny.orientation && typeof screenAny.orientation.unlock === 'function') {
            screenAny.orientation.unlock();
          }
        }
        return next;
      });
    } else {
      // Desktop: Use native browser fullscreen
      if (!document.fullscreenElement) {
        playerContainerRef.current.requestFullscreen().catch((err) => {
          console.error('Error enabling fullscreen', err);
        });
      } else {
        document.exitFullscreen();
      }
    }
  };

  // Fullscreen touch gesture handlers (swipe to close/open chat drawer)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchEndX - touchStartX.current;
    const diffY = touchEndY - touchStartY.current;
    
    if (isPortrait) {
      // Swipe down to close chat drawer
      if (diffY > 60) {
        setShowFullscreenChat(false);
      }
    } else {
      // Swipe left (towards left edge) to close open chat drawer
      if (diffX < -60) {
        setShowFullscreenChat(false);
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handlePlayerTouchStart = (e: React.TouchEvent) => {
    if (!isFullscreen) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handlePlayerTouchEnd = (e: React.TouchEvent) => {
    if (!isFullscreen || touchStartX.current === null || touchStartY.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchEndX - touchStartX.current;
    const diffY = touchEndY - touchStartY.current;
    
    const containerWidth = playerContainerRef.current?.clientWidth || window.innerWidth;
    const containerHeight = playerContainerRef.current?.clientHeight || window.innerHeight;
    
    if (isPortrait) {
      // Swipe down to close open chat
      if (showFullscreenChat && diffY > 60) {
        setShowFullscreenChat(false);
      }
      // Swipe up from bottom 25% edge of screen to open chat
      else if (!showFullscreenChat && diffY < -60) {
        if (touchStartY.current > containerHeight * 0.75) {
          setShowFullscreenChat(true);
        }
      }
    } else {
      // Swipe left (towards left edge) to close open chat
      if (showFullscreenChat && diffX < -60) {
        setShowFullscreenChat(false);
      }
      // Swipe right from left 25% edge of screen to open chat
      else if (!showFullscreenChat && diffX > 60) {
        if (touchStartX.current < containerWidth * 0.25) {
          setShowFullscreenChat(true);
        }
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
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
      <LoadingScreen
        title="Private Cinema"
        subtitle="Connecting to your theater..."
      />
    );
  }

  return (
    <div 
      className="flex-1 flex flex-col bg-[#0a0a0c] overflow-hidden"
      style={viewportStyle}
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

      <MobileRoomHeader
        connected={connected}
        partnerUsername={partnerUsername}
        cinemaMode={cinemaMode}
        onCinemaToggle={toggleCinemaMode}
      />

      <header className="hidden lg:flex px-4 py-2 border-b border-white/5 items-center justify-between gap-3 z-10 shrink-0 bg-[#0a0a0c]">
        <div className="flex items-center gap-2 min-w-0 text-xs">
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              connected ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          />
          <span className="text-white font-medium">Private Cinema</span>
          <span className="text-gray-600 truncate">
            {partnerUsername ? `· ${partnerUsername}` : '· chat & call'}
          </span>
        </div>
        <CinemaModeToggle enabled={cinemaMode} onToggle={toggleCinemaMode} />
      </header>

      {/* Main workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative min-h-0">
        {/* Left Column (Desktop Right): Synced Video Player. Stacked top on mobile (order 1), fills right side on desktop (order 2) */}
        {cinemaMode && (
          <div className={`w-full lg:flex-1 order-1 lg:order-2 flex flex-col overflow-hidden relative min-h-0 shrink-0 ${
            isKeyboardOpen || (isMobile && activeTab === 'call') ? 'hidden' : 'p-2 sm:p-5'
          }`}>
          {/* Ambient Cinema Hue Backlight Glow */}
          <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] aspect-video bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 rounded-[50px] filter blur-[100px] transition-all duration-1000 -z-10 ${
            room?.is_playing ? 'opacity-30 scale-105 animate-pulse' : 'opacity-10 scale-100'
          }`} />

          {/* Compact Toggle for Media Controls on Mobile */}
          <div className="flex lg:hidden items-center justify-between mb-1.5 shrink-0 gap-2">
            <span className="text-[10px] text-gray-600 truncate">
              {room?.is_playing ? 'Playing' : 'Idle'}
            </span>
            <button
              type="button"
              onClick={() => setShowControlsMobile(!showControlsMobile)}
              className="px-2 py-1 text-[10px] text-gray-500 bg-white/5 rounded"
            >
              {showControlsMobile ? 'Hide' : 'URL'}
            </button>
          </div>

          {/* Load Video form — mobile: stacked grid; desktop: row */}
          <div
            className={`${
              showControlsMobile ? 'grid' : 'hidden lg:grid'
            } lg:flex mb-2 lg:mb-3 shrink-0 grid-cols-2 gap-2 lg:flex-row lg:gap-2.5`}
          >
            <form onSubmit={handleLoadNewVideo} className="col-span-2 lg:flex-1 flex gap-2">
              <input
                type="text"
                value={videoUrlInput}
                onChange={(e) => setVideoUrlInput(e.target.value)}
                placeholder="YouTube or MP4 link"
                className="cinema-input flex-1 text-sm"
              />
              <button
                type="submit"
                className="cinema-btn cinema-btn-primary shrink-0"
                aria-label="Load video"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Load</span>
              </button>
            </form>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="cinema-btn cinema-btn-success col-span-1"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UploadCloud className="w-4 h-4" />
              )}
              <span className="truncate">{uploading ? `${uploadProgress}%` : 'Upload'}</span>
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="cinema-btn cinema-btn-secondary col-span-1"
              title="Cinema Fullscreen"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              <span className="lg:hidden">Full</span>
              <span className="hidden lg:inline">Cinema Mode</span>
            </button>
          </div>

          {/* Core Player display box. On mobile has aspect-video ratio, on desktop scales relative to space.
              When in fullscreen mode, uses CSS Flexbox to layout video and chat drawer side-by-side dynamically. */}
          <div 
            ref={playerContainerRef} 
            onTouchStart={handlePlayerTouchStart}
            onTouchEnd={handlePlayerTouchEnd}
            className={isFullscreen 
              ? `fixed z-[100] flex ${isPortrait ? 'flex-col' : 'flex-row'} bg-black overflow-hidden shadow-2xl animate-fade-in items-stretch justify-between rounded-none border-0`
              : "mobile-player-height lg:flex-1 flex items-center justify-center bg-black rounded-xl lg:rounded-2xl border border-white/5 relative overflow-hidden w-full lg:max-h-[85%] lg:aspect-video mx-auto shadow-2xl animate-fade-in shrink-0"
            }
            style={getFullscreenStyle()}
          >
            {/* Left Column: Fullscreen Chat drawer */}
            {isFullscreen && (
              <div 
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                className={`bg-[#0d0d12] ${isPortrait ? 'border-t' : 'border-r'} border-white/5 flex flex-col z-30 shadow-2xl overflow-hidden transition-all duration-300 ease-in-out ${
                  showFullscreenChat 
                    ? (isPortrait ? 'w-full h-[45%] opacity-100 visible' : 'w-[320px] h-full opacity-100 visible') 
                    : (isPortrait ? 'w-full h-0 opacity-0 invisible pointer-events-none' : 'w-0 h-full opacity-0 invisible pointer-events-none')
                } shrink-0`}
              >
                <div className="px-4 py-3 bg-black/40 border-b border-white/5 flex items-center justify-between shrink-0">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-purple-400" />
                    Cinema Chat
                  </span>
                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={() => setShowFullscreenChat(false)} 
                      className="p-1 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded transition-all cursor-pointer"
                      title={isPortrait ? "Hide Chat (Swipe down to close)" : "Hide Chat (Swipe left to close)"}
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
                <div ref={fullscreenChatContainerRef} className="flex-1 overflow-y-auto p-3 space-y-3">
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
                <form onSubmit={handleSendChat} className="p-2 border-t border-white/5 bg-black/40 flex gap-1.5 shrink-0">
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
                    onMouseDown={(e) => e.preventDefault()}
                    onTouchStart={(e) => e.preventDefault()}
                    className="p-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/30 text-white rounded-xl active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}

            {/* Right Column: Video player area (fills container normally, transitions to dynamic size when chat is open in fullscreen) */}
            <div className={`relative flex items-center justify-center bg-black transition-all duration-300 ${
              isFullscreen 
                ? (isPortrait 
                    ? (showFullscreenChat ? 'w-full h-[55%]' : 'w-full h-full')
                    : (showFullscreenChat ? 'w-[calc(100%-320px)] h-full' : 'w-full h-full')
                  )
                : 'w-full h-full'
            }`}>
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
                  <div key={ytVideoId} className="w-full h-full overflow-hidden">
                    <div id="yt-player" className="w-full h-full"></div>
                  </div>
                ) : isEmbedUrl(currentVideoUrl) ? (
                  /* General Website Iframe Embed Mode */
                  <div key={currentVideoUrl} className="w-full h-full overflow-hidden bg-black relative">
                    <iframe
                      src={getCleanEmbedUrl(currentVideoUrl)}
                      className="w-full h-full border-0 absolute inset-0 bg-[#060608]"
                      allow="autoplay; encrypted-media; gyroscope; picture-in-picture; clipboard-write"
                      allowFullScreen
                      sandbox="allow-same-origin allow-scripts allow-forms allow-pointer-lock allow-popups allow-presentation"
                    ></iframe>
                  </div>
                ) : (
                  /* HTML5 Direct Video streaming mode */
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
                /* Landing display when player is empty */
                <div className="flex flex-col items-center p-8 text-center max-w-lg mx-auto animate-fade-in">
                  <div className="p-5 bg-gradient-to-br from-purple-600/20 to-pink-600/10 border border-purple-500/30 rounded-3xl mb-5 shrink-0">
                    <Tv className="w-12 h-12 text-purple-300" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2 tracking-wide shrink-0">
                    Screen is ready
                  </h3>
                  <p className="text-gray-500 text-xs max-w-[260px] leading-relaxed shrink-0">
                    Paste a YouTube or MP4 link, or upload a file to start watching in sync with your partner.
                  </p>
                </div>
              )}

              {/* Minimalist handle line docked when drawer is minimized */}
              {isFullscreen && !showFullscreenChat && (
                isPortrait ? (
                  <div
                    onClick={() => setShowFullscreenChat(true)}
                    className="absolute bottom-0 left-0 right-0 h-3 hover:h-5 bg-gradient-to-t from-purple-600/70 to-purple-600/10 hover:from-purple-500 hover:to-purple-600 border-t border-purple-500/20 flex items-center justify-center z-30 cursor-pointer transition-all duration-300 group"
                    title="Swipe up or tap to open Cinema Chat"
                  >
                    <div className="h-[3px] w-20 bg-purple-400/80 group-hover:bg-white rounded-full animate-pulse transition-colors" />
                  </div>
                ) : (
                  <div
                    onClick={() => setShowFullscreenChat(true)}
                    className="absolute left-0 top-0 bottom-0 w-3 hover:w-5 bg-gradient-to-r from-purple-600/70 to-purple-600/10 hover:from-purple-500 hover:to-purple-600 border-r border-purple-500/20 flex items-center justify-center z-30 cursor-pointer transition-all duration-300 group"
                    title="Swipe right or tap to open Cinema Chat"
                  >
                    <div className="w-[3px] h-20 bg-purple-400/80 group-hover:bg-white rounded-full animate-pulse transition-colors" />
                  </div>
                )
              )}
            </div>
          </div>
        </div>
        )}

        {/* Left Column (Desktop Left): Tabbed Sidebar Panel (Responsive inline-stacked bottom on mobile (order 2), side-aligned on desktop (order 1)) */}
        <aside className={`w-full order-2 lg:order-1 cinema-sidebar flex flex-col flex-1 min-h-0 overflow-hidden ${
          cinemaMode
            ? 'lg:w-96 border-t lg:border-t-0 lg:border-r lg:flex-none lg:h-full'
            : 'w-full lg:w-full border-t-0 border-r-0 lg:h-full'
        }`}>
          {isMobile && (
            <MobileTabBar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              showTypingDot={partnerIsTyping}
              cinemaMode={cinemaMode}
            />
          )}

          <div className="hidden lg:flex border-b border-white/5 bg-black/30 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={`cinema-tab relative ${activeTab === 'chat' ? 'cinema-tab-active' : ''}`}
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
            {cinemaMode && (
              <button
                type="button"
                onClick={() => setActiveTab('library')}
                className={`cinema-tab ${activeTab === 'library' ? 'cinema-tab-active' : ''}`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Library</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('call')}
              className={`cinema-tab ${activeTab === 'call' ? 'cinema-tab-active' : ''}`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Call</span>
            </button>
          </div>

          {/* TAB CONTENT: Chat panel */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col overflow-hidden h-full">
              {/* Chat Message Scroll */}
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-2.5 space-y-2">
                {messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 my-auto min-h-[200px]">
                    <MessageSquare className="w-8 h-8 text-gray-600 mb-2" />
                    <p className="text-gray-500 text-xs">No messages yet.</p>
                    <p className="text-gray-600 text-[10px]">Your messages are securely recorded in the database.</p>
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <ChatMessage
                      key={`${msg.id}-${index}`}
                      content={msg.content}
                      senderName={msg.sender_name}
                      isSelf={msg.sender_name === user.username}
                      isSystem={msg.sender_name === 'System'}
                      compact={isMobile}
                    />
                  ))
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
              <form onSubmit={handleSendChat} className="p-2 border-t border-white/5 shrink-0 flex gap-1.5 relative safe-bottom lg:pb-2">
                {/* Emoji Picker Drawer */}
                {showEmojiPicker && (
                  <div className="emoji-picker-container absolute bottom-[calc(100%+8px)] left-2 right-2 sm:left-3 sm:right-3 bg-[#16161f]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-30 p-3 max-h-[min(42dvh,280px)] flex flex-col overflow-hidden animate-fade-in">
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
                          <div className="grid grid-cols-8 gap-1">
                            {category.emojis.map((emoji, emojiIndex) => (
                              <button
                                key={emojiIndex}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onTouchStart={(e) => e.preventDefault()}
                                onClick={() => {
                                  setChatInput(prev => prev + emoji);
                                  handleChatInputChange(chatInput + emoji);
                                }}
                                className="w-8 h-8 flex items-center justify-center text-base hover:bg-white/10 rounded"
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
                  enterKeyHint="send"
                  value={chatInput}
                  onChange={(e) => handleChatInputChange(e.target.value)}
                  placeholder="Type a message..."
                  className="cinema-input flex-1 text-sm"
                />

                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onTouchStart={(e) => e.preventDefault()}
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`p-1.5 rounded border border-white/5 shrink-0 ${
                    showEmojiPicker ? 'text-purple-400' : 'text-gray-600'
                  }`}
                  aria-label="Emoji"
                >
                  <Smile className="w-4 h-4" />
                </button>

              <button
                type="submit"
                disabled={!chatInput.trim()}
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => e.preventDefault()}
                className="cinema-btn cinema-btn-primary shrink-0 !px-2"
                aria-label="Send"
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
                              
                              try {
                                const res = await apiFetch(`/api/rooms/${roomId}/media/${media.id}/`, {
                                  method: 'DELETE',
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
                            className="p-1 text-red-500/80 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 shrink-0"
                            title="Delete Video"
                            aria-label="Delete video"
                          >
                            <Trash2 className="w-4 h-4" />
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
                  <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl mobile-player-height lg:aspect-video lg:h-auto max-lg:min-h-[220px]">
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-black/70 rounded-lg border border-white/10 text-[10px] text-gray-200 font-semibold backdrop-blur-md max-w-[60%] truncate">
                      {partnerUsername ?? 'Partner'}
                    </div>
                    <div className="absolute bottom-3 right-3 w-[30%] min-w-[96px] max-w-[120px] aspect-[3/4] rounded-xl overflow-hidden border-2 border-purple-500/40 shadow-xl bg-black">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-purple-600/90 rounded text-[8px] text-white font-bold">
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
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={toggleMic}
                      className={`flex-1 py-1.5 border rounded text-[10px] flex items-center justify-center gap-1 ${
                        micMuted
                          ? 'border-red-500/30 text-red-400 bg-red-500/10'
                          : 'border-white/5 text-gray-400 bg-white/5'
                      }`}
                    >
                      {micMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                    </button>
                    <button
                      type="button"
                      onClick={toggleVideo}
                      className={`flex-1 py-1.5 border rounded text-[10px] flex items-center justify-center gap-1 ${
                        videoMuted
                          ? 'border-red-500/30 text-red-400 bg-red-500/10'
                          : 'border-white/5 text-gray-400 bg-white/5'
                      }`}
                    >
                      {videoMuted ? <VideoOff className="w-3 h-3" /> : <Video className="w-3 h-3" />}
                    </button>
                    <button
                      type="button"
                      onClick={endCall}
                      className="px-3 py-1.5 bg-red-600 text-white rounded text-[10px] font-medium"
                    >
                      End
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={startCall}
                    disabled={!partnerUsername}
                    className="w-full cinema-btn cinema-btn-success !py-2 text-xs"
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
