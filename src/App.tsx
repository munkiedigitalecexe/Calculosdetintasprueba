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
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl overflow-hidden bg-white p-1">
            <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
          </div>
          
          <nav className="flex flex-row md:flex-col gap-4 md:gap-6 flex-1 justify-center">
            <SidebarIcon icon={<Home size={20} />} active />
            <SidebarIcon icon={<Package size={20} />} />
            <SidebarIcon icon={<PieChart size={20} />} />
            <SidebarIcon icon={<Settings size={20} />} />
          </nav>

          <div className="w-10 h-10 rounded-full bg-brand-accent flex items-center justify-center cursor-pointer hover:scale-110 transition-transform shrink-0">
            <Plus size={20} />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col gap-4 overflow-y-auto md:overflow-hidden">
          {/* Top Header */}
          <header className="flex flex-col md:flex-row items-start md:items-center justify-between px-2 md:px-4 gap-4 md:gap-0">
            <div className="flex flex-col">
              <h2 className="text-lg md:text-xl font-bold text-white/90">¡Buen día, MUNKIE!</h2>
              <p className="text-[10px] md:text-xs text-white/40">MNK Est INK • Gestión de Producción</p>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <input 
                  type="text" 
                  placeholder="Buscar proyectos..." 
                  className="bg-white/5 border border-white/10 rounded-full px-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50 w-full"
                />
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
              </div>
              <div className="flex items-center justify-between md:justify-start gap-4 w-full md:w-auto">
                <div className="flex items-center gap-4">
                  <Bell size={20} className="text-white/40 cursor-pointer hover:text-white" />
                  <ShoppingCart size={20} className="text-white/40 cursor-pointer hover:text-white" />
                </div>
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center cursor-pointer border border-white/10">
                  <User size={20} />
                </div>
              </div>
            </div>
          </header>

          {/* Dashboard Grid */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 overflow-hidden">
            {/* Left Column: Editor */}
            <div className="col-span-1 md:col-span-12 lg:col-span-8 flex flex-col gap-4 min-h-0">
              {/* Project Info Card */}
              <section className="glass-card p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between shrink-0 relative overflow-hidden group gap-4 md:gap-0">
                <div className="absolute inset-0 bg-gradient-to-r from-brand-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 flex-1 w-full">
                  <input 
                    type="text" 
                    value={projectName}
                    onChange={e => setProjectName(e.target.value)}
                    placeholder="NOMBRE DEL PROYECTO"
                    className="bg-transparent border-none text-xl md:text-2xl font-black placeholder:text-white/10 focus:outline-none w-full uppercase tracking-tighter"
                  />
                  <p className="text-[10px] md:text-xs text-white/40 mt-1">Añade componentes como Rótulos, Cenefas, etc.</p>
                </div>
                <button 
                  onClick={saveProject}
                  className="btn-primary relative z-10 w-full md:w-auto"
                >
                  <Save size={18} />
                  Finalizar Proyecto
                </button>
              </section>

              {/* Component Editor & List Container */}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
                <section className="glass-card p-4 md:p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar max-h-[70vh] lg:max-h-full">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-brand-accent sticky top-0 bg-brand-bg/80 backdrop-blur-md py-2 z-20">
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

                    {/* Production Mode Toggle */}
                    <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-white/60 uppercase">Modo Producción</span>
                        <span className="text-[8px] text-white/30 uppercase">Calcula repeticiones automáticamente</span>
                      </div>
                      <button 
                        onClick={() => setProductionMode(!productionMode)}
                        className={`w-10 h-5 rounded-full relative transition-colors ${productionMode ? 'bg-brand-accent' : 'bg-white/10'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${productionMode ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>

                    {productionMode && (
                      <div className="grid grid-cols-2 gap-3 bg-brand-accent/5 p-4 rounded-2xl border border-brand-accent/20">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-brand-accent uppercase ml-1">Unid. por Tira</label>
                          <input 
                            type="number" 
                            className="input-field-dark border-brand-accent/20"
                            value={newComp.unitsPerStrip}
                            onChange={e => setNewComp(prev => ({ ...prev, unitsPerStrip: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-brand-accent uppercase ml-1">Total Unidades</label>
                          <input 
                            type="number" 
                            className="input-field-dark border-brand-accent/20"
                            value={newComp.totalUnitsTarget}
                            onChange={e => setNewComp(prev => ({ ...prev, totalUnitsTarget: e.target.value }))}
                          />
                        </div>
                      </div>
                    )}

                    {newComp.substrateType === SubstrateType.ROLL && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-white/30 uppercase ml-1">Largo del Rollo (m)</label>
                        <input 
                          type="number" 
                          step="any"
                          className="input-field-dark font-mono"
                          value={newComp.rollLength}
                          onChange={e => setNewComp(prev => ({ ...prev, rollLength: e.target.value }))}
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-white/30 uppercase ml-1">Ancho (m)</label>
                        <div className="flex items-center bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                          <button 
                            onClick={() => setNewComp(prev => ({ ...prev, width: String(Math.max(0, (parseFloat(prev.width) || 0) - 0.1)) }))}
                            className="p-3 hover:bg-white/10 transition-colors text-white/40 hover:text-white"
                          >
                            <Minus size={14} />
                          </button>
                          <input 
                            type="number" 
                            step="any"
                            className="w-full bg-transparent text-center text-sm font-mono focus:outline-none py-2"
                            value={newComp.width}
                            onChange={e => setNewComp(prev => ({ ...prev, width: e.target.value }))}
                          />
                          <button 
                            onClick={() => setNewComp(prev => ({ ...prev, width: String((parseFloat(prev.width) || 0) + 0.1) }))}
                            className="p-3 hover:bg-white/10 transition-colors text-white/40 hover:text-white"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-white/30 uppercase ml-1">Alto (m)</label>
                        <div className="flex items-center bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                          <button 
                            onClick={() => setNewComp(prev => ({ ...prev, height: String(Math.max(0, (parseFloat(prev.height) || 0) - 0.1)) }))}
                            className="p-3 hover:bg-white/10 transition-colors text-white/40 hover:text-white"
                          >
                            <Minus size={14} />
                          </button>
                          <input 
                            type="number" 
                            step="any"
                            className="w-full bg-transparent text-center text-sm font-mono focus:outline-none py-2"
                            value={newComp.height}
                            onChange={e => setNewComp(prev => ({ ...prev, height: e.target.value }))}
                          />
                          <button 
                            onClick={() => setNewComp(prev => ({ ...prev, height: String((parseFloat(prev.height) || 0) + 0.1) }))}
                            className="p-3 hover:bg-white/10 transition-colors text-white/40 hover:text-white"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-white/30 uppercase ml-1">Cantidad</label>
                      <div className="flex items-center bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                        <button 
                          onClick={() => setNewComp(prev => ({ ...prev, quantity: String(Math.max(1, (parseInt(prev.quantity) || 0) - 1)) }))}
                          className="p-3 hover:bg-white/10 transition-colors text-white/40 hover:text-white"
                        >
                          <Minus size={14} />
                        </button>
                        <input 
                          type="number" 
                          className="w-full bg-transparent text-center text-sm font-mono focus:outline-none py-2"
                          value={newComp.quantity}
                          onChange={e => setNewComp(prev => ({ ...prev, quantity: e.target.value }))}
                        />
                        <button 
                          onClick={() => setNewComp(prev => ({ ...prev, quantity: String((parseInt(prev.quantity) || 0) + 1) }))}
                          className="p-3 hover:bg-white/10 transition-colors text-white/40 hover:text-white"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="bg-white/5 rounded-2xl p-4 space-y-3">
                      <p className="text-[10px] font-bold text-white/30 uppercase">Consumo RIP (ml)</p>
                      {newComp.inks.map(ink => (
                        <div key={ink.id} className="flex items-center gap-3">
                          <span className="text-[10px] font-bold w-16 text-white/60">{ink.name}</span>
                          <input 
                            type="number" 
                            step="any"
                            className="flex-1 bg-transparent border-b border-white/10 text-xs font-mono focus:outline-none focus:border-brand-accent py-1"
                            value={ink.ml}
                            onChange={e => {
                              const val = e.target.value;
                              setNewComp(prev => ({
                                ...prev,
                                inks: prev.inks.map(i => i.id === ink.id ? { ...i, ml: val as any } : i)
                              }));
                            }}
                          />
                        </div>
                      ))}
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
                <section className="glass-card p-4 md:p-6 flex flex-col gap-4 overflow-y-auto">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-brand-secondary">
                    <Layers size={16} />
                    LISTA DE COMPONENTES
                  </h3>
                  
                  <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                      {components.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 md:py-20 text-white/20 gap-2">
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
                                {comp.width}x{comp.height}m • x{comp.quantity} {comp.substrateType === SubstrateType.ROLL && comp.rollsNeeded ? `(${comp.rollsNeeded.toFixed(2)} rollos)` : ''}
                              </span>
                              {comp.totalUnitsTarget && (
                                <span className="text-[8px] text-brand-accent font-bold uppercase">
                                  {comp.totalUnitsTarget} unidades totales
                                </span>
                              )}
                              
                              {/* Per Component Color Breakdown */}
                              <div className="flex gap-2 mt-2">
                                {comp.inks.map(ink => (
                                  <div key={ink.id} className="flex flex-col items-center">
                                    <div className={`w-1.5 h-1.5 rounded-full ${
                                      ink.id === 'cyan' ? 'bg-cyan-400' : 
                                      ink.id === 'magenta' ? 'bg-pink-500' : 
                                      ink.id === 'yellow' ? 'bg-yellow-400' : 
                                      ink.id === 'black' ? 'bg-zinc-900 border border-white/20' : 
                                      'bg-white'
                                    }`} />
                                    <span className="text-[8px] font-mono text-white/40 mt-0.5">{(ink.ml * comp.quantity).toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-xs font-bold text-brand-accent font-mono">{comp.inkMl.toFixed(2)}ml</span>
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
            <div className="col-span-1 md:col-span-12 lg:col-span-4 flex flex-col gap-4 overflow-y-auto md:overflow-hidden">
              {/* Statistics Card */}
              <section className="glass-card p-6 md:p-8 flex flex-col items-center justify-center gap-6 relative shrink-0">
                <div className="absolute top-6 left-6 text-[10px] font-bold text-white/30 uppercase tracking-widest">Estadísticas</div>
                
                <div className="relative w-32 h-32 md:w-48 md:h-48 flex items-center justify-center">
                  {/* Gauge visualization (simplified) */}
                  <div className="absolute inset-0 rounded-full border-[8px] md:border-[12px] border-white/5" />
                  <div className="absolute inset-0 rounded-full border-[8px] md:border-[12px] border-brand-accent border-t-transparent border-l-transparent rotate-45" />
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] md:text-xs text-white/40 font-bold uppercase">Total ml</span>
                    <span className="text-2xl md:text-4xl font-black font-mono tracking-tighter">{totals.totalInkWithWaste.toFixed(2)}</span>
                    <span className="text-[8px] md:text-[10px] text-brand-accent font-bold mt-1">Incluye 15% desperdicio</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 w-full gap-2 md:gap-4">
                  <StatMini label="Área" value={`${totals.totalArea.toFixed(2)}`} unit="m²" color="bg-brand-accent" />
                  <StatMini label="Tinta Neta" value={`${totals.totalInkMl.toFixed(2)}`} unit="ml" color="bg-brand-secondary" />
                  <StatMini label="Desperdicio" value={`${(totals.totalInkWithWaste - totals.totalInkMl).toFixed(2)}`} unit="ml" color="bg-orange-500" />
                </div>

                {/* Per Color Breakdown */}
                <div className="w-full bg-white/5 rounded-2xl p-4 border border-white/10">
                  <div className="text-[10px] font-bold text-white/30 uppercase mb-3 tracking-widest">Consumo por Color</div>
                  <div className="space-y-3">
                    {totals.inkTotals.map(ink => (
                      <div key={ink.id} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              ink.id === 'cyan' ? 'bg-cyan-400' : 
                              ink.id === 'magenta' ? 'bg-pink-500' : 
                              ink.id === 'yellow' ? 'bg-yellow-400' : 
                              ink.id === 'black' ? 'bg-zinc-900 border border-white/20' : 
                              'bg-white'
                            }`} />
                            <span className="text-[10px] font-bold text-white/60 uppercase">{ink.name}</span>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-brand-accent">{ink.mlWithWaste.toFixed(2)} ml</span>
                        </div>
                        <div className="flex justify-between items-center pl-4">
                          <span className="text-[8px] text-white/20 uppercase">Litros (con desp.)</span>
                          <span className="text-[9px] font-mono text-white/40">{ink.litersWithWaste.toFixed(4)} L</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 w-full gap-3 mt-2">
                  <button 
                    onClick={exportToExcel}
                    className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-2 px-4 rounded-xl text-[10px] font-bold transition-all shadow-lg shadow-emerald-500/20"
                  >
                    <FileSpreadsheet size={14} />
                    EXCEL
                  </button>
                  <button 
                    onClick={exportToPDF}
                    className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-xl text-[10px] font-bold transition-all shadow-lg shadow-red-500/20"
                  >
                    <FileDown size={14} />
                    PDF
                  </button>
                </div>
              </section>

              {/* History Card */}
              <section className="glass-card flex-1 p-4 md:p-6 flex flex-col gap-4 overflow-y-auto min-h-[300px] md:min-h-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider">Últimos Proyectos</h3>
                  <span className="text-[10px] font-bold text-white/30 hover:text-white cursor-pointer transition-colors">Ver más</span>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                  {projects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-white/10">
                      <History size={24} />
                      <p className="text-[10px] font-bold uppercase mt-2">Sin historial</p>
                    </div>
                  ) : (
                    projects.map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => loadProject(p)}
                        className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 hover:bg-white/10 transition-all cursor-pointer group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-brand-accent/20 flex items-center justify-center text-brand-accent shrink-0">
                          <FileText size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold truncate uppercase">{p.name}</h4>
                          <p className="text-[10px] text-white/30">{p.date}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-xs font-bold font-mono">{p.totalInkMl.toFixed(2)}ml</span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}
                            className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-brand-accent transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>

      {/* Credits Footer */}
      <footer className="text-[8px] md:text-[10px] font-bold text-white/20 uppercase tracking-widest text-center py-2 md:py-4 shrink-0 px-4">
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
    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center cursor-pointer transition-all ${active ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/20' : 'text-white/30 hover:text-white hover:bg-white/5'}`}>
      {icon}
    </div>
  );
}

function StatMini({ label, value, unit, color }: { label: string, value: string, unit: string, color: string }) {
  return (
    <div className="flex flex-col items-center gap-1 md:gap-2">
      <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl ${color} flex items-center justify-center text-white shadow-lg shadow-black/20`}>
        <span className="text-[8px] md:text-[10px] font-bold">{unit}</span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-[10px] md:text-xs font-black font-mono">{value}</span>
        <span className="text-[6px] md:text-[8px] font-bold text-white/30 uppercase text-center">{label}</span>
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
      className="w-10 h-10 md:w-14 md:h-14 soap-bubble rounded-full flex items-center justify-center text-white shadow-xl cursor-pointer"
    >
      {children}
    </motion.a>
  );
}

