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
  reminder_polite: { label: 'Polite Reminder', color: 'bg-[#10B9810B] text-[#10B981] border-[#10B98125]', badge: 'bg-[#10B981]' },
  reminder_firm: { label: 'Firm Reminder', color: 'bg-[#F5A6230B] text-[#F5A623] border-[#F5A62325]', badge: 'bg-[#F5A623]' },
  reminder_final: { label: 'Final Notice', color: 'bg-[#EF44440B] text-[#EF4444] border-[#EF444425]', badge: 'bg-[#EF4444]' },
  invoice_created: { label: 'Invoice Created', color: 'bg-[#3B82F60B] text-[#3B82F6] border-[#3B82F625]', badge: 'bg-[#3B82F6]' },
  invoice_paid: { label: 'Payment Received', color: 'bg-[#10B9810B] text-[#10B981] border-[#10B98125]', badge: 'bg-[#10B981]' },
  custom: { label: 'Custom Template', color: 'bg-[#8B5CF60B] text-[#8B5CF6] border-[#8B5CF625]', badge: 'bg-[#8B5CF6]' }
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
      <div className="flex flex-col items-center justify-center h-64 space-y-4 text-left">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#C8FF00]"></div>
        <p className="text-[#888888] font-mono text-xs">Loading templates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 text-left">
      <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} />

      {view === 'list' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#EEEEEE]">Email Templates</h1>
              <p className="text-[#888888] text-xs mt-1.5">Customize how Paydrip communicates with your clients</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setView('generator')}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#111111] border border-[#222222] rounded-lg text-xs font-semibold text-[#EEEEEE] hover:text-[#C8FF00] hover:border-[#C8FF00]/40 transition-all shadow-sm"
              >
                <Sparkles size={14} className="text-[#C8FF00]" />
                Generate with AI
              </button>
              <button 
                onClick={() => openEditor()}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#C8FF00] text-[#080808] rounded-lg text-xs font-bold hover:bg-[#b8ef00] transition-all shadow-md"
              >
                <Plus size={16} />
                Create Template
              </button>
            </div>
          </div>

          <div className="space-y-8">
            {[
              { title: 'Invoice Delivery', types: ['invoice_created'] },
              { title: 'Reminders', types: ['reminder_polite', 'reminder_firm', 'reminder_final'] },
              { title: 'Confirmations', types: ['invoice_paid'] },
              { title: 'Custom', types: ['custom'] }
            ].map(group => {
              const groupTemplates = templates.filter(t => group.types.includes(t.template_type));
              if (groupTemplates.length === 0) return null;

              return (
                <div key={group.title} className="space-y-4">
                  <h2 className="text-[10px] font-bold text-[#888888] uppercase tracking-[0.2em] border-b border-[#222222] pb-1.5 font-mono">{group.title}</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {groupTemplates.map(template => (
                      <motion.div 
                        key={template.id}
                        layout
                        className="bg-[#111111] border border-[#222222] rounded-xl p-5 shadow-sm hover:border-[#C8FF00]/20 transition-all group relative overflow-hidden"
                      >
                        <div className="flex items-start justify-between mb-3 relative z-10">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-[#EEEEEE] text-sm tracking-tight">{template.name}</h3>
                              {template.is_default && (
                                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-[#C8FF00]/10 text-[#C8FF00] rounded-md text-[8px] font-bold uppercase tracking-wider border border-[#C8FF00]/20 font-mono">
                                  <Star size={8} className="fill-[#C8FF00]" /> Default
                                </span>
                              )}
                              {template.ai_generated && (
                                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-[#8B5CF610] text-[#A78BFA] rounded-md text-[8px] font-bold uppercase tracking-wider border border-[#8B5CF620] font-mono">
                                  <Sparkles size={8} className="fill-[#A78BFA]" /> AI
                                </span>
                              )}
                            </div>
                            <div className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider border", TEMPLATE_TYPE_CONFIG[template.template_type].color)}>
                              {TEMPLATE_TYPE_CONFIG[template.template_type].label}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => { setSelectedTemplate(template); setShowPreview(true); }}
                              className="p-1.5 text-[#888888] hover:text-[#C8FF00] hover:bg-[#161616] rounded-md transition-all"
                              title="Preview"
                            >
                              <Eye size={16} />
                            </button>
                            <button 
                              onClick={() => openEditor(template)}
                              className="p-1.5 text-[#888888] hover:text-[#C8FF00] hover:bg-[#161616] rounded-md transition-all"
                              title="Edit"
                            >
                              <Pencil size={16} />
                            </button>
                            {isAdmin && !template.is_default && template.organization_id && (
                              <button 
                                onClick={() => handleDelete(template.id)}
                                className="p-1.5 text-[#888888] hover:text-[#EF4444] hover:bg-[#161616] rounded-md transition-all"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-[#888888] text-xs mb-4 line-clamp-2 leading-relaxed">{template.description || "No description provided."}</p>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 border-t border-[#222222] relative z-10 gap-3">
                          <div className="flex items-center gap-4">
                            <div className="space-y-0.5">
                              <p className="text-[8px] font-semibold text-[#888888] uppercase tracking-wider font-mono">Times Used</p>
                              <p className="font-mono text-[11px] font-bold text-[#EEEEEE]">{template.performance_data.times_used}</p>
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-[8px] font-semibold text-[#888888] uppercase tracking-wider font-mono">Response Rate</p>
                              <p className="font-mono text-[11px] font-bold text-[#EEEEEE]">{template.performance_data.response_rate}%</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {!template.is_default && template.organization_id && (
                              <button 
                                onClick={() => handleSetDefault(template)}
                                className="px-2.5 py-1.5 bg-[#161616] hover:bg-[#080808] text-[#EEEEEE] hover:text-[#C8FF00] rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border border-[#222222]"
                              >
                                Make Default
                              </button>
                            )}
                            <div className="text-[9px] text-[#444444] italic">
                              Updated {new Date(template.updated_at).toLocaleDateString()}
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <button 
              onClick={() => setView('list')}
              className="flex items-center gap-1.5 text-[#888888] hover:text-[#EEEEEE] font-mono text-[10px] uppercase tracking-wider transition-all self-start"
            >
              <ArrowLeft size={14} /> Back to List
            </button>
            <div className="flex items-center gap-2.5">
              <button 
                onClick={() => setView('list')}
                className="px-4 py-2 bg-[#111111] border border-[#222222] rounded-lg text-xs font-semibold text-[#EEEEEE] hover:bg-[#161616] transition-all"
              >
                Cancel
              </button>
              <button 
                disabled={isSaving}
                onClick={() => saveTemplate(false)}
                className="px-4 py-2 bg-[#111111] border border-[#222222] hover:border-[#C8FF00]/40 rounded-lg text-xs font-semibold text-[#EEEEEE] hover:text-[#C8FF00] transition-all shadow-sm"
              >
                Save Draft
              </button>
              <button 
                disabled={isSaving}
                onClick={() => saveTemplate(true)}
                className="px-5 py-2 bg-[#C8FF00] text-[#080808] rounded-lg text-xs font-bold hover:bg-[#b8ef00] transition-all"
              >
                {isSaving ? 'Saving...' : 'Save & Set Default'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-[calc(100vh-250px)]">
            {/* Editor Panel */}
            <div className="bg-[#111111] border border-[#222222] rounded-xl p-6 overflow-y-auto custom-scrollbar space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-semibold text-[#888888] uppercase tracking-wider font-mono">Template Name</label>
                  <input 
                    value={editorData.name}
                    onChange={e => setEditorData({ ...editorData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-[#080808] border border-[#222222] rounded-lg focus:border-[#C8FF00]/40 outline-none text-xs text-[#EEEEEE] font-semibold"
                    placeholder="e.g. Agency Polite Reminder"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-semibold text-[#888888] uppercase tracking-wider font-mono">Type</label>
                  <select 
                    value={editorData.template_type}
                    onChange={e => setEditorData({ ...editorData, template_type: e.target.value as TemplateType })}
                    className="w-full px-3 py-2 bg-[#080808] border border-[#222222] text-[#EEEEEE] rounded-lg focus:border-[#C8FF00]/40 outline-none text-xs font-bold appearance-none cursor-pointer"
                  >
                    {Object.entries(TEMPLATE_TYPE_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>{config.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-semibold text-[#888888] uppercase tracking-wider font-mono">Description</label>
                <input 
                  value={editorData.description || ''}
                  onChange={e => setEditorData({ ...editorData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[#080808] border border-[#222222] rounded-lg focus:border-[#C8FF00]/40 outline-none text-xs text-[#888888]"
                  placeholder="A brief description of when to use this template"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-semibold text-[#888888] uppercase tracking-wider font-mono">Email Subject</label>
                  <div className="flex gap-1 overflow-x-auto pb-1 max-w-[60%]">
                    {['client_name', 'invoice_number', 'business_name'].map(v => (
                      <button 
                        key={v}
                        onClick={() => setEditorData({ ...editorData, subject: (editorData.subject || '') + ` {{${v}}}` })}
                        className="px-1.5 py-0.5 bg-[#080808] border border-[#222222] hover:border-[#444444] text-[8px] font-mono uppercase text-[#888888] rounded-md transition-all shrink-0"
                        type="button"
                      >
                        +{v}
                      </button>
                    ))}
                  </div>
                </div>
                <input 
                  value={editorData.subject}
                  onChange={e => setEditorData({ ...editorData, subject: e.target.value })}
                  className="w-full px-3 py-2 bg-[#080808] border border-[#222222] rounded-lg focus:border-[#C8FF00]/40 outline-none text-xs text-[#EEEEEE] font-bold"
                  placeholder="e.g. Reminder: Invoice #{{invoice_number}} is due"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-semibold text-[#888888] uppercase tracking-wider font-mono">Body (HTML Content)</label>
                  <div className="flex gap-1 overflow-x-auto pb-1 max-w-[70%]">
                    {['client_name', 'invoice_number', 'amount', 'due_date', 'payment_link', 'business_name'].map(v => (
                      <button 
                        key={v}
                        onClick={() => setEditorData({ ...editorData, body_html: (editorData.body_html || '') + ` {{${v}}}` })}
                        className="px-1.5 py-0.5 bg-[#080808] border border-[#222222] hover:border-[#444444] text-[8px] font-mono uppercase text-[#888888] rounded-md transition-all shrink-0"
                        type="button"
                      >
                        +{v}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea 
                  value={editorData.body_html}
                  onChange={e => setEditorData({ ...editorData, body_html: e.target.value })}
                  className="w-full h-80 p-4 bg-[#080808] border border-[#222222] rounded-lg focus:border-[#C8FF00]/40 outline-none text-[#EEEEEE] font-mono text-xs leading-relaxed"
                  placeholder="<div>Hello {{client_name}}...</div>"
                />
              </div>
            </div>

            {/* Live Preview Panel */}
            <div className="flex flex-col bg-[#111111] border border-[#222222] rounded-xl overflow-hidden shadow-inner">
              <div className="p-4 border-b border-[#222222] bg-[#161616] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-semibold text-[#888888] uppercase tracking-wider font-mono">Live Preview</span>
                  <div className="flex bg-[#080808] p-0.5 rounded-lg border border-[#222222]">
                    <button 
                      onClick={() => setEditorViewMode('html')}
                      className={cn("px-2 py-1 rounded-md text-[9px] font-bold uppercase transition-all", editorViewMode === 'html' ? "bg-[#161616] text-[#C8FF00]" : "text-[#888888]")}
                    >
                      HTML
                    </button>
                    <button 
                      onClick={() => setEditorViewMode('text')}
                      className={cn("px-2 py-1 rounded-md text-[9px] font-bold uppercase transition-all", editorViewMode === 'text' ? "bg-[#161616] text-[#C8FF00]" : "text-[#888888]")}
                    >
                      Plain Text
                    </button>
                  </div>
                </div>
                <div className="flex bg-[#080808] p-0.5 rounded-lg border border-[#222222]">
                  <button 
                    onClick={() => setEditorPreviewMode('desktop')}
                    className={cn("p-1 rounded-md transition-all", editorPreviewMode === 'desktop' ? "bg-[#161616] text-[#C8FF00]" : "text-[#444444]")}
                  >
                    <Monitor size={12} />
                  </button>
                  <button 
                    onClick={() => setEditorPreviewMode('mobile')}
                    className={cn("p-1 rounded-md transition-all", editorPreviewMode === 'mobile' ? "bg-[#161616] text-[#C8FF00]" : "text-[#444444]")}
                  >
                    <Smartphone size={12} />
                  </button>
                </div>
              </div>

              <div className="flex-1 flex justify-center items-center overflow-auto p-4 bg-[#080808]">
                <div className={cn(
                  "bg-[#111111] border border-[#222222] shadow-xl rounded-xl overflow-hidden transition-all duration-500 flex flex-col h-full max-h-[500px]",
                  editorPreviewMode === 'mobile' ? "w-[300px]" : "w-full max-w-[500px]"
                )}>
                  <div className="p-3 bg-[#161616] border-b border-[#222222] space-y-1">
                    <p className="text-[8px] font-semibold text-[#888888] uppercase tracking-wider font-mono">Subject</p>
                    <p className="text-xs font-bold text-[#EEEEEE]">{editorData.subject ? renderPreview(editorData.subject) : '(No subject)'}</p>
                  </div>
                  <div className="flex-1 overflow-auto p-6 bg-white text-slate-800">
                    {editorViewMode === 'html' ? (
                      <div 
                        className="preview-container text-xs" 
                        dangerouslySetInnerHTML={{ __html: editorData.body_html ? renderPreview(editorData.body_html) : '<p class="text-slate-400 italic">No content yet...</p>' }} 
                      />
                    ) : (
                      <pre className="text-[10px] font-mono whitespace-pre-wrap text-[#444444]">
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
            className="absolute inset-0 bg-[#080808]/80 backdrop-blur-sm" 
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-full max-w-md bg-[#111111] border-l border-[#222222] h-screen shadow-2xl flex flex-col"
          >
            <div className="p-6 border-b border-[#222222] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#161616] border border-[#222222] rounded-xl flex items-center justify-center text-[#C8FF00]">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#EEEEEE]">AI Template Studio</h2>
                  <p className="text-[8px] font-semibold uppercase tracking-wider text-[#888888] font-mono mt-0.5">Gemini Engine Platform</p>
                </div>
              </div>
              <button 
                onClick={() => setView('list')}
                className="p-2 hover:bg-[#161616] rounded-lg text-[#888888] transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-left">
              {!genResult ? (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-semibold text-[#888888] uppercase tracking-wider font-mono">Recovery Type</label>
                      <select 
                        value={genConfig.template_type}
                        onChange={e => setGenConfig({ ...genConfig, template_type: e.target.value })}
                        className="w-full px-3 py-2 bg-[#080808] border border-[#222222] text-[#EEEEEE] rounded-lg focus:border-[#C8FF00]/40 outline-none text-xs font-bold"
                      >
                        <option value="reminder_polite">Polite Reminder</option>
                        <option value="reminder_firm">Firm Reminder</option>
                        <option value="reminder_final">Final Notice</option>
                        <option value="custom">Custom Email</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-semibold text-[#888888] uppercase tracking-wider font-mono">Tone of Voice</label>
                        <select 
                          value={genConfig.tone}
                          onChange={e => setGenConfig({ ...genConfig, tone: e.target.value })}
                          className="w-full px-3 py-2 bg-[#080808] border border-[#222222] text-[#EEEEEE] rounded-lg focus:border-[#C8FF00]/40 outline-none text-xs font-bold"
                        >
                          <option>Professional</option>
                          <option>Friendly</option>
                          <option>Firm</option>
                          <option>Urgent</option>
                          <option>Empathetic</option>
                        </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-semibold text-[#888888] uppercase tracking-wider font-mono">Industry Context</label>
                        <select 
                          value={genConfig.industry}
                          onChange={e => setGenConfig({ ...genConfig, industry: e.target.value })}
                          className="w-full px-3 py-2 bg-[#080808] border border-[#222222] text-[#EEEEEE] rounded-lg focus:border-[#C8FF00]/40 outline-none text-xs font-bold"
                        >
                          <option>Freelancer</option>
                          <option>Creative Agency</option>
                          <option>Software Developer</option>
                          <option>Consultant</option>
                          <option>Lawyer</option>
                          <option>Writer</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-semibold text-[#888888] uppercase tracking-wider font-mono">Language</label>
                        <select 
                          value={genConfig.language}
                          onChange={e => setGenConfig({ ...genConfig, language: e.target.value })}
                          className="w-full px-3 py-2 bg-[#080808] border border-[#222222] text-[#EEEEEE] rounded-lg focus:border-[#C8FF00]/40 outline-none text-xs font-bold"
                        >
                          <option>English</option>
                          <option>Hindi</option>
                          <option>Hinglish</option>
                          <option>Spanish</option>
                          <option>German</option>
                        </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-semibold text-[#888888] uppercase tracking-wider font-mono">Directives (Optional)</label>
                    <textarea 
                      value={genConfig.instructions}
                      onChange={e => setGenConfig({ ...genConfig, instructions: e.target.value })}
                      placeholder="e.g. Mention that this is the second time I'm reaching out. Keep it clean and elegant."
                      rows={3}
                      className="w-full px-3 py-2 bg-[#080808] border border-[#222222] text-[#EEEEEE] rounded-lg focus:border-[#C8FF00]/40 outline-none text-xs leading-relaxed"
                    />
                  </div>

                  <div className="p-5 bg-[#161616] border border-[#222222] rounded-xl text-left">
                     <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                           <div className="w-1.5 h-1.5 bg-[#C8FF00] rounded-full animate-pulse" />
                           <span className="text-[9px] font-semibold uppercase tracking-wider text-[#888888]" font-mono="true">Quota metrics</span>
                        </div>
                        <span className="text-[10px] font-mono text-[#EEEEEE] font-semibold">
                          {limits.ai_generations.current} / {limits.ai_generations.limit === -1 ? '∞' : limits.ai_generations.limit} limits
                        </span>
                     </div>
                     <div className="h-1.5 bg-[#080808] rounded-full overflow-hidden border border-[#222222] mb-4">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${limits.ai_generations.percentage}%` }}
                          className="h-full bg-[#C8FF00]"
                        />
                     </div>
                     <button 
                       disabled={isGenerating}
                       onClick={generateWithAi}
                       className="w-full py-2.5 bg-[#C8FF00] text-[#080808] hover:bg-[#b8ef00] rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                     >
                       {isGenerating ? (
                         <>
                           <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-[#080808]/30 border-t-[#080808]"></div>
                           Synthesizing...
                         </>
                       ) : (
                         <>
                           <Sparkles size={14} />
                           Generate Recovery Draft
                         </>
                       )}
                     </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="bg-[#161616] border border-[#222222] rounded-xl p-4 space-y-3">
                    <div>
                      <p className="text-[8px] font-semibold text-[#888888] uppercase tracking-wider font-mono">Subject Line</p>
                      <p className="text-xs font-bold text-[#EEEEEE]">{renderPreview(genResult.subject)}</p>
                    </div>
                    <div className="h-px bg-[#222222]" />
                    <div>
                       <p className="text-[8px] font-semibold text-[#888888] uppercase tracking-wider font-mono mb-1.5">HTML Layout Preview</p>
                       <div 
                         className="p-4 bg-white text-slate-800 rounded-lg text-[10px] leading-relaxed max-h-60 overflow-auto" 
                         dangerouslySetInnerHTML={{ __html: renderPreview(genResult.body_html) }} 
                       />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => setGenResult(null)}
                      className="flex-1 py-2.5 bg-[#111111] border border-[#222222] hover:bg-[#161616] rounded-lg text-xs font-semibold text-[#EEEEEE] transition-all font-mono"
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
                      className="flex-1 py-2.5 bg-[#C8FF00] text-[#080808] hover:bg-[#b8ef00] rounded-lg text-xs font-bold transition-all"
                    >
                      Open Editor
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-[#222222] bg-[#161616] flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[#888888] text-[10px]">
                <Info size={12} />
                Gemini secure context active
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && selectedTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-left">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowPreview(false)}
              className="absolute inset-0 bg-[#080808]/85 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl bg-[#111111] border border-[#222222] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-5 border-b border-[#222222] flex items-center justify-between shrink-0 bg-[#161616]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#080808] border border-[#222222] rounded-lg flex items-center justify-center text-[#888888]">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h3 className="text-md font-bold text-[#EEEEEE]">{selectedTemplate.name}</h3>
                    <p className="text-[8px] font-semibold uppercase tracking-wider text-[#888888] font-mono mt-0.5">{TEMPLATE_TYPE_CONFIG[selectedTemplate.template_type].label}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowPreview(false)}
                  className="p-1.5 hover:bg-[#222222] rounded-lg text-[#888888] transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-[#080808]">
                <div className="bg-[#111111] rounded-xl border border-[#222222] overflow-hidden">
                   <div className="p-4 border-b border-[#222222] bg-[#161616]">
                      <p className="text-[8px] font-semibold text-[#888888] uppercase tracking-wider font-mono mb-1">Subject line</p>
                      <p className="text-xs font-bold text-[#EEEEEE]">{renderPreview(selectedTemplate.subject)}</p>
                   </div>
                   <div className="p-6 bg-white text-slate-800 text-xs min-h-[220px]">
                      <div dangerouslySetInnerHTML={{ __html: renderPreview(selectedTemplate.body_html) }} />
                   </div>
                </div>

                {selectedTemplate.description && (
                  <div className="mt-4 flex gap-2.5 p-4 bg-[#161616] rounded-xl border border-[#222222]">
                    <Info size={14} className="text-[#C8FF00] shrink-0 mt-0.5" />
                    <p className="text-[10px] text-[#888888] leading-relaxed italic">{selectedTemplate.description}</p>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-[#222222] bg-[#161616] flex flex-col sm:flex-row items-center justify-end gap-2.5 shrink-0">
                <button 
                  onClick={() => setShowPreview(false)}
                  className="w-full sm:w-auto px-4 py-2 bg-[#111111] border border-[#222222] text-[#EEEEEE] hover:bg-[#222222] rounded-lg text-xs font-semibold"
                >
                  Close Preview
                </button>
                <button 
                  onClick={() => { setShowPreview(false); openEditor(selectedTemplate); }}
                  className="w-full sm:w-auto px-5 py-2 bg-[#C8FF00] text-[#080808] hover:bg-[#b8ef00] rounded-lg text-xs font-bold"
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
