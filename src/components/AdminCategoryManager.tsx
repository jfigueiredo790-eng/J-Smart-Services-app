import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ServiceCategory } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { 
  Plus, 
  Search, 
  Layers, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck, 
  Tag, 
  FolderPlus,
  Briefcase,
  Users,
  FileText,
  Radio,
  Image as ImageIcon
} from 'lucide-react';

const AVAILABLE_ICONS = [
  { name: 'Zap', label: 'Eletricidade' },
  { name: 'Droplet', label: 'Água / Canalização' },
  { name: 'Paintbrush', label: 'Pintura' },
  { name: 'Wrench', label: 'Manutenção / Reparação' },
  { name: 'Snowflake', label: 'Frio / AC / Arcas' },
  { name: 'Flame', label: 'Gás / Fogões' },
  { name: 'Tv', label: 'TV / Eletrónica' },
  { name: 'Sofa', label: 'Estofador / Móveis' },
  { name: 'Monitor', label: 'Informática / TI' },
  { name: 'HardHat', label: 'Construção / Obras' },
  { name: 'Car', label: 'Mecânica Automóvel' },
  { name: 'Truck', label: 'Transporte / Fretes' },
  { name: 'Scissors', label: 'Beleza / Cabelo' },
  { name: 'Utensils', label: 'Cozinha / Eventos' },
  { name: 'Music', label: 'Música / DJ' },
  { name: 'Camera', label: 'Fotografia / Vídeo' },
  { name: 'Lightbulb', label: 'Design / Criativo' },
  { name: 'Home', label: 'Limpeza / Lar' },
  { name: 'Shield', label: 'Segurança / CFTV' },
  { name: 'Layers', label: 'Estuque / Pladur' },
  { name: 'Package', label: 'Logística / Entregas' },
  { name: 'Gem', label: 'Joalharia / Estética' },
  { name: 'Briefcase', label: 'Geral / Outros' }
];

const COLOR_PALETTES = [
  { id: 'emerald', label: 'Esmeralda', bg: 'bg-emerald-500', text: 'text-emerald-700', border: 'border-emerald-500' },
  { id: 'teal', label: 'Teal', bg: 'bg-teal-500', text: 'text-teal-700', border: 'border-teal-500' },
  { id: 'blue', label: 'Azul', bg: 'bg-blue-500', text: 'text-blue-700', border: 'border-blue-500' },
  { id: 'indigo', label: 'Índigo', bg: 'bg-indigo-500', text: 'text-indigo-700', border: 'border-indigo-500' },
  { id: 'purple', label: 'Roxo', bg: 'bg-purple-500', text: 'text-purple-700', border: 'border-purple-500' },
  { id: 'rose', label: 'Rosa / Vermelho', bg: 'bg-rose-500', text: 'text-rose-700', border: 'border-rose-500' },
  { id: 'amber', label: 'Âmbar', bg: 'bg-amber-500', text: 'text-amber-700', border: 'border-amber-500' },
  { id: 'orange', label: 'Laranja', bg: 'bg-orange-500', text: 'text-orange-700', border: 'border-orange-500' }
];

const DEFAULT_GROUPS = [
  'Casa & Manutenção',
  'Construção & Obras',
  'Tecnologia & Informática',
  'Eventos, Beleza & Estética',
  'Automóvel & Transporte',
  'Serviços Domésticos & Limpeza',
  'Aulas, Consultoria & Outros'
];

