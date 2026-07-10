import React, { useEffect, useState } from "react";
import { api } from "../lib/api.ts";
import { Deliverable, Document } from "../modules/project-tracker/types.ts";
import { Folder, FileText, CheckSquare, Plus, UploadCloud, Search, Trash2, Eye } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.tsx";

interface Props {
  projectId: string;
}

interface CriteriaItem {
  criteria: string;
  isApproved: boolean;
  approvedByName?: string;
}

const parseCriteria = (criteria: string | any): CriteriaItem[] => {
  if (!criteria) return [];
  if (typeof criteria === "string") {
    const trimmed = criteria.trim();
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((c: any) => {
            if (typeof c === "string") {
              return { criteria: c, isApproved: false };
            }
            return {
              criteria: String(c.criteria || ""),
              isApproved: !!c.isApproved
            };
          });
        }
      } catch (e) {
        // ignore
      }
    }
    const items = trimmed.split(";").map(item => item.trim()).filter(Boolean);
    return items.map(item => ({
      criteria: item,
      isApproved: false
    }));
  }
  if (Array.isArray(criteria)) {
    return criteria.map((c: any) => {
      if (typeof c === "string") {
        return { criteria: c, isApproved: false };
      }
      return {
        criteria: String(c?.criteria || ""),
        isApproved: !!c?.isApproved
      };
    });
  }
  return [];
};

