import { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  X, 
  Smartphone, 
  Copy, 
  Check, 
  ExternalLink, 
  QrCode, 
  Users, 
  Sparkles,
  Wifi
} from 'lucide-react';

interface ConnectDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  onSwitchToRemoteView: () => void;
  connectedClientsCount: number;
}

export function ConnectDeviceModal({
  isOpen,
  onClose,
  roomId,
  onSwitchToRemoteView,
  connectedClientsCount,
}: ConnectDeviceModalProps) {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Derive mobile remote link
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const remoteUrl = `${currentOrigin}/?room=${encodeURIComponent(roomId)}&view=remote`;

  useEffect(() => {
    if (!isOpen) return;

    QRCode.toDataURL(remoteUrl, {
      width: 260,
      margin: 2,
      color: {
        dark: '#0369a1', // sky-700
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR generation error', err));
  }, [isOpen, remoteUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(remoteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-sky-100 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden text-center flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-sky-100 flex items-center justify-between bg-sky-50/50">
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-xs">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-['Outfit'] flex items-center gap-2">
                Singer Mobile Remote
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Live Sync
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Queue songs from any smartphone or tablet while music is playing
              </p>
            </div>
          </div>

          <button
            id="connect-modal-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex flex-col items-center justify-center space-y-4">
          {/* QR Code Container */}
          <div className="p-3 bg-sky-50/60 rounded-2xl border border-sky-200 shadow-sm flex flex-col items-center">
            <div className="p-2 bg-white rounded-xl shadow-xs border border-sky-100">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`Scan to open Room ${roomId} Karaoke Remote`}
                  className="w-48 h-48 rounded-lg object-contain"
                />
              ) : (
                <div className="w-48 h-48 rounded-lg flex items-center justify-center text-slate-400">
                  <QrCode className="w-12 h-12 animate-pulse" />
                </div>
              )}
            </div>

            <div className="mt-2.5 flex items-center gap-2 text-xs font-semibold text-sky-800">
              <QrCode className="w-4 h-4 text-sky-600" />
              <span>Scan with phone camera to join Room:</span>
              <span className="px-2 py-0.5 rounded-md bg-white border border-sky-200 font-mono text-sky-700">
                {roomId}
              </span>
            </div>
          </div>

          {/* Quick instructions */}
          <div className="w-full text-left bg-sky-50/30 border border-sky-100 rounded-xl p-3 text-xs space-y-1.5 text-slate-600">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span>How it works:</span>
            </div>
            <p>1. Open your phone camera and point at the QR code.</p>
            <p>2. Paste any YouTube song link or pick from the songbook.</p>
            <p>3. Tap "Queue Song" — it appears on this stage screen instantly without interrupting the singer!</p>
          </div>

          {/* Direct Link Box with Copy Button */}
          <div className="w-full flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={remoteUrl}
              className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-mono select-all focus:outline-none"
            />
            <button
              id="copy-remote-link-btn"
              onClick={handleCopyLink}
              className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-sky-100 bg-sky-50/40 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Wifi className="w-3.5 h-3.5 text-emerald-500" />
            <span>Room: <strong className="text-slate-700">{roomId}</strong></span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-sky-600" />
              {connectedClientsCount} connected
            </span>
          </div>

          <button
            id="open-remote-view-btn"
            onClick={() => {
              onClose();
              onSwitchToRemoteView();
            }}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-sky-50 text-sky-700 text-xs font-semibold border border-sky-200 shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <span>Preview Remote View</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
