import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Calculator, 
  Layers, 
  Scroll, 
  Save, 
  History, 
  Droplets, 
  ArrowRight,
  FileText,
  LayoutGrid,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SubstrateType, InkComponent, Project, DEFAULT_ROLL_WIDTH, DEFAULT_ROLL_LENGTH } from './types';

const INITIAL_INKS: InkComponent[] = [
  { id: 'cyan', name: 'Cyan', ml: 0 },
  { id: 'magenta', name: 'Magenta', ml: 0 },
  { id: 'yellow', name: 'Yellow', ml: 0 },
  { id: 'black', name: 'Black', ml: 0 },
  { id: 'white', name: 'White', ml: 0 },
];

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState({
    name: '',
    substrateType: SubstrateType.SHEET,
    width: 0,
    height: 0,
    quantity: 1,
    inks: INITIAL_INKS.map(ink => ({ ...ink })),
  });

  // Load projects from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('inkcalc_projects');
    if (saved) {
      try {
        setProjects(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load projects", e);
      }
    }
  }, []);

  // Save projects to localStorage when they change
  useEffect(() => {
    localStorage.setItem('inkcalc_projects', JSON.stringify(projects));
  }, [projects]);

  const calculations = useMemo(() => {
    const { width, height, quantity, inks, substrateType } = currentProject;
    
    let area = 0;
    if (substrateType === SubstrateType.SHEET) {
      area = width * height * quantity;
    } else {
      // For rolls, if user provides width/height, it might be the printed area
      // but usually they want to calculate based on the total roll area or specific job area
      area = width * height * quantity;
    }

    const totalInkMl = inks.reduce((sum, ink) => sum + ink.ml, 0);
    const mlPerM2 = area > 0 ? totalInkMl / area : 0;

    return {
      totalArea: area,
      totalInkMl,
      mlPerM2,
      totalInkL: totalInkMl / 1000
    };
  }, [currentProject]);

  const handleInkChange = (id: string, value: string) => {
    const ml = parseFloat(value) || 0;
    setCurrentProject(prev => ({
      ...prev,
      inks: prev.inks.map(ink => ink.id === id ? { ...ink, ml } : ink)
    }));
  };

  const saveProject = () => {
    if (!currentProject.name) {
      alert("Por favor, asigne un nombre al proyecto.");
      return;
    }
    if (calculations.totalArea <= 0) {
      alert("El área total debe ser mayor a 0.");
      return;
    }

    const newProject: Project = {
      id: crypto.randomUUID(),
      date: new Date().toLocaleString(),
      ...currentProject,
      totalArea: calculations.totalArea,
      totalInkMl: calculations.totalInkMl,
      mlPerM2: calculations.mlPerM2,
    };

    setProjects(prev => [newProject, ...prev]);
    // Reset form partially
    setCurrentProject(prev => ({
      ...prev,
      name: '',
      inks: INITIAL_INKS.map(ink => ({ ...ink }))
    }));
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const setRollDefaults = () => {
    setCurrentProject(prev => ({
      ...prev,
      width: DEFAULT_ROLL_WIDTH,
      height: DEFAULT_ROLL_LENGTH,
      substrateType: SubstrateType.ROLL
    }));
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden border border-slate-100">
              <img 
                src="https://munkiedigitalecuador.vercel.app/lovable-uploads/d595f062-6436-48e6-a22a-91aa6e4e8169.png" 
                alt="Logo" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">MNK Est INK</h1>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Gestión de Consumo</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
            >
              <History size={18} />
              Historial
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input Form */}
        <div className="lg:col-span-8 space-y-8">
          <section className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Calculator size={20} className="text-indigo-600" />
                Nuevo Cálculo
              </h2>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button 
                  onClick={() => setCurrentProject(prev => ({ ...prev, substrateType: SubstrateType.SHEET }))}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${currentProject.substrateType === SubstrateType.SHEET ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <LayoutGrid size={14} />
                  Láminas
                </button>
                <button 
                  onClick={() => setCurrentProject(prev => ({ ...prev, substrateType: SubstrateType.ROLL }))}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${currentProject.substrateType === SubstrateType.ROLL ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Scroll size={14} />
                  Rollos
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nombre del Proyecto</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Banner Promocional A"
                    className="input-field"
                    value={currentProject.name}
                    onChange={e => setCurrentProject(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Ancho (m)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      className="input-field font-mono"
                      value={currentProject.width || ''}
                      onChange={e => setCurrentProject(prev => ({ ...prev, width: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Largo/Alto (m)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      className="input-field font-mono"
                      value={currentProject.height || ''}
                      onChange={e => setCurrentProject(prev => ({ ...prev, height: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Cantidad</label>
                    <input 
                      type="number" 
                      className="input-field font-mono w-24"
                      value={currentProject.quantity}
                      onChange={e => setCurrentProject(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                  {currentProject.substrateType === SubstrateType.ROLL && (
                    <button 
                      onClick={setRollDefaults}
                      className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      <Info size={12} />
                      Usar rollo estándar (1.5m x 50m)
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                  <Droplets size={14} className="text-indigo-500" />
                  Consumo RIP (ml)
                </h3>
                <div className="space-y-3">
                  {currentProject.inks.map(ink => (
                    <div key={ink.id} className="flex items-center gap-3">
                      <div className="w-24 text-xs font-semibold text-slate-700">{ink.name}</div>
                      <div className="flex-1 relative">
                        <input 
                          type="number" 
                          step="0.01"
                          className="input-field font-mono pr-8 py-1.5 text-sm"
                          value={ink.ml || ''}
                          onChange={e => handleInkChange(ink.id, e.target.value)}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">ml</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
              <button 
                onClick={saveProject}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
              >
                <Save size={18} />
                Guardar Proyecto
              </button>
            </div>
          </section>

          {/* Results Summary */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-5 bg-indigo-600 text-white border-none">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">Área Total</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono">{calculations.totalArea.toFixed(3)}</span>
                <span className="text-sm font-medium">m²</span>
              </div>
            </div>
            <div className="card p-5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Tinta Total</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-slate-900">{calculations.totalInkMl.toFixed(2)}</span>
                <span className="text-sm font-medium text-slate-500">ml</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-mono">({calculations.totalInkL.toFixed(3)} L)</p>
            </div>
            <div className="card p-5 border-indigo-100 bg-indigo-50/30">
              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">Consumo por m²</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-indigo-700">{calculations.mlPerM2.toFixed(2)}</span>
                <span className="text-sm font-medium text-indigo-600">ml/m²</span>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Info/Tips */}
        <div className="lg:col-span-4 space-y-6">
          <div className="card p-6 bg-slate-900 text-white border-none">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
              <Info size={18} className="text-indigo-400" />
              Guía de Uso
            </h3>
            <ul className="space-y-4 text-xs text-slate-300">
              <li className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-indigo-400 shrink-0">1</div>
                <p>Seleccione el tipo de sustrato (Lámina o Rollo).</p>
              </li>
              <li className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-indigo-400 shrink-0">2</div>
                <p>Ingrese las dimensiones en metros. Para rollos, puede usar el botón de acceso rápido.</p>
              </li>
              <li className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-indigo-400 shrink-0">3</div>
                <p>Copie los valores de mililitros (ml) que le proporciona su software RIP.</p>
              </li>
              <li className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-indigo-400 shrink-0">4</div>
                <p>El sistema calculará automáticamente el rendimiento por metro cuadrado.</p>
              </li>
            </ul>
          </div>

          <div className="card p-6 border-dashed border-2 border-slate-200 bg-transparent">
            <h3 className="text-sm font-bold text-slate-700 mb-2">¿Sabías que?</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Un consumo promedio eficiente en impresión UV suele rondar los 8-12 ml/m² dependiendo de la saturación y el tipo de cabezal. Monitorear este valor te ayuda a presupuestar mejor tus trabajos.
            </p>
          </div>
        </div>
      </main>

      {/* History Section */}
      <section className="max-w-7xl mx-auto px-4 mt-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <History size={22} className="text-slate-400" />
            Historial de Proyectos
          </h2>
          <span className="text-xs font-bold text-slate-400 uppercase">{projects.length} Proyectos Guardados</span>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="p-4 data-grid-header">Proyecto</th>
                  <th className="p-4 data-grid-header">Fecha</th>
                  <th className="p-4 data-grid-header">Sustrato</th>
                  <th className="p-4 data-grid-header text-right">Área (m²)</th>
                  <th className="p-4 data-grid-header text-right">Tinta Total (ml)</th>
                  <th className="p-4 data-grid-header text-right">ml/m²</th>
                  <th className="p-4 data-grid-header text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <AnimatePresence mode="popLayout">
                  {projects.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center">
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                          <FileText size={48} strokeWidth={1} />
                          <p className="text-sm font-medium">No hay proyectos guardados aún.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    projects.map((project) => (
                      <motion.tr 
                        key={project.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="hover:bg-slate-50/50 transition-colors group"
                      >
                        <td className="p-4">
                          <div className="font-bold text-slate-900">{project.name}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-xs text-slate-500">{project.date}</div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {project.substrateType === SubstrateType.ROLL ? (
                              <Scroll size={14} className="text-indigo-500" />
                            ) : (
                              <LayoutGrid size={14} className="text-emerald-500" />
                            )}
                            <span className="text-xs font-medium text-slate-600">{project.substrateType}</span>
                          </div>
                        </td>
                        <td className="p-4 text-right font-mono text-sm">{project.totalArea.toFixed(3)}</td>
                        <td className="p-4 text-right font-mono text-sm">{project.totalInkMl.toFixed(2)}</td>
                        <td className="p-4 text-right">
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 font-mono text-xs font-bold">
                            {project.mlPerM2.toFixed(2)}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button 
                            onClick={() => deleteProject(project.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-20 py-8 border-t border-slate-200 text-center">
        <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">
          desarrollado con amor por{' '}
          <a 
            href="https://munkiedigitalecuador.vercel.app/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-indigo-500 hover:underline"
          >
            munkiedigitalecuador
          </a>{' '}
          © 2026
        </p>
      </footer>

      {/* Social Bubbles */}
      <div className="fixed right-6 bottom-24 flex flex-col gap-3 z-50">
        <motion.a
          whileHover={{ scale: 1.1, x: -5 }}
          whileTap={{ scale: 0.9 }}
          href="https://instagram.com/bryant_ldu"
          target="_blank"
          rel="noopener noreferrer"
          className="w-12 h-12 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 rounded-full flex items-center justify-center text-white shadow-lg"
          title="Instagram"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
        </motion.a>
        <motion.a
          whileHover={{ scale: 1.1, x: -5 }}
          whileTap={{ scale: 0.9 }}
          href="https://facebook.com/bryant.ldu"
          target="_blank"
          rel="noopener noreferrer"
          className="w-12 h-12 bg-[#1877F2] rounded-full flex items-center justify-center text-white shadow-lg"
          title="Facebook"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
        </motion.a>
        <motion.a
          whileHover={{ scale: 1.1, x: -5 }}
          whileTap={{ scale: 0.9 }}
          href="https://wa.me/593998257855"
          target="_blank"
          rel="noopener noreferrer"
          className="w-12 h-12 bg-[#25D366] rounded-full flex items-center justify-center text-white shadow-lg"
          title="WhatsApp"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        </motion.a>
      </div>
    </div>
  );
}
