'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Compass, Flame, Moon, Sun } from 'lucide-react';
import { createRoot, type Root } from 'react-dom/client';
import L from 'leaflet';

type MapReport = {
  id: string | number;
  user_id?: string | null;
  area?: string | null;
  lat: number;
  lng: number;
  waste_type?: string | null;
  notes?: string | null;
  image_url?: string | null;
  user_name?: string | null;
  user_avatar?: string | null;
  verified_count?: number | null;
  status?: string | null;
  created_at?: string | null;
};

const GD_DARK_TILES =
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const GD_LIGHT_TILES =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const GD_LEAF_TILES =
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const GD_SATELLITE_TILES =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const GD_MAP_BOUNDS: L.LatLngBoundsExpression = [
  [32, -2],
  [38, 10],
];
const GD_WORLD_BOUNDS: L.LatLngBoundsExpression = [
  [-85, -180],
  [85, 180],
];

const GD_HEAT_GRADIENT: Record<number, string> = {
  0.0: '#4cc9f0',
  1.0: '#ff5f6d',
};

const GD_interpolateHeatColor = (value: number) => {
  const clamped = Math.max(0, Math.min(1, value));
  const start = [76, 201, 240];
  const end = [255, 95, 109];
  const rgb = start.map((channel, index) =>
    Math.round(channel + (end[index] - channel) * clamped)
  );
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
};

