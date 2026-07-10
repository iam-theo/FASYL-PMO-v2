import React, { useEffect, useState, useCallback, useRef } from "react";
import { api } from "../lib/api.ts";
import { useAuth } from "../contexts/AuthContext";
import { 
  Shield, CheckCircle, FileText, Upload, CheckSquare, 
  MessageSquare, AlertTriangle, AlertCircle, RefreshCw,
  Lock, ArrowRight, Download, History, XCircle, Info
} from "lucide-react";

interface Props {
  projectId: string;
}

export function LifecycleView({ projectId }: Props) {
  const { user, hasRole } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [lifecycle, setLifecycle] = useState<any>(null);
  const [readiness, setReadiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewComment, setReviewComment] = useState("");

  const loadReadiness = useCallback(async (instanceId: string, stageId: string) => {
    try {
      const data = await api.getLifecycleReadinessStatus(instanceId, stageId);
      setReadiness(data);
    } catch (err) {
      console.error("Readiness check failed:", err);
    }
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const data = await api.getLifecycleInstance(projectId);
      setLifecycle(data);
      if (data?.hasLifecycle && data.id && data.currentStageId) {
        await loadReadiness(data.id, data.currentStageId);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load enterprise lifecycle");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [projectId]);

  const handleCompleteChecklist = async (instanceId: string, checklistId: string, isCompleted: boolean) => {
    try {
      setActionLoading(true);
      await api.completeLifecycleChecklist(instanceId, checklistId, { isCompleted, notes: "Self-certified by PM" });
      await load();
    } catch (e: any) {
      alert("Validation Error: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUploadDoc = async (instanceId: string, docId: string, file: File) => {
    try {
      setActionLoading(true);
      const formData = new FormData();
      formData.append("file", file);
      
      await api.uploadLifecycleDocument(instanceId, docId, formData);
      await load();
    } catch (e: any) {
      alert("Upload Error: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const triggerUpload = (docId: string) => {
    setActiveDocId(docId);
    fileInputRef.current?.click();
  };

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeDocId || !lifecycle?.id) return;
    await handleUploadDoc(lifecycle.id, activeDocId, file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmitForReview = async () => {
    try {
      setActionLoading(true);
      await api.submitLifecycleForReview(lifecycle.id);
      await load();
    } catch (e: any) {
      alert("Submission Blocked: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReviewDecision = async (decision: "APPROVE" | "REJECT") => {
    if (decision === "REJECT" && !reviewComment.trim()) {
      alert("Rejection comments are mandatory for governance audit trail.");
      return;
    }
    try {
      setActionLoading(true);
      await api.reviewLifecycleStageGate(lifecycle.id, { decision, comments: reviewComment });
      setReviewComment("");
      await load();
    } catch (e: any) {
      alert("Governance Review Error: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const verifyDocument = async (docVersionId: string) => {
    try {
      setActionLoading(true);
      await api.verifyLifecycleDocument(docVersionId, {
        status: "VERIFIED",
        notes: "Document integrity verified by compliance engine"
      });
      await load();
    } catch (e: any) {
      alert("Verification Error: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !lifecycle) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error || !lifecycle || lifecycle.hasLifecycle === false) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-8 rounded-2xl text-sm max-w-2xl mx-auto mt-12 shadow-sm">
        <AlertCircle className="h-6 w-6 mb-4 text-rose-500" />
        <h3 className="text-lg font-semibold text-rose-900 mb-2">Lifecycle Inactive</h3>
        <p className="opacity-70 mb-6 leading-relaxed">
          {error || "This project is currently decoupled from the enterprise governance engine. You must provision a standard project lifecycle to enable stage-gate controls."}
        </p>
        <button 
          onClick={async () => {
            try {
              setActionLoading(true);
              const templates = await api.getLifecycleTemplates();
              if (templates && templates.length > 0) {
                 await api.createLifecycleInstance({ projectId, templateId: templates[0].id });
                 await load();
              }
            } catch (err: any) {
              alert(err.message);
            } finally {
              setActionLoading(false);
            }
          }}
          disabled={actionLoading}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-indigo-500/20 flex items-center"
        >
          {actionLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
          Provision Governance Lifecycle
        </button>
      </div>
    );
  }

  const currentStage = lifecycle.stages?.find((s: any) => s.isCurrent);
  const isLocked = lifecycle.status === "AWAITING_REVIEW";
  const isReady = readiness?.isReady;

  return (
    <div className="max-w-6xl mx-auto pb-20">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={onFileSelected} 
        className="hidden" 
        accept=".pdf,.docx,.doc,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg"
      />
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded text-[10px] font-bold tracking-widest uppercase">
              {lifecycle.template?.name || "Governance"}
            </span>
            <span className="text-slate-500 text-xs font-mono">• v2.4.0 Engine</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            Stage Gate Governance
            {isLocked && <Lock className="w-5 h-5 text-amber-500" />}
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-slate-500 uppercase tracking-tighter">SLA Health</p>
            <p className="text-emerald-600 font-mono font-bold">ON TARGET</p>
          </div>
          <button onClick={load} className="p-2 text-slate-500 hover:text-slate-900 bg-white border border-slate-200 rounded-lg transition-colors">
            <RefreshCw className={`h-5 w-5 ${actionLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Stage Progress & Metadata */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 relative overflow-hidden shadow-sm">
             <div className="absolute top-0 right-0 p-3 opacity-5">
               <Shield className="w-24 h-24 text-slate-900" />
             </div>
             
             <h3 className="text-sm font-semibold text-slate-500 mb-6 flex items-center uppercase tracking-widest">
               <History className="w-4 h-4 mr-2" /> Project Progress
             </h3>
             
             <div className="space-y-6 relative">
               {lifecycle.stages?.map((stage: any, idx: number) => (
                 <div key={stage.id || `stage-${idx}`} className="flex gap-4 relative">
                   {idx < lifecycle.stages.length - 1 && (
                     <div className={`absolute left-[11px] top-6 bottom-[-24px] w-0.5 ${stage.status === 'COMPLETED' ? 'bg-emerald-500/50' : 'bg-slate-200'}`} />
                   )}
                   <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 border-2 ${
                     stage.status === 'COMPLETED' ? 'bg-emerald-100 border-emerald-500 text-emerald-600' :
                     stage.status === 'ACTIVE' || stage.status === 'IN_REVIEW' ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' :
                     'bg-slate-50 border-slate-200 text-slate-400'
                   }`}>
                     {stage.status === 'COMPLETED' ? <CheckCircle className="w-4 h-4" /> : <span className="text-[10px] font-bold">{idx + 1}</span>}
                   </div>
                   <div className="pt-0.5">
                     <p className={`text-sm font-medium ${stage.isCurrent ? 'text-slate-900' : 'text-slate-500'}`}>{stage.name}</p>
                     {stage.isCurrent && <p className="text-[10px] text-indigo-600 font-mono mt-1 uppercase tracking-widest">{lifecycle.status.replace(/_/g, ' ')}</p>}
                   </div>
                 </div>
               ))}
             </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
             <h3 className="text-xs font-bold text-amber-600 mb-4 uppercase tracking-widest flex items-center">
               <Info className="w-4 h-4 mr-2" /> Governance Context
             </h3>
             <div className="space-y-4">
               <div>
                 <p className="text-[10px] text-slate-500 uppercase">Stage Owner</p>
                 <p className="text-sm text-slate-900 font-medium">Project Manager</p>
               </div>
               <div>
                 <p className="text-[10px] text-slate-500 uppercase">Approval Body</p>
                 <p className="text-sm text-slate-900 font-medium">Head of Operations</p>
               </div>
               <div>
                 <p className="text-[10px] text-slate-500 uppercase">Expected Duration</p>
                 <p className="text-sm text-slate-900 font-medium">15 Working Days</p>
               </div>
             </div>
          </div>
        </div>

        {/* Right Column: Active Stage Workspace */}
        <div className="lg:col-span-8 space-y-6">
          {currentStage ? (
            <>
              {/* Review Panel for Head of Operations */}
              {isLocked && (hasRole("HEAD_OF_OPS") || hasRole("REVIEWER") || hasRole("ADMIN")) && (
                <div className="bg-indigo-50 border-2 border-indigo-100 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-600 rounded-lg shadow-sm">
                        <Shield className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">Governance Review Workspace</h3>
                        <p className="text-xs text-indigo-500">Awaiting executive approval decision for stage: {currentStage.name}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <textarea 
                      placeholder="Enter review comments for audit history (Mandatory for rejection)..."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      className="w-full bg-white border border-indigo-200 rounded-xl p-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 h-24"
                    />
                    <div className="flex gap-4">
                      <button 
                        onClick={() => handleReviewDecision("APPROVE")}
                        disabled={actionLoading}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-5 h-5" /> Approve Stage Gate
                      </button>
                      <button 
                        onClick={() => handleReviewDecision("REJECT")}
                        disabled={actionLoading}
                        className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-5 h-5" /> Request Rework
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Main Stage Panel */}
              <div className={`bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-all ${isLocked ? 'opacity-60 grayscale-[0.5] pointer-events-none cursor-not-allowed' : ''}`}>
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">{currentStage.name} Workspace</h2>
                    <p className="text-slate-500 text-sm mt-1 max-w-xl">Complete all governance requirements below to enable stage gate submission.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Stage Progress</p>
                    <p className="text-3xl font-black text-indigo-600">
                      {Math.round((((currentStage.checklists || []).filter((c:any) => c.isCompleted).length + (currentStage.documents || []).filter((d:any) => d.status === 'VERIFIED').length) / Math.max(1, (currentStage.checklists || []).length + (currentStage.documents || []).length)) * 100)}%
                    </p>
                  </div>
                </div>

                <div className="p-8 space-y-10">
                  {/* Checklist */}
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-bold text-slate-700 flex items-center uppercase tracking-wider">
                        <CheckSquare className="w-4 h-4 mr-2 text-indigo-600" /> Mandatory Checklist
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400 italic">Audit timestamp required</span>
                    </div>
                    <div className="space-y-2">
                      {currentStage.checklists?.map((item: any, i: number) => (
                        <div key={item.id || `cl-${i}`} className={`group flex items-center justify-between p-4 rounded-xl border transition-all ${item.isCompleted ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50 border-slate-150 hover:border-slate-300'}`}>
                          <div className="flex items-center gap-4">
                            <button 
                              disabled={actionLoading || isLocked} 
                              onClick={() => handleCompleteChecklist(lifecycle.id, item.id, !item.isCompleted)} 
                              className={`w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${item.isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-slate-400'}`}
                            >
                              {item.isCompleted && <CheckCircle className="w-4 h-4" />}
                            </button>
                            <div>
                              <p className={`text-sm font-medium ${item.isCompleted ? 'text-emerald-700 line-through opacity-60' : 'text-slate-800'}`}>{item.itemText}</p>
                              {item.completedAt && <p className="text-[10px] text-slate-500 font-mono mt-0.5">Completed {new Date(item.completedAt).toLocaleString()}</p>}
                            </div>
                          </div>
                          {item.isMandatory && <span className="text-[9px] font-bold text-amber-700 uppercase bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Mandatory</span>}
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Documents */}
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-bold text-slate-700 flex items-center uppercase tracking-wider">
                        <FileText className="w-4 h-4 mr-2 text-indigo-600" /> Required Evidence & Documents
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400 italic">Version control enforced</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {currentStage.documents?.map((doc: any, i: number) => (
                        <div key={doc.id || `doc-${i}`} className={`p-4 rounded-xl border flex flex-col justify-between h-40 transition-all ${doc.status === 'VERIFIED' ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50 border-slate-150'}`}>
                          <div>
                            <div className="flex items-start justify-between mb-2">
                               <p className="text-xs font-bold text-slate-800 line-clamp-2">{doc.name}</p>
                               {doc.status === 'VERIFIED' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />}
                            </div>
                            <p className="text-[10px] text-slate-500 uppercase font-mono tracking-tighter">{doc.category} • Max 50MB</p>
                          </div>
                          
                          <div className="space-y-3">
                            {doc.uploadedFile ? (
                              <div className="bg-slate-100 rounded-lg p-2 flex items-center justify-between border border-slate-200">
                                <div className="flex items-center gap-2 truncate">
                                  <FileText className="w-3 h-3 text-slate-400" />
                                  <span className="text-[10px] text-slate-600 truncate">v{doc.uploadedFile.version} • {doc.uploadedFile.fileName}</span>
                                </div>
                                <button 
                                  onClick={() => window.open(doc.uploadedFile.filePath, '_blank')}
                                  className="text-indigo-600 hover:text-indigo-700 p-1"
                                >
                                  <Download className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <p className="text-[10px] text-rose-500 italic font-semibold">No document submitted</p>
                            )}
                            
                            <div className="flex gap-2">
                              {!isLocked && (
                                <button 
                                  disabled={actionLoading} 
                                  onClick={() => triggerUpload(doc.id)}
                                  className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-2"
                                >
                                  <Upload className="w-3 h-3" /> {doc.uploadedFile ? 'Replace' : 'Upload'}
                                </button>
                              )}
                              {doc.uploadedFile && doc.status !== 'VERIFIED' && (
                                <button 
                                  disabled={actionLoading} 
                                  onClick={() => verifyDocument(doc.uploadedFile.id)}
                                  className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 py-1.5 rounded-lg text-[10px] font-bold"
                                >
                                  Self-Verify
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                {/* Validation Footer */}
                <div className="bg-slate-50 p-8 border-t border-slate-100">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                       <h4 className="text-sm font-bold text-slate-800 mb-2">Stage Gate Readiness</h4>
                       <div className="flex flex-wrap gap-4">
                         <div className="flex items-center gap-2">
                           <div className={`w-2.5 h-2.5 rounded-full ${readiness?.missingChecklist?.length === 0 ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
                           <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Checklist Requirements</span>
                         </div>
                         <div className="flex items-center gap-2">
                           <div className={`w-2.5 h-2.5 rounded-full ${readiness?.missingDocuments?.length === 0 ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
                           <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Mandatory Documentation</span>
                         </div>
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-4 w-full md:w-auto">
                      {!isReady && readiness && (
                        <div className="hidden md:block text-right">
                           <p className="text-[10px] text-rose-600 font-bold uppercase tracking-tighter">Blocking Issues</p>
                           <p className="text-xs text-slate-500">{readiness.missingChecklist.length + readiness.missingDocuments.length} items remain</p>
                        </div>
                      )}
                      <button 
                        disabled={!isReady || actionLoading || isLocked}
                        onClick={handleSubmitForReview}
                        className={`flex-1 md:flex-none px-8 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-3 shadow-md ${
                          isReady && !isLocked
                            ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20' 
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-50 shadow-none'
                        }`}
                      >
                        {isLocked ? <Lock className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                        {isLocked ? 'Awaiting Operations Review' : 'Submit for Review'}
                        {!isLocked && <ArrowRight className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  
                  {!isReady && readiness && (
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-2 border-t border-slate-200/60 pt-4">
                      {readiness.missingChecklist.map((c: string, i: number) => (
                        <p key={`missing-cl-${i}`} className="text-[10px] text-rose-600 flex items-center gap-2">
                          <AlertTriangle className="w-3 h-3 text-rose-500" /> Missing Checklist: {c}
                        </p>
                      ))}
                      {readiness.missingDocuments.map((d: string, i: number) => (
                        <p key={`missing-doc-${i}`} className="text-[10px] text-rose-600 flex items-center gap-2">
                          <AlertTriangle className="w-3 h-3 text-rose-500" /> Missing Document: {d}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 p-12 rounded-2xl text-center shadow-sm">
               <CheckCircle className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
               <h3 className="text-2xl font-bold text-emerald-900 mb-2">Project Lifecycle Completed</h3>
               <p className="text-slate-600 max-w-md mx-auto">All stage gates have been formally approved and verified. The project is now in its active execution/maintenance phase.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

