import React, { useState } from 'react';
import { Project } from '../types';
import { Share2, CornerUpLeft, ChevronLeft, ChevronRight, Image as ImageIcon, Printer, Loader2, FileText } from 'lucide-react';
import { jsPDF } from "jspdf";

interface Props {
  project: Project;
  onBack: () => void;
}

const DeliveryView: React.FC<Props> = ({ project, onBack }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  
  const pages = project.finalStory || [];

  const handleExportLog = () => {
      if (pages.length === 0) return;

      const timestamp = new Date().toLocaleString();
      let logContent = `STORYENGINE AI - GENERATION LOG\n`;
      logContent += `Project: ${project.name}\n`;
      logContent += `Date: ${timestamp}\n`;
      logContent += `Context: ${project.context}\n`;
      logContent += `Art Style: ${project.artStyle}\n`;
      logContent += `=================================================\n\n`;

      pages.forEach((page) => {
          logContent += `[PAGE ${page.id}]\n`;
          logContent += `STORY TEXT: ${page.text}\n`;
          logContent += `IMAGE PROMPT:\n${page.imagePrompt}\n`;
          logContent += `-------------------------------------------------\n\n`;
      });

      const blob = new Blob([logContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (project.name || 'story').replace(/[^a-z0-9]/gi, '_');
      a.download = `${safeName}_generation.log`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
      if (pages.length === 0) return;
      
      setIsExporting(true);
      // Small delay to ensure UI updates to show loading state
      await new Promise(resolve => setTimeout(resolve, 50));

      try {
          const doc = new jsPDF({
              orientation: 'portrait',
              unit: 'mm',
              format: 'a4'
          });
          
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          
          for (let i = 0; i < pages.length; i++) {
              const page = pages[i];
              if (i > 0) {
                  doc.addPage();
              }
              
              if (page.imageUrl) {
                  // Detect format crudely or default to PNG. Base64 usually contains mime type.
                  const format = page.imageUrl.includes('image/jpeg') ? 'JPEG' : 'PNG';
                  try {
                      doc.addImage(page.imageUrl, format, 0, 0, pageWidth, pageHeight);
                  } catch (err) {
                      console.error(`Error adding image for page ${i + 1}`, err);
                      doc.text(`[Error loading image for Page ${i+1}]`, 20, 20);
                      doc.text(page.text, 20, 40, { maxWidth: pageWidth - 40 });
                  }
              } else {
                  // Fallback if no image
                  doc.setFontSize(14);
                  doc.text(`Page ${i + 1}`, 20, 20);
                  doc.setFontSize(12);
                  doc.text(page.text || "", 20, 40, { maxWidth: pageWidth - 40 });
              }
          }
          
          const safeName = (project.name || 'story').replace(/[^a-z0-9]/gi, '_');
          doc.save(`${safeName}.pdf`);

      } catch (e) {
          console.error("PDF Export failed", e);
          alert("Failed to generate PDF. Please try again.");
      } finally {
          setIsExporting(false);
      }
  };
  
  const handleShare = async () => {
     if (pages.length === 0) return;
     const fullText = pages.map(p => `Page ${p.id}:\n${p.text}`).join('\n\n');
     try {
         await navigator.clipboard.writeText(fullText);
         alert("Story text copied to clipboard!");
     } catch (err) {
         console.error("Failed to copy", err);
     }
  };

  if (pages.length === 0) {
      return (
        <div className="flex flex-col h-full items-center justify-center">
             <div className="text-slate-400 mb-4">No story pages found.</div>
             <button onClick={onBack} className="text-indigo-400 hover:text-white">Back to Oracle</button>
        </div>
      );
  }

  const page = pages[currentPage];

  return (
    <div className="flex flex-col h-full w-full">
      {/* Screen Header */}
      <div className="flex justify-between items-center mb-6 max-w-4xl mx-auto w-full px-4">
        <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-2 transition-colors">
            <CornerUpLeft className="w-4 h-4"/>
            Back to Oracle
        </button>
        <div className="flex gap-3">
             <button onClick={handleShare} className="px-4 py-2 border border-slate-600 hover:border-slate-400 text-slate-300 rounded-md flex items-center gap-2 transition-colors">
                <Share2 className="w-4 h-4"/>
                <span className="hidden sm:inline">Copy Text</span>
             </button>
             <button onClick={handleExportLog} className="px-4 py-2 border border-slate-600 hover:border-slate-400 text-slate-300 rounded-md flex items-center gap-2 transition-colors" title="Download Prompts Log">
                <FileText className="w-4 h-4"/>
                <span className="hidden sm:inline">Log</span>
             </button>
             <button 
                onClick={handleExport} 
                disabled={isExporting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md flex items-center gap-2 font-medium shadow-lg shadow-emerald-900/20 disabled:opacity-70 disabled:cursor-not-allowed"
             >
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Printer className="w-4 h-4"/>}
                {isExporting ? 'Generating PDF...' : 'Download PDF'}
             </button>
        </div>
      </div>

      {/* Screen Book View (Single Vertical Page) */}
      <div className="flex-1 flex items-center justify-center gap-6 max-w-6xl mx-auto w-full overflow-hidden pb-6">
        <button 
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="p-3 rounded-full hover:bg-slate-800 disabled:opacity-0 transition-all shrink-0"
        >
            <ChevronLeft className="w-8 h-8 text-slate-300" />
        </button>

        {/* The Page Container - A4 Ratio approx */}
        <div className="h-full aspect-[3/4] bg-white rounded-sm shadow-2xl overflow-hidden relative group">
             {page.imageUrl ? (
                <img src={page.imageUrl} alt={`Page ${page.id}`} className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 bg-slate-100">
                    <ImageIcon className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-xs font-mono uppercase tracking-widest mb-2 opacity-50">Generating Page...</p>
                </div>
            )}
            
            {/* Overlay to read raw text if image text is hard to read (Optional, hidden by default) */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                <p className="text-sm font-serif leading-relaxed text-center opacity-90">{page.text}</p>
                <p className="text-[10px] text-center text-slate-500 mt-2 uppercase tracking-wider">Raw Text Backup</p>
            </div>
        </div>

        <button 
            onClick={() => setCurrentPage(Math.min(pages.length - 1, currentPage + 1))}
            disabled={currentPage === pages.length - 1}
            className="p-3 rounded-full hover:bg-slate-800 disabled:opacity-0 transition-all shrink-0"
        >
            <ChevronRight className="w-8 h-8 text-slate-300" />
        </button>
      </div>

      <div className="h-10 flex items-center justify-center text-slate-500 text-sm">
        Page {currentPage + 1} of {pages.length}
      </div>
    </div>
  );
};

export default DeliveryView;