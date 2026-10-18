import React, { useState } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  Code,
  FileCode,
  FolderArchive,
  ExternalLink,
  Terminal,
} from 'lucide-react';
import { generateExtensionFiles, createExtensionZip, ExtensionCodeFiles } from '../lib/extensionPackager';

interface ExtensionDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExtensionDownloadModal: React.FC<ExtensionDownloadModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<keyof ExtensionCodeFiles>('manifest.json');
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  const files = generateExtensionFiles();

  const handleCopy = (content: string, key: string) => {
    navigator.clipboard.writeText(content);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadZip = async () => {
    setIsDownloading(true);
    try {
      const blob = await createExtensionZip();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'voice-form-assistant-chrome-extension.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed generating zip:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-700 p-4 sm:p-5 flex items-center justify-between border-b border-indigo-600/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white backdrop-blur-md">
              <FolderArchive className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Chrome Extension Package (Manifest V3)
              </h2>
              <p className="text-xs text-indigo-200">
                Ready to unpack and test in Google Chrome or any Chromium browser
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadZip}
              disabled={isDownloading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-4 rounded-xl shadow flex items-center gap-1.5 transition-all"
            >
              <Download className="w-4 h-4" />
              {isDownloading ? 'Preparing ZIP...' : 'Download (.ZIP)'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-indigo-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Installation Steps Banner */}
        <div className="bg-slate-950 p-4 border-b border-slate-800 text-xs text-slate-300 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-start gap-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0">
              1
            </span>
            <p>
              Download & extract the <strong className="text-white">.zip</strong> folder to your local drive.
            </p>
          </div>
          <div className="flex items-start gap-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0">
              2
            </span>
            <p>
              Navigate to <code className="text-indigo-300 font-mono">chrome://extensions</code> & toggle on <strong className="text-white">Developer mode</strong>.
            </p>
          </div>
          <div className="flex items-start gap-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0">
              3
            </span>
            <p>
              Click <strong className="text-white">"Load unpacked"</strong> and select the extracted folder!
            </p>
          </div>
        </div>

        {/* Source Code Inspector */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* File Explorer Sidebar */}
          <div className="w-full md:w-56 bg-slate-950/80 border-r border-slate-800 p-3 space-y-1 overflow-y-auto">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
              Extension Files
            </div>
            {(Object.keys(files) as (keyof ExtensionCodeFiles)[]).map((fileName) => {
              const isSelected = selectedFile === fileName;
              return (
                <button
                  key={fileName}
                  onClick={() => setSelectedFile(fileName)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors text-left ${
                    isSelected
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{fileName}</span>
                </button>
              );
            })}
          </div>

          {/* Code Viewer */}
          <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden">
            <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-mono text-indigo-400 font-medium">
                {selectedFile}
              </span>
              <button
                onClick={() => handleCopy(files[selectedFile], selectedFile)}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-md flex items-center gap-1 font-mono transition-colors"
              >
                {copiedKey === selectedFile ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy Code
                  </>
                )}
              </button>
            </div>

            <pre className="flex-1 p-4 overflow-auto text-xs font-mono text-slate-200 bg-slate-950/90 leading-relaxed select-text">
              <code>{files[selectedFile]}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
