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
  Layers
} from 'lucide-react';

export interface Foco {
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

// Configuración de categorías de sala de redacción con enfoque en Venezuela y la diáspora
export const CATEGORIAS_CONFIG: Record<
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

function extraerEtiquetaFuente(url: string, index: number): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname;

    if (host.includes('x.com') || host.includes('twitter.com')) {
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
    if (host.includes('eldiario')) return 'El Diario';
    if (host.includes('runrun')) return 'Runrun.es';
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

  // Métricas en cifras de Sala de Redacción
  const metricas = useMemo(() => {
    const totalFocos = focos.length;
    const totalReportes = focos.reduce((acc, f) => acc + (f.volumen_reportes || 0), 0);
    
    // Categoría crítica con más reportes acumulados
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

  // Filtrado reactivo por texto, categoría y alcance territorial
  const focosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    return focos.filter((f) => {
      const catFoco = f.categoria.toLowerCase();

      // Coincidencia de categoría
      const matchCat =
        filtroCategoria === 'todos' ||
        catFoco === filtroCategoria ||
        (filtroCategoria === 'fallas electricas' && catFoco === 'servicios');

      // Coincidencia de alcance geográfico
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

      // Coincidencia por texto
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
      {/* Header Editorial */}
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
            Monitoreo en tiempo real de focos críticos, incidentes ciudadanos y cobertura informativa que impacta a Venezuela y a la comunidad venezolana en el exterior.
          </p>
        </div>

        <div 
          className="flex items-center gap-2 text-xs bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-full text-slate-300 shrink-0 self-start md:self-auto"
          role="status"
          aria-live="polite"
        >
          <Radio className="w-3.5 h-3.5 text-emerald-400 motion-safe:animate-pulse" aria-hidden="true" />
          <span className="font-medium">Canal de verificación activo</span>
        </div>
      </header>

      {/* Panel de Datos en Cifras (KPIs de Sala de Redacción) */}
      <section className="my-6 grid grid-cols-2 sm:grid-cols-4 gap-3" aria-label="Métricas de monitoreo en tiempo real">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Focos Activos</span>
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">{metricas.totalFocos}</div>
          <span className="text-[11px] text-slate-500">Eventos bajo seguimiento</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Reportes Ciudadanos</span>
            <Flame className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 tracking-tight">{metricas.totalReportes}</div>
          <span className="text-[11px] text-slate-500">Menciones acumuladas</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Mayor Alerta</span>
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg font-bold text-amber-300 truncate capitalize tracking-tight">
            {metricas.catCritica}
          </div>
          <span className="text-[11px] text-slate-500">Mayor volumen de reporte</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Alcance Geográfico</span>
            <Globe className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-sm font-semibold text-slate-200 mt-1">
            <span className="text-emerald-400 font-bold">{metricas.venezuelaCount}</span> en Vzla / <span className="text-sky-400 font-bold">{metricas.diasporaCount}</span> Diáspora
          </div>
          <span className="text-[11px] text-slate-500">Distribución de eventos</span>
        </div>
      </section>

      {/* Selector de Ámbito Territorial */}
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

      {/* Buscador y Botonera Temática por Fuentes / Hechos */}
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

        {/* Botones de Categorías Temáticas */}
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

      {/* Estados: Error, Carga, Vacío y Lista de Focos */}
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
          <p className="text-slate-500 text-xs mt-1">No se detectaron reportes coincidentes con el filtro o término de búsqueda seleccionado.</p>
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
            
            // Filtrar fuentes seguras
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

                  {/* Lista de Fuentes Verificadas */}
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
