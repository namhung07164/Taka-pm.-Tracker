import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, UserCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AccountControlProps {
  customAccounts: any[];
  setCustomAccounts: (accounts: any[]) => void;
  systemUsers?: any[];
  masterCustomAccounts?: any[];
}

export function AccountControl({ customAccounts, setCustomAccounts, systemUsers = [], masterCustomAccounts = [] }: AccountControlProps) {
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const allMasterUsers = [...systemUsers, ...masterCustomAccounts];

  const handleAddAccount = () => {
    if (!newName.trim()) {
      toast.error('Name is required');
      return;
    }
    
    const newId = `custom_${Date.now()}`;
    const newAccount = {
      id: newId,
      displayName: newName.trim(),
      email: newEmail.trim() || undefined,
      isCustom: true
    };
    
    setCustomAccounts([...customAccounts, newAccount]);
    setNewName('');
    setNewEmail('');
    toast.success('Account added successfully');
  };

  const handleRemoveAccount = (id: string) => {
    setCustomAccounts(customAccounts.filter(acc => acc.id !== id));
    toast.success('Account removed');
  };

  return (
    <div className="bg-white rounded-[2rem] border border-[#D1D1D6]/40 p-6 sm:p-10 min-h-[60vh]">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#1C1C1E]">Account Control</h2>
          <p className="text-[#8E8E93] mt-2 text-sm max-w-lg">Create custom party/user accounts to assign tasks. These accounts will be combined with the master app users.</p>
        </div>

        <div className="bg-[#F2F2F7]/50 rounded-2xl p-6 border border-[#D1D1D6]/50">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#8E8E93] mb-4">Add New Option in byParty</h3>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-2 flex-1 w-full relative z-10">
              <Label className="text-[11px] font-bold uppercase tracking-widest text-[#8E8E93]">Admin Configured Option Name</Label>
              <Input 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
                placeholder="e.g. John Doe, Contractor A"
                className="bg-white h-12 rounded-xl border-[#D1D1D6] font-medium"
              />
            </div>
            <div className="space-y-2 flex-1 w-full relative z-10">
              <Label className="text-[11px] font-bold uppercase tracking-widest text-[#8E8E93]">Email (Optional)</Label>
              <Input 
                value={newEmail} 
                onChange={(e) => setNewEmail(e.target.value)} 
                placeholder="e.g. email@example.com"
                className="bg-white h-12 rounded-xl border-[#D1D1D6]"
              />
            </div>
            <Button 
              onClick={handleAddAccount}
              className="bg-[#007AFF] hover:bg-[#007AFF]/90 font-bold tracking-wide text-white h-12 px-6 rounded-xl shrink-0 w-full sm:w-auto relative z-10"
            >
              <Plus className="w-5 h-5 sm:mr-1.5" /> <span className="hidden sm:inline">Add</span>
            </Button>
          </div>
        </div>

        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#8E8E93] mb-4">Admin Configured Accounts ({customAccounts.length})</h3>
          {customAccounts.length === 0 ? (
            <div className="text-center py-10 bg-[#F2F2F7]/30 rounded-2xl border border-dashed border-[#D1D1D6]">
              <UserCircle2 className="w-8 h-8 text-[#D1D1D6] mx-auto mb-3" />
              <p className="text-[#8E8E93] text-sm">No custom accounts configured yet</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {customAccounts.map(account => (
                <div key={account.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#D1D1D6]/50 shadow-sm transition-all hover:border-[#D1D1D6]">
                  <div className="flex flex-col overflow-hidden mr-3">
                    <span className="font-bold text-[#1C1C1E] text-sm truncate">{account.displayName}</span>
                    {account.email && <span className="text-[11px] text-[#8E8E93] truncate">{account.email}</span>}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleRemoveAccount(account.id)}
                    className="text-[#8E8E93] hover:text-red-500 hover:bg-red-50 rounded-xl shrink-0 opacity-50 hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#8E8E93] mb-4 mt-8">Taka-PM Users ({allMasterUsers.length})</h3>
          <p className="text-xs text-[#8E8E93] mb-4">These users are automatically synced from the master app. They can log in to this app.</p>
          {allMasterUsers.length === 0 ? (
            <div className="text-center py-10 bg-[#F2F2F7]/30 rounded-2xl border border-dashed border-[#D1D1D6]">
              <UserCircle2 className="w-8 h-8 text-[#D1D1D6] mx-auto mb-3" />
              <p className="text-[#8E8E93] text-sm">No users synced from master app yet</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {allMasterUsers.map(account => (
                <div key={account.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#D1D1D6]/50 shadow-sm transition-all hover:border-[#D1D1D6]">
                  <div className="flex flex-col overflow-hidden mr-3">
                     <span className="font-bold text-[#1C1C1E] text-sm truncate">{account.displayName || account.name || 'Unnamed User'}</span>
                    {account.email && <span className="text-[11px] text-[#8E8E93] truncate">{account.email}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
