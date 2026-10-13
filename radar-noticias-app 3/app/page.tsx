'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Flame, 
  MapPin, 
  Radio, 
  AlertTriangle, 
  Zap, 
  HeartPulse, 
  Scale, 
  ShieldAlert, 
  CloudRain, 
  Landmark, 
  Gavel, 
  Flag, 
  Globe, 
  ExternalLink,
  RefreshCw,
  TrendingUp,
  Activity,
  Layers,
  PlusCircle,
  X,
  CheckCircle,
  Twitter,
  MessageSquare
} from 'lucide-react';

interface FxAuthor {
  name: string;
  screen_name: string;
  avatar_url?: string;
}

interface FxTweet {
  id: string;
  url: string;
  text: string;
  created_at: string;
  created_timestamp: number;
  likes: number;
  retweets: number;
  replies: number;
  views?: number;
  author: FxAuthor;
}

interface Foco {
  id_foco: string;
  titulo: string;
  zona: string;
  categoria: string;
  alcance?: 'nacional' | 'regional' | 'internacional';
  volumen_reportes: number;
  primer_reporte: string;
  ultimo_reporte: string;
  ejemplos_tweets: string[];
  activo: boolean;
}

const CATEGORIAS_CONFIG: Record<
  string, 
  { label: string; icon: any; color: string; badge: string }
> = {
  'fallas electricas': { 
    label: 'Fallas Eléctricas / Servicios', 
    icon: Zap, 
    color: 'text-amber-400', 
    badge: 'bg-amber-950/40 border-amber-900/50 text-amber-300' 
  },
  'servicios': { 
    label: 'Servicios Básicos', 
    icon: Zap, 
    color: 'text-amber-400', 
    badge: 'bg-amber-950/40 border-amber-900/50 text-amber-300' 
  },
  'salud': { 
    label: 'Salud y Hospitales', 
    icon: HeartPulse, 
    color: 'text-emerald-400', 
    badge: 'bg-emerald-950/40 border-emerald-900/50 text-emerald-300' 
  },
  'ddhh': { 
    label: 'DDHH y Libertad de Expresión', 
    icon: Scale, 
    color: 'text-blue-400', 
    badge: 'bg-blue-950/40 border-blue-900/50 text-blue-300' 
  },
  'violencia': { 
    label: 'Seguridad y Sucesos', 
    icon: ShieldAlert, 
    color: 'text-rose-400', 
    badge: 'bg-rose-950/40 border-rose-900/50 text-rose-300' 
  },
  'desastres naturales': { 
    label: 'Desastres Naturales / Clima', 
    icon: CloudRain, 
    color: 'text-cyan-400', 
    badge: 'bg-cyan-950/40 border-cyan-900/50 text-cyan-300' 
  },
  'clima': { 
    label: 'Clima y Lluvias', 
    icon: CloudRain, 
    color: 'text-cyan-400', 
    badge: 'bg-cyan-950/40 border-cyan-900/50 text-cyan-300' 
  },
  'politica': { 
    label: 'Política y Gobernanza', 
    icon: Landmark, 
    color: 'text-indigo-400', 
    badge: 'bg-indigo-950/40 border-indigo-900/50 text-indigo-300' 
  },
  'judicial': { 
    label: 'Judicial y Tribunales', 
    icon: Gavel, 
    color: 'text-purple-400', 
    badge: 'bg-purple-950/40 border-purple-900/50 text-purple-300' 
  },
  'nacionales': { 
    label: 'Nacional Venezuela', 
    icon: Flag, 
    color: 'text-yellow-400', 
    badge: 'bg-yellow-950/40 border-yellow-900/50 text-yellow-300' 
  },
  'regionales': { 
    label: 'Regiones y Estados', 
    icon: MapPin, 
    color: 'text-teal-400', 
    badge: 'bg-teal-950/40 border-teal-900/50 text-teal-300' 
  },
  'internacionales': { 
    label: 'Diáspora / Internacional', 
    icon: Globe, 
    color: 'text-sky-400', 
    badge: 'bg-sky-950/40 border-sky-900/50 text-sky-300' 
  }
};

