import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  FileText, 
  Plus, 
  Sparkles, 
  Eye, 
  Pencil, 
  Star, 
  Trash2, 
  ChevronRight, 
  Globe, 
  X, 
  Monitor, 
  Smartphone, 
  Info,
  Check,
  AlertCircle,
  Clock,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useOrganization } from '../contexts/OrganizationContext';
import { useUsageLimits } from '../hooks/useUsageLimits';
import { UpgradeModal } from './UpgradeModal';
import { recoveryService } from '../lib/recoveryService';

type TemplateType = 'reminder_polite' | 'reminder_firm' | 'reminder_final' | 'invoice_created' | 'invoice_paid' | 'custom';

interface EmailTemplate {
  id: string;
  organization_id: string | null;
  name: string;
  description: string | null;
  template_type: TemplateType;
  subject: string;
  body_html: string;
  body_text: string | null;
  variables: string[];
  is_default: boolean;
  is_active: boolean;
  ai_generated: boolean;
  performance_data: {
    times_used: number;
    payments_triggered: number;
    response_rate: number;
  };
  created_at: string;
  updated_at: string;
}

const TEMPLATE_TYPE_CONFIG: Record<TemplateType, { label: string, color: string, badge: string }> = {
  reminder_polite: { label: 'Polite Reminder', color: 'bg-green-50 text-green-700 border-green-100', badge: 'bg-green-500' },
  reminder_firm: { label: 'Firm Reminder', color: 'bg-amber-50 text-amber-700 border-amber-100', badge: 'bg-amber-500' },
  reminder_final: { label: 'Final Notice', color: 'bg-red-50 text-red-700 border-red-100', badge: 'bg-red-500' },
  invoice_created: { label: 'Invoice Created', color: 'bg-blue-50 text-blue-700 border-blue-100', badge: 'bg-blue-500' },
  invoice_paid: { label: 'Payment Received', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', badge: 'bg-emerald-500' },
  custom: { label: 'Custom Template', color: 'bg-purple-50 text-purple-700 border-purple-100', badge: 'bg-purple-500' }
};

const SAMPLE_VARIABLES = {
  client_name: "Rahul Sharma",
  invoice_number: "INV-001",
  amount: "₹15,000",
  due_date: "30 May 2026",
  days_overdue: "5",
  payment_link: "#",
  business_name: "Acme Creative"
};

export default function TemplateManager() {
  const { currentOrganization, isAdmin } = useOrganization();
  const { isFreePlan, limits, refresh: refreshUsage } = useUsageLimits();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'editor' | 'generator'>('list');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Editor State
  const [editorData, setEditorData] = useState<Partial<EmailTemplate>>({
    name: '',
    description: '',
    template_type: 'custom',
    subject: '',
    body_html: '',
    body_text: ''
  });
  const [editorPreviewMode, setEditorPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [editorViewMode, setEditorViewMode] = useState<'html' | 'text'>('html');

  // Generator State
  const [genConfig, setGenConfig] = useState({
    template_type: 'reminder_polite',
    tone: 'Professional',
    industry: 'Freelancer',
    language: 'English',
    instructions: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [genResult, setGenResult] = useState<any>(null);

  useEffect(() => {
    fetchTemplates();
  }, [currentOrganization]);

  const fetchTemplates = async () => {
    if (!currentOrganization) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .or(`organization_id.eq.${currentOrganization.id},organization_id.is.null`)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (template: EmailTemplate) => {
    if (!currentOrganization || template.is_default) return;
    try {
      // Unset previous default of same type for this org
      await supabase
        .from('email_templates')
        .update({ is_default: false })
        .eq('organization_id', currentOrganization.id)
        .eq('template_type', template.template_type);

      // Set new default
      const { error } = await supabase
        .from('email_templates')
        .update({ is_default: true })
        .eq('id', template.id);

      if (error) throw error;
      fetchTemplates();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin || !confirm('Are you sure you want to delete this template?')) return;
    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchTemplates();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openEditor = (template?: EmailTemplate) => {
    if (isFreePlan) {
      setShowUpgrade(true);
      return;
    }
    if (template) {
      setEditorData(template);
      setSelectedTemplate(template);
    } else {
      setEditorData({
        name: '',
        description: '',
        template_type: 'custom',
        subject: '',
        body_html: '',
        body_text: ''
      });
      setSelectedTemplate(null);
    }
    setView('editor');
  };

  const saveTemplate = async (setAsDefault = false) => {
    if (!currentOrganization) return;
    setIsSaving(true);
    try {
      const payload = {
        ...editorData,
        organization_id: currentOrganization.id,
        is_default: setAsDefault || editorData.is_default,
        body_text: editorData.body_text || editorData.body_html?.replace(/<[^>]*>/g, '')
      };

      if (setAsDefault) {
        // Unset other defaults of the same type
        await supabase
          .from('email_templates')
          .update({ is_default: false })
          .eq('organization_id', currentOrganization.id)
          .eq('template_type', editorData.template_type);
      }

      let res;
      if (selectedTemplate) {
        res = await supabase
          .from('email_templates')
          .update(payload)
          .eq('id', selectedTemplate.id);
      } else {
        res = await supabase
          .from('email_templates')
          .insert([payload]);
      }

      if (res.error) throw res.error;
      
      setView('list');
      fetchTemplates();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const generateWithAi = async () => {
    if (!currentOrganization) return;
    if (isFreePlan) {
      setShowUpgrade(true);
      return;
    }
    
    if (limits.ai_generations.current >= limits.ai_generations.limit && limits.ai_generations.limit !== -1) {
      alert("AI Generation quota reached. Please upgrade to Pro.");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await recoveryService.generateEmailTemplateWithAI({
        ...genConfig,
        organizationId: currentOrganization.id,
        businessName: currentOrganization.name
      });
      setGenResult(result);
      refreshUsage();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderPreview = (content: string) => {
    let rendered = content;
    Object.entries({ ...SAMPLE_VARIABLES, business_name: currentOrganization?.name || SAMPLE_VARIABLES.business_name }).forEach(([key, value]) => {
      rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return rendered;
  };

  if (loading && templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
        <p className="text-slate-400 font-medium">Synchronizing Templates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} />

      {view === 'list' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-slate-900 italic">Email Templates</h1>
              <p className="text-slate-500 font-medium mt-1">Customize how Paydrip communicates with your clients</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setView('generator')}
                className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm"
              >
                <Sparkles size={14} className="text-indigo-500" />
                Generate with AI
              </button>
              <button 
                onClick={() => openEditor()}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-indigo-100"
              >
                <Plus size={16} />
                Create Template
              </button>
            </div>
          </div>

          <div className="space-y-12">
            {[
              { title: 'Invoice Delivery', types: ['invoice_created'] },
              { title: 'Reminders', types: ['reminder_polite', 'reminder_firm', 'reminder_final'] },
              { title: 'Confirmations', types: ['invoice_paid'] },
              { title: 'Custom', types: ['custom'] }
            ].map(group => {
              const groupTemplates = templates.filter(t => group.types.includes(t.template_type));
              if (groupTemplates.length === 0) return null;

              return (
                <div key={group.title} className="space-y-6">
                  <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100 pb-2">{group.title}</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {groupTemplates.map(template => (
                      <motion.div 
                        key={template.id}
                        layout
                        className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all group relative overflow-hidden"
                      >
                        {template.is_default && (
                          <div className="absolute top-0 right-0 p-8 bg-indigo-500/5 blur-[40px] rounded-full -mr-4 -mt-4" />
                        )}
                        
                        <div className="flex items-start justify-between mb-4 relative z-10">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-black text-slate-900 tracking-tight">{template.name}</h3>
                              {template.is_default && (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[8px] font-black uppercase tracking-widest border border-indigo-100">
                                  <Star size={8} className="fill-indigo-600" /> Default
                                </span>
                              )}
                              {template.ai_generated && (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full text-[8px] font-black uppercase tracking-widest border border-purple-100">
                                  <Sparkles size={8} className="fill-purple-600" /> AI
                                </span>
                              )}
                            </div>
                            <div className={cn("inline-flex items-center px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border", TEMPLATE_TYPE_CONFIG[template.template_type].color)}>
                              {TEMPLATE_TYPE_CONFIG[template.template_type].label}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => { setSelectedTemplate(template); setShowPreview(true); }}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                              title="Preview"
                            >
                              <Eye size={18} />
                            </button>
                            <button 
                              onClick={() => openEditor(template)}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                              title="Edit"
                            >
                              <Pencil size={18} />
                            </button>
                            {isAdmin && !template.is_default && template.organization_id && (
                              <button 
                                onClick={() => handleDelete(template.id)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                title="Delete"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-slate-500 text-sm mb-6 line-clamp-2">{template.description || "No description provided."}</p>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-6 border-t border-slate-50 relative z-10 gap-4">
                          <div className="flex items-center gap-6">
                            <div className="space-y-0.5">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Times Used</p>
                              <p className="font-mono text-xs font-bold text-slate-700">{template.performance_data.times_used}</p>
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Response Rate</p>
                              <p className="font-mono text-xs font-bold text-slate-700">{template.performance_data.response_rate}%</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {!template.is_default && template.organization_id && (
                              <button 
                                onClick={() => handleSetDefault(template)}
                                className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-100"
                              >
                                Make Default
                              </button>
                            )}
                            <div className="text-[9px] font-medium text-slate-400 italic">
                              Last updated {new Date(template.updated_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {view === 'editor' && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setView('list')}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-black uppercase text-[10px] tracking-widest transition-all"
            >
              <ArrowLeft size={16} /> Back to List
            </button>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setView('list')}
                className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button 
                disabled={isSaving}
                onClick={() => saveTemplate(false)}
                className="px-6 py-3 bg-white border border-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm"
              >
                Save Draft
              </button>
              <button 
                disabled={isSaving}
                onClick={() => saveTemplate(true)}
                className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-indigo-100"
              >
                {isSaving ? 'Saving...' : 'Save & Set Default'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 h-[calc(100vh-250px)]">
            {/* Editor Panel */}
            <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm overflow-y-auto custom-scrollbar space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Template Name</label>
                  <input 
                    value={editorData.name}
                    onChange={e => setEditorData({ ...editorData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-indigo-600 outline-none text-sm font-bold"
                    placeholder="e.g. Agency Polite Reminder"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</label>
                  <select 
                    value={editorData.template_type}
                    onChange={e => setEditorData({ ...editorData, template_type: e.target.value as TemplateType })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-indigo-600 outline-none text-sm font-bold appearance-none cursor-pointer"
                  >
                    {Object.entries(TEMPLATE_TYPE_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>{config.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</label>
                <input 
                  value={editorData.description || ''}
                  onChange={e => setEditorData({ ...editorData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-indigo-600 outline-none text-sm font-medium"
                  placeholder="A brief description of when to use this template"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Subject</label>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-[60%]">
                    {['client_name', 'invoice_number', 'business_name'].map(v => (
                      <button 
                        key={v}
                        onClick={() => setEditorData({ ...editorData, subject: (editorData.subject || '') + ` {{${v}}}` })}
                        className="px-2 py-1 bg-slate-50 text-[8px] font-black uppercase text-slate-500 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-100 shrink-0"
                      >
                        +{v}
                      </button>
                    ))}
                  </div>
                </div>
                <input 
                  value={editorData.subject}
                  onChange={e => setEditorData({ ...editorData, subject: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-indigo-600 outline-none text-sm font-black"
                  placeholder="e.g. Reminder: Invoice #{{invoice_number}} is due"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Body (HTML Content)</label>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-[70%]">
                    {['client_name', 'invoice_number', 'amount', 'due_date', 'payment_link', 'business_name'].map(v => (
                      <button 
                        key={v}
                        onClick={() => setEditorData({ ...editorData, body_html: (editorData.body_html || '') + ` {{${v}}}` })}
                        className="px-2 py-1 bg-slate-50 text-[8px] font-black uppercase text-slate-500 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-100 shrink-0"
                      >
                        +{v}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea 
                  value={editorData.body_html}
                  onChange={e => setEditorData({ ...editorData, body_html: e.target.value })}
                  className="w-full h-96 p-6 bg-slate-900 border border-slate-800 rounded-[2rem] focus:ring-2 focus:ring-indigo-500 outline-none text-indigo-100 font-mono text-xs leading-relaxed"
                  placeholder="<div>Hello {{client_name}}...</div>"
                />
              </div>
            </div>

            {/* Live Preview Panel */}
            <div className="flex flex-col bg-slate-50 border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-inner">
              <div className="p-6 border-b border-slate-200 bg-white/50 backdrop-blur-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Preview</span>
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button 
                      onClick={() => setEditorViewMode('html')}
                      className={cn("px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all", editorViewMode === 'html' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500")}
                    >
                      HTML
                    </button>
                    <button 
                      onClick={() => setEditorViewMode('text')}
                      className={cn("px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all", editorViewMode === 'text' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500")}
                    >
                      Plain Text
                    </button>
                  </div>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button 
                    onClick={() => setEditorPreviewMode('desktop')}
                    className={cn("p-1.5 rounded-lg transition-all", editorPreviewMode === 'desktop' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400")}
                  >
                    <Monitor size={14} />
                  </button>
                  <button 
                    onClick={() => setEditorPreviewMode('mobile')}
                    className={cn("p-1.5 rounded-lg transition-all", editorPreviewMode === 'mobile' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400")}
                  >
                    <Smartphone size={14} />
                  </button>
                </div>
              </div>

              <div className="flex-1 flex justify-center items-center overflow-auto p-8">
                <div className={cn(
                  "bg-white shadow-2xl rounded-3xl overflow-hidden transition-all duration-500 flex flex-col h-full max-h-[700px]",
                  editorPreviewMode === 'mobile' ? "w-[375px]" : "w-full max-w-[600px]"
                )}>
                  <div className="p-4 bg-slate-50 border-b border-slate-100 space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Subject</p>
                    <p className="text-xs font-black text-slate-900">{editorData.subject ? renderPreview(editorData.subject) : '(No subject)'}</p>
                  </div>
                  <div className="flex-1 overflow-auto p-4 md:p-8">
                    {editorViewMode === 'html' ? (
                      <div 
                        className="preview-container" 
                        dangerouslySetInnerHTML={{ __html: editorData.body_html ? renderPreview(editorData.body_html) : '<p class="text-slate-400 italic">No content yet...</p>' }} 
                      />
                    ) : (
                      <pre className="text-[11px] font-mono whitespace-pre-wrap text-slate-600">
                        {editorData.body_text || editorData.body_html?.replace(/<[^>]*>/g, '') || 'No plain text version available.'}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {view === 'generator' && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={() => setView('list')}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" 
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-full max-w-2xl bg-[#FDFDFF] h-screen shadow-2xl flex flex-col"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tighter text-slate-900">AI Template Studio</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Powered by Gemini Adaptive Intelligence</p>
                </div>
              </div>
              <button 
                onClick={() => setView('list')}
                className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 transition-all active:scale-95"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
              {!genResult ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Recovery Type</label>
                      <select 
                        value={genConfig.template_type}
                        onChange={e => setGenConfig({ ...genConfig, template_type: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-indigo-600 outline-none text-xs font-bold"
                      >
                        <option value="reminder_polite">Polite Reminder</option>
                        <option value="reminder_firm">Firm Reminder</option>
                        <option value="reminder_final">Final Notice</option>
                        <option value="custom">Custom Email</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tone of Voice</label>
                        <select 
                          value={genConfig.tone}
                          onChange={e => setGenConfig({ ...genConfig, tone: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-indigo-600 outline-none text-xs font-bold"
                        >
                          <option>Professional</option>
                          <option>Friendly</option>
                          <option>Firm</option>
                          <option>Urgent</option>
                          <option>Empathetic</option>
                        </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Industry Context</label>
                        <select 
                          value={genConfig.industry}
                          onChange={e => setGenConfig({ ...genConfig, industry: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-indigo-600 outline-none text-xs font-bold"
                        >
                          <option>Freelancer</option>
                          <option>Creative Agency</option>
                          <option>Software Developer</option>
                          <option>Consultant</option>
                          <option>Lawyer</option>
                          <option>Writer</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Language</label>
                        <select 
                          value={genConfig.language}
                          onChange={e => setGenConfig({ ...genConfig, language: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-indigo-600 outline-none text-xs font-bold"
                        >
                          <option>English</option>
                          <option>Hindi</option>
                          <option>Hinglish</option>
                          <option>Spanish</option>
                          <option>German</option>
                        </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Specific Directives (Optional)</label>
                    <textarea 
                      value={genConfig.instructions}
                      onChange={e => setGenConfig({ ...genConfig, instructions: e.target.value })}
                      placeholder="e.g. Mention that this is the second time I'm reaching out. Use a very direct tone."
                      rows={3}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:border-indigo-600 outline-none text-[11px] font-medium leading-relaxed"
                    />
                  </div>

                  <div className="p-6 bg-slate-900 rounded-[2rem] text-white relative overflow-hidden group">
                     <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="flex items-center gap-2">
                           <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                           <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Operation Quota</span>
                        </div>
                        <span className="text-[10px] font-black italic">
                          {limits.ai_generations.current} of {limits.ai_generations.limit === -1 ? '∞' : limits.ai_generations.limit} Remaining
                        </span>
                     </div>
                     <div className="h-1.5 bg-white/10 rounded-full overflow-hidden relative z-10 mb-6">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${limits.ai_generations.percentage}%` }}
                          className="h-full bg-indigo-500"
                        />
                     </div>
                     <button 
                       disabled={isGenerating}
                       onClick={generateWithAi}
                       className="w-full py-4 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white hover:text-slate-900 transition-all shadow-xl shadow-black/40 relative z-10 flex items-center justify-center gap-3 disabled:opacity-50"
                     >
                       {isGenerating ? (
                         <>
                           <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                           Orchestrating Response...
                         </>
                       ) : (
                         <>
                           <Sparkles size={16} />
                           Generate Recovery Engine
                         </>
                       )}
                     </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                  <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm space-y-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Generated Subject</p>
                      <p className="text-sm font-black text-slate-900">{renderPreview(genResult.subject)}</p>
                    </div>
                    <div className="h-px bg-slate-50" />
                    <div className="space-y-2">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Draft Preview</p>
                       <div 
                         className="p-6 bg-slate-50 rounded-2xl text-xs leading-relaxed max-h-96 overflow-auto" 
                         dangerouslySetInnerHTML={{ __html: renderPreview(genResult.body_html) }} 
                       />
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button 
                      onClick={() => setGenResult(null)}
                      className="flex-1 py-4 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all font-mono"
                    >
                      Regenerate
                    </button>
                    <button 
                      onClick={() => {
                        setEditorData({
                          ...genResult,
                          template_type: genConfig.template_type as TemplateType,
                          ai_generated: true,
                          ai_prompt: genConfig.instructions
                        });
                        setView('editor');
                        setGenResult(null);
                      }}
                      className="flex-1 py-4 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 shadow-xl shadow-indigo-100 transition-all"
                    >
                      Open in Editor
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-8 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400 font-medium text-xs">
                <Info size={14} />
                Gemini flash-2.0 protocol active
              </div>
              <div className="flex items-center gap-4 text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                Safe Mode Protocol: Active
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && selectedTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowPreview(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tighter text-slate-900">{selectedTemplate.name}</h3>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-0.5 italic">{TEMPLATE_TYPE_CONFIG[selectedTemplate.template_type].label}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowPreview(false)}
                  className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 transition-all active:scale-95"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="bg-slate-50 rounded-[2rem] border border-slate-100 overflow-hidden shadow-inner">
                   <div className="p-6 border-b border-slate-200">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Subject Line</p>
                      <p className="text-sm font-black text-slate-900 leading-tight">{renderPreview(selectedTemplate.subject)}</p>
                   </div>
                   <div className="p-6 md:p-10 bg-white min-h-[300px]">
                      <div dangerouslySetInnerHTML={{ __html: renderPreview(selectedTemplate.body_html) }} />
                   </div>
                </div>

                {selectedTemplate.description && (
                  <div className="mt-8 flex gap-3 p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                    <Info size={18} className="text-indigo-400 shrink-0" />
                    <p className="text-[11px] font-medium text-indigo-700 leading-relaxed italic">{selectedTemplate.description}</p>
                  </div>
                )}
              </div>

              <div className="p-8 border-t border-slate-50 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-end gap-3 shrink-0">
                <button 
                  onClick={() => setShowPreview(false)}
                  className="w-full sm:w-auto px-6 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Close Preview
                </button>
                <button 
                  onClick={() => { setShowPreview(false); openEditor(selectedTemplate); }}
                  className="w-full sm:w-auto px-10 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-indigo-100"
                >
                  Modify Template
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
