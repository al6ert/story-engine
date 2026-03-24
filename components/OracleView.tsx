import React, { useState, useEffect, useRef } from 'react';
import { Project, StoryPage } from '../types';
import { inspireAnswers, generateStoryPage } from '../services/geminiService';
import { Sparkles, ArrowRight, BookOpen, Terminal, CheckCircle2, Loader2, Circle } from 'lucide-react';

interface Props {
  project: Project;
  onUpdate: (updatedProject: Project) => void;
  onNext: () => void;
}

interface LogEntry {
    id: string;
    message: string;
    status: 'pending' | 'running' | 'done' | 'error';
}

const OracleView: React.FC<Props> = ({ project, onUpdate, onNext }) => {
  const [isInspiring, setIsInspiring] = useState(false);
  const [isWeaving, setIsWeaving] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const addLog = (message: string) => {
      const id = Math.random().toString(36);
      setLogs(prev => [...prev, { id, message, status: 'running' }]);
      return id;
  };

  const updateLog = (id: string, status: 'done') => {
      setLogs(prev => prev.map(log => log.id === id ? { ...log, status } : log));
  };

  const failLog = (id: string, message: string) => {
      setLogs(prev => prev.map(log => log.id === id ? { ...log, message, status: 'error' } : log));
  };

  const formatError = (error: unknown) => {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown error';
    }
  };

  const handleInputChange = (id: string, value: string) => {
    const updatedVars = project.variables.map(v => 
      v.id === id ? { ...v, value } : v
    );
    onUpdate({ ...project, variables: updatedVars });
  };

  const handleInspire = async () => {
    setIsInspiring(true);
    try {
      const answers = await inspireAnswers(project);
      const updatedVars = project.variables.map(v => 
        answers[v.id] && !v.value ? { ...v, value: answers[v.id] } : v
      );
      onUpdate({ ...project, variables: updatedVars });
    } catch (e) {
      console.error(e);
    } finally {
      setIsInspiring(false);
    }
  };

  const handleWeaveStory = async () => {
    setIsWeaving(true);
    setLogs([]); // Clear logs
    
    // Initial Setup
    const setupLogId = addLog("Initializing story engine & context...");
    await new Promise(r => setTimeout(r, 800)); // Fake init delay for UX
    updateLog(setupLogId, 'done');

    const generatedPages: StoryPage[] = [];
    let previousText = "";
    let previousImage: string | undefined = undefined;

    try {
      for (let i = 1; i <= project.pageCount; i++) {
        // Step 1: Write & Design
        const stepLogId = addLog(`Page ${i}/${project.pageCount}: Designing layout & rendering...`);
        addLog(`Page ${i}/${project.pageCount}: Starting text generation...`);
        
        // Pass previousImage for consistency
        const pageResult = await generateStoryPage(
          project,
          i,
          previousText,
          previousImage,
          (message) => {
            addLog(`Page ${i}/${project.pageCount}: ${message}`);
          }
        );
        
        // Push result
        generatedPages.push({
            id: i,
            text: pageResult.text,
            imagePrompt: pageResult.imagePrompt,
            imageUrl: pageResult.imageUrl
        });
        
        previousText = pageResult.text;
        
        // IMPORTANT: Update previous image so next page uses it as reference
        if (pageResult.imageUrl) {
            previousImage = pageResult.imageUrl;
        }

        updateLog(stepLogId, 'done');
        
        // Small delay to make the "Terminal" feel satisfying
        await new Promise(r => setTimeout(r, 500));
      }

      const finalLogId = addLog("Binding book & assembling PDF...");
      await new Promise(r => setTimeout(r, 1000));
      updateLog(finalLogId, 'done');

      onUpdate({
        ...project,
        finalStory: generatedPages
      });
      
      // Allow user to see the "Done" state briefly before navigating
      setTimeout(() => {
          onNext();
      }, 1500);

    } catch (e) {
      console.error(e);
      const message = formatError(e);
      addLog(`Error: ${message}`);
      alert(`Failed to weave story: ${message}`);
    } finally {
      setIsWeaving(false);
    }
  };

  return (
    <div className="flex h-full gap-8 max-w-6xl mx-auto w-full">
      {/* Blueprint Summary */}
      <div className="w-1/3 flex flex-col gap-6">
        <div className="p-6 bg-slate-800 rounded-lg border border-slate-700">
            <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400"/>
                Synopsis
            </h3>
            <div className="text-slate-400 text-sm leading-relaxed max-h-[30vh] overflow-y-auto pr-2 font-serif italic mb-4">
                {project.context || "No context defined yet."}
            </div>
            
            <div className="pt-4 border-t border-slate-700">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Art Style</h4>
                <p className="text-slate-300 text-xs">{project.artStyle || "No style defined."}</p>
            </div>
             <div className="pt-4 border-t border-slate-700 mt-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Length</h4>
                <p className="text-slate-300 text-xs">{project.pageCount} Pages</p>
            </div>
        </div>

        {/* Feedback Terminal - Only shows when weaving or logs exist */}
        {(isWeaving || logs.length > 0) && (
            <div className="flex-1 bg-black rounded-lg border border-slate-800 p-4 font-mono text-xs overflow-y-auto shadow-2xl relative">
                <div className="absolute top-2 right-2 text-slate-600 flex items-center gap-1">
                    <Terminal className="w-3 h-3" /> SYS.LOG
                </div>
                <div className="space-y-3 mt-4">
                    {logs.map((log) => (
                        <div key={log.id} className="flex gap-3 items-start animate-in fade-in slide-in-from-left-2 duration-300">
                            {log.status === 'running' && <Loader2 className="w-4 h-4 text-amber-500 animate-spin shrink-0" />}
                            {log.status === 'done' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                            {log.status === 'error' && <Circle className="w-4 h-4 text-red-500 fill-red-500 shrink-0" />}
                            {log.status === 'pending' && <Circle className="w-4 h-4 text-slate-600 shrink-0" />}
                            <span className={log.status === 'done' ? 'text-slate-400' : log.status === 'error' ? 'text-red-300' : 'text-emerald-100'}>
                                {log.message}
                            </span>
                        </div>
                    ))}
                    <div ref={logsEndRef} />
                </div>
            </div>
        )}
      </div>

      {/* The Form */}
      <div className="flex-1 flex flex-col h-full">
         <div className="flex justify-between items-center mb-6">
            <div>
                <h2 className="text-2xl font-bold text-white">The Oracle</h2>
                <p className="text-slate-400">Answer the variables to guide the generation.</p>
            </div>
            <div className="flex gap-3">
                <button 
                    onClick={handleInspire}
                    disabled={isInspiring || isWeaving}
                    className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-md flex items-center gap-2 font-medium transition-colors disabled:opacity-50"
                >
                    <Sparkles className={`w-4 h-4 ${isInspiring ? 'animate-spin' : ''}`} />
                    {isInspiring ? 'Divining...' : 'Inspire Me'}
                </button>
                <button 
                    onClick={handleWeaveStory}
                    disabled={isWeaving}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md flex items-center gap-2 font-bold shadow-lg shadow-indigo-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isWeaving ? 'Processing...' : 'Weave Story'}
                    {!isWeaving && <ArrowRight className="w-4 h-4" />}
                </button>
            </div>
         </div>

         <div className={`flex-1 overflow-y-auto pr-4 space-y-6 pb-20 transition-opacity ${isWeaving ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            {project.variables.map(v => (
                <div key={v.id} className="space-y-2 group">
                    <label className="block text-sm font-medium text-slate-300">
                        {v.question}
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={v.value}
                            onChange={(e) => handleInputChange(v.id, e.target.value)}
                            placeholder={`Answer for ${v.placeholder}...`}
                            className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                        <div className="absolute right-3 top-3 text-xs text-slate-600 font-mono">
                            {`{{${v.placeholder}}}`}
                        </div>
                    </div>
                </div>
            ))}
            {project.variables.length === 0 && (
                <div className="text-center py-20 text-slate-500">
                    No variables found. The Architect phase needs to identify questions first.
                </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default OracleView;