export function DeliverablesDocsView({ projectId }: Props) {
  const { user } = useAuth();
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<string[]>(["/"]);
  const [activeFolder, setActiveFolder] = useState("/");
  const [loading, setLoading] = useState(true);

  // Tab: "deliverables" or "docs"
  const [activeTab, setActiveTab] = useState<"deliverables" | "docs">("deliverables");

  // Document upload state
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [docName, setDocName] = useState("");
  const [docCategory, setDocCategory] = useState("Technical Specification");
  const [docFolder, setDocFolder] = useState("/");
  const [docTags, setDocTags] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [dList, docList, fList] = await Promise.all([
        api.getDeliverables(projectId),
        api.getDocuments(projectId, activeFolder),
        api.getFolders(projectId)
      ]);
      setDeliverables(dList);
      setDocuments(docList);
      setFolders(fList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId, activeFolder]);

  const handleToggleCriteria = async (deliverableId: string, index: number) => {
    const d = deliverables.find(x => x.id === deliverableId);
    if (!d) return;

    const parsedCriteria = parseCriteria(d.acceptanceCriteria);
    if (!parsedCriteria[index]) return;

    const reviewerName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email : "Project Specialist";

    const newCriteria = parsedCriteria.map((c, idx) => 
      idx === index 
        ? { 
            ...c, 
            isApproved: !c.isApproved, 
            approvedByName: !c.isApproved ? reviewerName : undefined 
          } 
        : c
    );

    // Calculate overall completion status automatically
    const allDone = newCriteria.every(c => c.isApproved);
    const newStatus = allDone ? "APPROVED" : "IN_REVIEW";

    try {
      await api.updateDeliverable(deliverableId, {
        acceptanceCriteria: JSON.stringify(newCriteria),
        status: newStatus as any
      });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName) return;

    try {
      await api.uploadDocument({
        projectId,
        name: docName,
        folderPath: docFolder,
        category: docCategory,
        tags: docTags.split(",").map(t => t.trim()).filter(Boolean),
        uploadedBy: "usr-alex",
        fileSize: Math.round(Math.random() * 8500 + 500) // simulated random size (KB)
      });
      setIsAddingDoc(false);
      setDocName("");
      setDocTags("");
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading && deliverables.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs text-slate-600">
      {/* Sub-tab switches */}
      <div className="flex justify-between items-center bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab("deliverables")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === "deliverables" 
                ? "bg-indigo-50 text-indigo-600 border border-indigo-150 font-semibold shadow-sm" 
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`}
          >
            Milestone Deliverables Review ({deliverables.length})
          </button>
          <button
            onClick={() => setActiveTab("docs")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === "docs" 
                ? "bg-indigo-50 text-indigo-600 border border-indigo-150 font-semibold shadow-sm" 
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`}
          >
            Project Documents Repository ({documents.length})
          </button>
        </div>

        {activeTab === "docs" && (
          <button
            onClick={() => setIsAddingDoc(!isAddingDoc)}
            className="flex items-center space-x-1.5 bg-indigo-600 text-white px-3 py-2 rounded-lg font-medium hover:bg-indigo-500 transition shadow-sm"
          >
            <UploadCloud className="h-4 w-4" />
            <span>Upload Document</span>
          </button>
        )}
      </div>

      {/* RENDER ACTIVE SCREEN */}
      {activeTab === "deliverables" ? (
        <div className="space-y-6">
          {deliverables.map(d => (
            <div key={d.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm leading-snug">{d.title}</h3>
                  <p className="text-slate-400 text-[10px] mt-0.5">Due Date: {d.dueDate}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-semibold border ${
                  d.status === "APPROVED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                  d.status === "IN_REVIEW" ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                  "bg-slate-100 text-slate-600 border-slate-200"
                }`}>
                  {d.status}
                </span>
              </div>

              <p className="text-slate-600 leading-relaxed">{d.description}</p>

              {/* Acceptance Criteria Checklist */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <span className="font-semibold text-slate-700 block text-xs flex items-center space-x-1">
                  <CheckSquare className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Acceptance Criteria Checklist</span>
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {parseCriteria(d.acceptanceCriteria).map((c, idx) => (
                    <label
                      key={idx}
                      className={`flex items-start space-x-2.5 p-3 rounded-lg border text-[11px] leading-relaxed cursor-pointer hover:bg-slate-50 transition-all duration-200 ${
                        c.isApproved 
                          ? "bg-emerald-50/60 border-emerald-200 text-slate-750" 
                          : "bg-slate-50/50 border-slate-200 text-slate-600"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={c.isApproved}
                        onChange={() => handleToggleCriteria(d.id, idx)}
                        className="mt-0.5 h-3.5 w-3.5 border-slate-300 bg-white text-indigo-600 focus:ring-0 rounded cursor-pointer"
                      />
                      <div>
                        <strong className={`block ${c.isApproved ? "text-emerald-800" : "text-slate-700"}`}>{c.criteria}</strong>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">Approved by: {c.isApproved ? (c.approvedByName || "Alex Rivera") : "Pending Signoff"}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Upload Document module */}
          {isAddingDoc && (
            <form onSubmit={handleUploadDoc} className="bg-white border border-slate-200 p-5 rounded-xl space-y-4 shadow-sm">
              <h3 className="font-semibold text-slate-800">Register Document Asset</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 mb-1">Document File Name</label>
                  <input type="text" value={docName} onChange={e => setDocName(e.target.value)} placeholder="e.g. SRS-Technical-Brief.pdf" required className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:outline-none focus:border-indigo-500 text-slate-800" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-500 mb-1">Category</label>
                    <select value={docCategory} onChange={e => setDocCategory(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:outline-none focus:border-indigo-500 text-slate-800">
                      <option value="Technical Specification">Technical Spec</option>
                      <option value="Client Agreement">Client Agreement</option>
                      <option value="Financial Budget">Financial Budget</option>
                      <option value="Meeting Minutes">Meeting Minutes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Target Directory</label>
                    <select value={docFolder} onChange={e => setDocFolder(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:outline-none focus:border-indigo-500 text-slate-800">
                      {folders.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Tags (Comma-separated)</label>
                <input type="text" value={docTags} onChange={e => setDocTags(e.target.value)} placeholder="e.g. scope, technical, architect" className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:outline-none focus:border-indigo-500 text-slate-800" />
              </div>
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setIsAddingDoc(false)} className="px-3.5 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded transition text-xs font-semibold">Cancel</button>
                <button type="submit" className="px-3.5 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-500 transition text-xs font-semibold">Save Document</button>
              </div>
            </form>
          )}

          {/* Folder Explorer Breadcrumb Pane */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <span className="font-semibold text-slate-700 text-xs block">Document Explorer Directory</span>
            
            <div className="flex space-x-2 overflow-x-auto pb-1">
              {folders.map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFolder(f)}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg border font-mono text-[10px] transition cursor-pointer ${
                    activeFolder === f 
                      ? "bg-indigo-50 border-indigo-200 text-indigo-600 font-semibold shadow-sm" 
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100/50"
                  }`}
                >
                  <Folder className="h-3.5 w-3.5 text-slate-400" />
                  <span>{f}</span>
                </button>
              ))}
            </div>

            {/* Document listings table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-medium">
                    <th className="p-3">File Asset Name</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Revision</th>
                    <th className="p-3">Size</th>
                    <th className="p-3">Meta Tags</th>
                    <th className="p-3 text-right">Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map(d => (
                    <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50/50 text-slate-700 transition-colors">
                      <td className="p-3 flex items-center space-x-2.5">
                        <FileText className="h-4 w-4 text-indigo-500" />
                        <span className="font-semibold text-slate-800">{d.name}</span>
                      </td>
                      <td className="p-3 font-medium text-slate-500">{d.category}</td>
                      <td className="p-3 font-mono font-bold text-indigo-600">v{d.version}.0</td>
                      <td className="p-3 font-mono text-slate-400">{(d.fileSize / 1024).toFixed(1)} MB</td>
                      <td className="p-3">
                        <div className="flex space-x-1.5">
                          {d.tags.map((t, tIdx) => (
                            <span key={tIdx} className="bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.2 rounded font-mono text-[8px]">
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <button onClick={() => alert(`Launching visual preview window for doc: ${d.name}`)} className="text-slate-400 hover:text-indigo-600 transition p-1 cursor-pointer">
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {documents.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-4 text-center italic text-slate-400 bg-slate-50/50">No documents found in this directory.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
