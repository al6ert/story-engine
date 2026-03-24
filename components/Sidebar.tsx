import React from 'react';
import { Project } from '../types';
import { Book, Plus, Trash2, Copy, Key } from 'lucide-react';

interface Props {
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onAddProject: () => void;
  onDeleteProject: (id: string, e: React.MouseEvent) => void;
  onDuplicateProject: (project: Project, e: React.MouseEvent) => void;
  onChangeApiKey: () => void;
}

const Sidebar: React.FC<Props> = ({ 
    projects, 
    activeProjectId, 
    onSelectProject, 
    onAddProject,
    onDeleteProject,
    onDuplicateProject,
    onChangeApiKey
}) => {
  return (
    <div className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col h-full">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Book className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-lg tracking-tight text-white">StoryEngine</h1>
        </div>
        <button 
            onClick={onAddProject}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 px-4 rounded-md flex items-center justify-center gap-2 transition-colors border border-slate-700 text-sm font-medium"
        >
            <Plus className="w-4 h-4" />
            New Project
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {projects.map(project => (
            <div 
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className={`group relative p-3 rounded-md cursor-pointer transition-all border ${activeProjectId === project.id ? 'bg-indigo-900/20 border-indigo-500/50 text-indigo-100' : 'border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
            >
                <div className="font-medium truncate pr-8">{project.name || "Untitled Story"}</div>
                <div className="text-xs opacity-60 truncate">{project.seed || "Empty seed"}</div>
                
                {/* Hover Actions */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex gap-1 bg-slate-900/80 rounded backdrop-blur-sm p-1">
                    <button 
                        onClick={(e) => onDuplicateProject(project, e)}
                        className="p-1 hover:text-indigo-400 text-slate-500"
                        title="Duplicate"
                    >
                        <Copy className="w-3 h-3" />
                    </button>
                    <button 
                        onClick={(e) => onDeleteProject(project.id, e)}
                        className="p-1 hover:text-red-400 text-slate-500"
                        title="Delete"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>
            </div>
        ))}
      </div>
      
      <div className="p-4 border-t border-slate-800 flex flex-col items-center gap-3">
        <button 
            onClick={onChangeApiKey}
            className="text-xs text-slate-500 hover:text-indigo-400 flex items-center gap-1.5 transition-colors"
        >
            <Key className="w-3 h-3" />
            Change API Key
        </button>
        <div className="text-[10px] text-slate-700">
            v1.0.0 Alpha
        </div>
      </div>
    </div>
  );
};

export default Sidebar;