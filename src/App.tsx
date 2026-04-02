/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Upload, 
  Music, 
  FileAudio, 
  Printer, 
  RefreshCw, 
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Guitar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDropzone, type DropzoneOptions } from 'react-dropzone';
import { cn } from './lib/utils';

// Initialize Gemini API
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

interface TabResult {
  chords: string[];
  tabContent: string;
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TabResult | null>(null);
  const [progress, setProgress] = useState("");

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError(null);
      setResult(null);
    }
  }, []);

  const dropzoneOptions = {
    onDrop,
    accept: {
      'audio/mpeg': ['.mp3'],
      'audio/wav': ['.wav'],
    },
    multiple: false
  } as any;

  const { getRootProps, getInputProps, isDragActive } = useDropzone(dropzoneOptions);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const generateTabs = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setProgress("Analyzing audio...");

    try {
      const base64Data = await fileToBase64(file);
      
      const model = "gemini-3-flash-preview";
      const prompt = `Analyze the ENTIRE audio file and identify all guitar chords played throughout the song. 
      Generate a comprehensive guitar tab representation covering the full duration of the track.
      Break the transcription down by song sections (e.g., Intro, Verse, Chorus, Bridge, Outro).
      Format the output as a clean, printable guitar tab in ASCII format.
      Include the chord names above the tabs for every section.
      Identify all unique chords and list them.
      Structure the response as a JSON object with two fields:
      "chords": an array of strings (all unique chord names found),
      "tabContent": a string containing the full-length formatted guitar tabs.
      Return ONLY the JSON object.`;

      const response = await genAI.models.generateContent({
        model: model,
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: file.type,
                  data: base64Data
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          systemInstruction: "You are a professional music transcriber. Your goal is to provide a complete, bar-by-bar guitar tab for the entire duration of the provided audio file. Do not summarize or provide only a snippet; transcribe the full song structure including all chord changes."
        }
      });

      const text = response.text;
      if (!text) throw new Error("No response from AI");
      
      const parsed = JSON.parse(text) as TabResult;
      setResult(parsed);
      setProgress("Done!");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during processing.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setProgress("");
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-orange-100">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white/80 backdrop-blur-md sticky top-0 z-10 print:hidden">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-200">
              <Guitar size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">TabGenie</h1>
          </div>
          <nav className="hidden sm:flex items-center gap-6 text-sm font-medium text-neutral-500">
            <a href="#" className="hover:text-orange-600 transition-colors">How it works</a>
            <a href="#" className="hover:text-orange-600 transition-colors">Examples</a>
            <button 
              onClick={reset}
              className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-full transition-colors text-neutral-900"
            >
              New Session
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div
              key="upload-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto space-y-8"
            >
              <div className="text-center space-y-4">
                <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                  Turn your audio into <span className="text-orange-600">guitar tabs</span>
                </h2>
                <p className="text-lg text-neutral-500 max-w-lg mx-auto">
                  Upload an MP3 or WAV file. Our AI will isolate the guitar and generate printable tabs for you.
                </p>
              </div>

              <div 
                {...getRootProps()} 
                className={cn(
                  "relative group cursor-pointer rounded-3xl border-2 border-dashed transition-all duration-300 p-12 text-center",
                  isDragActive 
                    ? "border-orange-500 bg-orange-50/50" 
                    : "border-neutral-200 hover:border-orange-400 hover:bg-neutral-50"
                )}
              >
                <input {...getInputProps()} />
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                    {file ? (
                      <FileAudio className="text-orange-600" size={32} />
                    ) : (
                      <Upload className="text-neutral-400" size={32} />
                    )}
                  </div>
                  <div>
                    <p className="text-lg font-semibold">
                      {file ? file.name : "Drop your audio here"}
                    </p>
                    <p className="text-sm text-neutral-400">
                      MP3 or WAV up to 20MB
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3 text-red-700"
                >
                  <AlertCircle className="shrink-0 mt-0.5" size={18} />
                  <p className="text-sm font-medium">{error}</p>
                </motion.div>
              )}

              <button
                disabled={!file || loading}
                onClick={generateTabs}
                className={cn(
                  "w-full py-4 rounded-2xl font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-3",
                  !file || loading
                    ? "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                    : "bg-orange-600 text-white hover:bg-orange-700 active:scale-[0.98] shadow-orange-200"
                )}
              >
                {loading ? (
                  <>
                    <RefreshCw className="animate-spin" size={20} />
                    {progress}
                  </>
                ) : (
                  <>
                    Generate Tabs
                    <ChevronRight size={20} />
                  </>
                )}
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="result-section"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8"
            >
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 print:hidden">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-green-600 font-semibold text-sm">
                    <CheckCircle2 size={16} />
                    Tabs Generated Successfully
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight">{file?.name}</h2>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={reset}
                    className="px-6 py-2.5 bg-neutral-100 hover:bg-neutral-200 rounded-xl font-semibold transition-colors"
                  >
                    Start Over
                  </button>
                  <button
                    onClick={handlePrint}
                    className="px-6 py-2.5 bg-orange-600 text-white hover:bg-orange-700 rounded-xl font-semibold shadow-lg shadow-orange-200 transition-all flex items-center gap-2"
                  >
                    <Printer size={18} />
                    Print Tabs
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar: Chords */}
                <div className="lg:col-span-1 space-y-6 print:hidden">
                  <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Music size={14} />
                      Chords Identified
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {result.chords.map((chord, i) => (
                        <span 
                          key={i}
                          className="px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg font-mono font-bold text-sm border border-orange-100"
                        >
                          {chord}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-neutral-900 text-white rounded-3xl p-6 shadow-xl">
                    <h4 className="font-bold mb-2">Pro Tip</h4>
                    <p className="text-sm text-neutral-400 leading-relaxed">
                      You can print these tabs directly. The layout is optimized for standard A4 paper.
                    </p>
                  </div>
                </div>

                {/* Main Content: Tabs */}
                <div className="lg:col-span-3">
                  <div className="bg-white border border-neutral-200 rounded-3xl shadow-sm overflow-hidden print:border-none print:shadow-none">
                    <div className="p-8 sm:p-12">
                      <div className="mb-8 hidden print:block">
                        <h1 className="text-2xl font-bold mb-1">{file?.name}</h1>
                        <p className="text-neutral-500 text-sm">Generated by TabGenie AI</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {result.chords.map((chord, i) => (
                            <span key={i} className="text-sm font-mono font-bold">{chord}</span>
                          ))}
                        </div>
                        <hr className="mt-6 border-neutral-200" />
                      </div>
                      
                      <pre className="font-mono text-sm sm:text-base leading-relaxed overflow-x-auto whitespace-pre-wrap break-words text-neutral-800">
                        {result.tabContent}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-neutral-200 mt-12 print:hidden">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4 opacity-50">
            <Guitar size={20} />
            <span className="font-bold tracking-tight">TabGenie</span>
          </div>
          <p className="text-neutral-400 text-sm">
            Powered by Gemini AI. For educational and personal use only.
          </p>
        </div>
      </footer>

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; color: black !important; }
          main { padding: 0 !important; max-width: 100% !important; }
          .rounded-3xl { border-radius: 0 !important; }
          pre { font-size: 12pt !important; line-height: 1.4 !important; }
        }
      `}} />
    </div>
  );
}
