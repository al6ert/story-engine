import React, { useState, useEffect } from 'react';
import { Project, AppPhase } from './types';
import Sidebar from './components/Sidebar';
import ArchitectView from './components/ArchitectView';
import OracleView from './components/OracleView';
import DeliveryView from './components/DeliveryView';
import { setImageModelTier } from './services/geminiService';
import { PenTool, MessageSquare, BookOpenCheck, ExternalLink, TriangleAlert, Info, Zap } from 'lucide-react';

const App: React.FC = () => {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState<AppPhase>(AppPhase.ARCHITECT);
  const [useFreeTier, setUseFreeTier] = useState(false);

  // Check for API Key on mount
  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      } else {
        // Fallback for dev environments without the AI Studio wrapper
        setHasApiKey(true);
      }
    };
    checkApiKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      // Assume success after closing the dialog to avoid race conditions
      setHasApiKey(true);
    }
  };

  const enableFreeTier = () => {
    setImageModelTier('standard');
    setUseFreeTier(true);
    handleSelectKey(); // Try selecting key again with the expectation that the user might now pick a free one (or the same one)
  };

  // Load initial dummy project if empty
  useEffect(() => {
    if (projects.length === 0) {
       createNewProject();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createNewProject = () => {
    const newProject: Project = {
      id: Math.random().toString(36).substr(2, 9),
      name: `New Story ${projects.length + 1}`,
      seed: '',
      context: '', // Synopsis
      isContextLocked: false,
      pageCount: 8, // Default
      artStyle: '',
      isArtStyleLocked: false,
      variables: [],
      finalStory: null,
      lastModified: Date.now()
    };
    setProjects(prev => [newProject, ...prev]);
    setActiveProjectId(newProject.id);
    setCurrentPhase(AppPhase.ARCHITECT);
  };

  const updateProject = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  const deleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newProjects = projects.filter(p => p.id !== id);
    setProjects(newProjects);
    if (activeProjectId === id) {
        setActiveProjectId(newProjects[0]?.id || null);
    }
  };

  const duplicateProject = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    const newProject = {
        ...project,
        id: Math.random().toString(36).substr(2, 9),
        name: `${project.name} (Copy)`,
        lastModified: Date.now()
    };
    setProjects(prev => [newProject, ...prev]);
    setActiveProjectId(newProject.id);
  };

  const activeProject = projects.find(p => p.id === activeProjectId);

  const getPhaseColor = (phase: AppPhase) => {
      if (currentPhase === phase) return 'bg-indigo-600 text-white';
      return 'text-slate-500 hover:text-slate-300 hover:bg-slate-800';
  };

  // Render API Key Selection Screen if no key is selected
  if (!hasApiKey && typeof window !== 'undefined' && window.aistudio) {
    return (
        <div className="flex h-screen w-full bg-slate-950 items-center justify-center flex-col gap-6 text-slate-50 font-sans p-4 overflow-y-auto">
            <div className="text-center space-y-3 max-w-lg">
                <div className="flex justify-center mb-2">
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center">
                        <TriangleAlert className="w-6 h-6 text-indigo-400" />
                    </div>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white">Connect Project</h1>
                
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-left text-sm space-y-3">
                    <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-400" />
                        Why isn't my project showing up?
                    </h3>
                    <p className="text-slate-400 leading-relaxed">
                        The <strong>Nano Banana Pro</strong> model requires a <span className="text-indigo-400 font-medium">Paid (Pay-As-You-Go)</span> Google Cloud Project. 
                        If your project is on the <strong>Free Tier</strong> (Nivel gratuito), it will be filtered out by the selector.
                    </p>
                    <div className="text-slate-500 text-xs">
                        <strong>Solution:</strong> Go to Google Cloud Console {'>'} Billing and link a billing account to your project.
                    </div>
                </div>
            </div>
            
            <div className="flex flex-col gap-3 w-full max-w-xs">
                <button 
                    onClick={handleSelectKey}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                >
                    <Zap className="w-4 h-4 fill-white" />
                    Select Paid Key (Pro)
                </button>
                
                <button 
                    onClick={enableFreeTier}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 px-6 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm border border-slate-700"
                >
                    Use Standard Model (Free Tier)
                </button>

                <div className="pt-4 border-t border-slate-800/50 w-full"></div>

                <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="w-full text-slate-500 hover:text-indigo-400 text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                    Manage Projects & Billing
                    <ExternalLink className="w-3 h-3" />
                </a>
            </div>
            
             <p className="text-[10px] text-slate-600 max-w-xs text-center">
                We cannot manually accept API keys due to security restrictions. <br/>
                Please use the official selector above.
            </p>
        </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-900 text-slate-50 font-sans">
      <Sidebar 
        projects={projects}
        activeProjectId={activeProjectId || ''}
        onSelectProject={(id) => {
            setActiveProjectId(id);
            setCurrentPhase(AppPhase.ARCHITECT); 
        }}
        onAddProject={createNewProject}
        onDeleteProject={deleteProject}
        onDuplicateProject={duplicateProject}
        onChangeApiKey={handleSelectKey}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {activeProject ? (
            <>
                {/* Top Navigation for Phases */}
                <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-900/50 backdrop-blur">
                    <div className="flex items-center gap-4">
                       <input 
                         value={activeProject.name}
                         onChange={(e) => updateProject({...activeProject, name: e.target.value})}
                         className="bg-transparent text-lg font-bold outline-none border-b border-transparent focus:border-indigo-500 transition-colors placeholder-slate-600"
                         placeholder="Project Name"
                       />
                       {useFreeTier && (
                           <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">Standard Model</span>
                       )}
                    </div>
                    
                    <nav className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                        <button 
                            onClick={() => setCurrentPhase(AppPhase.ARCHITECT)}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${getPhaseColor(AppPhase.ARCHITECT)}`}
                        >
                            <PenTool className="w-4 h-4" /> Architect
                        </button>
                        <button 
                            onClick={() => setCurrentPhase(AppPhase.ORACLE)}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${getPhaseColor(AppPhase.ORACLE)}`}
                        >
                             <MessageSquare className="w-4 h-4" /> Oracle
                        </button>
                        <button 
                            onClick={() => setCurrentPhase(AppPhase.DELIVERY)}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${getPhaseColor(AppPhase.DELIVERY)}`}
                        >
                             <BookOpenCheck className="w-4 h-4" /> Delivery
                        </button>
                    </nav>
                </header>

                {/* Content Area */}
                <div className="flex-1 p-6 overflow-hidden">
                    {currentPhase === AppPhase.ARCHITECT && (
                        <ArchitectView project={activeProject} onUpdate={updateProject} />
                    )}
                    {currentPhase === AppPhase.ORACLE && (
                        <OracleView 
                            project={activeProject} 
                            onUpdate={updateProject} 
                            onNext={() => setCurrentPhase(AppPhase.DELIVERY)}
                        />
                    )}
                    {currentPhase === AppPhase.DELIVERY && (
                        <DeliveryView 
                            project={activeProject}
                            onBack={() => setCurrentPhase(AppPhase.ORACLE)}
                        />
                    )}
                </div>
            </>
        ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
                Select or create a project to begin.
            </div>
        )}
      </main>
    </div>
  );
};

export default App;