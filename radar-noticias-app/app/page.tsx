'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Flame, 
  MapPin, 
  Radio, 
  AlertTriangle, 
  Shield, 
  Zap, 
  Car, 
  CloudRain, 
  ExternalLink,
  RefreshCw
} from 'lucide-react';

export interface Foco {
  id_foco: string;
  titulo: string;
  zona: string;
  categoria: 'transito' | 'servicios' | 'clima' | 'seguridad' | string;
  volumen_reportes: number;
  primer_reporte: string;
  ultimo_reporte: string;
  ejemplos_tweets: string[];
  activo: boolean;
}

const CATEGORIAS_CONFIG: Record<string, { label: string; icon: typeof Zap; color: string; badge: string }> = {
  servicios: { label: 'Servicios', icon: Zap, color: 'text-amber-400', badge: 'bg-amber-950/40 border-amber-900/50 text-amber-200' },
  transito: { label: 'Tránsito', icon: Car, color: 'text-rose-400', badge: 'bg-rose-950/40 border-rose-900/50 text-rose-200' },
  clima: { label: 'Clima', icon: CloudRain, color: 'text-sky-400', badge: 'bg-sky-950/40 border-sky-900/50 text-sky-200' },
  seguridad: { label: 'Seguridad', icon: Shield, color: 'text-purple-400', badge: 'bg-purple-950/40 border-purple-900/50 text-purple-200' },
};

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
      const mensaje = err instanceof Error ? err.message : 'Error desconocido al cargar datos';
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

  const focosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return focos.filter((f) => {
      const matchCat =
        filtroCategoria === 'todos' || f.categoria.toLowerCase() === filtroCategoria.toLowerCase();
      const matchTxt =
        !q ||
        f.titulo.toLowerCase().includes(q) ||
        f.zona.toLowerCase().includes(q);
      return matchCat && matchTxt;
    });
  }, [focos, filtroCategoria, busqueda]);

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
    <main className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3" aria-hidden="true">
              <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Radar de Focos Informativos
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Detección de incidentes y tendencias en tiempo real vía redes sociales
          </p>
        </div>

        <div 
          className="flex items-center gap-2 text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full text-slate-300"
          role="status"
          aria-live="polite"
        >
          <Radio className="w-3.5 h-3.5 text-emerald-400 motion-safe:animate-pulse" aria-hidden="true" />
          <span>Sincronización en vivo activa</span>
        </div>
      </header>

      {/* Controles de Búsqueda y Filtros */}
      <section className="my-6 flex flex-col md:flex-row gap-3" aria-label="Filtros de búsqueda">
        <div className="flex-1 relative">
          <label htmlFor="busqueda-focos" className="sr-only">
            Buscar por zona o palabra clave
          </label>
          <input
            id="busqueda-focos"
            type="search"
            placeholder="Buscar por zona o palabra clave..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0" role="toolbar" aria-label="Filtrar por categoría">
          {['todos', 'transito', 'servicios', 'clima', 'seguridad'].map((cat) => {
            const estaActivo = filtroCategoria === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setFiltroCategoria(cat)}
                aria-pressed={estaActivo}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                  estaActivo
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </section>

      {/* Estados: Error, Carga, Vacío y Lista */}
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
            Reintentar
          </button>
        </div>
      ) : cargando ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-busy="true" aria-label="Cargando incidentes">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-5 animate-pulse h-40" />
          ))}
        </div>
      ) : focosFiltrados.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-slate-800 rounded-xl" role="status">
          <p className="text-slate-300 font-medium">No hay incidentes reportados</p>
          <p className="text-slate-500 text-xs mt-1">No se detectaron reportes concurrentes para este filtro o búsqueda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {focosFiltrados.map((foco) => {
            const configCat = CATEGORIAS_CONFIG[foco.categoria.toLowerCase()];
            const IconoCat = configCat?.icon || AlertTriangle;
            const fuenteValida = foco.ejemplos_tweets?.[0] && esUrlSegura(foco.ejemplos_tweets[0])
              ? foco.ejemplos_tweets[0]
              : null;

            return (
              <article
                key={foco.id_foco}
                className="bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all rounded-xl p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-800 text-slate-200">
                      <IconoCat className={`w-3.5 h-3.5 ${configCat?.color || 'text-slate-400'}`} aria-hidden="true" />
                      <span className="capitalize">{foco.categoria}</span>
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
                    <span>{foco.zona}</span>
                  </div>
                </div>

                <footer className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <time dateTime={foco.ultimo_reporte}>
                    Último reporte: {formatearHora(foco.ultimo_reporte)}
                  </time>

                  {fuenteValida && (
                    <a
                      href={fuenteValida}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Ver fuentes externas para el foco: ${foco.titulo}`}
                      className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium focus:underline focus:outline-none"
                    >
                      <span>Ver fuentes</span>
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
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
