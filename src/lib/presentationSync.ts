import { PresentationSlide } from '../services/geminiService';
import { SlideThemeId } from '../components/presentation/SlideCanvas';
import { PresentationBrandingSettings } from './presentationSettings';

export interface PresentationSyncState {
  slideIndex: number;
  totalSlides: number;
  currentSlide: PresentationSlide;
  nextSlide?: PresentationSlide;
  themeId: SlideThemeId;
  globalBackground?: string;
  globalDim?: number;
  globalBlur?: boolean;
  isBlackout?: boolean;
  isWhiteout?: boolean;
  title?: string;
  brandingSettings?: PresentationBrandingSettings;
  timestamp: number;
}

const CHANNEL_NAME = 'blu_presentation_broadcast_channel';
const STORAGE_KEY = 'blu_presentation_sync_state';

class PresentationSyncService {
  private channel: BroadcastChannel | null = null;
  private listeners: ((state: PresentationSyncState) => void)[] = [];
  private isConnectedToScreen: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (event) => {
          if (event.data) {
            this.notifyListeners(event.data);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel not supported or blocked, using localStorage fallback', err);
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            this.notifyListeners(data);
          } catch {}
        }
      });
    }
  }

  // Send nåværende tilstand til alle lyttere (f.eks. storskjerm)
  public broadcast(state: PresentationSyncState) {
    const payload = {
      ...state,
      timestamp: Date.now()
    };

    if (this.channel) {
      try {
        this.channel.postMessage(payload);
      } catch (err) {
        console.warn('Feil ved sending over BroadcastChannel:', err);
      }
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {}
  }

  // Hent lagret tilstand (for nyåpnede storskjermvinduer)
  public getLatestState(): PresentationSyncState | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  }

  // Abonner på endringer
  public subscribe(callback: (state: PresentationSyncState) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private notifyListeners(state: PresentationSyncState) {
    this.listeners.forEach(cb => {
      try {
        cb(state);
      } catch (e) {
        console.error('Feil i sync listener:', e);
      }
    });
  }
}

export const presentationSync = new PresentationSyncService();
