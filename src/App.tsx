import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Search, Calendar as CalendarIcon, CheckCircle2, Clock, AlertCircle, Trash2, LayoutDashboard, Send, Check, X, MessageSquare, LogIn, LogOut, Paperclip, XCircle, FileIcon, Bell, Link as LinkIcon, ListChecks, UserCircle2, Sun, Moon, Menu, ChevronsUpDown } from 'lucide-react';
import { format, isAfter, isBefore, isWithinInterval, startOfDay, parseISO, isValid } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';

import { auth, db, storage } from './firebase';
import { 
  onAuthStateChanged, 
  User,
  signInAnonymously
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  getDocs,
  setDoc,
  getDocFromServer,
  collectionGroup
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Task, TaskStatus, RequestStatus, DelegationStatus, ActionRequest } from './types';
import { dict, Language } from './i18n';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  toast.error(`System Error: ${errInfo.error}`);
  throw new Error(JSON.stringify(errInfo));
}

const TaskReportEditor = ({ task, onUpdate, disabled }: { task: Task, onUpdate: (updates: Partial<Task>) => void, disabled?: boolean }) => {
  const [val, setVal] = useState(task.report || '');
  const [isUploading, setIsUploading] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkVal, setLinkVal] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    setVal(task.report || '');
  }, [task.report]);

  const handleAddLink = () => {
    if (!linkVal.trim()) return;
    
    let url = linkVal.trim();
    if (url.match(/^[a-zA-Z]:\\/) || url.match(/^[a-zA-Z]:\//)) {
      url = 'file:///' + url.replace(/\\/g, '/');
    }

    const newAttachment = {
      name: linkVal.trim(),
      url: url,
      type: 'link'
    };

    const currentAttachments = task.attachments || [];
    onUpdate({ attachments: [...currentAttachments, newAttachment] });
    setLinkVal('');
    setShowLinkInput(false);
    toast.success("Link attached successfully!");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!task.groupId && !task.id) {
       toast.error("Cannot upload: task not securely linked");
       return;
    }

    try {
      setIsUploading(true);
      const storageRefPath = `delegation_reports/${task.groupId || 'no_group'}/${task.id}/${Date.now()}_${file.name}`;
      const fileRef = ref(storage, storageRefPath);
      const uploadTask = await uploadBytesResumable(fileRef, file);
      const downloadURL = await getDownloadURL(fileRef);

      const newAttachment = {
        name: file.name,
        url: downloadURL,
        type: file.type
      };

      const currentAttachments = task.attachments || [];
      const updatedAttachments = [...currentAttachments, newAttachment];

      // Automatically save attachment
      onUpdate({ attachments: updatedAttachments });
      toast.success("File attached successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (idx: number) => {
     if (!task.attachments) return;
     const newAtt = [...task.attachments];
     newAtt.splice(idx, 1);
     onUpdate({ attachments: newAtt });
  };

  return (
    <div className="space-y-3">
      <Textarea 
        disabled={disabled}
        placeholder="Enter report content here..." 
        className="min-h-[140px] text-[15px] p-4 rounded-2xl border-[#D1D1D6] focus:ring-[#007AFF] disabled:opacity-60 disabled:bg-[#F2F2F7]"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => {
          if(val !== task.report) onUpdate({ report: val });
        }}
      />
      
      <div className="flex flex-col gap-2">
        {task.attachments && task.attachments.length > 0 && (
          <div className="grid gap-2">
            {task.attachments.map((att, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-[#F2F2F7] border border-transparent group">
                <a 
                  href={att.url} 
                  target={att.url.startsWith('file://') || att.url.startsWith('smb://') || att.url.startsWith('\\\\') ? undefined : "_blank"}
                  rel="noopener noreferrer" 
                  className="flex items-center gap-2 overflow-hidden flex-1 hover:text-[#007AFF] transition-colors"
                  onClick={(e) => {
                    const isLocal = att.url.startsWith('file://') || att.url.startsWith('smb://') || att.url.startsWith('\\\\');
                    if (isLocal) {
                      e.preventDefault();
                      let copyText = att.url;
                      if (att.url.startsWith('file:///')) {
                         copyText = att.url.replace('file:///', '').replace(/\//g, '\\');
                         navigator.clipboard.writeText(copyText);
                         toast.success('Local file path copied to clipboard! (Browser security blocks opening local files directly)');
                      } else {
                         navigator.clipboard.writeText(att.url);
                         toast.success('Local file path copied to clipboard!');
                      }
                    }
                  }}
                  title={att.url}
                >
                   {att.type === 'link' ? <LinkIcon className="shrink-0 w-3.5 h-3.5 text-[#8E8E93]" /> : <FileIcon className="shrink-0 w-3.5 h-3.5 text-[#8E8E93]" />}
                   <span className="text-xs truncate font-medium text-[#1C1C1E]">{att.name}</span>
                </a>
                {!disabled && (
                  <Button variant="ghost" size="icon-xs" className="h-6 w-6 text-[#8E8E93] hover:bg-white hover:text-red-500 rounded-lg" onClick={() => removeAttachment(idx)}>
                    <XCircle className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {!disabled && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading || disabled} className="flex-1 text-xs rounded-xl h-8 text-[#8E8E93] border-[#D1D1D6] hover:text-[#1C1C1E] hover:bg-[#F2F2F7] active:scale-95 transition-all">
                 {isUploading ? <span className="animate-pulse">Uploading...</span> : <><Paperclip className="w-3.5 h-3.5 mr-1.5" /> File</>}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowLinkInput(!showLinkInput)} disabled={disabled} className="text-xs rounded-xl h-8 px-3 text-[#8E8E93] border-[#D1D1D6] hover:text-[#1C1C1E] hover:bg-[#F2F2F7] active:scale-95 transition-all">
                <LinkIcon className="w-3.5 h-3.5" />
              </Button>
            </div>
            
            <AnimatePresence>
              {showLinkInput && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex gap-2 items-center overflow-hidden"
                >
                  <Input 
                    placeholder="Enter link..." 
                    value={linkVal} 
                    onChange={e => setLinkVal(e.target.value)} 
                    className="h-8 text-xs rounded-xl focus-visible:ring-[#007AFF] border-[#D1D1D6]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddLink();
                    }}
                  />
                  <Button size="sm" className="h-8 text-xs rounded-xl px-4 bg-[#007AFF] hover:bg-[#007AFF]/90" onClick={handleAddLink} disabled={!linkVal.trim()}>Add</Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

const findDateValue = (obj: any, type: 'start' | 'finish') => {
  if (!obj || typeof obj !== 'object') return null;
  
  const targetAct = type === 'start' ? 'startact' : 'finishact';
  const targetBase = type === 'start' ? 'start' : 'finish';
  
  let bestMatch = null;

  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val === undefined || val === null || val === '') continue;
    
    const normalizedKey = key.toLowerCase().replace(/[\s\n_\-\(\)]/g, '');
    
    // Exact act match takes highest priority
    if (normalizedKey.includes(targetAct)) {
      return val;
    }
    
    // General match as fallback
    if (normalizedKey.includes(targetBase)) {
      bestMatch = val;
    }
  }
  
  return bestMatch;
};

const safeParseDate = (dateVal: any): Date | null => {
  if (!dateVal) return null;

  // Handle Firestore Timestamp
  if (typeof dateVal === 'object' && dateVal.seconds !== undefined) {
    return new Date(dateVal.seconds * 1000);
  }

  // Handle Date object
  if (dateVal instanceof Date) {
    return isValid(dateVal) ? dateVal : null;
  }

  // Handle string
  if (typeof dateVal === 'string' && dateVal.trim() !== '') {
    // Try parseISO first (good for ISO 8601)
    const parsed = parseISO(dateVal);
    if (isValid(parsed)) return parsed;

    // Try native Date constructor (handles formats like "Apr 27, 2026")
    const native = new Date(dateVal);
    if (isValid(native)) return native;
  }

  return null;
};

const safeFormatDate = (dateVal: any, formatStr: string): string => {
  const parsed = safeParseDate(dateVal);
  return parsed && isValid(parsed) ? format(parsed, formatStr) : '-';
};

const getAppBStatusDisplay = (status: DelegationStatus | undefined | string) => {
  switch(status) {
    case 'Assigned': return 'New Task';
    case 'On Process': return 'In Progress';
    case 'Review': return 'Waiting for Approval';
    case 'Done': return 'Completed';
    case 'Reject': return 'Needs Rework';
    default: return status || 'New Task';
  }
};

const getAppBStatusColor = (status: DelegationStatus | undefined | string) => {
  switch(status) {
    case 'Done': return 'bg-[#34C759] text-white';
    case 'Reject': return 'bg-[#FF3B30] text-white';
    case 'On Process': return 'bg-[#007AFF] text-white';
    case 'Assigned': return 'bg-white dark:bg-[#1C1C1E] text-amber-600 dark:text-amber-400';
    case 'Review': return 'bg-purple-500 text-white';
    default: return 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300';
  }
};

const getActStatusColor = (status: RequestStatus | undefined | string) => {
  switch(status) {
    case 'Approved': return 'bg-[#34C759] text-white';
    case 'Rejected': return 'bg-[#FF3B30] text-white';
    case 'Holding': return 'bg-amber-500 text-white';
    default: return 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400';
  }
};

const getTaskCardBg = (status: DelegationStatus | undefined | string) => {
  switch(status) {
    case 'Done': return 'bg-green-50/50 dark:bg-green-950/30 hover:bg-green-50 dark:hover:bg-green-900/40 border-green-100/50 dark:border-green-900/50';
    case 'Reject': return 'bg-red-50/50 dark:bg-red-950/30 hover:bg-red-50 dark:hover:bg-red-900/40 border-red-100/50 dark:border-red-900/50';
    case 'On Process': return 'bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-50 dark:hover:bg-blue-900/40 border-blue-100/50 dark:border-blue-900/50';
    case 'Assigned': return 'bg-amber-50/50 dark:bg-amber-950/30 hover:bg-amber-50 dark:hover:bg-amber-900/40 border-amber-100/50 dark:border-amber-900/50';
    case 'Review': return 'bg-purple-50/50 dark:bg-purple-950/30 hover:bg-purple-50 dark:hover:bg-purple-900/40 border-purple-100/50 dark:border-purple-900/50';
    default: return 'bg-white dark:bg-[#1C1C1E] hover:bg-[#F9F9F9] dark:hover:bg-[#2C2C2E] border-transparent';
  }
};

const getPriorityStyling = (priority?: string) => {
  switch(priority?.toLowerCase()) {
    case 'high': return 'bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/40';
    case 'mid-high': return 'bg-orange-50 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/40';
    case 'medium': return 'bg-yellow-50 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/40';
    case 'low': return 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/40';
    default: return 'bg-gray-50 dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700';
  }
};

const getPriorityWeight = (priority?: string) => {
  const p = (priority || 'Normal').toLowerCase();
  if (p === 'high') return 5;
  if (p === 'mid-high' || p === 'mid high') return 4;
  if (p === 'medium') return 3;
  if (p === 'normal') return 2;
  if (p === 'low') return 1;
  return 0; // Default
};

import { PersonalWorkspace } from './components/PersonalWorkspace';

import { AccountControl } from './components/AccountControl';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('taka_theme');
      return (saved as 'light' | 'dark') || 'light';
    } catch (e) {
      return 'light';
    }
  });

  useEffect(() => {
    localStorage.setItem('taka_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const [lang, setLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('taka_lang');
      return (saved as Language) || 'en';
    } catch (e) {
      return 'en';
    }
  });

  useEffect(() => {
    localStorage.setItem('taka_lang', lang);
  }, [lang]);
  const t = dict[lang];
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [masterCustomAccounts, setMasterCustomAccounts] = useState<any[]>([]);
  const [customAccounts, setCustomAccounts] = useState<any[]>([]);

  const [currentAppUser, setCurrentAppUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('taka_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [mainTab, setMainTab] = useState<'tasks' | 'workspace' | 'account'>(() => {
    try {
      const savedUser = localStorage.getItem('taka_current_user');
      const userId = savedUser ? JSON.parse(savedUser).id : 'default';
      const saved = localStorage.getItem(`taka_mainTab_${userId}`);
      return (saved as 'tasks' | 'workspace' | 'account') || 'tasks';
    } catch {
      return 'tasks';
    }
  });

  useEffect(() => {
    const userId = currentAppUser ? currentAppUser.id : 'default';
    localStorage.setItem(`taka_mainTab_${userId}`, mainTab);
  }, [mainTab, currentAppUser]);

  const allSystemUsers = useMemo(() => {
    return [...systemUsers, ...masterCustomAccounts, ...customAccounts];
  }, [systemUsers, masterCustomAccounts, customAccounts]);

  const [projectsMap, setProjectsMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (currentAppUser) {
      localStorage.setItem('taka_current_user', JSON.stringify(currentAppUser));
      const savedTab = localStorage.getItem(`taka_mainTab_${currentAppUser.id}`);
      if (savedTab) {
         setMainTab(savedTab as 'tasks' | 'workspace' | 'account');
      } else {
         setMainTab('tasks');
      }
    } else {
      localStorage.removeItem('taka_current_user');
      setMainTab('tasks');
    }
  }, [currentAppUser]);
  const [customNameInput, setCustomNameInput] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [parentTaskFilter, setParentTaskFilter] = useState<string>('All');
  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const search = params.get('search');
      if (search) {
        setMasterSearch(search);
      }
    };
    
    handleUrlChange();
    
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  const [masterSearch, setMasterSearch] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('search') || '';
  });
  const [openParentFilter, setOpenParentFilter] = useState(false);

  // Notifications State
  const [notifications, setNotifications] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('taka_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const prevTasksRef = useRef<Task[]>([]);
  const isFirstLoad = useRef(true);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('taka_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (tasks.length === 0 || !currentAppUser) {
      if (tasks.length === 0) isFirstLoad.current = true;
      return;
    }
    
    if (isFirstLoad.current) {
       isFirstLoad.current = false;
       prevTasksRef.current = tasks;
       return;
    }
    
    const currentUserName = (currentAppUser.displayName || currentAppUser.name || '').trim().toLowerCase();
    const newNotifications: any[] = [];
    const prevTasks = prevTasksRef.current;
    
    tasks.forEach(task => {
      if ((task.byParty || '').trim().toLowerCase() !== currentUserName) return;
      
      const prevTask = prevTasks.find(t => t.id === task.id);
      if (!prevTask) {
        newNotifications.push({
          id: Date.now().toString() + Math.random(),
          taskId: task.id,
          title: 'New Task Assigned',
          message: `You have been assigned to: ${task.title}`,
          type: 'assigned',
          isRead: false,
          timestamp: new Date().toISOString()
        });
      } else {
        const pStatus = prevTask.delegationStatus;
        const cStatus = task.delegationStatus;
        
        if (pStatus !== cStatus) {
           if (cStatus === 'Reject' || cStatus === 'Rejected') {
             newNotifications.push({
                id: Date.now().toString() + Math.random(),
                taskId: task.id,
                title: 'Task Rejected',
                message: `Master rejected task: ${task.title}`,
                type: 'reject',
                isRead: false,
                timestamp: new Date().toISOString()
             });
           }
           if (cStatus === 'Done' || cStatus === 'Completed') {
             newNotifications.push({
                id: Date.now().toString() + Math.random(),
                taskId: task.id,
                title: 'Task Approved',
                message: `Master approved task: ${task.title}`,
                type: 'approve',
                isRead: false,
                timestamp: new Date().toISOString()
             });
           }
        }
      }
    });

    if (newNotifications.length > 0) {
      setNotifications(prev => [...newNotifications, ...prev].slice(0, 50));
    }
    
    prevTasksRef.current = tasks;
  }, [tasks, currentAppUser]);
  
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [showAdminPasswordInput, setShowAdminPasswordInput] = useState(false);

  const handleCustomLogin = () => {
    if (!customNameInput.trim()) return;
    const normalizedInput = customNameInput.trim().toLowerCase();
    
    if (normalizedInput === 'admin') {
       if (!showAdminPasswordInput) {
         setShowAdminPasswordInput(true);
         return;
       }
       if (adminPasswordInput !== 'Taka@2026') {
         toast.error(t.language === 'vi' ? 'Mật khẩu không đúng.' : (t.language === 'ja' ? 'パスワードが間違っています。' : 'Incorrect password.'));
         return;
       }
       setCurrentAppUser({ id: 'admin', displayName: 'Admin' });
       setShowAdminPasswordInput(false);
       setAdminPasswordInput('');
       return;
    }
    
    // Try to find a match in the system users or custom accounts
    const matchedSystemUser = allSystemUsers.find(u => {
      const name = (u.displayName || u.name || '').trim().toLowerCase();
      const email = (u.email || '').trim().toLowerCase();
      return name === normalizedInput || email === normalizedInput;
    });

    if (matchedSystemUser) {
       setCurrentAppUser(matchedSystemUser);
       return;
    }
    
    // If not found, reject login
    toast.error(t.language === 'vi' ? 'Không tìm thấy người dùng hoặc không có quyền truy cập.' : (t.language === 'ja' ? 'ユーザーが見つからないか、アクセス権がありません。' : 'User not found or unauthorized.'));
  };

  const handleSysUserLogin = (sysUser: any) => {
    const userName = (sysUser.displayName || sysUser.name || '').trim().toLowerCase();
    
    if (userName === 'admin') {
       setCurrentAppUser({ id: 'admin', displayName: 'Admin' });
       return;
    }

    setCurrentAppUser(sysUser);
  };

  const findPartyValue = (obj: any) => {
    if (!obj) return '';
    if (typeof obj !== 'object') return '';
    for (const key of Object.keys(obj)) {
      const normalizedKey = key.toLowerCase().replace(/[\s\n_]/g, '');
      if (normalizedKey === 'byparty' || normalizedKey === 'party') {
        const val = obj[key];
        if (typeof val === 'string' || typeof val === 'number') {
          return String(val);
        }
      }
    }
    return '';
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.error("Auto anonymous login failed:", e);
        }
      } else {
        setUser(u);
        setIsAuthReady(true);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady || !user) return;
    
    // Fetch users registered from the Master app
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSystemUsers(usersList);
    }, (err) => {
      console.error("Failed to fetch master users:", err);
    });

    // Fetch custom accounts from the master app using the exact same path format
    const PARENT_APP_ID = 'taka-projects-app-v1';
    const masterCustomAccountsRef = collection(db, 'artifacts', PARENT_APP_ID, 'public', 'data', 'taka_users');
    const unsubMasterAccounts = onSnapshot(masterCustomAccountsRef, (snapshot) => {
      const arr = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          displayName: data.username || data.name || data.displayName,
          isCustom: true 
        };
      });
      setMasterCustomAccounts(arr);
    }, (err) => {
      console.warn("Failed to fetch taka_users from master:", err);
    });

    const subAppUsersRef = collection(db, 'artifacts', PARENT_APP_ID, 'public', 'data', 'taka_sub_app_users');
    const unsubSubAppUsers = onSnapshot(subAppUsersRef, (snapshot) => {
      const arr = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCustomAccounts(arr);
    }, (err) => {
      console.warn("Failed to fetch taka_sub_app_users:", err);
    });

    return () => {
      unsub();
      unsubMasterAccounts();
      unsubSubAppUsers();
    };
  }, [isAuthReady, user]);

  useEffect(() => {
    if (!isAuthReady || !user) {
      setTasks([]);
      setProjectsMap({});
      return;
    }

    const PARENT_APP_ID = 'taka-projects-app-v1';
    const projectsRef = collection(db, 'artifacts', PARENT_APP_ID, 'public', 'data', 'taka_projects');
    
    // Fetch projects to map projectCode -> projectName
    const unsubProjects = onSnapshot(projectsRef, (snapshot) => {
      const pMap: Record<string, string> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.code && data.name) {
          pMap[data.code] = data.name;
        }
      });
      setProjectsMap(pMap);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'taka_projects');
    });

    const delegationRef = collection(db, 'artifacts', PARENT_APP_ID, 'public', 'data', 'taka_delegation_groups');
    
    toast.loading('Fetching data from Master App...');
    const unsubscribe = onSnapshot(delegationRef, (snapshot) => {
      const groups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log("All Delegations:", groups);
      
      // Transform into our local tasks format for the UI, or keep it group-based
      // Since the UI currently expects a flat array of tasks that it then groups by `parentTask`,
      // we can flatten the subTasks into a single array and assign them the parent properties.
      const flattenedTasks: Task[] = [];
      const today = new Date();
      groups.forEach((group: any) => {
        const parentName = group.name || 'Delegation Group';
        const projectCode = group.projectCode || '-';
        
        if (Array.isArray(group.subTasks)) {
          group.subTasks.forEach((sub: any) => {
            let rawStatus = sub.delegationStatus;
            
            let mappedStatus = rawStatus;
            if (!rawStatus) {
              mappedStatus = 'Assigned';
            } else {
              const norm = rawStatus.toLowerCase().trim();
              if (norm === 'pending' || norm === 'assigned') {
                mappedStatus = 'Assigned';
              } else if (norm === 'in progress' || norm === 'on process') {
                mappedStatus = 'On Process';
              } else if (norm === 'pending completed' || norm === 'review') {
                mappedStatus = 'Review';
              } else if (norm === 'completed' || norm === 'done') {
                mappedStatus = 'Done';
              } else if (norm === 'rejected' || norm === 'reject') {
                mappedStatus = 'Reject';
              }
            }

            const start = findDateValue(sub, 'start') || findDateValue(group, 'start');
            const finish = findDateValue(sub, 'finish') || findDateValue(group, 'finish');


            flattenedTasks.push({
              ...sub,
              id: sub.id || Math.random().toString(), // fallback id
              code: sub.code || sub.taskCode || '-',
              name: sub.name || 'Sub-task',
              comments: sub.comments || '',
              parentComments: group.comments || group.comment || '',
              parentTask: parentName,
              projectCode: projectCode,
              location: sub.location || group.location || '',
              startDate: start,
              finishDate: finish,
              delegationStatus: mappedStatus,
              groupId: group.id, // Store group ID for updating later
              priority: sub.priority || group.priority || sub.Priority || group.Priority || 'Normal',
              byParty: findPartyValue(sub) || findPartyValue(group) || '',
              originalSub: sub,  // Keep a reference to the original subTask 
              originalGroup: group, // Keep a reference to the group
            });
          });
        }
      });
      
      setTasks(flattenedTasks);
      toast.dismiss();
    }, (error) => {
      toast.dismiss();
      handleFirestoreError(error, OperationType.LIST, 'taka_delegation_groups');
    });

    return () => {
      unsubProjects();
      unsubscribe();
    };
  }, [isAuthReady, user]);

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();
  }, []);

  const calculateStatus = (task: Task): TaskStatus => {
    const today = startOfDay(new Date());
    
    const parsedStart = safeParseDate(task.startDate);
    const parsedFinish = safeParseDate(task.finishDate);
    const parsedSiteUpdate = safeParseDate(task.siteUpdateDate);

    const start = parsedStart ? startOfDay(parsedStart) : null;
    const finish = parsedFinish ? startOfDay(parsedFinish) : null;
    const siteUpdate = parsedSiteUpdate ? startOfDay(parsedSiteUpdate) : null;

    if (!start || !finish) {
      return 'Upcoming';
    }

    if (isBefore(today, start)) {
      return 'Upcoming';
    }

    if (isWithinInterval(today, { start, end: finish })) {
      return 'In Progress';
    }

    if (isAfter(today, finish)) {
      return siteUpdate ? 'Completed' : 'Not Update';
    }

    return 'Upcoming';
  };

  const updateSubTaskInMaster = async (taskToUpdate: Task, updates: any) => {
    if (!taskToUpdate.groupId) return;
    try {
      const PARENT_APP_ID = 'taka-projects-app-v1';
      const docRef = doc(db, 'artifacts', PARENT_APP_ID, 'public', 'data', 'taka_delegation_groups', taskToUpdate.groupId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const groupData = docSnap.data();
        let subTasks = groupData.subTasks || [];
        const index = subTasks.findIndex((sub: any) => {
           if (sub.id && sub.id === taskToUpdate.originalSub?.id) return true;
           if (sub.code && sub.code === taskToUpdate.originalSub?.code) return true;
           if (sub.taskCode && sub.taskCode === taskToUpdate.originalSub?.taskCode) return true;
           if (sub.name && sub.name === taskToUpdate.originalSub?.name) return true;
           return false;
        });
        
        if (index > -1) {
          subTasks[index] = { ...subTasks[index], ...updates };
        } else if (taskToUpdate.originalSub) {
          // If we can't find it by ID/code, fallback to comparing original stringified
          const originalStr = JSON.stringify(taskToUpdate.originalSub);
          const idx = subTasks.findIndex((sub: any) => JSON.stringify(sub) === originalStr);
          if (idx > -1) {
             subTasks[idx] = { ...subTasks[idx], ...updates };
          } else {
             console.error("Could not find matching subTask to update! Original sub:", taskToUpdate.originalSub);
          }
        }
        
        await updateDoc(docRef, { subTasks });
      }
    } catch (error) {
      console.error("Failed to update parent app:", error);
      throw error;
    }
  };

  const handleActionUpdate = async (id: string, actionType: 'Accept' | 'Review') => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    try {
      const today = new Date();
      const formattedToday = format(today, 'yyyy-MM-dd');
      let updates: any = {};
      
      if (actionType === 'Accept') {
        updates = {
          delegationStatus: 'In Progress', // Update with value Master app expects
          siteUpdateDate: formattedToday
        };
      } else if (actionType === 'Review') {
        updates = {
          delegationStatus: 'Pending Completed', // Update with value Master app expects
          siteUpdateDate: formattedToday,
          actionRequest: {
            type: 'Completed',
            status: 'Holding',
            timestamp: today.toISOString()
          }
        };
      }
      
      await updateSubTaskInMaster(task, updates);
      toast.success(`Action applied.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `taka_delegation_groups`);
    }
  };

  const handleSiteUpdate = async (id: string) => {
    const today = new Date();
    const formattedToday = format(today, 'yyyy-MM-dd');
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    try {
      await updateSubTaskInMaster(task, { siteUpdateDate: formattedToday });
      toast.success('Site Update successful!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `taka_delegation_groups`);
    }
  };

  const updateTaskFields = async (id: string, updates: Partial<Task>) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    try {
      await updateSubTaskInMaster(task, updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `taka_delegation_groups`);
    }
  };

  const updateTaskCode = async (id: string, code: string) => {
    // Cannot update code directly for master tasks
    toast.info('Cannot change original task code');
  };

  const handleAddCustomAccount = async (newAccount: any) => {
    try {
      const PARENT_APP_ID = 'taka-projects-app-v1';
      await setDoc(doc(db, 'artifacts', PARENT_APP_ID, 'public', 'data', 'taka_sub_app_users', newAccount.id), newAccount);
    } catch (e) {
      console.error(e);
      handleFirestoreError(e, OperationType.CREATE, 'taka_sub_app_users');
    }
  };

  const handleRemoveCustomAccount = async (id: string) => {
    try {
      const PARENT_APP_ID = 'taka-projects-app-v1';
      await deleteDoc(doc(db, 'artifacts', PARENT_APP_ID, 'public', 'data', 'taka_sub_app_users', id));
    } catch (e) {
      console.error(e);
      handleFirestoreError(e, OperationType.DELETE, 'taka_sub_app_users');
    }
  };

  const deleteTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task || !task.groupId) return;

    try {
      const PARENT_APP_ID = 'taka-projects-app-v1';
      const docRef = doc(db, 'artifacts', PARENT_APP_ID, 'public', 'data', 'taka_delegation_groups', task.groupId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const groupData = docSnap.data();
        let subTasks = groupData.subTasks || [];
        subTasks = subTasks.filter((sub: any) => sub.id !== task.id && sub.code !== task.code);
        await updateDoc(docRef, { subTasks });
      }
      toast.info('Task removed from list');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `taka_delegation_groups`);
    }
  };



  const filteredTasks = useMemo(() => {
    if (!currentAppUser) return [];
    
    const userName = (currentAppUser.displayName || currentAppUser.name || '').toLowerCase().trim();
    if (userName === 'admin') return tasks;

    return tasks.filter(t => {
      const byParty = t.byParty?.toLowerCase().trim() || '';
      return byParty === userName;
    });
  }, [tasks, currentAppUser]);

  const displayTasks = useMemo(() => {
    let tasksToDisplay = filteredTasks;
    
    if (selectedTaskId) {
      tasksToDisplay = tasksToDisplay.filter(t => t.id === selectedTaskId);
      return tasksToDisplay;
    }

    if (statusFilter !== 'All') {
      tasksToDisplay = tasksToDisplay.filter(t => t.delegationStatus === statusFilter);
    }
    
    if (priorityFilter !== 'All') {
      tasksToDisplay = tasksToDisplay.filter(t => {
        const p = (t.priority || 'Normal').toLowerCase();
        return p === priorityFilter.toLowerCase();
      });
    }

    if (parentTaskFilter !== 'All') {
      tasksToDisplay = tasksToDisplay.filter(t => (t.parentTask || 'Others') === parentTaskFilter);
    }
    
    if (masterSearch.trim() !== '') {
      const searchTerms = masterSearch.toLowerCase().trim().split(/\s+/);
      tasksToDisplay = tasksToDisplay.filter(t => {
         const searchStr = [
           t.name,
           t.parentTask,
           t.projectCode,
           t.code,
           t.location,
           t.comments,
           t.originalGroup?.projectName,
           t.originalGroup?.projectCode,
           t.originalGroup?.name,
         ].filter(Boolean).join(' ').toLowerCase();
         
         return searchTerms.every(term => searchStr.includes(term));
      });
    }

    return [...tasksToDisplay].sort((a, b) => {
      const getStatusWeight = (status: string | undefined) => {
        if (status === 'Assigned' || status === 'On Process' || status === 'Reject') return 2;
        if (status === 'Review') return 1;
        return 0; // Done
      };

      const wA = getStatusWeight(a.delegationStatus);
      const wB = getStatusWeight(b.delegationStatus);
      
      if (wA !== wB) {
        return wB - wA;
      }

      const getTime = (d: any) => {
        if (!d) return Infinity;
        const time = new Date(d).getTime();
        return isNaN(time) ? Infinity : time;
      };

      const timeA = getTime(a.finishDate);
      const timeB = getTime(b.finishDate);

      if (timeA !== timeB) {
         return timeA - timeB;
      }

      return getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
    });
  }, [filteredTasks, statusFilter, priorityFilter, parentTaskFilter, selectedTaskId, masterSearch]);

  const stats = useMemo(() => {
    const counts = {
      'Assigned': 0,
      'On Process': 0,
      'Review': 0,
      'Done': 0,
      'Reject': 0
    };
    filteredTasks.forEach(t => {
      const status = t.delegationStatus as keyof typeof counts;
      if (status && counts[status] !== undefined) {
        counts[status]++;
      } else {
        counts['Assigned']++;
      }
    });
    return counts;
  }, [filteredTasks]);

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans text-[#1C1C1E] selection:bg-blue-100">
      <Toaster position="top-center" expand={false} richColors />
      
      {/* iOS Style Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-[#D1D1D6] px-4 py-3 safe-top">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
             <Popover>
               <PopoverTrigger asChild>
                 <Button variant="ghost" size="icon" className="text-[#1C1C1E] shrink-0" title="Menu">
                   <Menu className="w-5 h-5" />
                 </Button>
               </PopoverTrigger>
               <PopoverContent className="w-56 p-2 rounded-2xl shadow-xl border border-[#D1D1D6]/40 bg-white/95 backdrop-blur-xl" align="start">
                 <div className="px-3 mb-2 pt-1 text-[10px] font-bold text-[#8E8E93] uppercase tracking-widest">Menu</div>
                 <Button 
                   variant="ghost" 
                   onClick={() => setMainTab('tasks')} 
                   className={cn("w-full justify-start h-10 rounded-xl text-sm font-semibold mb-1", mainTab === 'tasks' ? "bg-[#F2F2F7] text-[#007AFF]" : "text-[#1C1C1E] hover:bg-[#F2F2F7]")}
                 >
                    <ListChecks className="w-4 h-4 mr-2.5" /> Team Tasks
                 </Button>
                 <Button 
                   variant="ghost" 
                   onClick={() => setMainTab('workspace')} 
                   className={cn("w-full justify-start h-10 rounded-xl text-sm font-semibold mb-1", mainTab === 'workspace' ? "bg-[#F2F2F7] text-[#007AFF]" : "text-[#1C1C1E] hover:bg-[#F2F2F7]")}
                 >
                    <LayoutDashboard className="w-4 h-4 mr-2.5" /> Workspace
                 </Button>
                 {currentAppUser && (currentAppUser.id === 'admin' || currentAppUser?.email === 'namhung07164@gmail.com') && (
                   <Button 
                     variant="ghost" 
                     onClick={() => setMainTab('account')} 
                     className={cn("w-full justify-start h-10 rounded-xl text-sm font-semibold mb-1", mainTab === 'account' ? "bg-[#F2F2F7] text-[#007AFF]" : "text-[#1C1C1E] hover:bg-[#F2F2F7]")}
                   >
                      <UserCircle2 className="w-4 h-4 mr-2.5" /> Account Control
                   </Button>
                 )}
               </PopoverContent>
             </Popover>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest leading-none mb-1">
                {t.officialCloud}
              </span>
              <h1 className="text-xl font-bold tracking-tight text-[#1C1C1E]">{t.taskTracker}</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 bg-[#F2F2F7] p-1 rounded-lg">
              <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-7 h-6 flex items-center justify-center rounded text-[10px] transition-all text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-[#000000]"
                title="Toggle Theme"
              >
                {theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="flex items-center gap-0.5 mr-2 bg-[#F2F2F7] p-1 rounded-lg">
              <button 
                onClick={() => setLang('en')}
                className={cn('w-7 h-6 flex items-center justify-center rounded transition-all text-[10px] font-bold', lang === 'en' ? 'bg-white shadow text-[#1C1C1E]' : 'text-[#8E8E93] hover:text-[#1C1C1E]')}
                title="English"
              >
                US
              </button>
              <button 
                onClick={() => setLang('ja')}
                className={cn('w-7 h-6 flex items-center justify-center rounded transition-all text-[10px] font-bold', lang === 'ja' ? 'bg-white shadow text-[#1C1C1E]' : 'text-[#8E8E93] hover:text-[#1C1C1E]')}
                title="Japanese"
              >
                JP
              </button>
            </div>
            {!currentAppUser ? (
              <Button disabled variant="ghost" className="text-[#007AFF] font-semibold">
                <LogIn className="w-4 h-4 mr-1.5" />
                {t.loginRequired}
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#8E8E93] mr-2 hidden sm:inline-block">👤 {currentAppUser.displayName || currentAppUser.name || 'Master User'}</span>
                
                <div className="relative" ref={notificationsRef}>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="relative text-[#8E8E93] hover:text-[#1C1C1E] transition-colors"
                    onClick={() => {
                      if (!showNotifications) markAllAsRead();
                      setShowNotifications(!showNotifications);
                    }}
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                    )}
                  </Button>

                  <AnimatePresence>
                    {showNotifications && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-[#D1D1D6]/40 overflow-hidden z-50 origin-top-right"
                      >
                        <div className="bg-[#F2F2F7]/50 px-4 py-3 border-b border-[#D1D1D6]/40 flex items-center justify-between">
                          <h3 className="font-bold text-[#1C1C1E] text-sm">{t.notifications}</h3>
                          <span className="text-[10px] uppercase font-bold text-[#8E8E93] px-2 py-0.5 bg-[#E5E5EA] rounded-full">
                            {notifications.length}
                          </span>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center text-sm text-[#8E8E93]">
                              {t.noNotifications}
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              {[...notifications].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((notif) => (
                                <div 
                                  key={notif.id} 
                                  className={`px-4 py-3 border-b border-[#D1D1D6]/30 last:border-0 hover:bg-[#F2F2F7]/50 dark:hover:bg-[#2C2C2E] transition-colors cursor-pointer ${!notif.isRead ? 'bg-blue-50/30 dark:bg-blue-500/20' : ''}`}
                                  onClick={() => {
                                    if (notif.taskId) setSelectedTaskId(notif.taskId);
                                    setShowNotifications(false);
                                  }}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className={`mt-0.5 shrink-0 w-2 h-2 rounded-full ${
                                      notif.type === 'assigned' ? 'bg-blue-500' :
                                      notif.type === 'approve' ? 'bg-green-500' :
                                      notif.type === 'reject' ? 'bg-red-500' : 'bg-gray-400'
                                    }`} />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-semibold text-[#1C1C1E] mb-0.5">{notif.title}</p>
                                      <p className="text-xs text-[#8E8E93] leading-relaxed break-words">{notif.message}</p>
                                      <p className="text-[10px] text-[#C7C7CC] font-medium mt-1 uppercase tracking-widest">
                                        {format(new Date(notif.timestamp), 'MMM d, HH:mm')}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="w-px h-4 bg-[#D1D1D6] mx-1" />

                <Button onClick={() => { setCurrentAppUser(null); setSelectedTaskId(null); }} variant="ghost" size="icon" className="text-[#8E8E93] hover:text-red-500 transition-colors">
                  <LogOut className="w-5 h-5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className={cn("mx-auto flex flex-col md:flex-row gap-6", currentAppUser ? "max-w-6xl px-4 md:px-8 py-6" : "max-w-4xl px-4 py-6")}>
        {!currentAppUser ? (
          <main className="w-full space-y-8 pb-24 mx-auto max-w-4xl">
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-6">
            <div className="p-6 bg-white rounded-full shadow-sm">
              <LogIn className="w-12 h-12 text-[#007AFF]" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">{t.loginTitle}</h2>
              <p className="text-[#8E8E93] max-w-xs mx-auto">{t.loginDesc}</p>
            </div>
            
            <div className="flex flex-col gap-4 w-full max-w-xs mt-6 text-left">
               <Label className="text-xs font-bold uppercase tracking-widest text-[#8E8E93] ml-1 block mb-2">{showAdminPasswordInput ? 'Enter Admin Password' : t.enterCustomId}</Label>
               {showAdminPasswordInput ? (
                 <Input 
                   type="password"
                   placeholder="Password"
                   value={adminPasswordInput}
                   onChange={e => setAdminPasswordInput(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && handleCustomLogin()}
                   className="h-12 rounded-xl border-[#D1D1D6] text-sm"
                 />
               ) : (
                 <Input 
                   placeholder={t.enterName}
                   value={customNameInput}
                   onChange={e => setCustomNameInput(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && handleCustomLogin()}
                   className="h-12 rounded-xl border-[#D1D1D6] text-sm"
                 />
               )}
               <Button 
                 onClick={handleCustomLogin} 
                 className="bg-[#007AFF] hover:bg-[#007AFF]/90 text-white rounded-xl h-12 w-full font-bold active:scale-95 transition-all w-full tracking-wide"
               >
                 <LogIn className="w-5 h-5 mr-2" /> Login
               </Button>
               {showAdminPasswordInput && (
                 <Button 
                   onClick={() => { setShowAdminPasswordInput(false); setAdminPasswordInput(''); setCustomNameInput(''); }} 
                   variant="ghost"
                   className="text-[#8E8E93] hover:text-[#1C1C1E] mt-2"
                 >
                   Cancel
                 </Button>
               )}
            </div>
          </div>
          </main>
        ) : (
          <>
            <main className="flex-1 w-full space-y-8 pb-24 min-w-0">
               {mainTab === 'account' && <AccountControl customAccounts={customAccounts} setCustomAccounts={setCustomAccounts} systemUsers={systemUsers} masterCustomAccounts={masterCustomAccounts} onAddAccount={handleAddCustomAccount} onRemoveAccount={handleRemoveCustomAccount} />}
               
               {mainTab === 'workspace' && <PersonalWorkspace key={currentAppUser?.id || 'default'} />}

               {mainTab === 'tasks' && (
                 <>
                   {/* iOS Style Stats Scroll */}
                   <section className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 custom-scrollbar items-stretch">
              {[
                { label: t.allTasks, value: filteredTasks.length, color: 'bg-[#1C1C1E] text-white dark:bg-gray-800 dark:text-gray-100', icon: LayoutDashboard, filterVal: 'All' },
                { label: t.assignedToMe, value: stats['Assigned'], color: 'bg-white text-amber-600 dark:bg-[#1C1C1E] dark:text-amber-400', icon: Clock, filterVal: 'Assigned' },
                { label: t.inProgress, value: stats['On Process'], color: 'bg-[#007AFF] text-white', icon: Clock, filterVal: 'On Process' },
                { label: t.waitingApproval, value: stats['Review'], color: 'bg-purple-500 text-white', icon: AlertCircle, filterVal: 'Review' },
                { label: t.completed, value: stats['Done'], color: 'bg-[#34C759] text-white', icon: CheckCircle2, filterVal: 'Done' },
                { label: t.needsRework, value: stats['Reject'], color: 'bg-[#FF3B30] text-white', icon: AlertCircle, filterVal: 'Reject' },
              ].map((stat) => (
                <div 
                  key={stat.label} 
                  onClick={() => {
                    setStatusFilter(stat.filterVal);
                    setSelectedTaskId(null);
                  }}
                  className={cn(
                    "flex-shrink-0 w-32 p-4 rounded-2xl shadow-sm border border-[#D1D1D6]/30 cursor-pointer transition-all active:scale-95", 
                    stat.color,
                    statusFilter === stat.filterVal ? "ring-2 ring-offset-2 ring-[#007AFF] dark:ring-offset-[#000000]" : "opacity-70 hover:opacity-100"
                  )}
                >
                  <stat.icon className="w-5 h-5 mb-3 opacity-80" />
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{stat.label}</p>
                  <h3 className="text-2xl font-bold mt-0.5 tracking-tight">{stat.value}</h3>
                </div>
              ))}
              
              <div className="flex-shrink-0 flex flex-col justify-between ml-2 bg-white rounded-2xl border border-[#D1D1D6]/30 py-2.5 px-3 shadow-sm h-full max-h-[116px]">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#8E8E93] mb-1.5 px-1">{t.priorityFilter}</p>
                  <div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar">
                    {['All', 'High', 'Mid-High', 'Medium', 'Normal', 'Low'].map(prio => (
                       <button 
                         key={prio} 
                         onClick={() => {
                           setPriorityFilter(prio);
                           setSelectedTaskId(null);
                         }}
                         className={cn(
                           "text-[9px] uppercase font-bold text-left px-2 py-1.5 rounded-lg transition-colors leading-none",
                           priorityFilter === prio ? "bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400" : "text-[#8E8E93] hover:bg-[#F2F2F7] hover:text-[#1C1C1E] dark:hover:bg-[#2C2C2E] dark:hover:text-[#F2F2F7]"
                         )}
                       >
                         {prio}
                       </button>
                    ))}
                  </div>
              </div>
            </section>

            {/* Filters */}
            <section className="pb-4 space-y-3 relative">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E93]" />
                <Input
                  value={masterSearch}
                  onChange={(e) => {
                    setMasterSearch(e.target.value);
                    setSelectedTaskId(null);
                  }}
                  placeholder={t.language === 'vi' ? 'Tìm trong tất cả nội dung...' : (t.language === 'ja' ? 'すべてのコンテンツを検索...' : 'Search all content...')}
                  className="w-full h-11 pl-10 pr-10 rounded-2xl border-[#D1D1D6]/80 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] text-[13px] font-semibold focus-visible:ring-[#007AFF]"
                />
                {masterSearch && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-[#F2F2F7]"
                    onClick={() => setMasterSearch('')}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                )}
              </div>
              
              <Popover open={openParentFilter} onOpenChange={setOpenParentFilter}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openParentFilter}
                    className="w-full h-11 justify-between rounded-2xl border border-[#D1D1D6]/80 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] text-[13px] font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] hover:bg-gray-50 dark:hover:bg-[#2C2C2E]"
                  >
                    {parentTaskFilter === 'All' ? t.allProjectsGroups : parentTaskFilter}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-[#8E8E93]" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[calc(100vw-32px)] sm:w-[400px] p-0 rounded-2xl shadow-xl border-[#D1D1D6]/50 dark:border-[#38383A]">
                  <Command>
                    <CommandInput placeholder="Search..." className="h-11 dark:text-[#F2F2F7]" />
                    <CommandList className="max-h-[300px]">
                      <CommandEmpty>No project/group found.</CommandEmpty>
                      <CommandGroup>
                        {['All', ...Array.from(new Set(filteredTasks.map(t => t.parentTask || 'Others')))].map((pTask) => (
                          <CommandItem
                            key={pTask}
                            value={pTask === 'All' ? t.allProjectsGroups : pTask}
                            onSelect={(currentValue) => {
                              // Shadcn Command lowercases the value by default, so we match against the lowercased option
                              const actualValue = pTask;
                              setParentTaskFilter(actualValue);
                              setSelectedTaskId(null);
                              setOpenParentFilter(false);
                            }}
                            className="text-[13px] font-medium"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                parentTaskFilter === pTask ? "opacity-100 text-[#007AFF]" : "opacity-0"
                              )}
                            />
                            {pTask === 'All' ? t.allProjectsGroups : pTask}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </section>

            {/* Task List Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[#1C1C1E]">{t.taskList}</h2>
                  {selectedTaskId && (
                    <Button variant="ghost" size="sm" onClick={() => setSelectedTaskId(null)} className="h-6 px-2 text-[10px] bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-400 dark:hover:bg-blue-500/30 rounded-full">
                      {t.clearSelection}
                    </Button>
                  )}
                </div>
                <span className="text-xs font-medium text-[#8E8E93]">{displayTasks.length} {t.tasksCount}</span>
              </div>

              <div className="flex overflow-x-auto gap-5 snap-x pb-6 custom-scrollbar items-start">
                <AnimatePresence mode="popLayout">
                  {displayTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 w-full text-center space-y-3 bg-white rounded-3xl border border-[#D1D1D6]/50 shrink-0">
                      <div className="p-4 bg-[#F2F2F7] rounded-full">
                        <LayoutDashboard className="w-8 h-8 text-[#8E8E93]" />
                      </div>
                      <p className="text-[#8E8E93] font-medium">{t.noTasks}</p>
                    </div>
                  ) : (
                    Object.values(
                      displayTasks.reduce((acc, task) => {
                        const parentKey = task.parentTask || 'Others';
                        if (!acc[parentKey]) {
                          const code = task.projectCode || '-';
                          acc[parentKey] = {
                            parentTask: parentKey,
                            projectCode: code,
                            projectName: projectsMap[code] || '',
                            tasks: []
                          };
                        }
                        acc[parentKey].tasks.push(task);
                        return acc;
                      }, {} as Record<string, { parentTask: string; projectCode: string; projectName: string; tasks: Task[] }>)
                    ).map((group: { parentTask: string; projectCode: string; projectName: string; tasks: Task[] }) => (
                      <motion.div 
                        key={group.parentTask}
                        layout
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-3xl sm:rounded-[2rem] border border-[#D1D1D6]/40 shadow-sm overflow-hidden shrink-0 w-[85vw] sm:w-[400px] snap-start"
                      >
                        {/* Parent Header */}
                        <div className="bg-[#F2F2F7]/50 px-5 sm:px-6 py-5 border-b border-[#D1D1D6]/40 flex flex-col justify-center gap-2">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 min-w-0">
                             <div className="min-w-0 flex-1">
                              <h3 className="font-bold text-[#1C1C1E] text-base truncate">{group.parentTask}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold text-[#007AFF] bg-blue-100/50 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                                  {group.projectCode}
                                  {group.projectName ? ` - ${group.projectName}` : ''}
                                </span>
                                <span className="text-[10px] font-medium text-[#8E8E93]">
                                  {group.tasks.length} {t.delegationTasks}
                                </span>
                              </div>
                             </div>

                             {group.tasks[0]?.parentComments && (
                                <div className="mt-3 sm:mt-0 bg-[#F2F2F7] rounded-xl p-3.5 sm:max-w-md w-full sm:w-auto min-w-0">
                                   <div className="text-[10px] font-bold uppercase tracking-widest text-[#8E8E93] mb-1.5">{t.groupNote}</div>
                                   <p className="text-[13px] sm:text-sm font-medium text-[#1C1C1E] whitespace-pre-wrap break-words min-w-0 w-full">{group.tasks[0].parentComments}</p>
                                </div>
                             )}
                          </div>
                        </div>

                        {/* Child Tasks List */}
                        <div className="divide-y divide-[#F2F2F7]/60">
                          {group.tasks.map((task) => {
                            const status = calculateStatus(task);
                            return (
                              <div key={task.id} className={cn("px-5 sm:px-6 py-5 transition-colors group flex flex-col min-w-0", getTaskCardBg(task.delegationStatus))}>
                                <div className="flex justify-between items-start mb-4 gap-2">
                                  <div className="space-y-1.5 flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-[10px] font-bold text-[#8E8E93] bg-[#E5E5EA] px-1.5 py-0.5 rounded uppercase tracking-wider">
                                        {task.code}
                                      </span>
                                      <Badge 
                                        variant="secondary"
                                        className={cn(
                                          "px-2 py-0 h-4 text-[9px] font-bold uppercase tracking-tighter rounded-full",
                                          status === 'In Progress' && "bg-blue-100 text-blue-700",
                                          status === 'Completed' && "bg-green-100 text-green-700",
                                          status === 'Not Update' && "bg-red-100 text-red-700",
                                          status === 'Upcoming' && "bg-gray-100 text-gray-600"
                                        )}
                                      >
                                        {status === 'In Progress' ? t.inProgress : 
                                         status === 'Completed' ? t.completed : 
                                         status === 'Not Update' ? t.notUpdate : 
                                         status /* Upcoming */ }
                                      </Badge>
                                      {task.originalGroup?.plStatus && (
                                        <Badge 
                                          variant="secondary"
                                          className="px-2 py-0 h-4 text-[9px] font-bold uppercase tracking-tighter rounded-full whitespace-nowrap bg-slate-100 text-slate-700 hover:bg-slate-200 border-transparent"
                                        >
                                          Pl: {task.originalGroup.plStatus}
                                        </Badge>
                                      )}
                                      {task.originalGroup?.actStatus && (
                                        <Badge 
                                          variant="secondary"
                                          className={cn(
                                            "px-2 py-0 h-4 text-[9px] font-bold uppercase tracking-tighter rounded-full whitespace-nowrap",
                                            task.originalGroup.actStatus === 'Critical Delay' ? "bg-[#990000] text-white hover:bg-[#990000]" :
                                            task.originalGroup.actStatus === 'Delay' ? "bg-red-500 text-white hover:bg-red-600" :
                                            task.originalGroup.actStatus === 'Completed' || task.originalGroup.actStatus === 'Approved' ? "bg-[#34C759] text-white hover:bg-[#2EB84F]" :
                                            "bg-[#1C1C1E] text-white hover:bg-[#2C2C2E] border-transparent"
                                          )}
                                        >
                                          Act: {task.originalGroup.actStatus.toUpperCase()}
                                        </Badge>
                                      )}
                                    </div>
                                    
                                    <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4 pt-1.5 align-top">
                                      <div className="flex items-start gap-2 min-w-0">
                                        <div className="-ml-1 text-[#C7C7CC] shrink-0 mt-0.5">
                                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M8 6V14C8 15.1046 8.89543 16 10 16H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            <path d="M15 13L18 16L15 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                          </svg>
                                        </div>
                                        {task.name !== task.parentTask && task.name !== 'Sub-task' && (
                                          <h4 className="font-bold text-[#1C1C1E] text-sm md:text-base break-words">
                                            {task.name}
                                          </h4>
                                        )}
                                      </div>
                                      
                                      {task.comments && (
                                        <div className="bg-[#F2F2F7]/80 border-l-[3px] border-[#8E8E93] pl-3 py-2 pr-4 rounded-r-xl max-w-full mt-2 min-w-0 break-words">
                                          <span className="text-[10px] font-bold uppercase tracking-widest text-[#8E8E93] block mb-1">{t.commentFromMaster}</span>
                                          <p className="text-[13px] sm:text-sm md:text-base font-medium text-[#1C1C1E] whitespace-pre-wrap break-words min-w-0 w-full">{task.comments}</p>
                                        </div>
                                      )}
                                    </div>
                                    <p className="text-xs text-[#8E8E93] ml-5">{task.location}</p>
                                  </div>
                                  <div className="flex flex-col items-end gap-2">
                                    <div className={cn("px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border text-center bg-white shadow-sm", getPriorityStyling(task.priority))}>
                                      {task.priority || 'Normal'}
                                    </div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 py-4 border-y border-[#F2F2F7]/80 mt-auto">
                                  <div className="space-y-1.5 mt-1">
                                    <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-widest">{t.startAct}</span>
                                    <div className="text-[#1C1C1E] font-semibold">{safeFormatDate(task.startDate, 'MMM d, yyyy')}</div>
                                  </div>
                                  <div className="space-y-1.5 mt-1">
                                    <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-widest">{t.finishAct}</span>
                                    <div className="text-[#1C1C1E] font-semibold">{safeFormatDate(task.finishDate, 'MMM d, yyyy')}</div>
                                  </div>
                                </div>

                                <div className="flex flex-col sm:flex-row items-stretch pt-2 pb-1 gap-3 w-full">
                                  <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-[160px] shrink-0">
                                    <div className="flex-1 sm:flex-none">
                                      <Button 
                                        variant="ghost" 
                                        className={cn(
                                          "h-auto min-h-[44px] py-1.5 w-full justify-start text-[11px] font-semibold rounded-2xl px-2.5 border border-transparent pointer-events-none",
                                          getAppBStatusColor(task.delegationStatus)
                                        )}
                                      >
                                        <Clock className="w-3.5 h-3.5 mr-2 opacity-70 shrink-0" />
                                        <div className="flex flex-col items-start leading-tight">
                                          <span className="text-[9px] opacity-70 uppercase tracking-tighter">{t.status}</span>
                                          <span className="text-left whitespace-pre-wrap">{getAppBStatusDisplay(task.delegationStatus)}</span>
                                        </div>
                                      </Button>
                                    </div>
                                    <div className="flex-1 sm:flex-none">
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <Button variant="outline" className="h-auto min-h-[44px] py-1.5 w-full justify-start text-[11px] font-semibold rounded-2xl px-2.5 border-[#D1D1D6] text-gray-700 bg-white hover:bg-gray-50 focus:ring-0">
                                            <Send className="w-3.5 h-3.5 mr-2 text-gray-400 shrink-0" />
                                            {task.actionRequest ? (
                                                <div className="flex flex-col items-start leading-tight">
                                                   <span className="text-[9px] text-gray-400 uppercase tracking-tighter w-full truncate text-left">req: {task.actionRequest.type}</span>
                                                   <span className="truncate">{safeFormatDate(task.actionRequest.timestamp, 'MMM d, yyyy')}</span>
                                                </div>
                                            ) : task.siteUpdateDate ? (
                                                <div className="flex flex-col items-start leading-tight">
                                                   <span className="text-[9px] text-gray-400 uppercase tracking-tighter">{t.update}</span>
                                                   <span>{safeFormatDate(task.siteUpdateDate, 'MMM d, yyyy')}</span>
                                                </div>
                                            ) : (
                                              t.action
                                            )}
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[calc(100vw-32px)] sm:w-64 p-2 rounded-2xl shadow-xl border border-[#D1D1D6]/50 bg-white/95 backdrop-blur-xl">
                                            <p className="text-[10px] px-2 pt-1 pb-1 font-bold text-gray-400 uppercase tracking-widest mb-1">{t.selectAction}</p>
                                            
                                            {(!task.delegationStatus || task.delegationStatus === 'Assigned') && (
                                               <Button className="w-full justify-start h-10 rounded-xl text-xs font-medium" variant="ghost" onClick={() => handleActionUpdate(task.id, 'Accept')}>
                                                  ✅ {t.acceptTask}
                                               </Button>
                                            )}
                                            
                                            {(task.delegationStatus === 'On Process' || task.delegationStatus === 'Reject') && (
                                              <Button className="w-full justify-start h-10 rounded-xl text-[13px] font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/20" variant="ghost" onClick={() => handleActionUpdate(task.id, 'Review')}>
                                                📤 {t.requestReview}
                                              </Button>
                                            )}
                                            
                                            {task.delegationStatus === 'Review' && (
                                               <p className="text-xs text-center text-gray-500 dark:text-gray-400 py-3 mt-1 bg-gray-50 dark:bg-gray-800 rounded-xl">{t.waitingApprovalNote}</p>
                                            )}

                                            {task.delegationStatus === 'Done' && (
                                               <p className="text-xs text-center text-green-600 dark:text-green-400 font-medium py-3 mt-1 bg-green-50 dark:bg-green-950/30 rounded-xl">{t.taskCompletedNote}</p>
                                            )}
                                        </PopoverContent>
                                      </Popover>
                                    </div>
                                  </div>

                                  <div className="flex-1 w-full min-w-0">
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button variant="ghost" className="h-auto min-h-[44px] py-2.5 w-full justify-start text-[11px] sm:text-xs font-semibold rounded-2xl bg-[#F2F2F7] dark:bg-[#1C1C1E] px-3 border border-transparent hover:bg-[#E5E5EA] dark:hover:bg-[#2C2C2E] active:scale-95 transition-all text-left dark:text-gray-300">
                                          <MessageSquare className="w-4 h-4 mr-2.5 opacity-70 shrink-0 mt-0.5" />
                                          <span className="whitespace-pre-wrap break-words text-left leading-relaxed">{task.report || t.tapToWriteReport}</span>
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-[calc(100vw-32px)] sm:w-96 p-5 rounded-[24px] shadow-2xl border border-[#D1D1D6]/50 bg-white/95 backdrop-blur-xl">
                                        <div className="space-y-3">
                                          <Label className="text-[11px] font-bold uppercase tracking-widest text-[#8E8E93]">{t.reportContent}</Label>
                                          <TaskReportEditor disabled={task.delegationStatus === 'Done'} task={task} onUpdate={(updates) => updateTaskFields(task.id, updates)} />
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </section>
            
                 </>
               )}
            </main>
          </>
        )}
      </div>

      {/* iOS Style Footer */}
      <footer className="text-center space-y-2 pt-10 pb-8 opacity-40">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Takashimaya PM • Cloud Tracking</p>
        <div className="flex justify-center gap-4 text-[9px] font-medium">
          <span>v1.0.0</span>
          <span>•</span>
          <span>iOS Optimized</span>
        </div>
      </footer>
    </div>
  );
}
