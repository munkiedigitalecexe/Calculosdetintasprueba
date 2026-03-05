import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Minus,
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
  X,
  Download,
  FileSpreadsheet,
  FileDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
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
    width: '0',
    height: '0',
    quantity: '1',
    unitsPerStrip: '0',
    totalUnitsTarget: '0',
    rollLength: String(DEFAULT_ROLL_LENGTH),
    inks: INITIAL_INKS.map(ink => ({ ...ink, ml: '0' })),
  });

  const [productionMode, setProductionMode] = useState(false);

  useEffect(() => {
    const units = parseFloat(newComp.unitsPerStrip);
    const target = parseFloat(newComp.totalUnitsTarget);
    if (productionMode && units > 0 && target > 0) {
      const calculatedQty = Math.ceil(target / units);
      setNewComp(prev => ({ ...prev, quantity: String(calculatedQty) }));
    }
  }, [productionMode, newComp.unitsPerStrip, newComp.totalUnitsTarget]);

  useEffect(() => {
    const savedProjects = localStorage.getItem('mnk_ink_projects');
    if (savedProjects) {
      try {
        setProjects(JSON.parse(savedProjects));
      } catch (e) {
        console.error("Failed to load projects", e);
      }
    }
    
    const savedCurrentName = localStorage.getItem('mnk_ink_current_name');
    if (savedCurrentName) setProjectName(savedCurrentName);
    
    const savedCurrentComponents = localStorage.getItem('mnk_ink_current_components');
    if (savedCurrentComponents) {
      try {
        setComponents(JSON.parse(savedCurrentComponents));
      } catch (e) {
        console.error("Failed to load current components", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('mnk_ink_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('mnk_ink_current_name', projectName);
  }, [projectName]);

  useEffect(() => {
    localStorage.setItem('mnk_ink_current_components', JSON.stringify(components));
  }, [components]);

  const addComponent = () => {
    if (!newComp.name) {
      alert("Asigne un nombre al componente (ej: Rótulo, Cenefa)");
      return;
    }

    const width = parseFloat(newComp.width) || 0;
    const height = parseFloat(newComp.height) || 0;
    const quantity = parseFloat(newComp.quantity) || 0;
    const rollLength = parseFloat(newComp.rollLength) || 0;
    const unitsPerStrip = parseFloat(newComp.unitsPerStrip) || 0;
    const totalUnitsTarget = parseFloat(newComp.totalUnitsTarget) || 0;

    const area = width * height * quantity;
    const inkMl = newComp.inks.reduce((sum, ink) => sum + (parseFloat(ink.ml as any) || 0), 0) * quantity;

    let rollsNeeded = 0;
    if (newComp.substrateType === SubstrateType.ROLL && height > 0 && rollLength > 0) {
      const stripsPerRoll = Math.floor(rollLength / height);
      rollsNeeded = stripsPerRoll > 0 ? quantity / stripsPerRoll : 0;
    }

    const component: ProjectComponent = {
      id: crypto.randomUUID(),
      name: newComp.name,
      substrateType: newComp.substrateType,
      width,
      height,
      quantity,
      unitsPerStrip,
      totalUnitsTarget,
      rollLength,
      inks: newComp.inks.map(ink => ({ ...ink, ml: parseFloat(ink.ml as any) || 0 })),
      area,
      inkMl,
      rollsNeeded: rollsNeeded > 0 ? rollsNeeded : undefined
    };

    setComponents(prev => [...prev, component]);
    setNewComp({
      name: '',
      substrateType: SubstrateType.SHEET,
      width: '0',
      height: '0',
      quantity: '1',
      unitsPerStrip: '0',
      totalUnitsTarget: '0',
      rollLength: String(DEFAULT_ROLL_LENGTH),
      inks: INITIAL_INKS.map(ink => ({ ...ink, ml: '0' })),
    });
  };

  const removeComponent = (id: string) => {
    setComponents(prev => prev.filter(c => c.id !== id));
  };

  const totals = useMemo(() => {
    const totalArea = components.reduce((sum, c) => sum + c.area, 0);
    const totalInkMl = components.reduce((sum, c) => sum + c.inkMl, 0);
    const totalInkWithWaste = totalInkMl * 1.15;
    const mlPerM2 = totalArea > 0 ? totalInkMl / totalArea : 0;
    
    // Per-ink totals
    const inkTotals = INITIAL_INKS.map(initialInk => {
      const ml = components.reduce((sum, comp) => {
        const compInk = comp.inks.find(i => i.id === initialInk.id);
        return sum + (compInk ? compInk.ml * comp.quantity : 0);
      }, 0);
      return {
        ...initialInk,
        ml,
        liters: ml / 1000,
        mlWithWaste: ml * 1.15,
        litersWithWaste: (ml * 1.15) / 1000
      };
    });

    return { totalArea, totalInkMl, totalInkWithWaste, mlPerM2, inkTotals };
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

  const loadProject = (project: Project) => {
    if (components.length > 0 && !confirm("¿Desea cargar este proyecto? Se perderán los cambios actuales.")) {
      return;
    }
    setProjectName(project.name);
    setComponents(project.components);
  };

  const exportToExcel = () => {
    if (components.length === 0) {
      alert("No hay datos para exportar");
      return;
    }

    const data = components.map(c => {
      const row: any = {
        Componente: c.name,
        Sustrato: c.substrateType,
        "Ancho (m)": c.width,
        "Alto (m)": c.height,
        Cantidad: c.quantity,
        "Área Total (m2)": c.area.toFixed(2),
        "Tinta Total (ml)": c.inkMl.toFixed(2),
        "Unid. por Tira": c.unitsPerStrip || "-",
        "Total Unidades": c.totalUnitsTarget || "-",
        "Rollos Estimados": c.rollsNeeded?.toFixed(2) || "-"
      };
      
      // Add per-color columns for each component
      c.inks.forEach(ink => {
        row[`${ink.name} (ml)`] = (ink.ml * c.quantity).toFixed(2);
      });
      
      return row;
    });

    // Add ink totals by color
    data.push({ Componente: "--- CONSUMO POR COLOR ---" } as any);
    totals.inkTotals.forEach(ink => {
      data.push({
        Componente: `Tinta ${ink.name}`,
        "Tinta Total (ml)": ink.ml.toFixed(2),
        "Área Total (m2)": `${ink.liters.toFixed(4)} L`,
        Sustrato: "Con Desperdicio:",
        "Ancho (m)": ink.mlWithWaste.toFixed(2) as any,
        "Alto (m)": `${ink.litersWithWaste.toFixed(4)} L` as any
      } as any);
    });

    // Add summary row with waste
    data.push({ Componente: "--- TOTALES GENERALES ---" } as any);
    data.push({
      Componente: "TOTAL PROYECTO (Sin Desperdicio)",
      Sustrato: "",
      "Ancho (m)": 0,
      "Alto (m)": 0,
      Cantidad: 0,
      "Área Total (m2)": totals.totalArea.toFixed(2),
      "Tinta Total (ml)": totals.totalInkMl.toFixed(2),
      "Unid. por Tira": "",
      "Total Unidades": "",
      "Rollos Estimados": ""
    } as any);

    data.push({
      Componente: "TOTAL CON 15% DESPERDICIO",
      Sustrato: "",
      "Ancho (m)": 0,
      "Alto (m)": 0,
      Cantidad: 0,
      "Área Total (m2)": "",
      "Tinta Total (ml)": totals.totalInkWithWaste.toFixed(2),
      "Unid. por Tira": "",
      "Total Unidades": "",
      "Rollos Estimados": ""
    } as any);

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Producción");
    XLSX.writeFile(wb, `${projectName || 'Proyecto'}_MNK_INK.xlsx`);
  };

  const exportToPDF = () => {
    if (components.length === 0) {
      alert("No hay datos para exportar");
      return;
    }

    const doc = new jsPDF();
    const title = projectName || "PROYECTO MNK EST INK";
    
    doc.setFontSize(20);
    doc.text(title.toUpperCase(), 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Total Tinta (Neto): ${totals.totalInkMl.toFixed(2)} ml`, 14, 38);
    doc.text(`Total con 15% Desperdicio: ${totals.totalInkWithWaste.toFixed(2)} ml`, 14, 46);
    doc.text(`Rendimiento: ${totals.mlPerM2.toFixed(2)} ml/m2`, 14, 54);

    // Add per-color info
    doc.setFontSize(9);
    let yPos = 62;
    doc.text("CONSUMO POR COLOR (ML / LITROS):", 14, yPos);
    yPos += 5;
    totals.inkTotals.forEach((ink, i) => {
      const text = `${ink.name}: ${ink.ml.toFixed(2)}ml (${ink.liters.toFixed(3)}L) | Con Desperdicio: ${ink.mlWithWaste.toFixed(2)}ml (${ink.litersWithWaste.toFixed(3)}L)`;
      doc.text(text, 14, yPos + (i * 4));
    });

    const tableData = components.map(c => [
      c.name,
      c.width + "x" + c.height,
      c.quantity,
      c.area.toFixed(2) + " m2",
      c.inkMl.toFixed(2) + " ml",
      c.inks.map(i => `${i.name.charAt(0)}:${(i.ml * c.quantity).toFixed(1)}`).join(" | ")
    ]);

    (doc as any).autoTable({
      startY: yPos + (totals.inkTotals.length * 4) + 5,
      head: [['Componente', 'Medida', 'Cant.', 'Área', 'Tinta Total', 'Desglose Colores (ml)']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`${projectName || 'Proyecto'}_MNK_INK.pdf`);
  };

  return (
    <div className="flex flex-col min-h-screen md:h-screen bg-brand-bg text-white overflow-y-auto md:overflow-hidden p-2 md:p-4">
      <div className="flex flex-col md:flex-row flex-1 gap-2 md:gap-4 overflow-y-auto md:overflow-hidden mb-4">
        {/* Sidebar */}
        <aside className="w-full md:w-20 glass-card flex flex-row md:flex-col items-center py-4 md:py-8 px-4 md:px-0 gap-4 md:gap-8 shrink-0">
          <div 
            className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden bg-white p-1 cursor-pointer hover:scale-105 transition-transform shadow-lg border border-white/10"
            onClick={() => window.location.href = '/'}
            title="Ir al Dashboard"
          >
            <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
          </div>
          
          <nav className="flex flex-row md:flex-col gap-4 md:gap-6 flex-1 justify-center">
            <SidebarIcon icon={<Home size={20} />} active />
            <SidebarIcon icon={<Package size={20} />} />
            <SidebarIcon icon={<PieChart size={20} />} />
            <SidebarIcon icon={<Settings size={20} />} />
          </nav>

          <div className="w-10 h-10 rounded-lg bg-brand-accent flex items-center justify-center cursor-pointer hover:scale-110 transition-transform shrink-0 shadow-[0_0_15px_#45F882]" onClick={() => { setProjectName(''); setComponents([]); }}>
            <Plus size={20} className="text-black" />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col gap-4 overflow-y-auto md:overflow-hidden">
          {/* Top Header */}
          <header className="flex flex-col md:flex-row items-start md:items-center justify-between px-4 md:px-8 py-4 gap-4 md:gap-0 shrink-0 border-b border-white/5 bg-brand-card/50 backdrop-blur-md">
            <div className="flex flex-col">
              <h2 className="text-2xl md:text-4xl font-display font-black text-brand-accent tracking-tighter uppercase italic">MUNKIE PRODUCTION</h2>
              <p className="text-xs text-white/40 font-bold uppercase tracking-[0.4em] mt-1 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
                System Active • Ink Management v2.0
              </p>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-6 w-full md:w-auto">
              <div className="relative w-full md:w-72 group">
                <input 
                  type="text" 
                  placeholder="SEARCH PROJECTS..." 
                  className="bg-brand-surface border border-white/10 rounded-lg px-12 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand-accent w-full transition-all uppercase font-bold"
                />
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-brand-accent transition-colors" />
              </div>
              <div className="flex items-center justify-between md:justify-start gap-6 w-full md:w-auto">
                <div className="flex items-center gap-5">
                  <div className="relative cursor-pointer hover:text-brand-accent transition-colors text-white/30">
                    <Bell size={20} />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-brand-accent rounded-full shadow-[0_0_10px_#45F882]" />
                  </div>
                  <ShoppingCart size={20} className="text-white/30 cursor-pointer hover:text-brand-accent transition-colors" />
                </div>
                <div className="w-10 h-10 rounded-lg bg-brand-surface border border-white/10 flex items-center justify-center cursor-pointer hover:border-brand-accent transition-all shadow-lg">
                  <User size={20} className="text-white/60" />
                </div>
              </div>
            </div>
          </header>

          {/* Dashboard Grid */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 overflow-hidden">
            {/* Left Column: Editor */}
            <div className="col-span-1 md:col-span-12 lg:col-span-8 flex flex-col gap-4 min-h-0">
              {/* Project Info Card */}
              <section className="glass-card p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between shrink-0 relative overflow-hidden group gap-6 md:gap-0 border-l-4 border-l-brand-accent">
                <div className="relative z-10 flex-1 w-full flex items-center gap-6">
                  <div className="p-4 rounded-lg bg-brand-accent/10 text-brand-accent border border-brand-accent/20">
                    <FileText size={32} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <input 
                        type="text" 
                        value={projectName}
                        onChange={e => setProjectName(e.target.value)}
                        placeholder="PROJECT NAME"
                        className="bg-transparent border-none text-2xl md:text-5xl font-display font-black placeholder:text-white/5 focus:outline-none w-full uppercase tracking-tighter text-white selection:bg-brand-accent/40"
                      />
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-brand-accent font-bold uppercase tracking-[0.2em]">{new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                      <span className="w-1 h-1 rounded-full bg-white/10" />
                      <span className="text-xs text-white/30 font-bold uppercase tracking-[0.2em]">Total Area: {totals.totalArea.toFixed(2)} m²</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto relative z-10">
                  <button 
                    onClick={() => {
                      if (confirm("¿Desea limpiar el proyecto actual?")) {
                        setComponents([]);
                        setProjectName('');
                      }
                    }}
                    className="p-5 rounded-lg bg-brand-secondary border border-white/5 text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all active:scale-95 group/trash"
                    title="Limpiar Todo"
                  >
                    <Trash2 size={24} className="group-hover/trash:rotate-12 transition-transform" />
                  </button>
                  <button 
                    onClick={saveProject}
                    className="btn-primary flex-1 md:flex-none h-16 px-10 text-lg"
                  >
                    <Save size={22} />
                    SAVE PROJECT
                  </button>
                </div>
              </section>

              {/* Component Editor & List Container */}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
                <section className="glass-card p-4 md:p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                  <h3 className="text-sm font-display font-bold flex items-center gap-2 text-brand-accent sticky top-0 bg-brand-card py-2 z-20 uppercase tracking-widest border-b border-brand-accent/20 mb-4">
                    <Calculator size={16} />
                    ADD COMPONENT
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="relative group">
                      <Package size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-brand-accent transition-colors" />
                      <input 
                        type="text" 
                        placeholder="Nombre (ej: Rótulo Principal)"
                        className="input-field-dark pl-12"
                        value={newComp.name}
                        onChange={e => setNewComp(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>

                    <div className="flex bg-white/5 p-1 rounded-xl">
                      <button 
                        onClick={() => setNewComp(prev => ({ ...prev, substrateType: SubstrateType.SHEET }))}
                        className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${newComp.substrateType === SubstrateType.SHEET ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/20' : 'text-white/40 hover:text-white/60'}`}
                      >
                        <LayoutGrid size={12} />
                        LÁMINAS
                      </button>
                      <button 
                        onClick={() => setNewComp(prev => ({ ...prev, substrateType: SubstrateType.ROLL }))}
                        className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${newComp.substrateType === SubstrateType.ROLL ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/20' : 'text-white/40 hover:text-white/60'}`}
                      >
                        <Scroll size={12} />
                        ROLLOS
                      </button>
                    </div>

                    {/* Production Mode Toggle */}
                    <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] p-3 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${productionMode ? 'bg-brand-accent/20 text-brand-accent' : 'bg-white/5 text-white/20'}`}>
                          <Settings size={14} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Modo Producción</span>
                          <span className="text-[10px] text-white/30 uppercase font-medium">Calcula repeticiones automáticamente</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => setProductionMode(!productionMode)}
                        className={`w-10 h-5 rounded-full relative transition-all duration-300 ${productionMode ? 'bg-brand-accent' : 'bg-white/10'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-300 ${productionMode ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>

                    {productionMode && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="grid grid-cols-2 gap-3 bg-brand-accent/[0.03] p-4 rounded-2xl border border-brand-accent/10"
                      >
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-brand-accent/70 uppercase ml-1 tracking-widest">Unid. por Tira</label>
                          <input 
                            type="number" 
                            className="input-field-dark border-brand-accent/20 bg-brand-accent/[0.04]"
                            value={newComp.unitsPerStrip}
                            onChange={e => setNewComp(prev => ({ ...prev, unitsPerStrip: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-brand-accent/70 uppercase ml-1 tracking-widest">Total Unidades</label>
                          <input 
                            type="number" 
                            className="input-field-dark border-brand-accent/20 bg-brand-accent/[0.04]"
                            value={newComp.totalUnitsTarget}
                            onChange={e => setNewComp(prev => ({ ...prev, totalUnitsTarget: e.target.value }))}
                          />
                        </div>
                      </motion.div>
                    )}

                    {newComp.substrateType === SubstrateType.ROLL && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-white/40 uppercase ml-1 tracking-widest">Largo del Rollo (m)</label>
                        <div className="relative">
                          <Scroll size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                          <input 
                            type="number" 
                            step="any"
                            className="input-field-dark pl-12 font-mono"
                            value={newComp.rollLength}
                            onChange={e => setNewComp(prev => ({ ...prev, rollLength: e.target.value }))}
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-white/40 uppercase ml-1 tracking-widest">Ancho (m)</label>
                        <div className="flex items-center bg-white/[0.03] rounded-2xl border border-white/[0.08] overflow-hidden group focus-within:border-brand-accent/40 transition-colors">
                          <button 
                            onClick={() => setNewComp(prev => ({ ...prev, width: String(Math.max(0, (parseFloat(prev.width) || 0) - 0.1)) }))}
                            className="p-3 hover:bg-white/5 transition-colors text-white/30 hover:text-white"
                          >
                            <Minus size={14} />
                          </button>
                          <input 
                            type="number" 
                            step="any"
                            className="w-full bg-transparent text-center text-sm font-mono font-bold focus:outline-none py-2"
                            value={newComp.width}
                            onChange={e => setNewComp(prev => ({ ...prev, width: e.target.value }))}
                          />
                          <button 
                            onClick={() => setNewComp(prev => ({ ...prev, width: String((parseFloat(prev.width) || 0) + 0.1) }))}
                            className="p-3 hover:bg-white/5 transition-colors text-white/30 hover:text-white"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-white/40 uppercase ml-1 tracking-widest">Alto (m)</label>
                        <div className="flex items-center bg-white/[0.03] rounded-2xl border border-white/[0.08] overflow-hidden group focus-within:border-brand-accent/40 transition-colors">
                          <button 
                            onClick={() => setNewComp(prev => ({ ...prev, height: String(Math.max(0, (parseFloat(prev.height) || 0) - 0.1)) }))}
                            className="p-3 hover:bg-white/5 transition-colors text-white/30 hover:text-white"
                          >
                            <Minus size={14} />
                          </button>
                          <input 
                            type="number" 
                            step="any"
                            className="w-full bg-transparent text-center text-sm font-mono font-bold focus:outline-none py-2"
                            value={newComp.height}
                            onChange={e => setNewComp(prev => ({ ...prev, height: e.target.value }))}
                          />
                          <button 
                            onClick={() => setNewComp(prev => ({ ...prev, height: String((parseFloat(prev.height) || 0) + 0.1) }))}
                            className="p-3 hover:bg-white/5 transition-colors text-white/30 hover:text-white"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/40 uppercase ml-2 tracking-[0.2em]">Cantidad de Piezas</label>
                      <div className="flex items-center bg-white/[0.03] rounded-2xl border border-white/[0.08] overflow-hidden group focus-within:border-brand-accent/40 transition-colors">
                        <button 
                          onClick={() => setNewComp(prev => ({ ...prev, quantity: String(Math.max(1, (parseInt(prev.quantity) || 0) - 1)) }))}
                          className="p-4 hover:bg-white/5 transition-colors text-white/30 hover:text-white"
                        >
                          <Minus size={16} />
                        </button>
                        <input 
                          type="number" 
                          className="w-full bg-transparent text-center text-sm font-mono font-black focus:outline-none py-3"
                          value={newComp.quantity}
                          onChange={e => setNewComp(prev => ({ ...prev, quantity: e.target.value }))}
                        />
                        <button 
                          onClick={() => setNewComp(prev => ({ ...prev, quantity: String((parseInt(prev.quantity) || 0) + 1) }))}
                          className="p-4 hover:bg-white/5 transition-colors text-white/30 hover:text-white"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-6 space-y-5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-white/40 uppercase tracking-[0.3em] flex items-center gap-2">
                          <Droplets size={12} className="text-brand-accent" />
                          Consumo RIP (ml)
                        </p>
                        <span className="text-[10px] font-bold text-brand-accent/60 uppercase tracking-widest">Valores por pieza</span>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        {newComp.inks.map(ink => (
                          <div key={ink.id} className="flex items-center gap-4 group/ink">
                            <div className="flex items-center gap-3 w-24 shrink-0">
                              <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${
                                ink.id === 'cyan' ? 'bg-cyan-400' : 
                                ink.id === 'magenta' ? 'bg-pink-500' : 
                                ink.id === 'yellow' ? 'bg-yellow-400' : 
                                ink.id === 'black' ? 'bg-zinc-900 border border-white/20' : 
                                'bg-white'
                              }`} />
                              <span className="text-xs font-bold text-white/50 uppercase tracking-wider group-hover/ink:text-white/80 transition-colors">{ink.name}</span>
                            </div>
                            <div className="flex-1 relative">
                              <input 
                                type="number" 
                                step="any"
                                placeholder="0.00"
                                className="w-full bg-white/[0.03] border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent/70 transition-all text-white placeholder:text-white/5"
                                value={ink.ml}
                                onChange={e => {
                                  const val = e.target.value;
                                  setNewComp(prev => ({
                                    ...prev,
                                    inks: prev.inks.map(i => i.id === ink.id ? { ...i, ml: val as any } : i)
                                  }));
                                }}
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-white/10 group-focus-within/ink:text-brand-accent/50 transition-colors">ML</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button 
                      onClick={addComponent}
                      className="btn-secondary w-full mb-8"
                    >
                      <Plus size={18} />
                      Añadir Componente
                    </button>
                  </div>
                </section>

                {/* Components List */}
                <section className="glass-card p-4 md:p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                  <h3 className="text-sm font-display font-bold flex items-center gap-2 text-white/60 uppercase tracking-widest border-b border-white/5 pb-2">
                    <Layers size={16} />
                    COMPONENTS LIST
                  </h3>
                  
                  <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                      {components.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-white/5 gap-6">
                          <div className="relative">
                            <Package size={64} strokeWidth={0.5} className="text-white/[0.03]" />
                            <motion.div 
                              animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                              transition={{ duration: 4, repeat: Infinity }}
                              className="absolute inset-0 flex items-center justify-center"
                            >
                              <Plus size={24} className="text-brand-accent/20" />
                            </motion.div>
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <p className="text-sm font-display font-bold uppercase tracking-[0.3em] text-white/20">Lista Vacía</p>
                            <p className="text-xs text-white/10 uppercase font-medium">Añade componentes para comenzar</p>
                          </div>
                        </div>
                      ) : (
                        components.map(comp => (
                          <motion.div 
                            key={comp.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white/[0.01] border border-white/[0.05] rounded-[2rem] p-6 flex flex-col gap-6 card-hover group/card relative overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover/card:bg-brand-accent/10 transition-colors" />
                            
                            <div className="flex items-start justify-between relative z-10">
                              <div className="flex flex-col gap-2">
                                <h4 className="text-lg font-display font-bold text-brand-accent tracking-tight uppercase italic">{comp.name}</h4>
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="flex items-center gap-1.5 bg-brand-secondary px-3 py-1 rounded border border-white/5">
                                    <LayoutGrid size={12} className="text-brand-accent" />
                                    <span className="text-xs text-white/70 font-mono font-bold">
                                      {comp.width}m × {comp.height}m
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 bg-brand-secondary px-3 py-1 rounded border border-white/5">
                                    <Plus size={12} className="text-brand-accent" />
                                    <span className="text-xs text-white/70 font-mono font-bold">
                                      x{comp.quantity} {comp.substrateType === SubstrateType.ROLL && comp.rollsNeeded ? `(${comp.rollsNeeded.toFixed(2)} rollos)` : ''}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 bg-brand-accent/20 px-3 py-1 rounded border border-brand-accent/30">
                                    <span className="text-[11px] text-brand-accent font-black uppercase tracking-widest">
                                      {comp.area.toFixed(2)} m²
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-5">
                                  <div className="flex flex-col items-end">
                                  <div className="flex items-center gap-2">
                                    <Droplets size={14} className="text-brand-accent" />
                                    <span className="text-xl font-display font-black text-white tracking-tighter">{comp.inkMl.toFixed(1)}<span className="text-xs text-white/30 ml-0.5">ml</span></span>
                                  </div>
                                  <span className="text-xs text-white/30 font-bold uppercase tracking-widest mt-0.5">{(comp.inkMl / (comp.area || 1)).toFixed(2)} ml/m²</span>
                                </div>
                                <button 
                                  onClick={() => removeComponent(comp.id)}
                                  className="p-3 rounded-2xl bg-white/[0.03] text-white/10 hover:text-red-400 hover:bg-red-400/10 transition-all active:scale-90 border border-white/[0.05]"
                                >
                                  <X size={18} />
                                </button>
                              </div>
                            </div>
                            
                            {/* Per Component Color Breakdown */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-5 border-t border-white/[0.05] relative z-10">
                              {comp.inks.map(ink => (
                                <div key={ink.id} className="flex flex-col gap-2 bg-white/[0.02] p-3 rounded-2xl border border-white/[0.03] hover:bg-white/[0.04] transition-colors">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full shadow-sm ${
                                      ink.id === 'cyan' ? 'bg-cyan-400' : 
                                      ink.id === 'magenta' ? 'bg-pink-500' : 
                                      ink.id === 'yellow' ? 'bg-yellow-400' : 
                                      ink.id === 'black' ? 'bg-zinc-900 border border-white/20' : 
                                      'bg-white'
                                    }`} />
                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest truncate">{ink.name}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-xs font-mono font-bold text-white/90">{(ink.ml * comp.quantity).toFixed(1)}ml</span>
                                    <span className="text-[10px] font-mono text-white/30 font-bold uppercase mt-0.5">{(ink.ml / (comp.area / comp.quantity || 1)).toFixed(2)} ml/m²</span>
                                  </div>
                                </div>
                              ))}
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
            <div className="col-span-1 md:col-span-12 lg:col-span-4 flex flex-col gap-4 overflow-y-auto md:overflow-hidden">
              {/* Statistics Card */}
              <section className="glass-card p-6 md:p-8 flex flex-col items-center justify-center gap-6 relative shrink-0 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-accent/50 to-transparent" />
                <div className="absolute top-6 left-6 text-xs font-bold text-brand-accent uppercase tracking-[0.4em] italic">DASHBOARD</div>
                
                <div className="relative w-40 h-40 md:w-56 md:h-56 flex items-center justify-center">
                  {/* Gauge visualization */}
                  <svg className="w-full h-full -rotate-90 transform">
                    <circle
                      cx="50%"
                      cy="50%"
                      r="45%"
                      className="stroke-white/5 fill-none"
                      strokeWidth="12"
                    />
                    <motion.circle
                      cx="50%"
                      cy="50%"
                      r="45%"
                      className="stroke-brand-accent fill-none"
                      strokeWidth="12"
                      strokeDasharray="283"
                      initial={{ strokeDashoffset: 283 }}
                      animate={{ strokeDashoffset: 283 - (Math.min(100, (totals.totalInkWithWaste / 500) * 100) / 100) * 283 }}
                      strokeLinecap="butt"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-xs md:text-sm text-white/40 font-bold uppercase tracking-widest">Ink Total</span>
                    <span className="text-3xl md:text-6xl font-black font-display tracking-tighter text-brand-accent">{totals.totalInkWithWaste.toFixed(1)}</span>
                    <div className="flex items-center gap-1 mt-1">
                      <Droplets size={12} className="text-brand-accent" />
                      <span className="text-[10px] md:text-xs text-brand-accent font-bold uppercase">ML + WASTE</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 w-full gap-3">
                  <StatMini label="PROJECT AREA" value={`${totals.totalArea.toFixed(2)}`} unit="m²" color="bg-brand-accent" />
                  <StatMini label="NET INK" value={`${totals.totalInkMl.toFixed(1)}`} unit="ml" color="bg-brand-secondary" />
                  <StatMini label="YIELD" value={`${(totals.totalInkMl / (totals.totalArea || 1)).toFixed(1)}`} unit="ml/m²" color="bg-brand-secondary" />
                </div>

                {/* Per Color Breakdown */}
                <div className="w-full bg-white/[0.02] rounded-3xl p-5 border border-white/[0.05]">
                  <div className="text-xs font-bold text-white/30 uppercase mb-4 tracking-[0.2em] flex items-center gap-2">
                    <Droplets size={14} className="text-brand-accent" />
                    Consumo por Color
                  </div>
                  <div className="space-y-4">
                    {totals.inkTotals.map(ink => (
                      <div key={ink.id} className="group">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-3 h-3 rounded-full shadow-lg ${
                              ink.id === 'cyan' ? 'bg-cyan-400 shadow-cyan-400/20' : 
                              ink.id === 'magenta' ? 'bg-pink-500 shadow-pink-500/20' : 
                              ink.id === 'yellow' ? 'bg-yellow-400 shadow-yellow-400/20' : 
                              ink.id === 'black' ? 'bg-zinc-900 border border-white/20' : 
                              'bg-white shadow-white/20'
                            }`} />
                            <span className="text-xs font-bold text-white/80 uppercase tracking-wider">{ink.name}</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-sm font-mono font-bold text-brand-accent">{ink.mlWithWaste.toFixed(2)} ml</span>
                            <span className="text-[10px] font-mono text-white/30 font-bold">{(ink.mlWithWaste / (totals.totalArea || 1)).toFixed(2)} ml/m²</span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (ink.mlWithWaste / (totals.totalInkWithWaste || 1)) * 100)}%` }}
                            className={`h-full rounded-full ${
                              ink.id === 'cyan' ? 'bg-cyan-400' : 
                              ink.id === 'magenta' ? 'bg-pink-500' : 
                              ink.id === 'yellow' ? 'bg-yellow-400' : 
                              ink.id === 'black' ? 'bg-white/50' : 
                              'bg-white'
                            }`}
                          />
                        </div>
                        <div className="flex justify-between items-center mt-1.5 px-1">
                          <span className="text-[10px] text-white/30 uppercase font-bold tracking-wider">Equivalente en Litros</span>
                          <span className="text-[11px] font-mono text-white/50 font-black">{ink.litersWithWaste.toFixed(4)} L</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 w-full gap-4 mt-2">
                  <button 
                    onClick={exportToExcel}
                    className="flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-white h-14 rounded-2xl text-xs font-black transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
                  >
                    <FileSpreadsheet size={18} />
                    EXCEL
                  </button>
                  <button 
                    onClick={exportToPDF}
                    className="flex items-center justify-center gap-3 bg-red-500 hover:bg-red-600 text-white h-14 rounded-2xl text-xs font-black transition-all shadow-xl shadow-red-500/20 active:scale-95"
                  >
                    <FileDown size={18} />
                    PDF
                  </button>
                </div>
              </section>

              {/* History Card */}
              <section className="glass-card flex-1 p-4 md:p-6 flex flex-col gap-4 overflow-y-auto min-h-[300px] md:min-h-0">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-xs font-display font-bold text-white/90 uppercase tracking-[0.2em] flex items-center gap-2">
                    <History size={18} className="text-brand-accent/60" />
                    Historial
                  </h3>
                  <button className="text-[11px] font-black text-brand-accent hover:text-brand-secondary transition-colors uppercase tracking-widest">Ver Todo</button>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {projects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-white/5 gap-6">
                      <div className="p-8 rounded-full bg-white/[0.01] border border-white/[0.03] relative">
                        <History size={40} strokeWidth={0.5} />
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-0 border border-dashed border-white/5 rounded-full"
                        />
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <p className="text-sm font-display font-bold uppercase tracking-[0.3em] text-white/20">Sin Historial</p>
                        <p className="text-xs text-white/10 uppercase font-medium text-center">Tus proyectos guardados aparecerán aquí</p>
                      </div>
                    </div>
                  ) : (
                    projects.map(p => (
                      <motion.div 
                        key={p.id} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => loadProject(p)}
                        className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-4 flex items-center gap-4 hover:bg-white/[0.06] hover:border-white/[0.1] transition-all cursor-pointer group relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-brand-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="w-12 h-12 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent shrink-0 group-hover:scale-110 transition-transform shadow-inner">
                          <FileText size={20} />
                        </div>
                        <div className="flex-1 min-w-0 relative z-10">
                          <h4 className="text-sm font-bold truncate uppercase tracking-tight text-brand-accent italic">{p.name}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">{p.date}</span>
                            <span className="w-1 h-1 rounded-full bg-white/10" />
                            <span className="text-[10px] text-white/60 font-black uppercase tracking-wider">{p.totalArea.toFixed(2)} m²</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0 relative z-10">
                          <span className="text-sm font-black font-mono text-brand-accent">{p.totalInkMl.toFixed(1)}ml</span>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}
                              className="p-1.5 rounded-lg bg-white/5 text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all active:scale-90"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>

      {/* Credits Footer */}
      <footer className="text-[10px] md:text-xs font-black text-white/30 uppercase tracking-[0.3em] text-center py-2 md:py-4 shrink-0 px-4">
        desarrollado con amor por <a href="https://munkiedigitalecuador.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline">munkiedigitalecuador</a> © 2026
      </footer>

      {/* Social Bubbles */}
      <div className="fixed right-2 md:right-8 top-1/2 -translate-y-1/2 flex flex-col gap-4 md:gap-6 z-50">
        <SocialIcon 
          href="https://instagram.com/bryant_ldu" 
          delay={0}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E4405F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
        </SocialIcon>
        <SocialIcon 
          href="https://facebook.com/bryant.ldu" 
          delay={0.5}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1877F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
        </SocialIcon>
        <SocialIcon 
          href="https://wa.me/593998257855" 
          delay={1}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        </SocialIcon>
      </div>
    </div>
  );
}

function SidebarIcon({ icon, active = false }: { icon: React.ReactNode, active?: boolean }) {
  return (
    <motion.div 
      whileHover={{ scale: 1.1, backgroundColor: "rgba(69, 248, 130, 0.1)" }}
      whileTap={{ scale: 0.95 }}
      className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center cursor-pointer transition-all relative ${
        active ? 'bg-brand-accent text-black shadow-[0_0_15px_#45F882]' : 'text-white/30 hover:text-brand-accent'
      }`}
    >
      {active && (
        <motion.div 
          layoutId="active-pill"
          className="absolute -left-1 md:-left-2 w-1 h-6 md:h-8 bg-brand-accent rounded-full shadow-[0_0_15px_#45F882]"
        />
      )}
      {icon}
    </motion.div>
  );
}

function StatMini({ label, value, unit, color }: { label: string, value: string, unit: string, color: string }) {
  return (
    <div className="flex flex-col items-center gap-2 p-3 bg-brand-surface rounded-lg border border-white/5 hover:border-brand-accent/30 transition-colors">
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center text-black shadow-lg mb-1`}>
        <span className="text-xs font-black uppercase tracking-tighter">{unit}</span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-sm font-black font-mono tracking-tight text-white">{value}</span>
        <span className="text-[9px] font-black text-white/30 uppercase tracking-widest text-center leading-tight">{label}</span>
      </div>
    </div>
  );
}

function SocialIcon({ children, href, delay }: { children: React.ReactNode, href: string, delay: number }) {
  return (
    <motion.a
      animate={{
        y: [0, -8, 0],
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
      className="w-10 h-10 md:w-14 md:h-14 bg-brand-card border border-brand-accent/20 rounded-lg flex items-center justify-center text-white shadow-xl cursor-pointer hover:border-brand-accent transition-colors"
    >
      {children}
    </motion.a>
  );
}

