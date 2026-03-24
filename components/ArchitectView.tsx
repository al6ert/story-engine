import React, { useState, useRef } from 'react';
import { Project, StoryVariable } from '../types';
import { generateBlueprint } from '../services/geminiService';
import { Lock, Unlock, RefreshCw, Plus, Trash2, Wand2, Palette, Layers, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';

interface Props {
  project: Project;
  onUpdate: (updatedProject: Project) => void;
}

const ArchitectView: React.FC<Props> = ({ project, onUpdate }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSeedExpanded, setIsSeedExpanded] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const seedInputRef = useRef<HTMLTextAreaElement>(null);

  const handleGenerate = async () => {
    if (!project.seed) return;
    setIsGenerating(true);
    try {
      const result = await generateBlueprint(
        project.seed,
        project.context,
        project.variables,
        project.isContextLocked,
        project.artStyle,
        project.isArtStyleLocked
      );
      
      let newVariables = [...project.variables];
      if (project.variables.length > 0) {
         newVariables = newVariables.filter(v => v.isLocked);
      }

      result.variables.forEach(newVar => {
        if (!newVariables.find(v => v.placeholder === newVar.placeholder)) {
           newVariables.push({
             id: Math.random().toString(36).substr(2, 9),
             question: newVar.question,
             placeholder: newVar.placeholder,
             value: '',
             isLocked: false
           });
        }
      });

      onUpdate({
        ...project,
        context: project.isContextLocked ? project.context : result.context,
        artStyle: project.isArtStyleLocked ? project.artStyle : result.artStyle,
        variables: newVariables
      });

      setIsSeedExpanded(false); // Collapse seed after generation

    } catch (error) {
      console.error(error);
      alert("Failed to generate blueprint. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleContextLock = () => {
    onUpdate({ ...project, isContextLocked: !project.isContextLocked });
  };
  
  const toggleArtLock = () => {
    onUpdate({ ...project, isArtStyleLocked: !project.isArtStyleLocked });
  };

  const toggleVariableLock = (id: string) => {
    const updatedVars = project.variables.map(v => 
      v.id === id ? { ...v, isLocked: !v.isLocked } : v
    );
    onUpdate({ ...project, variables: updatedVars });
  };

  const deleteVariable = (id: string) => {
    onUpdate({ ...project, variables: project.variables.filter(v => v.id !== id) });
  };

  const addManualVariable = () => {
    const newVar: StoryVariable = {
      id: Math.random().toString(36).substr(2, 9),
      question: "New Question?",
      placeholder: "variable_name",
      value: "",
      isLocked: false
    };
    onUpdate({ ...project, variables: [...project.variables, newVar] });
  };

  const updateVariableRaw = (id: string, field: 'question' | 'placeholder', value: string) => {
    const updatedVars = project.variables.map(v => 
      v.id === id ? { ...v, [field]: value } : v
    );
    onUpdate({ ...project, variables: updatedVars });
  };

  const insertVariableToText = (placeholder: string) => {
      onUpdate({...project, context: project.context + ` {{${placeholder}}} `});
  };

  return (
    <div className="flex h-full gap-6 relative">
      {/* Central Canvas - Context & Art */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div className="flex justify-between items-start">
             <div className="flex items-center gap-6">
                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <span className="bg-indigo-600 text-xs px-2 py-1 rounded">Step 1</span>
                    The Blueprint
                </h2>
                {/* Page Slider moved to header */}
                <div className="flex items-center gap-3 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700/50">
                    <Layers className="w-4 h-4 text-slate-400" />
                    <input 
                        type="range" 
                        min="1" 
                        max="10" 
                        value={project.pageCount}
                        onChange={(e) => onUpdate({...project, pageCount: parseInt(e.target.value)})}
                        className="w-24 accent-indigo-500 cursor-pointer h-1.5 bg-slate-600 rounded-lg appearance-none"
                    />
                    <span className="text-sm font-mono text-indigo-300 w-16 text-right">{project.pageCount} Pages</span>
                </div>
             </div>

             <div className="flex gap-2 relative">
                {/* Expandable Seed Input */}
                <div className={`transition-all duration-200 ease-in-out relative z-20 ${isSeedExpanded ? 'w-[400px]' : 'w-64'}`}>
                    <textarea 
                        ref={seedInputRef}
                        value={project.seed}
                        onFocus={() => setIsSeedExpanded(true)}
                        onChange={(e) => onUpdate({...project, seed: e.target.value})}
                        placeholder="Seed idea (e.g. 'A lonely robot gardener...')"
                        className={`bg-slate-800 border border-slate-700 text-slate-200 px-3 py-2 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all ${isSeedExpanded ? 'h-32 shadow-xl absolute right-0 top-0 w-full' : 'h-9 w-full overflow-hidden whitespace-nowrap'}`}
                    />
                    {isSeedExpanded && (
                        <div className="absolute top-2 right-2 cursor-pointer text-slate-500 hover:text-white" onClick={() => setIsSeedExpanded(false)}>
                            <Maximize2 className="w-3 h-3 rotate-45" />
                        </div>
                    )}
                </div>
                
                <button 
                    onClick={handleGenerate}
                    disabled={isGenerating || !project.seed}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-md flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50 h-9"
                >
                    {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Wand2 className="w-4 h-4"/>}
                    {project.context ? 'Refine' : 'Generate'}
                </button>
             </div>
        </div>

        <div className="flex-1 flex flex-col gap-4 min-h-0">
            {/* Row 1: Context/Synopsis */}
            <div className="relative flex-1 bg-slate-800 rounded-lg border border-slate-700 overflow-hidden flex flex-col min-h-0">
                <div className="absolute top-2 right-2 z-10">
                    <button 
                        onClick={toggleContextLock}
                        className={`p-1.5 rounded-full transition-all ${project.isContextLocked ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                        title="Lock Synopsis"
                    >
                        {project.isContextLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    </button>
                </div>
                <div className="bg-slate-900/50 px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 shrink-0">
                    Global Synopsis
                </div>
                <textarea
                    value={project.context}
                    onChange={(e) => onUpdate({...project, context: e.target.value})}
                    disabled={project.isContextLocked}
                    className={`w-full h-full p-4 bg-transparent text-slate-200 resize-none outline-none font-serif text-lg leading-relaxed ${project.isContextLocked ? 'opacity-80' : ''}`}
                    placeholder="The narrative arc goes here..."
                />
                {project.isContextLocked && (
                    <div className="absolute inset-0 pointer-events-none border-2 border-amber-500/30 rounded-lg"></div>
                )}
            </div>

            {/* Row 2: Art Director */}
            <div className="h-1/3 relative bg-slate-800 rounded-lg border border-slate-700 overflow-hidden flex flex-col shrink-0">
                    <div className="absolute top-2 right-2 z-10">
                    <button 
                        onClick={toggleArtLock}
                        className={`p-1.5 rounded-full transition-all ${project.isArtStyleLocked ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                        title="Lock Art Style"
                    >
                        {project.isArtStyleLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    </button>
                </div>
                <div className="bg-slate-900/50 px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 shrink-0">
                    <Palette className="w-3 h-3" /> Art Director
                </div>
                <textarea
                    value={project.artStyle}
                    onChange={(e) => onUpdate({...project, artStyle: e.target.value})}
                    disabled={project.isArtStyleLocked}
                    className={`w-full h-full p-4 bg-transparent text-slate-200 resize-none outline-none text-sm leading-relaxed ${project.isArtStyleLocked ? 'opacity-80' : ''}`}
                    placeholder="Describe the visual style (e.g., 'Watercolor, Studio Ghibli style, soft pastels')..."
                />
                {project.isArtStyleLocked && (
                    <div className="absolute inset-0 pointer-events-none border-2 border-amber-500/30 rounded-lg"></div>
                )}
            </div>
        </div>
      </div>

      {/* Right Sidebar - Variables */}
      <div className={`transition-all duration-300 ease-in-out flex flex-col gap-4 border-l border-slate-800 bg-slate-900 z-10 ${isSidebarExpanded ? 'w-[600px] shadow-2xl' : 'w-80'} pl-6`}>
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
                 <button 
                    onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
                    className="p-1 hover:bg-slate-800 rounded text-slate-500"
                    title={isSidebarExpanded ? "Collapse" : "Expand"}
                >
                    {isSidebarExpanded ? <ChevronRight className="w-4 h-4"/> : <ChevronLeft className="w-4 h-4"/>}
                </button>
                <h3 className="font-semibold text-slate-300">Variables</h3>
            </div>
            <button onClick={addManualVariable} className="text-indigo-400 hover:text-indigo-300">
                <Plus className="w-5 h-5" />
            </button>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {project.variables.length === 0 && (
                <p className="text-slate-500 text-sm italic">No variables yet.</p>
            )}
            
            {project.variables.map(v => (
                <div key={v.id} className={`p-3 rounded-md border transition-all ${v.isLocked ? 'border-amber-500/50 bg-amber-900/10' : 'border-slate-700 bg-slate-800'}`}>
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 mr-2">
                            <textarea
                                value={v.question}
                                onChange={(e) => updateVariableRaw(v.id, 'question', e.target.value)}
                                className="bg-transparent text-sm font-medium text-slate-200 w-full outline-none mb-1 resize-y min-h-[1.5em]"
                                rows={isSidebarExpanded ? 2 : 1}
                            />
                            <div className="flex items-center gap-1 text-xs text-indigo-400 bg-indigo-900/30 px-1.5 py-0.5 rounded w-fit cursor-pointer hover:bg-indigo-900/50" title="Click to insert into text" onClick={() => insertVariableToText(v.placeholder)}>
                                <span>{`{{${v.placeholder}}}`}</span>
                            </div>
                        </div>
                        <div className="flex gap-1 flex-col sm:flex-row">
                             <button 
                                onClick={() => toggleVariableLock(v.id)}
                                className={`p-1 rounded hover:bg-slate-700 ${v.isLocked ? 'text-amber-500' : 'text-slate-500'}`}
                             >
                                {v.isLocked ? <Lock className="w-3 h-3"/> : <Unlock className="w-3 h-3"/>}
                             </button>
                             <button 
                                onClick={() => deleteVariable(v.id)}
                                className="p-1 rounded hover:bg-red-900/30 text-slate-500 hover:text-red-400"
                             >
                                <Trash2 className="w-3 h-3"/>
                             </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default ArchitectView;