const CATEGORIAS_FILTRO = [
  { id: 'todos', label: 'Todos' },
  { id: 'fallas electricas', label: 'Fallas Eléctricas' },
  { id: 'salud', label: 'Salud' },
  { id: 'ddhh', label: 'DDHH' },
  { id: 'violencia', label: 'Violencia' },
  { id: 'desastres naturales', label: 'Desastres Nat.' },
  { id: 'politica', label: 'Política' },
  { id: 'judicial', label: 'Judicial' },
  { id: 'nacionales', label: 'Nacionales' },
  { id: 'regionales', label: 'Regionales' },
  { id: 'internacionales', label: 'Diáspora / Int.' },
];

function parsearTweetUrl(url: string): { username: string; id: string } | null {
  try {
    const cleanUrl = url.trim();
    const match = cleanUrl.match(/(?:twitter\.com|x\.com|fxtwitter\.com|fixupx\.com)\/([A-Za-z0-9_]+)\/status\/([0-9]+)/i);
    if (!match) return null;
    return {
      username: match[1],
      id: match[2],
    };
  } catch {
    return null;
  }
}

function extraerEtiquetaFuente(url: string, index: number): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname;

    if (host.includes('x.com') || host.includes('twitter.com') || host.includes('fxtwitter.com')) {
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length >= 1 && parts[0] !== 'home' && parts[0] !== 'explore') {
        return `@${parts[0]}`;
      }
      return 'Reporte en X';
    }
    if (host.includes('elpitazo')) return 'El Pitazo';
    if (host.includes('efectococuyo')) return 'Efecto Cocuyo';
    if (host.includes('monitoreamos')) return 'Monitoreamos';
    if (host.includes('talcualdigital')) return 'TalCual';
    if (host.includes('provea')) return 'PROVEA';
    return `Fuente ${index + 1}`;
  } catch {
    return `Fuente ${index + 1}`;
  }
}

