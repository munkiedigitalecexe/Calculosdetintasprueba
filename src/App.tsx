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
  Info,
  Search,
  Bell,
  ShoppingCart,
  User,
  Home,
  Settings,
  PieChart,
  Package,
  ChevronRight,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SubstrateType, InkComponent, Project, ProjectComponent, DEFAULT_ROLL_WIDTH, DEFAULT_ROLL_LENGTH } from './types';

const INITIAL_INKS: InkComponent[] = [
  { id: 'cyan', name: 'Cyan', ml: 0 },
  { id: 'magenta', name: 'Magenta', ml: 0 },
  { id: 'yellow', name: 'Yellow', ml: 0 },
  { id: 'black', name: 'Black', ml: 0 },
  { id: 'white', name: 'White', ml: 0 },
];

const LOGO_URL = "https://munkiedigitalecuador.vercel.app/lovable-uploads/d595f062-6436-48e6-a22a-91aa6e4e8169.png";

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectName, setProjectName] = useState('');
  const [components, setComponents] = useState<ProjectComponent[]>([]);
  
  // Form state for a single component being added
  const [newComp, setNewComp] = useState({
    name: '',
    substrateType: SubstrateType.SHEET,
    width: 0,
    height: 0,
    quantity: 1,
    inks: INITIAL_INKS.map(ink => ({ ...ink })),
  });

  useEffect(() => {
    const saved = localStorage.getItem('mnk_ink_projects');
    if (saved) {
      try {
        setProjects(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load projects", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('mnk_ink_projects', JSON.stringify(projects));
  }, [projects]);

  const addComponent = () => {
    if (!newComp.name) {
      alert("Asigne un nombre al componente (ej: Rótulo, Cenefa)");
      return;
    }
    const area = newComp.width * newComp.height * newComp.quantity;
    const inkMl = newComp.inks.reduce((sum, ink) => sum + ink.ml, 0);

    const component: ProjectComponent = {
      id: crypto.randomUUID(),
      ...newComp,
      area,
      inkMl
    };

    setComponents(prev => [...prev, component]);
    setNewComp({
      name: '',
      substrateType: SubstrateType.SHEET,
      width: 0,
      height: 0,
      quantity: 1,
      inks: INITIAL_INKS.map(ink => ({ ...ink })),
    });
  };

  const removeComponent = (id: string) => {
    setComponents(prev => prev.filter(c => c.id !== id));
  };

  const totals = useMemo(() => {
    const totalArea = components.reduce((sum, c) => sum + c.area, 0);
    const totalInkMl = components.reduce((sum, c) => sum + c.inkMl, 0);
    const mlPerM2 = totalArea > 0 ? totalInkMl / totalArea : 0;
    return { totalArea, totalInkMl, mlPerM2 };
  }, [components]);

  const saveProject = () => {
    if (!projectName) {
      alert("Nombre del proyecto requerido");
      return;
    }
    if (components.length === 0) {
      alert("Añada al menos un componente");
      return;
    }

    const project: Project = {
      id: crypto.randomUUID(),
      name: projectName,
      date: new Date().toLocaleString(),
      components: [...components],
      ...totals
    };

    setProjects(prev => [project, ...prev]);
    setProjectName('');
    setComponents([]);
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="flex flex-col h-screen bg-brand-bg text-white overflow-hidden p-4">
      <div className="flex flex-1 gap-4 overflow-hidden mb-4">
        {/* Sidebar */}
        <aside className="w-20 glass-card flex flex-col items-center py-8 gap-8 shrink-0">
        <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white p-1">
          <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
        </div>
        
        <nav className="flex flex-col gap-6 flex-1">
          <SidebarIcon icon={<Home size={22} />} active />
          <SidebarIcon icon={<Package size={22} />} />
          <SidebarIcon icon={<PieChart size={22} />} />
          <SidebarIcon icon={<Settings size={22} />} />
        </nav>

        <div className="w-10 h-10 rounded-full bg-brand-accent flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
          <Plus size={20} />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* Top Header */}
        <header className="flex items-center justify-between px-4">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-white/90">¡Buen día, MUNKIE!</h2>
            <p className="text-xs text-white/40">MNK Est INK • Gestión de Producción</p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search projects..." 
                className="bg-white/5 border border-white/10 rounded-full px-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50 w-64"
              />
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
            </div>
            <div className="flex items-center gap-4">
              <Bell size={20} className="text-white/40 cursor-pointer hover:text-white" />
              <ShoppingCart size={20} className="text-white/40 cursor-pointer hover:text-white" />
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center cursor-pointer border border-white/10">
                <User size={20} />
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="flex-1 grid grid-cols-12 gap-4 overflow-hidden">
          {/* Left Column: Editor */}
          <div className="col-span-8 flex flex-col gap-4 overflow-hidden">
            {/* Project Info Card */}
            <section className="glass-card p-6 flex items-center justify-between shrink-0 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-brand-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 flex-1">
                <input 
                  type="text" 
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  placeholder="NOMBRE DEL PROYECTO"
                  className="bg-transparent border-none text-2xl font-black placeholder:text-white/10 focus:outline-none w-full uppercase tracking-tighter"
                />
                <p className="text-xs text-white/40 mt-1">Añade componentes como Rótulos, Cenefas, etc.</p>
              </div>
              <button 
                onClick={saveProject}
                className="btn-primary relative z-10"
              >
                <Save size={18} />
                Finalizar Proyecto
              </button>
            </section>

            {/* Component Editor */}
            <div className="flex-1 grid grid-cols-2 gap-4 overflow-hidden">
              <section className="glass-card p-6 flex flex-col gap-4 overflow-y-auto">
                <h3 className="text-sm font-bold flex items-center gap-2 text-brand-accent">
                  <Calculator size={16} />
                  NUEVO COMPONENTE
                </h3>
                
                <div className="space-y-4">
                  <input 
                    type="text" 
                    placeholder="Nombre (ej: Rótulo Principal)"
                    className="input-field-dark"
                    value={newComp.name}
                    onChange={e => setNewComp(prev => ({ ...prev, name: e.target.value }))}
                  />

                  <div className="flex bg-white/5 p-1 rounded-xl">
                    <button 
                      onClick={() => setNewComp(prev => ({ ...prev, substrateType: SubstrateType.SHEET }))}
                      className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${newComp.substrateType === SubstrateType.SHEET ? 'bg-brand-accent text-white' : 'text-white/40'}`}
                    >
                      LÁMINAS
                    </button>
                    <button 
                      onClick={() => setNewComp(prev => ({ ...prev, substrateType: SubstrateType.ROLL }))}
                      className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${newComp.substrateType === SubstrateType.ROLL ? 'bg-brand-accent text-white' : 'text-white/40'}`}
                    >
                      ROLLOS
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-white/30 uppercase ml-1">Ancho (m)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        className="input-field-dark font-mono"
                        value={newComp.width || ''}
                        onChange={e => setNewComp(prev => ({ ...prev, width: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-white/30 uppercase ml-1">Alto (m)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        className="input-field-dark font-mono"
                        value={newComp.height || ''}
                        onChange={e => setNewComp(prev => ({ ...prev, height: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/30 uppercase ml-1">Cantidad</label>
                    <input 
                      type="number" 
                      className="input-field-dark font-mono"
                      value={newComp.quantity}
                      onChange={e => setNewComp(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                    />
                  </div>

                  <div className="bg-white/5 rounded-2xl p-4 space-y-3">
                    <p className="text-[10px] font-bold text-white/30 uppercase">Consumo RIP (ml)</p>
                    {newComp.inks.map(ink => (
                      <div key={ink.id} className="flex items-center gap-3">
                        <span className="text-[10px] font-bold w-16 text-white/60">{ink.name}</span>
                        <input 
                          type="number" 
                          className="flex-1 bg-transparent border-b border-white/10 text-xs font-mono focus:outline-none focus:border-brand-accent py-1"
                          value={ink.ml || ''}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            setNewComp(prev => ({
                              ...prev,
                              inks: prev.inks.map(i => i.id === ink.id ? { ...i, ml: val } : i)
                            }));
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={addComponent}
                    className="btn-secondary w-full"
                  >
                    <Plus size={18} />
                    Añadir Componente
                  </button>
                </div>
              </section>

              {/* Components List */}
              <section className="glass-card p-6 flex flex-col gap-4 overflow-y-auto">
                <h3 className="text-sm font-bold flex items-center gap-2 text-brand-secondary">
                  <Layers size={16} />
                  LISTA DE COMPONENTES
                </h3>
                
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {components.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-white/20 gap-2">
                        <Package size={32} />
                        <p className="text-[10px] font-bold uppercase">Vacío</p>
                      </div>
                    ) : (
                      components.map(comp => (
                        <motion.div 
                          key={comp.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between group"
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-white/80">{comp.name}</span>
                            <span className="text-[10px] text-white/30 font-mono">
                              {comp.width}x{comp.height}m • x{comp.quantity} • {comp.area.toFixed(2)}m²
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-bold text-brand-accent font-mono">{comp.inkMl.toFixed(1)}ml</span>
                            <button 
                              onClick={() => removeComponent(comp.id)}
                              className="text-white/20 hover:text-brand-accent transition-colors"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </section>
            </div>
          </div>

          {/* Right Column: Stats & History */}
          <div className="col-span-4 flex flex-col gap-4 overflow-hidden">
            {/* Statistics Card */}
            <section className="glass-card p-8 flex flex-col items-center justify-center gap-6 relative shrink-0">
              <div className="absolute top-6 left-6 text-[10px] font-bold text-white/30 uppercase tracking-widest">Your Statistic</div>
              
              <div className="relative w-48 h-48 flex items-center justify-center">
                {/* Gauge visualization (simplified) */}
                <div className="absolute inset-0 rounded-full border-[12px] border-white/5" />
                <div className="absolute inset-0 rounded-full border-[12px] border-brand-accent border-t-transparent border-l-transparent rotate-45" />
                <div className="flex flex-col items-center">
                  <span className="text-xs text-white/40 font-bold uppercase">Total ml</span>
                  <span className="text-4xl font-black font-mono tracking-tighter">{totals.totalInkMl.toFixed(1)}</span>
                  <span className="text-[10px] text-brand-accent font-bold mt-1">{totals.mlPerM2.toFixed(2)} ml/m²</span>
                </div>
              </div>

              <div className="grid grid-cols-3 w-full gap-4">
                <StatMini label="Área" value={`${totals.totalArea.toFixed(2)}`} unit="m²" color="bg-brand-accent" />
                <StatMini label="Litros" value={`${(totals.totalInkMl/1000).toFixed(2)}`} unit="L" color="bg-brand-secondary" />
                <StatMini label="Comp." value={`${components.length}`} unit="und" color="bg-purple-500" />
              </div>
            </section>

            {/* History Card */}
            <section className="glass-card flex-1 p-6 flex flex-col gap-4 overflow-hidden">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white/80">LAST PROJECTS</h3>
                <span className="text-[10px] font-bold text-white/30 hover:text-white cursor-pointer transition-colors">See More</span>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {projects.map(p => (
                  <div key={p.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 hover:bg-white/10 transition-all cursor-pointer group">
                    <div className="w-10 h-10 rounded-xl bg-brand-accent/20 flex items-center justify-center text-brand-accent">
                      <FileText size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold truncate uppercase">{p.name}</h4>
                      <p className="text-[10px] text-white/30">{p.date}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-bold font-mono">{p.totalInkMl.toFixed(1)}ml</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}
                        className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-brand-accent transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>

      {/* Credits Footer */}
      <footer className="text-[10px] font-bold text-white/20 uppercase tracking-widest text-center py-2 shrink-0">
        desarrollado con amor por <a href="https://munkiedigitalecuador.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline">munkiedigitalecuador</a> © 2026
      </footer>

      {/* Social Bubbles */}
      <div className="fixed right-8 top-1/2 -translate-y-1/2 flex flex-col gap-6 z-50">
        <SocialIcon 
          href="https://instagram.com/bryant_ldu" 
          delay={0}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E4405F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
        </SocialIcon>
        <SocialIcon 
          href="https://facebook.com/bryant.ldu" 
          delay={0.5}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1877F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
        </SocialIcon>
        <SocialIcon 
          href="https://wa.me/593998257855" 
          delay={1}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        </SocialIcon>
      </div>
    </div>
  );
}

function SidebarIcon({ icon, active = false }: { icon: React.ReactNode, active?: boolean }) {
  return (
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer transition-all ${active ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/20' : 'text-white/30 hover:text-white hover:bg-white/5'}`}>
      {icon}
    </div>
  );
}

function StatMini({ label, value, unit, color }: { label: string, value: string, unit: string, color: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center text-white shadow-lg shadow-black/20`}>
        <span className="text-[10px] font-bold">{unit}</span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-xs font-black font-mono">{value}</span>
        <span className="text-[8px] font-bold text-white/30 uppercase">{label}</span>
      </div>
    </div>
  );
}

function SocialIcon({ children, href, delay }: { children: React.ReactNode, href: string, delay: number }) {
  return (
    <motion.a
      animate={{
        y: [0, -8, 0],
        x: [0, 3, 0],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
        delay: delay
      }}
      whileHover={{ scale: 1.1, filter: "brightness(1.2)" }}
      whileTap={{ scale: 0.9 }}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="w-14 h-14 soap-bubble rounded-full flex items-center justify-center text-white shadow-xl cursor-pointer"
    >
      {children}
    </motion.a>
  );
}

