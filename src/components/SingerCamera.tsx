import { 
  useEffect, 
  useRef, 
  useState, 
  useCallback, 
  MouseEvent as ReactMouseEvent, 
  TouchEvent as ReactTouchEvent 
} from 'react';
import { 
  Camera, 
  CameraOff, 
  FlipHorizontal, 
  Maximize2, 
  Minimize2, 
  X, 
  AlertCircle,
  Sparkles,
  RefreshCw,
  Move,
  GripHorizontal
} from 'lucide-react';

interface SingerCameraProps {
  isActive: boolean;
  onClose: () => void;
  singerName?: string;
  className?: string;
  initialPosition?: 'top-left' | 'top-right' | 'bottom-right' | 'bottom-left';
}

export function SingerCamera({
  isActive,
  onClose,
  singerName = 'Singer',
  className = '',
  initialPosition = 'top-left',
}: SingerCameraProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMirrored, setIsMirrored] = useState<boolean>(true);
  const [sizeMode, setSizeMode] = useState<'standard' | 'large' | 'compact'>('standard');
  const [filterMode, setFilterMode] = useState<'clean' | 'warm' | 'stage'>('clean');

  // Mouse / Touch Draggable Coordinates
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragInfoRef = useRef<{
    startX: number;
    startY: number;
    elemStartX: number;
    elemStartY: number;
    active: boolean;
  }>({
    startX: 0,
    startY: 0,
    elemStartX: 0,
    elemStartY: 0,
    active: false,
  });

  // Clamp coordinates within parent bounds
  const clampCoords = useCallback((rawX: number, rawY: number): { x: number; y: number } => {
    const container = containerRef.current;
    const parent = container?.parentElement;
    if (!container || !parent) return { x: rawX, y: rawY };

    const parentRect = parent.getBoundingClientRect();
    const elemRect = container.getBoundingClientRect();

    const pad = 12;
    const minX = pad;
    const maxX = Math.max(pad, parentRect.width - elemRect.width - pad);
    const minY = pad;
    const maxY = Math.max(pad, parentRect.height - elemRect.height - pad);

    return {
      x: Math.min(maxX, Math.max(minX, rawX)),
      y: Math.min(maxY, Math.max(minY, rawY)),
    };
  }, []);

  // Compute position based on corner preset
  const snapToCorner = useCallback((corner: 'top-left' | 'top-right' | 'bottom-right' | 'bottom-left') => {
    const container = containerRef.current;
    const parent = container?.parentElement;
    if (!container || !parent) return;

    const parentRect = parent.getBoundingClientRect();
    const elemRect = container.getBoundingClientRect();
    const pad = 16;

    let targetX = pad;
    let targetY = pad;

    if (corner === 'top-right') {
      targetX = Math.max(pad, parentRect.width - elemRect.width - pad);
      targetY = pad;
    } else if (corner === 'bottom-left') {
      targetX = pad;
      targetY = Math.max(pad, parentRect.height - elemRect.height - pad);
    } else if (corner === 'bottom-right') {
      targetX = Math.max(pad, parentRect.width - elemRect.width - pad);
      targetY = Math.max(pad, parentRect.height - elemRect.height - pad);
    }

    setCoords({ x: targetX, y: targetY });
  }, []);

  // Initialize coordinates on mount or when container changes
  useEffect(() => {
    if (!isActive) return;

    const timer = setTimeout(() => {
      snapToCorner(initialPosition);
    }, 50);

    return () => clearTimeout(timer);
  }, [isActive, initialPosition, snapToCorner]);

  // Keep camera inside parent when container resizes (e.g. entering/exiting fullscreen)
  useEffect(() => {
    if (!isActive) return;
    const container = containerRef.current;
    const parent = container?.parentElement;
    if (!parent) return;

    const observer = new ResizeObserver(() => {
      setCoords((prev) => {
        if (!prev) return null;
        return clampCoords(prev.x, prev.y);
      });
    });

    observer.observe(parent);
    return () => observer.disconnect();
  }, [isActive, clampCoords]);

  // Also clamp when size mode changes
  useEffect(() => {
    if (!isActive) return;
    const timer = setTimeout(() => {
      setCoords((prev) => {
        if (!prev) return null;
        return clampCoords(prev.x, prev.y);
      });
    }, 60);
    return () => clearTimeout(timer);
  }, [sizeMode, isActive, clampCoords]);

  // Mouse and Touch Drag Handlers
  const handleDragStart = (e: ReactMouseEvent | ReactTouchEvent) => {
    const target = e.target as HTMLElement;
    // Don't drag if clicking buttons or inputs
    if (target.closest('button') || target.closest('a') || target.closest('input')) {
      return;
    }

    const container = containerRef.current;
    const parent = container?.parentElement;
    if (!container || !parent) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const parentRect = parent.getBoundingClientRect();
    const elemRect = container.getBoundingClientRect();

    const currentX = coords ? coords.x : elemRect.left - parentRect.left;
    const currentY = coords ? coords.y : elemRect.top - parentRect.top;

    dragInfoRef.current = {
      startX: clientX,
      startY: clientY,
      elemStartX: currentX,
      elemStartY: currentY,
      active: true,
    };

    setIsDragging(true);
  };

  useEffect(() => {
    const handlePointerMove = (clientX: number, clientY: number) => {
      if (!dragInfoRef.current.active) return;

      const deltaX = clientX - dragInfoRef.current.startX;
      const deltaY = clientY - dragInfoRef.current.startY;

      const rawX = dragInfoRef.current.elemStartX + deltaX;
      const rawY = dragInfoRef.current.elemStartY + deltaY;

      const clamped = clampCoords(rawX, rawY);
      setCoords(clamped);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!dragInfoRef.current.active) return;
      e.preventDefault();
      handlePointerMove(e.clientX, e.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!dragInfoRef.current.active || e.touches.length === 0) return;
      handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    const onPointerUp = () => {
      if (dragInfoRef.current.active) {
        dragInfoRef.current.active = false;
        setIsDragging(false);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onPointerUp);
    };
  }, [clampCoords]);

  // Start / stop camera stream
  useEffect(() => {
    let isCancelled = false;

    const stopStream = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    if (!isActive) {
      stopStream();
      setCameraError(null);
      return;
    }

    const startCamera = async () => {
      setIsLoading(true);
      setCameraError(null);
      stopStream();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera is not supported on this browser or connection.');
        setIsLoading(false);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {
            // Autoplay policy or pause
          });
        }
        setIsLoading(false);
      } catch (err: any) {
        if (isCancelled) return;
        setIsLoading(false);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraError('Camera permission was denied. Please allow camera access in browser settings.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setCameraError('No camera found on this device.');
        } else {
          setCameraError(err.message || 'Unable to access camera.');
        }
      }
    };

    startCamera();

    return () => {
      isCancelled = true;
      stopStream();
    };
  }, [isActive, facingMode]);

  if (!isActive) return null;

  // Size classes
  const sizeClasses = {
    standard: 'w-48 sm:w-64 md:w-72 aspect-video',
    large: 'w-64 sm:w-80 md:w-96 aspect-video',
    compact: 'w-36 sm:w-44 aspect-video',
  }[sizeMode];

  // Filter styles
  const filterStyles = {
    clean: '',
    warm: 'contrast-105 saturate-115 brightness-105',
    stage: 'contrast-110 saturate-125 hue-rotate-5',
  }[filterMode];

  return (
    <div
      ref={containerRef}
      id="singer-face-camera-container"
      onMouseDown={handleDragStart}
      onTouchStart={handleDragStart}
      style={
        coords
          ? {
              transform: `translate3d(${coords.x}px, ${coords.y}px, 0)`,
              left: 0,
              top: 0,
              touchAction: 'none',
            }
          : { left: '16px', top: '16px' }
      }
      className={`absolute z-40 ${sizeClasses} ${
        isDragging
          ? 'cursor-grabbing select-none shadow-2xl ring-4 ring-sky-400/80 scale-[1.02]'
          : 'cursor-grab hover:ring-2 hover:ring-sky-400/50'
      } ${isDragging ? '' : 'transition-transform duration-100 ease-out'} pointer-events-auto ${className}`}
      title="Click and drag with mouse to move camera anywhere on stage"
    >
      <div className="relative w-full h-full rounded-2xl overflow-hidden bg-slate-950 border-2 border-sky-400 shadow-2xl ring-2 ring-sky-500/20 group select-none">
        {/* Video feed */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover pointer-events-none transition-transform duration-200 ${
            isMirrored ? '-scale-x-100' : 'scale-x-100'
          } ${filterStyles}`}
        />

        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center text-white gap-2 p-3 text-center pointer-events-none">
            <RefreshCw className="w-6 h-6 text-sky-400 animate-spin" />
            <span className="text-xs font-semibold">Starting Singer Cam...</span>
          </div>
        )}

        {/* Error Notice */}
        {cameraError && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center text-white p-4 text-center">
            <AlertCircle className="w-7 h-7 text-rose-400 mb-2" />
            <p className="text-xs font-medium text-slate-200 leading-snug">
              {cameraError}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
                }}
                className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
              >
                Switch Cam
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Top Badges & Live Status */}
        <div className="absolute top-2 inset-x-2 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 text-white shadow-xs">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-300">LIVE</span>
            <span className="text-[10px] text-white/50">•</span>
            <span className="text-[10px] font-bold text-sky-300 truncate max-w-[80px]">
              {singerName}
            </span>
          </div>

          {/* Center Drag Handle Badge */}
          <div className="hidden sm:flex items-center gap-1 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 text-white/80 shadow-xs pointer-events-none">
            <Move className="w-2.5 h-2.5 text-sky-300" />
            <span className="text-[9px] font-medium text-slate-300">Drag with mouse</span>
          </div>

          <div className="flex items-center gap-1 pointer-events-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMirrored(!isMirrored);
              }}
              className="p-1 rounded-lg bg-black/60 hover:bg-black/80 text-white/80 hover:text-white transition-colors cursor-pointer border border-white/10"
              title={isMirrored ? 'Mirror Mode: ON (Click to unmirror)' : 'Mirror Mode: OFF'}
            >
              <FlipHorizontal className="w-3 h-3" />
            </button>
            <button
              id="close-singer-camera-btn"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1 rounded-lg bg-black/60 hover:bg-rose-600 text-white transition-colors cursor-pointer border border-white/10"
              title="Close Singer Camera"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Bottom Floating Control Bar (reveals on hover/touch) */}
        <div className="absolute bottom-2 inset-x-2 flex items-center justify-between opacity-80 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-md px-2 py-1 rounded-xl border border-white/10 text-white text-xs">
          {/* Filter toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (filterMode === 'clean') setFilterMode('warm');
              else if (filterMode === 'warm') setFilterMode('stage');
              else setFilterMode('clean');
            }}
            className="flex items-center gap-1 text-[10px] font-medium text-sky-300 hover:text-white transition-colors cursor-pointer"
            title="Toggle camera visual tone"
          >
            <Sparkles className="w-3 h-3" />
            <span className="capitalize">{filterMode}</span>
          </button>

          {/* Snap Corner Quick Presets */}
          <div className="flex items-center gap-1">
            <div className="hidden xs:flex items-center gap-0.5 bg-white/10 rounded-md p-0.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  snapToCorner('top-left');
                }}
                className="px-1 py-0.2 rounded text-[9px] hover:bg-white/20 text-slate-200 transition-colors"
                title="Move to Top-Left"
              >
                TL
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  snapToCorner('top-right');
                }}
                className="px-1 py-0.2 rounded text-[9px] hover:bg-white/20 text-slate-200 transition-colors"
                title="Move to Top-Right"
              >
                TR
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  snapToCorner('bottom-right');
                }}
                className="px-1 py-0.2 rounded text-[9px] hover:bg-white/20 text-slate-200 transition-colors"
                title="Move to Bottom-Right"
              >
                BR
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  snapToCorner('bottom-left');
                }}
                className="px-1 py-0.2 rounded text-[9px] hover:bg-white/20 text-slate-200 transition-colors"
                title="Move to Bottom-Left"
              >
                BL
              </button>
            </div>

            {/* Size toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (sizeMode === 'standard') setSizeMode('large');
                else if (sizeMode === 'large') setSizeMode('compact');
                else setSizeMode('standard');
              }}
              className="p-1 rounded text-white/90 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
              title={sizeMode === 'large' ? 'Shrink' : 'Enlarge'}
            >
              {sizeMode === 'large' ? (
                <Minimize2 className="w-3 h-3" />
              ) : (
                <Maximize2 className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