const GD_buildHeatPoints = (reports: MapReport[]) => {
  const buckets = new Map<string, { lat: number; lng: number; score: number }>();
  reports.forEach((report) => {
    const lat = Number(report.lat);
    const lng = Number(report.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    const verified = report.verified_count ?? 0;
    const score = 1 + Math.max(0, verified) * 0.4;
    const current = buckets.get(key) ?? { lat, lng, score: 0 };
    current.score += score;
    buckets.set(key, current);
  });
  return Array.from(buckets.values()).map((item) => ({
    lat: item.lat,
    lng: item.lng,
    intensity: Math.min(1, item.score / 4),
  }));
};

export default function MapComponent({
  reports,
  externalMapRef,
  mapTheme,
  onToggleTheme,
  onConfirmReport,
  canConfirmReport,
  confirmingReportId,
  confirmButtonLabel = 'Confirm Planting',
  heatmapEnabled,
  onHeatmapToggle,
  mapId: mapIdProp,
  tileMode = 'standard',
  showControls = true,
  viewportMode = 'regional',
  lowPowerMode = false,
  minZoomOverride,
}: {
  reports: MapReport[];
  externalMapRef?: { current: L.Map | null };
  mapTheme: 'dark' | 'light';
  onToggleTheme: () => void;
  onConfirmReport?: (reportId: string) => void;
  canConfirmReport?: (report: MapReport) => boolean;
  confirmingReportId?: string | null;
  confirmButtonLabel?: string;
  heatmapEnabled?: boolean;
  onHeatmapToggle?: (next: boolean) => void;
  mapId?: string;
  tileMode?: 'standard' | 'satellite' | 'leaf';
  showControls?: boolean;
  viewportMode?: 'regional' | 'global';
  lowPowerMode?: boolean;
  minZoomOverride?: number;
}) {
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const heatLayerRef = useRef<L.Layer | null>(null);
  const heatGroupRef = useRef<L.FeatureGroup | null>(null);
  const popupRootsRef = useRef<Root[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [clusterReady, setClusterReady] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const mapIdRef = useRef(
    mapIdProp ?? `gd-map-${Math.random().toString(36).slice(2, 8)}`
  );
  const mapId = mapIdRef.current;
  const markerRootsRef = useRef<Root[]>([]);
  const heatmapActive =
    !lowPowerMode &&
    (typeof heatmapEnabled === 'boolean' ? heatmapEnabled : showHeatmap);
  const tileUrl =
    tileMode === 'satellite'
      ? GD_SATELLITE_TILES
      : tileMode === 'leaf'
        ? GD_LEAF_TILES
      : mapTheme === 'dark'
        ? GD_DARK_TILES
        : GD_LIGHT_TILES;
  const viewportConfig = useMemo(
    () =>
      viewportMode === 'global'
        ? {
            minZoom: minZoomOverride ?? 2,
            initialCenter: [20, 0] as L.LatLngTuple,
            initialZoom: 2,
            maxBounds: GD_WORLD_BOUNDS,
            maxBoundsViscosity: 0.45,
            worldCopyJump: true,
          }
        : {
            minZoom: minZoomOverride ?? 8,
            initialCenter: [36.75, 3.05] as L.LatLngTuple,
            initialZoom: 12,
            maxBounds: GD_MAP_BOUNDS,
            maxBoundsViscosity: 0.9,
            worldCopyJump: false,
          },
    [viewportMode, minZoomOverride]
  );

  const handleHeatmapToggle = useCallback(() => {
    if (lowPowerMode) return;
    const next = !heatmapActive;
    if (onHeatmapToggle) {
      onHeatmapToggle(next);
    } else {
      setShowHeatmap(next);
    }
  }, [heatmapActive, onHeatmapToggle, lowPowerMode]);

  const handleHeatFocus = useCallback(
    (lat: number, lng: number) => {
      const map = mapRef.current;
      if (!map) return;
      const nextZoom = Math.min(Math.max(map.getZoom() + 2, 12), 16);
      map.flyTo([lat, lng], nextZoom, { duration: 0.9 });
      if (onHeatmapToggle) {
        onHeatmapToggle(false);
      } else {
        setShowHeatmap(false);
      }
    },
    [onHeatmapToggle]
  );

  const getWasteColor = useMemo(
    () => (wasteType?: string | null) => {
      switch (wasteType) {
        case 'Watering':
          return '#38bdf8';
        case 'Planting':
          return '#31f2b2';
        case 'Tree Planting':
          return '#22c55e';
        case 'Flower Planting':
          return '#f472b6';
        case 'Illegal Logging':
          return '#31f2b2';
        case 'Forest Fire':
          return '#ff9f1c';
        case 'Toxic Spill':
        case 'Chemical Leak':
          return '#ff5f6d';
        case 'Industrial Smoke':
          return '#ff6b6b';
        case 'Plastic Dump':
          return '#4cc9f0';
        default:
          return '#31f2b2';
      }
    },
    []
  );

  const toRgba = (hex: string, alpha: number) => {
    const cleaned = hex.replace('#', '');
    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const GD_buildInitials = useCallback((name?: string | null) => {
    if (!name) return 'GD';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return 'GD';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }, []);

  const GD_cleanupReactRoots = useCallback((rootsRef: MutableRefObject<Root[]>) => {
    const roots = rootsRef.current;
    if (roots.length === 0) {
      return;
    }
    rootsRef.current = [];
    const safeUnmount = () => {
      roots.forEach((root) => {
        try {
          root.unmount();
        } catch (error) {
          console.warn('Root unmount failed:', error);
        }
      });
    };
    if (typeof window !== 'undefined') {
      window.setTimeout(safeUnmount, 0);
    } else {
      safeUnmount();
    }
  }, []);

  useEffect(() => {
    const ensureLeafletCss = () => {
      try {
        if (typeof window !== 'undefined' && !document.querySelector('link[href*="leaflet"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }
      } catch (error) {
        console.error('Leaflet CSS load failed:', error);
      }
    };
    ensureLeafletCss();
  }, []);

  useEffect(() => {
    const loadClusterPlugin = async () => {
      if (lowPowerMode) {
        setClusterReady(true);
        return;
      }
      try {
        await import('leaflet.markercluster');
      } catch (error) {
        console.warn('Cluster plugin unavailable:', error);
      } finally {
        setClusterReady(true);
      }
    };
    loadClusterPlugin();
  }, [lowPowerMode]);


  useEffect(() => {
    const defaultIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl:
        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });
    L.Marker.prototype.options.icon = defaultIcon;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const container = mapNodeRef.current;
    if (!container) return;
    if (mapRef.current) return;
    if ((L.DomUtil.get(mapId) as any)?.['_leaflet_id']) return;

    if ((container as any)._leaflet_id) {
      try {
        (container as any)._leaflet_id = null;
      } catch (error) {
        console.warn('Leaflet container reset failed:', error);
      }
    }
    container.innerHTML = '';

    const map = L.map(container, {
      zoomControl: false,
      attributionControl: false,
      minZoom: viewportConfig.minZoom,
      maxZoom: 18,
      maxBounds: viewportConfig.maxBounds,
      maxBoundsViscosity: viewportConfig.maxBoundsViscosity,
      worldCopyJump: viewportConfig.worldCopyJump,
    });
    map.setView(viewportConfig.initialCenter, viewportConfig.initialZoom);

    const tileLayer = L.tileLayer(tileUrl);
    tileLayer.addTo(map);
    tileLayerRef.current = tileLayer;

    mapRef.current = map;
    if (externalMapRef) {
      externalMapRef.current = map;
    }
    markersRef.current = L.layerGroup().addTo(map);
    setMapReady(true);

    return () => {
      GD_cleanupReactRoots(popupRootsRef);
      GD_cleanupReactRoots(markerRootsRef);
      markersRef.current?.clearLayers();
      if (markersRef.current && mapRef.current) {
        try {
          mapRef.current.removeLayer(markersRef.current);
        } catch (error) {
          console.warn('Marker layer cleanup failed:', error);
        }
      }
      if (heatLayerRef.current && mapRef.current) {
        try {
          mapRef.current.removeLayer(heatLayerRef.current);
        } catch (error) {
          console.warn('Heatmap layer cleanup failed:', error);
        }
      }
      if (heatGroupRef.current && mapRef.current) {
        try {
          mapRef.current.removeLayer(heatGroupRef.current);
        } catch (error) {
          console.warn('Heatmap group cleanup failed:', error);
        }
      }
      if (tileLayerRef.current) {
        try {
          tileLayerRef.current.remove();
        } catch (error) {
          console.warn('Tile cleanup failed:', error);
        }
      }
      const existingMap = mapRef.current;
      if (existingMap) {
        try {
          existingMap.off?.();
        } catch (error) {
          console.warn('Map listener cleanup failed:', error);
        }
        if (container?.isConnected) {
          try {
            existingMap.remove();
          } catch (error) {
            console.error('Map cleanup failed:', error);
          }
        }
      }
      mapRef.current = null;
      if (externalMapRef) {
        externalMapRef.current = null;
      }
      tileLayerRef.current = null;
      markersRef.current = null;
      heatLayerRef.current = null;
      heatGroupRef.current = null;
      setMapReady(false);

      if ((container as any)._leaflet_id) {
        try {
          (container as any)._leaflet_id = null;
        } catch (error) {
          console.warn('Leaflet container cleanup failed:', error);
        }
      }
      container.innerHTML = '';
    };
  }, [GD_cleanupReactRoots, mapId, viewportConfig]);

  useEffect(() => {
    if (!mapReady || !tileLayerRef.current) return;
    const nextUrl =
      tileMode === 'satellite'
        ? GD_SATELLITE_TILES
        : tileMode === 'leaf'
          ? GD_LEAF_TILES
        : mapTheme === 'dark'
          ? GD_DARK_TILES
          : GD_LIGHT_TILES;
    try {
      tileLayerRef.current.setUrl(nextUrl);
    } catch (error) {
      console.warn('Tile update failed:', error);
    }
  }, [mapTheme, mapReady, tileMode]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    const map = mapRef.current;

    if (heatmapActive) {
      if (markersRef.current && map.hasLayer(markersRef.current)) {
        try {
          map.removeLayer(markersRef.current);
        } catch (error) {
          console.warn('Marker layer hide failed:', error);
        }
      }
      markersRef.current?.clearLayers();
      GD_cleanupReactRoots(popupRootsRef);
      GD_cleanupReactRoots(markerRootsRef);
      return;
    }

    const shouldCluster = !lowPowerMode && (reports ?? []).length > 48;
    const clusterFactory = (L as unknown as { markerClusterGroup?: (opts?: any) => L.LayerGroup })
      .markerClusterGroup;
    const wantsCluster = shouldCluster && typeof clusterFactory === 'function';
    const currentLayer = markersRef.current;
    const currentIsCluster =
      (currentLayer as any)?.getAllChildMarkers !== undefined;

    if (!currentLayer || wantsCluster !== currentIsCluster) {
      if (currentLayer) {
        try {
          map.removeLayer(currentLayer);
        } catch (error) {
          console.warn('Marker layer swap failed:', error);
        }
      }
      markersRef.current = wantsCluster
        ? clusterFactory?.({
            showCoverageOnHover: false,
            spiderfyOnMaxZoom: true,
            removeOutsideVisibleBounds: true,
            disableClusteringAtZoom: 16,
            iconCreateFunction: (cluster: { getChildCount: () => number }) => {
              const count = cluster.getChildCount();
              const size = count < 10 ? 34 : count < 50 ? 40 : 46;
              const color = 'rgba(49, 242, 178, 0.95)';
              const glow = 'rgba(49, 242, 178, 0.45)';
              return L.divIcon({
                html: `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;border-radius:999px;background:${color};box-shadow:0 0 18px ${glow};color:#0b1f1c;font-weight:600;font-size:12px;">${count}</div>`,
                className: 'gd-cluster-icon',
                iconSize: [size, size],
              });
            },
          }) ?? L.layerGroup()
        : L.layerGroup();
      markersRef.current.addTo(map);
    }

    const layerGroup = markersRef.current;
    if (!layerGroup) return;
    if (!map.hasLayer(layerGroup)) {
      layerGroup.addTo(map);
    }

    layerGroup.clearLayers();
      GD_cleanupReactRoots(popupRootsRef);
      GD_cleanupReactRoots(markerRootsRef);

    (reports ?? []).forEach((report) => {
      const lat = Number(report.lat);
      const lng = Number(report.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const color = getWasteColor(report.waste_type);

      const markerNode = document.createElement('div');
      const markerRoot = createRoot(markerNode);
      markerRootsRef.current.push(markerRoot);
      if (lowPowerMode) {
        markerRoot.render(
          <div className="relative flex h-9 w-9 items-center justify-center">
            <span
              className="absolute h-8 w-8 rounded-full opacity-60"
              style={{
                background: toRgba(color, 0.22),
                boxShadow: `0 0 8px rgba(0,0,0,0.35)`,
              }}
            />
            <span
              className="absolute h-4 w-4 rounded-full"
              style={{
                background: color,
                boxShadow: `0 0 10px ${toRgba(color, 0.55)}`,
              }}
            />
            <span className="absolute h-1.5 w-1.5 rounded-full bg-white/80" />
          </div>
        );
      } else {
        markerRoot.render(
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 16 }}
            className="relative flex h-9 w-9 items-center justify-center"
          >
            {report.created_at &&
              Date.now() - new Date(report.created_at).getTime() <
                24 * 60 * 60 * 1000 && (
                <motion.span
                  className="absolute h-10 w-10 rounded-full"
                  style={{
                    border: `1px solid ${toRgba(color, 0.7)}`,
                    boxShadow: `0 0 18px ${toRgba(color, 0.55)}`,
                  }}
                  animate={{ scale: [1, 1.6], opacity: [0.7, 0] }}
                  transition={{
                    duration: 2.1,
                    repeat: Infinity,
                    ease: 'easeOut',
                  }}
                />
              )}
            <span
              className="absolute h-9 w-9 rounded-full opacity-70"
              style={{
                background: toRgba(color, 0.22),
                boxShadow: `0 0 10px rgba(0,0,0,0.45), 0 0 24px ${toRgba(
                  color,
                  0.6
                )}`,
              }}
            />
            <span
              className="absolute h-4 w-4 rounded-full"
              style={{
                background: color,
                boxShadow: `0 0 14px ${toRgba(color, 0.8)}`,
              }}
            />
            <span className="absolute h-1.5 w-1.5 rounded-full bg-white/80" />
          </motion.div>
        );
      }

      const icon = L.divIcon({
        html: markerNode,
        className: 'gd-leaflet-marker',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18],
      });

      const marker = L.marker([lat, lng], { icon });
      if (report.waste_type || report.image_url || report.notes) {
        const reportId = String(report.id);
        const canConfirm =
          Boolean(onConfirmReport) &&
          (canConfirmReport ? canConfirmReport(report) : true);
        const isConfirming = confirmingReportId === reportId;
        const status =
          report.status ??
          (report.verified_count && report.verified_count > 0
            ? 'Verified'
            : 'Pending');
        const normalizedStatus = status.trim().toLowerCase();
        const statusColor =
          normalizedStatus === 'verified' ||
          normalizedStatus.startsWith('accepted by')
            ? '#31f2b2'
            : '#fbbf24';
        const navUrl = `https://www.google.com/maps?q=${lat},${lng}`;
        const areaLabel = report.area?.trim();
        const reportTime = report.created_at
          ? new Date(report.created_at).toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : null;
        const wrapper = document.createElement('div');
        const root = createRoot(wrapper);
        popupRootsRef.current.push(root);
        const popupContainerClassName = [
          'w-[min(80vw,19rem)] overflow-hidden rounded-[22px] border border-white/14',
          'bg-[linear-gradient(158deg,rgba(9,14,27,0.96),rgba(25,38,56,0.92))] text-white shadow-[0_24px_55px_rgba(3,10,24,0.55)]',
          lowPowerMode ? '' : 'backdrop-blur-xl',
        ]
          .filter(Boolean)
          .join(' ');
        const popupBody = (
          <div className={popupContainerClassName}>
            <div
              className="h-1.5 w-full"
              style={{
                background: `linear-gradient(90deg, ${toRgba(
                  color,
                  0.95
                )}, ${toRgba(statusColor, 0.9)})`,
              }}
            />
            <div className="space-y-3.5 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
                  style={{
                    color,
                    backgroundColor: toRgba(color, 0.18),
                    border: `1px solid ${toRgba(color, 0.28)}`,
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {report.waste_type ?? 'Unspecified'}
                </span>
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
                  style={{
                    color: statusColor,
                    backgroundColor: toRgba(statusColor, 0.17),
                    border: `1px solid ${toRgba(statusColor, 0.35)}`,
                    boxShadow: `0 0 14px ${toRgba(statusColor, 0.28)}`,
                  }}
                >
                  {status}
                </span>
              </div>
              {report.image_url ? (
                <div className="group relative h-32 w-full overflow-hidden rounded-2xl border border-white/12">
                  <img
                    src={report.image_url}
                    alt="Report evidence"
                    className="h-full w-full rounded-2xl object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
                </div>
              ) : (
                <div className="flex h-24 items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/[0.03] text-xs tracking-[0.18em] text-white/55">
                  NO IMAGE
                </div>
              )}
              <div className="rounded-2xl border border-white/12 bg-white/[0.05] p-2.5">
                <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-white/55">
                  Reporter
                </div>
                <div className="flex items-center gap-2.5">
                  {report.user_avatar ? (
                    <img
                      src={report.user_avatar}
                      alt="Reporter avatar"
                      className="h-9 w-9 rounded-full border border-white/18 object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/16 bg-white/10 text-xs font-semibold text-white/80">
                      {GD_buildInitials(report.user_name)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">
                      {report.user_name ?? 'Anonymous Ranger'}
                    </div>
                    <div className="truncate text-[11px] text-white/60">
                      {areaLabel ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`}
                    </div>
                    {reportTime ? (
                      <div className="text-[10px] uppercase tracking-[0.14em] text-white/45">
                        {reportTime}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
              {report.notes ? (
                <div className="rounded-xl border border-white/12 bg-black/20 px-2.5 py-2 text-xs leading-relaxed text-white/80">
                  {report.notes}
                </div>
              ) : null}
              <div className={`grid gap-2 ${canConfirm ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {canConfirm ? (
                  <button
                    type="button"
                    onClick={() => onConfirmReport?.(reportId)}
                    disabled={isConfirming}
                    className={[
                      'inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition',
                      isConfirming
                        ? 'cursor-not-allowed border border-emerald-300/25 bg-emerald-500/18 text-emerald-100/85'
                        : 'border border-emerald-300/35 bg-gradient-to-r from-emerald-500/28 to-emerald-300/24 text-emerald-100 hover:brightness-110',
                    ].join(' ')}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {isConfirming ? 'Confirming...' : confirmButtonLabel}
                  </button>
                ) : null}
                <a
                  href={navUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={[
                    'inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/18 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition',
                    'bg-white/[0.06] text-white hover:border-white/35 hover:bg-white/[0.12]',
                  ].join(' ')}
                >
                  <Compass className="h-3.5 w-3.5" />
                  Navigate
                </a>
              </div>
            </div>
          </div>
        );
        if (lowPowerMode) {
          root.render(popupBody);
        } else {
          root.render(
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 18 }}
            >
              {popupBody}
            </motion.div>
          );
        }

        const popup = L.popup({
          className: 'gd-system-popup gd-system-popup-dark',
          closeButton: false,
          autoPan: true,
          maxWidth: 340,
        }).setContent(wrapper);
        popup.on('remove', () => {
          if (typeof window !== 'undefined') {
            window.setTimeout(() => {
              try {
                root.unmount();
              } catch (error) {
                console.warn('Popup root unmount failed:', error);
              }
            }, 0);
          } else {
            try {
              root.unmount();
            } catch (error) {
              console.warn('Popup root unmount failed:', error);
            }
          }
          popupRootsRef.current = popupRootsRef.current.filter(
            (item) => item !== root
          );
        });
        marker.bindPopup(popup);
      }
      marker.addTo(layerGroup);
    });
  }, [
    reports,
    mapReady,
    clusterReady,
    getWasteColor,
    heatmapActive,
    GD_cleanupReactRoots,
    onConfirmReport,
    canConfirmReport,
    confirmingReportId,
    confirmButtonLabel,
    lowPowerMode,
  ]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    const map = mapRef.current;
    if (!heatmapActive) {
      if (heatGroupRef.current && map.hasLayer(heatGroupRef.current)) {
        try {
          map.removeLayer(heatGroupRef.current);
        } catch (error) {
          console.warn('Heatmap group hide failed:', error);
        }
      }
      heatLayerRef.current = null;
      return;
    }

    const heatPoints = GD_buildHeatPoints(reports ?? []);
    const densePoints = heatPoints.filter((point) => point.intensity >= 0.6);

    if (!heatGroupRef.current) {
      heatGroupRef.current = L.featureGroup();
    }
    const group = heatGroupRef.current;
    if (!map.hasLayer(group)) {
      group.addTo(map);
    }
    group.clearLayers();
    heatLayerRef.current = null;

    const heatFactory = (L as unknown as { heatLayer?: any }).heatLayer;
    if (typeof heatFactory === 'function') {
      const layer = heatFactory(
        heatPoints.map((point) => [point.lat, point.lng, point.intensity]),
        {
          radius: 25,
          blur: 15,
          maxZoom: 17,
          minOpacity: 0.25,
          gradient: GD_HEAT_GRADIENT,
        }
      );
      heatLayerRef.current = layer;
      group.addLayer(layer);
    } else {
      heatPoints.forEach((point) => {
        const color = GD_interpolateHeatColor(point.intensity);
        const marker = L.circleMarker([point.lat, point.lng], {
          radius: 25,
          color,
          fillColor: color,
          weight: 0,
          fillOpacity: 0.25,
          className: 'gd-heat-fallback',
        });
        group.addLayer(marker);
        if (point.intensity >= 0.6) {
          marker.on('click', () => handleHeatFocus(point.lat, point.lng));
        }
      });
    }

    densePoints.forEach((point) => {
      const clickTarget = L.circleMarker([point.lat, point.lng], {
        radius: 18,
        color: 'transparent',
        fillColor: 'transparent',
        opacity: 0.01,
        fillOpacity: 0.01,
      });
      clickTarget.on('click', () => handleHeatFocus(point.lat, point.lng));
      group.addLayer(clickTarget);
    });
  }, [reports, mapReady, heatmapActive, handleHeatFocus]);

  if (typeof window === 'undefined') return null;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        className={[
          'relative z-10 h-full w-full gd-map-tilt',
          lowPowerMode ? 'gd-map-low-power' : '',
          mapTheme === 'light' ? 'gd-map-theme-light' : 'gd-map-theme-dark',
        ].join(' ')}
      >
        <div
          id={mapId}
          ref={mapNodeRef}
          className="gd-leaflet-map gd-map-tilt-surface"
          style={{
            height: lowPowerMode ? '100%' : '110%',
            width: lowPowerMode ? '100%' : '110%',
            position: 'absolute',
            top: lowPowerMode ? '0%' : '-5%',
            left: lowPowerMode ? '0%' : '-5%',
          }}
        />
      </div>
      {showControls ? (
        <div className="pointer-events-auto absolute bottom-24 right-4 z-20 flex flex-col gap-2 md:bottom-16 md:right-6">
          <button
            onClick={handleHeatmapToggle}
            disabled={lowPowerMode}
            className={[
              'flex h-11 w-11 items-center justify-center rounded-full border',
              'shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur-md transition',
              mapTheme === 'dark'
                ? 'border-white/10 bg-white/10 text-white hover:bg-white/20'
                : 'border-black/10 bg-slate-200/50 text-slate-900 hover:bg-slate-300/80',
              lowPowerMode ? 'cursor-not-allowed opacity-50 hover:bg-transparent' : '',
              heatmapActive ? 'ring-2 ring-emerald-300/70' : '',
            ].join(' ')}
            aria-label={lowPowerMode ? 'Heatmap disabled in low power mode' : 'Toggle heatmap'}
            aria-pressed={heatmapActive}
          >
            <Flame className="h-4 w-4" />
          </button>
          <button
            onClick={onToggleTheme}
            className={[
              'flex h-11 w-11 items-center justify-center rounded-full border',
              'shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur-md transition',
              mapTheme === 'dark'
                ? 'border-white/10 bg-white/10 text-white hover:bg-white/20'
                : 'border-black/10 bg-slate-200/50 text-slate-900 hover:bg-slate-300/80',
            ].join(' ')}
            aria-label="Toggle map theme"
          >
            {mapTheme === 'dark' ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </button>
        </div>
      ) : null}

      <style jsx global>{`
        .gd-map-theme-dark .gd-leaflet-map.leaflet-container {
          background-color: #02080b;
        }
        .gd-map-theme-light .gd-leaflet-map.leaflet-container {
          background-color: #e7f0ec;
        }
        .gd-map-tilt .gd-leaflet-map.leaflet-container {
          transform: perspective(1000px) rotateX(10deg);
          transform-origin: center center;
          transform-style: preserve-3d;
          transition: transform 0.6s ease;
          will-change: transform;
        }
        .gd-map-theme-dark .gd-leaflet-map .leaflet-tile-pane {
          filter: contrast(1.08) saturate(1.04) brightness(0.96)
            drop-shadow(0 18px 28px rgba(0, 0, 0, 0.25));
        }
        .gd-map-theme-light .gd-leaflet-map .leaflet-tile-pane {
          filter: contrast(1.04) saturate(1.14) brightness(1.02)
            drop-shadow(0 18px 28px rgba(0, 0, 0, 0.16));
        }
        .gd-map-tilt .gd-leaflet-map .leaflet-marker-pane,
        .gd-map-tilt .gd-leaflet-map .leaflet-popup-pane,
        .gd-map-tilt .gd-leaflet-map .leaflet-shadow-pane,
        .gd-map-tilt .gd-leaflet-map .leaflet-tooltip-pane {
          transform: rotateX(-10deg);
          transform-origin: center center;
        }
        .gd-map-low-power .gd-leaflet-map.leaflet-container {
          transform: none !important;
        }
        .gd-map-low-power .gd-leaflet-map .leaflet-marker-pane,
        .gd-map-low-power .gd-leaflet-map .leaflet-popup-pane,
        .gd-map-low-power .gd-leaflet-map .leaflet-shadow-pane,
        .gd-map-low-power .gd-leaflet-map .leaflet-tooltip-pane {
          transform: none !important;
        }
        .gd-map-low-power .gd-leaflet-map .leaflet-tile-pane {
          filter: none !important;
        }
        @media (max-width: 768px) {
          .gd-map-tilt .gd-leaflet-map.leaflet-container {
            transform: perspective(1000px) rotateX(8deg);
          }
          .gd-map-tilt .gd-leaflet-map .leaflet-marker-pane,
          .gd-map-tilt .gd-leaflet-map .leaflet-popup-pane,
          .gd-map-tilt .gd-leaflet-map .leaflet-shadow-pane,
          .gd-map-tilt .gd-leaflet-map .leaflet-tooltip-pane {
            transform: rotateX(-8deg);
          }
          .leaflet-marker-icon,
          .leaflet-marker-shadow {
            transform: scale(0.85);
            transform-origin: center center;
          }
          .leaflet-popup-content {
            max-width: 290px;
            font-size: 12px;
            margin: 6px 8px;
          }
          .leaflet-popup-content-wrapper {
            border-radius: 12px;
          }
          .leaflet-tooltip {
            font-size: 11px;
            padding: 4px 6px;
          }
        }
        .gd-heat-fallback {
          filter: blur(1.5px);
        }
      `}</style>
    </div>
  );
}