export const AdminCategoryManager: React.FC = () => {
  const { 
    currentUser,
    categories, 
    addCategory, 
    updateCategory, 
    deleteCategory, 
    toggleCategoryStatus,
    addSubcategory, 
    updateSubcategory, 
    deleteSubcategory,
    checkCategoryUsage
  } = useApp();

  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('Todas');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [expandedCatIds, setExpandedCatIds] = useState<Set<string>>(() => new Set());

  // Toast Feedback State
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string, duration = 4000) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(prev => (prev?.message === message ? null : prev));
    }, duration);
  };

  // Add / Edit Category Modal State
  const [categoryModal, setCategoryModal] = useState<{
    isOpen: boolean;
    mode: 'add' | 'edit';
    categoryId?: string;
    name: string;
    description: string;
    iconName: string;
    color: string;
    group: string;
    customGroup: string;
    imageUrl: string;
    isActive: boolean;
    subcategories: string[];
    newSubInput: string;
    isSaving?: boolean;
  } | null>(null);

  // Quick Add Subcategory Modal / Inline State
  const [quickSubModal, setQuickSubModal] = useState<{
    isOpen: boolean;
    categoryId: string;
    categoryName: string;
    subcategoryName: string;
    isSaving?: boolean;
  } | null>(null);

  // Edit Subcategory Modal State
  const [editSubModal, setEditSubModal] = useState<{
    isOpen: boolean;
    categoryId: string;
    categoryName: string;
    oldName: string;
    newName: string;
    isSaving?: boolean;
  } | null>(null);

  // Delete Confirmation Modal State
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    targetType: 'category' | 'subcategory';
    categoryId: string;
    categoryName: string;
    subcategoryName?: string;
    usage?: { pros: number; requests: number; posts: number; total: number };
    isProcessing?: boolean;
  } | null>(null);

  // Toggle Category Accordion Expansion
  const toggleExpand = (catId: string) => {
    setExpandedCatIds(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  // Expand All / Collapse All
  const toggleExpandAll = () => {
    if (expandedCatIds.size >= categories.length) {
      setExpandedCatIds(new Set());
    } else {
      setExpandedCatIds(new Set(categories.map(c => c.id)));
    }
  };

  // Distinct groups available in categories
  const allGroups = useMemo(() => {
    const groups = new Set<string>(DEFAULT_GROUPS);
    categories.forEach(c => {
      if (c.group) groups.add(c.group);
    });
    return Array.from(groups);
  }, [categories]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter(cat => {
      const matchSearch = 
        cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.group?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cat.items && cat.items.some(item => item.toLowerCase().includes(searchTerm.toLowerCase())));

      const matchGroup = selectedGroupFilter === 'Todas' || cat.group === selectedGroupFilter;
      const matchStatus = 
        statusFilter === 'all' || 
        (statusFilter === 'active' && cat.isActive !== false) ||
        (statusFilter === 'inactive' && cat.isActive === false);

      return matchSearch && matchGroup && matchStatus;
    });
  }, [categories, searchTerm, selectedGroupFilter, statusFilter]);

  // Open Add Category Modal
  const handleOpenAddCategory = () => {
    setCategoryModal({
      isOpen: true,
      mode: 'add',
      name: '',
      description: '',
      iconName: 'Wrench',
      color: 'emerald',
      group: DEFAULT_GROUPS[0],
      customGroup: '',
      imageUrl: '',
      isActive: true,
      subcategories: [],
      newSubInput: ''
    });
  };

  // Open Edit Category Modal
  const handleOpenEditCategory = (cat: ServiceCategory) => {
    const items = cat.items || cat.subcategories || [];
    const isCustomGroup = cat.group && !DEFAULT_GROUPS.includes(cat.group);

    setCategoryModal({
      isOpen: true,
      mode: 'edit',
      categoryId: cat.id,
      name: cat.name,
      description: cat.description || '',
      iconName: cat.iconName || 'Briefcase',
      color: cat.color || 'emerald',
      group: isCustomGroup ? 'Outro' : (cat.group || DEFAULT_GROUPS[0]),
      customGroup: isCustomGroup ? (cat.group || '') : '',
      imageUrl: cat.imageUrl || '',
      isActive: cat.isActive !== false,
      subcategories: [...items],
      newSubInput: ''
    });
  };

  // Save Category Form (Add or Edit)
  const handleSaveCategoryModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryModal) return;

    if (!categoryModal.name.trim()) {
      showToast('error', 'Por favor insira o nome da categoria.');
      return;
    }

    const resolvedGroup = categoryModal.group === 'Outro' 
      ? (categoryModal.customGroup.trim() || 'Geral')
      : categoryModal.group;

    setCategoryModal(prev => prev ? { ...prev, isSaving: true } : null);

    try {
      if (categoryModal.mode === 'add') {
        const res = await addCategory({
          name: categoryModal.name.trim(),
          description: categoryModal.description.trim() || 'Serviço qualificado em Angola',
          iconName: categoryModal.iconName,
          color: categoryModal.color,
          group: resolvedGroup,
          items: categoryModal.subcategories,
          subcategories: categoryModal.subcategories,
          imageUrl: categoryModal.imageUrl.trim(),
          isActive: categoryModal.isActive,
          popularCount: 100
        });

        if (res.success) {
          showToast('success', res.message);
          setCategoryModal(null);
        } else {
          showToast('error', res.message);
          setCategoryModal(prev => prev ? { ...prev, isSaving: false } : null);
        }
      } else if (categoryModal.mode === 'edit' && categoryModal.categoryId) {
        const res = await updateCategory(categoryModal.categoryId, {
          name: categoryModal.name.trim(),
          description: categoryModal.description.trim(),
          iconName: categoryModal.iconName,
          color: categoryModal.color,
          group: resolvedGroup,
          items: categoryModal.subcategories,
          subcategories: categoryModal.subcategories,
          imageUrl: categoryModal.imageUrl.trim(),
          isActive: categoryModal.isActive
        });

        if (res.success) {
          showToast('success', res.message);
          setCategoryModal(null);
        } else {
          showToast('error', res.message);
          setCategoryModal(prev => prev ? { ...prev, isSaving: false } : null);
        }
      }
    } catch (err: any) {
      showToast('error', `Erro ao salvar: ${err.message || err}`);
      setCategoryModal(prev => prev ? { ...prev, isSaving: false } : null);
    }
  };

  // Add a subcategory tag inside the category modal
  const handleAddSubcategoryInModal = () => {
    if (!categoryModal || !categoryModal.newSubInput.trim()) return;
    const trimmed = categoryModal.newSubInput.trim();
    if (categoryModal.subcategories.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      showToast('info', 'Esta subcategoria já está na lista.');
      return;
    }
    setCategoryModal(prev => prev ? {
      ...prev,
      subcategories: [...prev.subcategories, trimmed],
      newSubInput: ''
    } : null);
  };

  // Remove a subcategory tag inside the category modal
  const handleRemoveSubcategoryInModal = (indexToRemove: number) => {
    if (!categoryModal) return;
    setCategoryModal(prev => prev ? {
      ...prev,
      subcategories: prev.subcategories.filter((_, idx) => idx !== indexToRemove)
    } : null);
  };

  // Quick Add Subcategory
  const handleQuickAddSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSubModal || !quickSubModal.subcategoryName.trim()) return;

    setQuickSubModal(prev => prev ? { ...prev, isSaving: true } : null);

    const res = await addSubcategory(quickSubModal.categoryId, quickSubModal.subcategoryName.trim());
    if (res.success) {
      showToast('success', res.message);
      // Auto expand to show the newly added subcategory
      setExpandedCatIds(prev => new Set(prev).add(quickSubModal.categoryId));
      setQuickSubModal(null);
    } else {
      showToast('error', res.message);
      setQuickSubModal(prev => prev ? { ...prev, isSaving: false } : null);
    }
  };

  // Save Edit Subcategory
  const handleSaveEditSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSubModal || !editSubModal.newName.trim()) return;

    setEditSubModal(prev => prev ? { ...prev, isSaving: true } : null);

    const res = await updateSubcategory(editSubModal.categoryId, editSubModal.oldName, editSubModal.newName.trim());
    if (res.success) {
      showToast('success', res.message);
      setEditSubModal(null);
    } else {
      showToast('error', res.message);
      setEditSubModal(prev => prev ? { ...prev, isSaving: false } : null);
    }
  };

  // Prompt delete category
  const handlePromptDeleteCategory = (cat: ServiceCategory) => {
    const usage = checkCategoryUsage(cat.id);
    setDeleteConfirmModal({
      isOpen: true,
      targetType: 'category',
      categoryId: cat.id,
      categoryName: cat.name,
      usage
    });
  };

  // Prompt delete subcategory
  const handlePromptDeleteSubcategory = (catId: string, catName: string, subName: string) => {
    setDeleteConfirmModal({
      isOpen: true,
      targetType: 'subcategory',
      categoryId: catId,
      categoryName: catName,
      subcategoryName: subName
    });
  };

  // Execute Delete
  const handleExecuteDelete = async (force = false) => {
    if (!deleteConfirmModal) return;

    setDeleteConfirmModal(prev => prev ? { ...prev, isProcessing: true } : null);

    try {
      if (deleteConfirmModal.targetType === 'category') {
        const res = await deleteCategory(deleteConfirmModal.categoryId, force);
        if (res.success) {
          showToast('success', res.message);
          setDeleteConfirmModal(null);
        } else if (res.inUse) {
          // Keep modal open to show in-use warning
          setDeleteConfirmModal(prev => prev ? { 
            ...prev, 
            isProcessing: false,
            usage: {
              pros: res.usageCount?.pros || 0,
              requests: res.usageCount?.requests || 0,
              posts: res.usageCount?.posts || 0,
              total: (res.usageCount?.pros || 0) + (res.usageCount?.requests || 0) + (res.usageCount?.posts || 0)
            }
          } : null);
        } else {
          showToast('error', res.message);
          setDeleteConfirmModal(null);
        }
      } else if (deleteConfirmModal.targetType === 'subcategory' && deleteConfirmModal.subcategoryName) {
        const res = await deleteSubcategory(deleteConfirmModal.categoryId, deleteConfirmModal.subcategoryName);
        if (res.success) {
          showToast('success', res.message);
          setDeleteConfirmModal(null);
        } else {
          showToast('error', res.message);
          setDeleteConfirmModal(null);
        }
      }
    } catch (err: any) {
      showToast('error', `Falha na exclusão: ${err.message || err}`);
      setDeleteConfirmModal(null);
    }
  };

  // Toggle Category Status (Ativar/Desativar)
  const handleToggleStatus = async (catId: string) => {
    const res = await toggleCategoryStatus(catId);
    if (res.success) {
      showToast('success', res.message);
    } else {
      showToast('error', res.message);
    }
  };

  const totalSubcategories = useMemo(() => {
    return categories.reduce((acc, cat) => acc + (cat.items?.length || cat.subcategories?.length || 0), 0);
  }, [categories]);

  const activeCategoriesCount = useMemo(() => {
    return categories.filter(c => c.isActive !== false).length;
  }, [categories]);

  return (
    <div className="space-y-6">
      
      {/* Toast Notification Banner */}
      {feedback && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between gap-3 shadow-md animate-fade-in ${
          feedback.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' :
          feedback.type === 'error' ? 'bg-rose-50 border-rose-300 text-rose-900' :
          'bg-blue-50 border-blue-300 text-blue-900'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> :
             feedback.type === 'error' ? <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" /> :
             <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
          <button 
            onClick={() => setFeedback(null)}
            className="p-1 hover:bg-slate-200/50 rounded-lg text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner with Statistics */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-400/30">
                <Layers className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-black text-white">Gestão de Categorias e Subcategorias</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Controlo exclusivo do Administrador para adicionar, editar, organizar e desativar serviços em Angola.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAddCategory}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Categoria</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800">
          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
            <p className="text-[10px] uppercase font-bold text-slate-400">Total Categorias</p>
            <p className="text-xl font-black text-white mt-0.5">{categories.length}</p>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
            <p className="text-[10px] uppercase font-bold text-emerald-400">Categorias Ativas</p>
            <p className="text-xl font-black text-emerald-400 mt-0.5">{activeCategoriesCount}</p>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
            <p className="text-[10px] uppercase font-bold text-amber-400">Subcategorias Totais</p>
            <p className="text-xl font-black text-amber-400 mt-0.5">{totalSubcategories}</p>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
            <p className="text-[10px] uppercase font-bold text-teal-400">Especialidades</p>
            <p className="text-xl font-black text-teal-400 mt-0.5">{allGroups.length}</p>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por categoria, subcategoria ou especialidade..."
              className="w-full text-xs font-bold pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Group Filter */}
          <div>
            <select
              value={selectedGroupFilter}
              onChange={(e) => setSelectedGroupFilter(e.target.value)}
              className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="Todas">Todas as Especialidades ({categories.length})</option>
              {allGroups.map(grp => (
                <option key={grp} value={grp}>{grp}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setStatusFilter('all')}
              className={`flex-1 text-[11px] font-extrabold py-1.5 rounded-lg transition-all ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`flex-1 text-[11px] font-extrabold py-1.5 rounded-lg transition-all ${
                statusFilter === 'active' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ativas
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`flex-1 text-[11px] font-extrabold py-1.5 rounded-lg transition-all ${
                statusFilter === 'inactive' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Inativas
            </button>
          </div>
        </div>

        {/* View Controls & Results Summary */}
        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-500">
          <span>
            A mostrar <strong>{filteredCategories.length}</strong> de <strong>{categories.length}</strong> categorias
          </span>

          <button
            onClick={toggleExpandAll}
            className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
          >
            <span>{expandedCatIds.size >= categories.length ? 'Recolher Todas' : 'Expandir Todas'}</span>
            {expandedCatIds.size >= categories.length ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Categories List */}
      {filteredCategories.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-slate-900 text-sm">Nenhuma categoria encontrada</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Não encontramos nenhuma categoria correspondente aos filtros de pesquisa selecionados.
          </p>
          <button
            onClick={() => { setSearchTerm(''); setSelectedGroupFilter('Todas'); setStatusFilter('all'); }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
          >
            Limpar Filtros
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredCategories.map((cat, idx) => {
            const isExpanded = expandedCatIds.has(cat.id);
            const items = cat.items || cat.subcategories || [];
            const isInactive = cat.isActive === false;
            const usage = checkCategoryUsage(cat.id);

            return (
              <div 
                key={cat.id}
                className={`bg-white rounded-3xl border transition-all duration-200 shadow-sm overflow-hidden ${
                  isInactive 
                    ? 'border-slate-300 opacity-80 bg-slate-50/50' 
                    : 'border-slate-200 hover:border-emerald-300'
                }`}
              >
                {/* Category Main Row */}
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  {/* Left: Icon, Name, Group, Status & Description */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className={`p-3 rounded-2xl shrink-0 transition-colors shadow-2xs ${
                      isInactive 
                        ? 'bg-slate-200 text-slate-500' 
                        : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    }`}>
                      <CategoryIcon name={cat.iconName} className="w-6 h-6" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={`font-black text-sm sm:text-base ${isInactive ? 'text-slate-600 line-through' : 'text-slate-900'}`}>
                          {cat.name}
                        </h3>

                        {/* Status Badge */}
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                          isInactive 
                            ? 'bg-slate-100 text-slate-600 border-slate-300' 
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}>
                          {isInactive ? 'Desativada' : 'Ativa'}
                        </span>

                        {/* Group Badge */}
                        {cat.group && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                            {cat.group}
                          </span>
                        )}

                        {/* Subcategories count badge */}
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200/70 flex items-center gap-1">
                          <Layers className="w-2.5 h-2.5" />
                          {items.length} Subcategorias
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                        {cat.description || 'Sem descrição cadastrada.'}
                      </p>

                      {/* Usage details */}
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-400" />
                          <strong>{usage.pros}</strong> profissionais
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3 text-slate-400" />
                          <strong>{usage.requests}</strong> pedidos
                        </span>
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                          ID: <code className="font-mono">{cat.id}</code>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    
                    {/* Add Subcategory Button */}
                    <button
                      onClick={() => setQuickSubModal({
                        isOpen: true,
                        categoryId: cat.id,
                        categoryName: cat.name,
                        subcategoryName: ''
                      })}
                      className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-xl border border-emerald-200 transition-colors flex items-center gap-1.5"
                      title="Adicionar Subcategoria"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-600" />
                      <span>+ Subcategoria</span>
                    </button>

                    {/* Edit Category Button */}
                    <button
                      onClick={() => handleOpenEditCategory(cat)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                      title="Editar Categoria"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {/* Toggle Status (Ativar/Desativar) */}
                    <button
                      onClick={() => handleToggleStatus(cat.id)}
                      className={`p-2 rounded-xl transition-colors border ${
                        isInactive 
                          ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200' 
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      }`}
                      title={isInactive ? 'Ativar Categoria' : 'Desativar Categoria'}
                    >
                      {isInactive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>

                    {/* Delete Category */}
                    <button
                      onClick={() => handlePromptDeleteCategory(cat)}
                      className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl border border-rose-200 transition-colors"
                      title="Excluir Categoria"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Expand/Collapse Accordion */}
                    <button
                      onClick={() => toggleExpand(cat.id)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors ml-1"
                      title={isExpanded ? 'Recolher subcategorias' : 'Ver subcategorias'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Subcategories Accordion Panel */}
                {isExpanded && (
                  <div className="bg-slate-50/80 p-4 sm:p-5 border-t border-slate-200/80 space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Subcategorias de {cat.name} ({items.length})</span>
                      </h4>

                      <button
                        onClick={() => setQuickSubModal({
                          isOpen: true,
                          categoryId: cat.id,
                          categoryName: cat.name,
                          subcategoryName: ''
                        })}
                        className="text-[11px] font-extrabold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Adicionar Nova Subcategoria</span>
                      </button>
                    </div>

                    {items.length === 0 ? (
                      <div className="bg-white p-4 rounded-2xl border border-dashed border-slate-300 text-center text-xs text-slate-500 space-y-2">
                        <p>Nenhuma subcategoria adicionada ainda a esta categoria.</p>
                        <button
                          onClick={() => setQuickSubModal({
                            isOpen: true,
                            categoryId: cat.id,
                            categoryName: cat.name,
                            subcategoryName: ''
                          })}
                          className="px-3 py-1.5 bg-emerald-600 text-white font-bold rounded-xl text-xs"
                        >
                          Adicionar a Primeira Subcategoria
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {items.map((sub, sIdx) => (
                          <div
                            key={sIdx}
                            className="bg-white p-3 rounded-2xl border border-slate-200 hover:border-emerald-300 transition-all shadow-2xs flex items-center justify-between gap-2 group"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="w-5 h-5 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-black shrink-0">
                                {sIdx + 1}
                              </span>
                              <span className="font-bold text-xs text-slate-800 truncate" title={sub}>
                                {sub}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => setEditSubModal({
                                  isOpen: true,
                                  categoryId: cat.id,
                                  categoryName: cat.name,
                                  oldName: sub,
                                  newName: sub
                                })}
                                className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                                title="Editar nome da subcategoria"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handlePromptDeleteSubcategory(cat.id, cat.name, sub)}
                                className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                                title="Remover subcategoria"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT CATEGORY */}
      {/* ========================================================================= */}
      {categoryModal?.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-400/30">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">
                    {categoryModal.mode === 'add' ? 'Adicionar Nova Categoria' : `Editar Categoria: ${categoryModal.name}`}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Defina os dados oficiais da categoria e as suas subcategorias.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setCategoryModal(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSaveCategoryModal} className="p-5 space-y-4 overflow-y-auto flex-1">
              
              {/* Name & Group */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome da Categoria *
                  </label>
                  <input
                    type="text"
                    value={categoryModal.name}
                    onChange={(e) => setCategoryModal(prev => prev ? { ...prev, name: e.target.value } : null)}
                    placeholder="Ex: Eletricista, Climatização, Serralheiro"
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Especialidade / Grupo *
                  </label>
                  <select
                    value={categoryModal.group}
                    onChange={(e) => setCategoryModal(prev => prev ? { ...prev, group: e.target.value } : null)}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {DEFAULT_GROUPS.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                    <option value="Outro">Outro (Personalizado...)</option>
                  </select>
                </div>
              </div>

              {categoryModal.group === 'Outro' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome da Especialidade Personalizada
                  </label>
                  <input
                    type="text"
                    value={categoryModal.customGroup}
                    onChange={(e) => setCategoryModal(prev => prev ? { ...prev, customGroup: e.target.value } : null)}
                    placeholder="Ex: Energia Solar & Inversores"
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descrição dos Serviços
                </label>
                <textarea
                  value={categoryModal.description}
                  onChange={(e) => setCategoryModal(prev => prev ? { ...prev, description: e.target.value } : null)}
                  placeholder="Ex: Instalação de quadros elétricos, curto-circuitos, tomadas e iluminação residencial em Angola..."
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Visual Icon Picker */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Ícone Visual da Categoria ({categoryModal.iconName})
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-200">
                  {AVAILABLE_ICONS.map(ic => {
                    const isSelected = categoryModal.iconName === ic.name;
                    return (
                      <button
                        type="button"
                        key={ic.name}
                        onClick={() => setCategoryModal(prev => prev ? { ...prev, iconName: ic.name } : null)}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all text-center ${
                          isSelected 
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-500/20' 
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <CategoryIcon name={ic.name} className="w-5 h-5" />
                        <span className="text-[9px] font-bold truncate max-w-full">{ic.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Palette Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Cor do Tema
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PALETTES.map(pal => {
                    const isSelected = categoryModal.color === pal.id;
                    return (
                      <button
                        type="button"
                        key={pal.id}
                        onClick={() => setCategoryModal(prev => prev ? { ...prev, color: pal.id } : null)}
                        className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                          isSelected ? 'bg-slate-900 text-white border-slate-900 shadow-xs' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span className={`w-3 h-3 rounded-full ${pal.bg}`}></span>
                        <span>{pal.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subcategories Tag Builder */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-800">
                    Subcategorias Associadas ({categoryModal.subcategories.length})
                  </label>
                  <span className="text-[11px] text-slate-500">Ex: Reparação, Montagem, Vistoria</span>
                </div>

                {/* Subcategory Input Field */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={categoryModal.newSubInput}
                    onChange={(e) => setCategoryModal(prev => prev ? { ...prev, newSubInput: e.target.value } : null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubcategoryInModal();
                      }
                    }}
                    placeholder="Escreva uma subcategoria e pressione Adicionar..."
                    className="flex-1 text-xs font-bold p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubcategoryInModal}
                    className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl transition-all shrink-0 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </button>
                </div>

                {/* Current Subcategories List */}
                {categoryModal.subcategories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 rounded-2xl border border-slate-200 max-h-36 overflow-y-auto">
                    {categoryModal.subcategories.map((sub, idx) => (
                      <span
                        key={idx}
                        className="bg-white border border-slate-200 text-slate-800 font-bold text-xs px-2.5 py-1 rounded-xl shadow-2xs flex items-center gap-1.5"
                      >
                        <span>{sub}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubcategoryInModal(idx)}
                          className="text-slate-400 hover:text-rose-600 rounded-full"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Status Toggle */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">Estado da Categoria</p>
                  <p className="text-[11px] text-slate-500">Categorias ativas aparecem na pesquisa e para os clientes.</p>
                </div>

                <button
                  type="button"
                  onClick={() => setCategoryModal(prev => prev ? { ...prev, isActive: !prev.isActive } : null)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 ${
                    categoryModal.isActive 
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {categoryModal.isActive ? <Check className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{categoryModal.isActive ? 'Ativa na Plataforma' : 'Desativada (Oculta)'}</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCategoryModal(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={categoryModal.isSaving}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {categoryModal.isSaving ? (
                    <span>A guardar na base de dados...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{categoryModal.mode === 'add' ? 'Salvar Categoria' : 'Atualizar Categoria'}</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: QUICK ADD SUBCATEGORY */}
      {/* ========================================================================= */}
      {quickSubModal?.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <h3 className="font-extrabold text-sm text-white">Nova Subcategoria em {quickSubModal.categoryName}</h3>
              </div>
              <button 
                onClick={() => setQuickSubModal(null)}
                className="p-1 text-slate-400 hover:text-white rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAddSubcategory} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome da Subcategoria *</label>
                <input
                  type="text"
                  value={quickSubModal.subcategoryName}
                  onChange={(e) => setQuickSubModal(prev => prev ? { ...prev, subcategoryName: e.target.value } : null)}
                  placeholder="Ex: Reparação de Arcas, Montagem de Disjuntores"
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuickSubModal(null)}
                  className="px-3.5 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={quickSubModal.isSaving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{quickSubModal.isSaving ? 'A adicionar...' : 'Adicionar Subcategoria'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT SUBCATEGORY */}
      {/* ========================================================================= */}
      {editSubModal?.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-400" />
                <h3 className="font-extrabold text-sm text-white">Editar Subcategoria</h3>
              </div>
              <button 
                onClick={() => setEditSubModal(null)}
                className="p-1 text-slate-400 hover:text-white rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSubcategory} className="p-5 space-y-4">
              <div>
                <p className="text-[11px] text-slate-500 mb-2">
                  Categoria: <strong>{editSubModal.categoryName}</strong>
                </p>
                <label className="block text-xs font-bold text-slate-700 mb-1">Novo Nome da Subcategoria *</label>
                <input
                  type="text"
                  value={editSubModal.newName}
                  onChange={(e) => setEditSubModal(prev => prev ? { ...prev, newName: e.target.value } : null)}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditSubModal(null)}
                  className="px-3.5 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editSubModal.isSaving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editSubModal.isSaving ? 'A salvar...' : 'Salvar Alteração'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: SMART DELETE CONFIRMATION WITH USAGE AUDIT */}
      {/* ========================================================================= */}
      {deleteConfirmModal?.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-rose-50 border-b border-rose-100 flex items-center gap-3 text-rose-900">
              <div className="p-2.5 bg-rose-100 text-rose-600 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-rose-950">
                  {deleteConfirmModal.targetType === 'category' ? 'Excluir Categoria' : 'Remover Subcategoria'}
                </h3>
                <p className="text-[11px] text-rose-700">
                  Ação exclusiva do Administrador
                </p>
              </div>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-600">
              {deleteConfirmModal.targetType === 'category' ? (
                <>
                  <p>
                    Tem a certeza que deseja excluir a categoria <strong>"{deleteConfirmModal.categoryName}"</strong>?
                  </p>

                  {deleteConfirmModal.usage && deleteConfirmModal.usage.total > 0 ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 space-y-2 text-amber-900">
                      <p className="font-extrabold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Atenção: Esta categoria está em uso ativo!</span>
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-[11px] pl-1">
                        <li><strong>{deleteConfirmModal.usage.pros}</strong> profissional(is) registados</li>
                        <li><strong>{deleteConfirmModal.usage.requests}</strong> pedido(s) de serviço</li>
                        <li><strong>{deleteConfirmModal.usage.posts}</strong> publicação(ões) no feed</li>
                      </ul>
                      <p className="text-[11px] text-amber-800 italic pt-1">
                        Recomendamos que <strong>desative</strong> a categoria em vez de a apagar, para preservar os dados históricos de forma íntegra.
                      </p>
                    </div>
                  ) : (
                    <p className="text-slate-500">
                      Esta categoria não possui profissionais nem pedidos vinculados. A exclusão é segura.
                    </p>
                  )}
                </>
              ) : (
                <p>
                  Tem a certeza que deseja remover a subcategoria <strong>"{deleteConfirmModal.subcategoryName}"</strong> da categoria <strong>"{deleteConfirmModal.categoryName}"</strong>?
                </p>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmModal(null)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancelar
                </button>

                {deleteConfirmModal.targetType === 'category' && deleteConfirmModal.usage && deleteConfirmModal.usage.total > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      await handleToggleStatus(deleteConfirmModal.categoryId);
                      setDeleteConfirmModal(null);
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl"
                  >
                    Apenas Desativar Categoria
                  </button>
                )}

                <button
                  type="button"
                  disabled={deleteConfirmModal.isProcessing}
                  onClick={() => handleExecuteDelete(true)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{deleteConfirmModal.isProcessing ? 'A excluir...' : 'Confirmar Exclusão'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