function esUrlSegura(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export default function HomePage() {
  const [focos, setFocos] = useState<Foco[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos');
  const [filtroAlcance, setFiltroAlcance] = useState<'todos' | 'nacional' | 'regional' | 'internacional'>('todos');
  const [busqueda, setBusqueda] = useState('');

  // Estados del modal de Ingesta FxEmbed
  const [modalAbierto, setModalAbierto] = useState(false);
  const [tweetUrlInput, setTweetUrlInput] = useState('');
  const [cargandoTweet, setCargandoTweet] = useState(false);
  const [tweetObtenido, setTweetObtenido] = useState<FxTweet | null>(null);
  const [errorTweet, setErrorTweet] = useState<string | null>(null);
  
  // Campos del nuevo foco
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [nuevaZona, setNuevaZona] = useState('Caracas, Venezuela');
  const [nuevaCategoria, setNuevaCategoria] = useState('fallas electricas');
  const [nuevoAlcance, setNuevoAlcance] = useState<'nacional' | 'regional' | 'internacional'>('regional');
  const [guardandoFoco, setGuardandoFoco] = useState(false);

  const obtenerFocos = useCallback(async () => {
    setCargando(true);
    setErrorCarga(null);

    try {
      const { data, error } = await supabase
        .from('focos_noticias')
        .select('*')
        .eq('activo', true)
        .order('ultimo_reporte', { ascending: false })
        .limit(100);

      if (error) throw error;
      setFocos((data as Foco[]) || []);
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : 'Error al conectar con Supabase';
      setErrorCarga(mensaje);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    obtenerFocos();

    const canal = supabase
      .channel('cambios-focos-vivo')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'focos_noticias' },
        (payload) => {
          setFocos((prev) => {
            const evento = payload.eventType;

            if (evento === 'INSERT') {
              const nuevo = payload.new as Foco;
              if (!nuevo.activo) return prev;
              const existe = prev.some((f) => f.id_foco === nuevo.id_foco);
              if (existe) return prev;
              return [nuevo, ...prev].sort(
                (a, b) => new Date(b.ultimo_reporte).getTime() - new Date(a.ultimo_reporte).getTime()
              );
            }

            if (evento === 'UPDATE') {
              const actualizado = payload.new as Foco;
              if (!actualizado.activo) {
                return prev.filter((f) => f.id_foco !== actualizado.id_foco);
              }
              const existe = prev.some((f) => f.id_foco === actualizado.id_foco);
              const lista = existe
                ? prev.map((f) => (f.id_foco === actualizado.id_foco ? actualizado : f))
                : [actualizado, ...prev];

              return lista.sort(
                (a, b) => new Date(b.ultimo_reporte).getTime() - new Date(a.ultimo_reporte).getTime()
              );
            }

            if (evento === 'DELETE') {
              return prev.filter((foco) => foco.id_foco !== payload.old.id_foco);
            }

            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [obtenerFocos]);

  // Consulta real a la Status Fetch API de FxEmbed (api.fxtwitter.com)
  const procesarTweetUrl = async () => {
    if (!tweetUrlInput.trim()) return;
    setCargandoTweet(true);
    setErrorTweet(null);
    setTweetObtenido(null);

    const parsed = parsearTweetUrl(tweetUrlInput);
    if (!parsed) {
      setErrorTweet('URL de tweet inválida. Debe ser https://x.com/usuario/status/id');
      setCargandoTweet(false);
      return;
    }

    try {
      // Llamada directa a api.fxtwitter.com (con soporte CORS habilitado)
      const res = await fetch(`https://api.fxtwitter.com/${parsed.username}/status/${parsed.id}`);
      if (!res.ok) {
        throw new Error('No se pudo encontrar el tweet o la cuenta es privada');
      }

      const data = await res.json();
      if (data.code === 200 && data.tweet) {
        const tw: FxTweet = data.tweet;
        setTweetObtenido(tw);
        setNuevoTitulo(tw.text.length > 180 ? tw.text.substring(0, 177) + '...' : tw.text);
      } else {
        throw new Error(data.message || 'Error en la respuesta de FxTwitter');
      }
    } catch (err: any) {
      setErrorTweet(err.message || 'Error al conectar con la API de FxTwitter');
    } finally {
      setCargandoTweet(false);
    }
  };

  // Guardar nuevo foco extraído a Supabase
  const guardarFocoEnSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoTitulo.trim() || !tweetObtenido) return;

    setGuardandoFoco(true);
    try {
      const volumenCalculado = (tweetObtenido.retweets || 0) + (tweetObtenido.likes || 0) || 1;
      const fechaReporte = tweetObtenido.created_timestamp
        ? new Date(tweetObtenido.created_timestamp * 1000).toISOString()
        : new Date().toISOString();

      const { error } = await supabase.from('focos_noticias').insert([
        {
          titulo: nuevoTitulo.trim(),
          zona: nuevaZona.trim(),
          categoria: nuevaCategoria,
          alcance: nuevoAlcance,
          volumen_reportes: volumenCalculado,
          primer_reporte: fechaReporte,
          ultimo_reporte: fechaReporte,
          ejemplos_tweets: [tweetObtenido.url],
          activo: true
        }
      ]);

      if (error) throw error;

      setModalAbierto(false);
      setTweetUrlInput('');
      setTweetObtenido(null);
      setNuevoTitulo('');
    } catch (err: any) {
      alert('Error al guardar foco en Supabase: ' + err.message);
    } finally {
      setGuardandoFoco(false);
    }
  };

  // Métricas en cifras
  const metricas = useMemo(() => {
    const totalFocos = focos.length;
    const totalReportes = focos.reduce((acc, f) => acc + (f.volumen_reportes || 0), 0);
    
    const acumuladoPorCat: Record<string, number> = {};
    focos.forEach((f) => {
      const cat = f.categoria.toLowerCase();
      acumuladoPorCat[cat] = (acumuladoPorCat[cat] || 0) + (f.volumen_reportes || 0);
    });

    let catCritica = 'Ninguna';
    let maxReportesCat = 0;
    Object.entries(acumuladoPorCat).forEach(([cat, total]) => {
      if (total > maxReportesCat) {
        maxReportesCat = total;
        catCritica = cat;
      }
    });

    const diasporaCount = focos.filter(
      (f) => f.categoria.toLowerCase() === 'internacionales' || f.alcance === 'internacional'
    ).length;

    return {
      totalFocos,
      totalReportes,
      catCritica,
      diasporaCount,
      venezuelaCount: totalFocos - diasporaCount
    };
  }, [focos]);

  // Filtrado reactivo
  const focosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    return focos.filter((f) => {
      const catFoco = f.categoria.toLowerCase();

      const matchCat =
        filtroCategoria === 'todos' ||
        catFoco === filtroCategoria ||
        (filtroCategoria === 'fallas electricas' && catFoco === 'servicios');

      let matchAlcance = true;
      if (filtroAlcance !== 'todos') {
        const esInternacional = catFoco === 'internacionales' || f.alcance === 'internacional';
        if (filtroAlcance === 'internacional') {
          matchAlcance = esInternacional;
        } else if (filtroAlcance === 'nacional') {
          matchAlcance = !esInternacional && (f.alcance === 'nacional' || catFoco === 'nacionales');
        } else if (filtroAlcance === 'regional') {
          matchAlcance = !esInternacional && (f.alcance === 'regional' || catFoco === 'regionales' || !f.alcance);
        }
      }

      const matchTxt =
        !q ||
        f.titulo.toLowerCase().includes(q) ||
        f.zona.toLowerCase().includes(q) ||
        f.categoria.toLowerCase().includes(q);

      return matchCat && matchAlcance && matchTxt;
    });
  }, [focos, filtroCategoria, filtroAlcance, busqueda]);

  const formatearHora = (fechaIso: string) => {
    try {
      const date = new Date(fechaIso);
      if (isNaN(date.getTime())) return 'Hora no disponible';
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Hora no disponible';
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      {/* Header con botón de Ingesta */}
      <header className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3.5 w-3.5" aria-hidden="true">
              <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
            </span>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              Radar Informativo | Venezuela y Diáspora
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Monitoreo en tiempo real de incidentes ciudadanos, fallas de servicios y cobertura que impacta a Venezuela y a venezolanos en el exterior.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setModalAbierto(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all focus:ring-2 focus:ring-indigo-400 focus:outline-none"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Extraer de X / Tweet</span>
          </button>

          <div 
            className="flex items-center gap-2 text-xs bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-lg text-slate-300"
            role="status"
            aria-live="polite"
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400 motion-safe:animate-pulse" aria-hidden="true" />
            <span className="font-medium">En vivo</span>
          </div>
        </div>
      </header>

      {/* Modal de Ingesta FxEmbed */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => { setModalAbierto(false); setTweetObtenido(null); }}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2 text-indigo-400">
              <Twitter className="w-5 h-5" />
              <h3 className="text-lg font-bold text-white">Importar Foco desde X (FxEmbed API)</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Pega el enlace de un post de X / Twitter de una fuente verificada para extraer el texto real, autor y métricas sin inventar datos.
            </p>

            {/* Input URL */}
            <div className="flex gap-2 mb-4">
              <input
                type="url"
                placeholder="https://x.com/ReporteYa/status/18451..."
                value={tweetUrlInput}
                onChange={(e) => setTweetUrlInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={procesarTweetUrl}
                disabled={cargandoTweet || !tweetUrlInput.trim()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                {cargandoTweet ? 'Leyendo...' : 'Obtener'}
              </button>
            </div>

            {errorTweet && (
              <div className="p-3 mb-4 rounded-lg bg-rose-950/30 border border-rose-900/60 text-xs text-rose-300">
                {errorTweet}
              </div>
            )}

            {/* Previsualización del Tweet real */}
            {tweetObtenido && (
              <form onSubmit={guardarFocoEnSupabase} className="space-y-4 pt-2 border-t border-slate-800">
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-white text-xs">{tweetObtenido.author.name}</span>
                    <span className="text-slate-400 text-xs">@{tweetObtenido.author.screen_name}</span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">{tweetObtenido.text}</p>
                  <div className="flex gap-4 mt-2 text-[11px] text-slate-500">
                    <span>🔁 {tweetObtenido.retweets} retweets</span>
                    <span>❤️ {tweetObtenido.likes} likes</span>
                  </div>
                </div>

                {/* Formulario de confirmación */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Titular del Foco</label>
                  <input
                    type="text"
                    value={nuevoTitulo}
                    onChange={(e) => setNuevoTitulo(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Zona / Lugar</label>
                    <input
                      type="text"
                      value={nuevaZona}
                      onChange={(e) => setNuevaZona(e.target.value)}
                      required
                      placeholder="Ej. Maracaibo, Zulia"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Ámbito</label>
                    <select
                      value={nuevoAlcance}
                      onChange={(e: any) => setNuevoAlcance(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                    >
                      <option value="regional">Regional (Estados)</option>
                      <option value="nacional">Nacional (Todo el país)</option>
                      <option value="internacional">Diáspora / Exterior</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Categoría Temática</label>
                  <select
                    value={nuevaCategoria}
                    onChange={(e) => setNuevaCategoria(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white capitalize"
                  >
                    {CATEGORIAS_FILTRO.filter(c => c.id !== 'todos').map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={guardandoFoco}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{guardandoFoco ? 'Publicando...' : 'Publicar Foco en el Radar'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Panel de Datos en Cifras */}
      <section className="my-6 grid grid-cols-2 sm:grid-cols-4 gap-3" aria-label="Métricas en cifras">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Focos Activos</span>
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">{metricas.totalFocos}</div>
          <span className="text-[11px] text-slate-500">Eventos en seguimiento</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Reportes e Interacciones</span>
            <Flame className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 tracking-tight">{metricas.totalReportes}</div>
          <span className="text-[11px] text-slate-500">Volumen acumulado</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Mayor Alerta</span>
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg font-bold text-amber-300 truncate capitalize tracking-tight">
            {metricas.catCritica}
          </div>
          <span className="text-[11px] text-slate-500">Mayor concurrencia</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Alcance Territorial</span>
            <Globe className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-sm font-semibold text-slate-200 mt-1">
            <span className="text-emerald-400 font-bold">{metricas.venezuelaCount}</span> Vzla / <span className="text-sky-400 font-bold">{metricas.diasporaCount}</span> Diáspora
          </div>
          <span className="text-[11px] text-slate-500">Distribución de hechos</span>
        </div>
      </section>

      {/* Selector de Ámbito */}
      <div className="flex flex-wrap items-center gap-2 pb-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mr-1">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          Ámbito:
        </span>
        {[
          { id: 'todos', label: 'Todo el Radar' },
          { id: 'nacional', label: '🇻🇪 Nacional' },
          { id: 'regional', label: '📍 Regionales / Estados' },
          { id: 'internacional', label: '🌎 Diáspora / Exterior' },
        ].map((item) => {
          const activo = filtroAlcance === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setFiltroAlcance(item.id as any)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                activo 
                  ? 'bg-slate-100 text-slate-950 font-semibold shadow-sm' 
                  : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Buscador y Botonera Temática */}
      <section className="my-4 flex flex-col gap-3" aria-label="Filtros de búsqueda y categorías">
        <div className="relative">
          <label htmlFor="busqueda-focos" className="sr-only">
            Buscar por palabra clave, estado o fuente
          </label>
          <input
            id="busqueda-focos"
            type="search"
            placeholder="Buscar por zona (ej. Maracaibo, Caracas, Madrid), hechos o palabras clave..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>

        <div 
          className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800" 
          role="toolbar" 
          aria-label="Filtrar por categoría temática"
        >
          {CATEGORIAS_FILTRO.map((cat) => {
            const estaActivo = filtroCategoria === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFiltroCategoria(cat.id)}
                aria-pressed={estaActivo}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                  estaActivo
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Lista de Focos */}
      {errorCarga ? (
        <div className="py-12 px-4 text-center border border-rose-900/50 bg-rose-950/20 rounded-xl" role="alert">
          <AlertTriangle className="w-6 h-6 text-rose-400 mx-auto mb-2" aria-hidden="true" />
          <p className="text-rose-200 font-medium text-sm">No se pudieron cargar los incidentes</p>
          <p className="text-rose-400/80 text-xs mt-1">{errorCarga}</p>
          <button
            onClick={obtenerFocos}
            className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-900/60 hover:bg-rose-800 text-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            Reintentar conexión
          </button>
        </div>
      ) : cargando ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-busy="true" aria-label="Cargando incidentes">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-5 animate-pulse h-44" />
          ))}
        </div>
      ) : focosFiltrados.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/20" role="status">
          <p className="text-slate-300 font-medium">No hay incidentes reportados</p>
          <p className="text-slate-500 text-xs mt-1">No se detectaron reportes coincidentes con el filtro seleccionado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {focosFiltrados.map((foco) => {
            const configCat = CATEGORIAS_CONFIG[foco.categoria.toLowerCase()] || {
              label: foco.categoria,
              icon: AlertTriangle,
              color: 'text-slate-400',
              badge: 'bg-slate-800 border-slate-700 text-slate-300'
            };
            const IconoCat = configCat.icon;
            const fuentesValidas = (foco.ejemplos_tweets || []).filter(esUrlSegura);

            return (
              <article
                key={foco.id_foco}
                className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all rounded-xl p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border ${configCat.badge}`}>
                      <IconoCat className={`w-3.5 h-3.5 ${configCat.color}`} aria-hidden="true" />
                      <span>{configCat.label}</span>
                    </span>

                    <span className="flex items-center gap-1 text-xs font-bold text-rose-400 bg-rose-950/40 border border-rose-900/50 px-2 py-0.5 rounded-full">
                      <Flame className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{foco.volumen_reportes} reportes</span>
                    </span>
                  </div>

                  <h2 className="text-base font-semibold text-slate-100 leading-snug">
                    {foco.titulo}
                  </h2>

                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" aria-hidden="true" />
                    <span className="font-medium text-slate-300">{foco.zona}</span>
                    {foco.alcance && (
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 ml-1">
                        {foco.alcance}
                      </span>
                    )}
                  </div>
                </div>

                {/* Fuentes Verificadas y Timestamps */}
                <footer className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <time dateTime={foco.ultimo_reporte}>
                      Último reporte: {formatearHora(foco.ultimo_reporte)}
                    </time>
                  </div>

                  {fuentesValidas.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] text-slate-400 font-medium">Fuentes directas:</span>
                      {fuentesValidas.map((url, idx) => {
                        const etiqueta = extraerEtiquetaFuente(url, idx);
                        return (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Abrir fuente ${etiqueta} para el reporte: ${foco.titulo}`}
                            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-900/60 text-indigo-300 font-medium transition-colors"
                          >
                            <span>{etiqueta}</span>
                            <ExternalLink className="w-3 h-3 text-indigo-400" aria-hidden="true" />
                          </a>
                        );
                      })}
                    </div>
                  )}
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
