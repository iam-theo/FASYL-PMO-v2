import React, { useEffect, useState } from "react";
import { api } from "../lib/api.ts";
import { Plus, Save, Trash, Shield, Settings, FileText, CheckSquare, Users } from "lucide-react";

export function LifecycleTemplateBuilderView() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await api.getLifecycleTemplates();
      setTemplates(data || []);
      if (data && data.length > 0) {
        loadTemplateDetails(data[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplateDetails = async (id: string) => {
    setLoading(true);
    try {
      const data = await api.getLifecycleTemplateById(id);
      setSelectedTemplate(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await api.updateLifecycleTemplate(selectedTemplate.id, selectedTemplate);
      alert("Template saved successfully");
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStageField = (stageIndex: number, field: string, value: any) => {
    const updated = { ...selectedTemplate };
    updated.stages[stageIndex][field] = value;
    setSelectedTemplate(updated);
  };

  const addChecklist = (stageIndex: number) => {
    const updated = { ...selectedTemplate };
    if (!updated.stages[stageIndex].checklists) updated.stages[stageIndex].checklists = [];
    updated.stages[stageIndex].checklists.push({ id: 'new', itemText: 'New Checklist Item', isMandatory: true });
    setSelectedTemplate(updated);
  };

  const updateChecklist = (stageIndex: number, clIndex: number, field: string, value: any) => {
    const updated = { ...selectedTemplate };
    updated.stages[stageIndex].checklists[clIndex][field] = value;
    setSelectedTemplate(updated);
  };

  const addDocument = (stageIndex: number) => {
    const updated = { ...selectedTemplate };
    if (!updated.stages[stageIndex].documents) updated.stages[stageIndex].documents = [];
    updated.stages[stageIndex].documents.push({ id: 'new', name: 'New Document Req', category: 'INTERNAL', isMandatory: true, description: '' });
    setSelectedTemplate(updated);
  };

  const updateDocument = (stageIndex: number, docIndex: number, field: string, value: any) => {
    const updated = { ...selectedTemplate };
    updated.stages[stageIndex].documents[docIndex][field] = value;
    setSelectedTemplate(updated);
  };

  if (loading && !templates.length) {
    return <div className="animate-spin h-8 w-8 border-b-2 border-indigo-500 rounded-full mx-auto mt-20"></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 flex items-center">
            <Settings className="w-6 h-6 mr-2 text-indigo-600" /> Lifecycle Template Builder
          </h2>
          <p className="text-slate-500 text-sm mt-1">Configure project stages, checklist requirements, document types, and approval gates.</p>
        </div>
        <button disabled={loading} onClick={handleSave} className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded text-sm transition-colors shadow-sm">
          <Save className="w-4 h-4 mr-2" /> Save Configuration
        </button>
      </div>

      <div className="flex space-x-4 border-b border-slate-200 pb-4">
        {templates.map(t => (
          <button 
            key={t.id} 
            onClick={() => loadTemplateDetails(t.id)}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${selectedTemplate?.id === t.id ? 'bg-slate-100 text-indigo-600 border border-slate-200' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            {t.name}
          </button>
        ))}
      </div>

      {selectedTemplate && (
        <div className="space-y-8">
          {selectedTemplate.stages?.map((stage: any, sIdx: number) => (
            <div key={stage.id || sIdx} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="bg-slate-200 px-3 py-1 rounded text-xs font-mono text-slate-700 border border-slate-300">Stage {stage.stageNumber}</div>
                  <input 
                    type="text" 
                    value={stage.name || ''} 
                    onChange={e => updateStageField(sIdx, 'name', e.target.value)}
                    className="bg-transparent border-none text-lg font-medium text-slate-900 focus:outline-none focus:ring-0 px-0 flex-1"
                    placeholder="Stage Name"
                  />
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Stage Info */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Description / Label</label>
                    <textarea 
                      value={stage.description || ''} 
                      onChange={e => updateStageField(sIdx, 'description', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded p-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 h-20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 flex items-center">
                      <Users className="w-3 h-3 mr-1" /> Designated Signees / Approvers
                    </label>
                    <input 
                      type="text" 
                      value={Array.isArray(stage.approverRoles) ? stage.approverRoles.join(', ') : (stage.approverRoles || '')}
                      onChange={e => updateStageField(sIdx, 'approverRoles', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                      placeholder="e.g. Head of Ops, Finance Director"
                      className="w-full bg-white border border-slate-200 rounded p-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Checklists */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h4 className="text-sm font-medium text-slate-700 flex items-center"><CheckSquare className="w-4 h-4 mr-1.5 text-emerald-600" /> Checkboxes / Forms</h4>
                    <button onClick={() => addChecklist(sIdx)} className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center">
                      <Plus className="w-3 h-3 mr-1" /> Add
                    </button>
                  </div>
                  {stage.checklists?.map((cl: any, clIdx: number) => (
                    <div key={clIdx} className="flex items-start space-x-2 bg-slate-50 p-2 rounded border border-slate-200">
                      <input 
                        type="checkbox" 
                        checked={!!cl.isMandatory} 
                        onChange={e => updateChecklist(sIdx, clIdx, 'isMandatory', e.target.checked)}
                        className="mt-1 rounded bg-white border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        title="Mandatory"
                      />
                      <input 
                        type="text" 
                        value={cl.itemText || ''} 
                        onChange={e => updateChecklist(sIdx, clIdx, 'itemText', e.target.value)}
                        className="bg-transparent border-none text-sm text-slate-700 focus:outline-none flex-1 py-0 px-1"
                        placeholder="Checklist Item Label"
                      />
                    </div>
                  ))}
                </div>

                {/* Documents */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h4 className="text-sm font-medium text-slate-700 flex items-center"><FileText className="w-4 h-4 mr-1.5 text-amber-500" /> Upload Requirements</h4>
                    <button onClick={() => addDocument(sIdx)} className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center">
                      <Plus className="w-3 h-3 mr-1" /> Add
                    </button>
                  </div>
                  {stage.documents?.map((doc: any, docIdx: number) => (
                    <div key={docIdx} className="flex flex-col space-y-2 bg-slate-50 p-2 rounded border border-slate-200">
                      <div className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          checked={!!doc.isMandatory} 
                          onChange={e => updateDocument(sIdx, docIdx, 'isMandatory', e.target.checked)}
                          className="rounded bg-white border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          title="Mandatory Upload"
                        />
                        <input 
                          type="text" 
                          value={doc.name || ''} 
                          onChange={e => updateDocument(sIdx, docIdx, 'name', e.target.value)}
                          className="bg-transparent border-none text-sm font-medium text-slate-900 focus:outline-none flex-1 py-0 px-1"
                          placeholder="Document Title"
                        />
                      </div>
                      <div className="flex items-center justify-between pl-6">
                        <select 
                          value={doc.category || 'INTERNAL'}
                          onChange={e => updateDocument(sIdx, docIdx, 'category', e.target.value)}
                          className="bg-white border-slate-200 text-xs text-slate-600 rounded focus:ring-0 py-1 pl-2 pr-6"
                        >
                          <option value="FINANCIAL">Financial</option>
                          <option value="INTERNAL">Internal</option>
                          <option value="CLIENT">Client</option>
                          <option value="CHARTER">Charter</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
