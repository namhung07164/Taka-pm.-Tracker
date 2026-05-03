import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

type BoardColor = 'gray' | 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'orange';

const BOARD_COLORS: Record<BoardColor, { headerText: string, headerBg: string, bg: string, border: string }> = {
  gray: { headerText: 'text-gray-800', headerBg: 'bg-gray-200/50', bg: 'bg-[#F2F2F7]', border: 'border-gray-200' },
  blue: { headerText: 'text-blue-800', headerBg: 'bg-blue-200/50', bg: 'bg-blue-50/50', border: 'border-blue-100' },
  green: { headerText: 'text-green-800', headerBg: 'bg-green-200/50', bg: 'bg-green-50/50', border: 'border-green-100' },
  red: { headerText: 'text-red-800', headerBg: 'bg-red-200/50', bg: 'bg-red-50/50', border: 'border-red-100' },
  yellow: { headerText: 'text-yellow-800', headerBg: 'bg-yellow-200/50', bg: 'bg-yellow-50/50', border: 'border-yellow-100' },
  purple: { headerText: 'text-purple-800', headerBg: 'bg-purple-200/50', bg: 'bg-purple-50/50', border: 'border-purple-100' },
  orange: { headerText: 'text-orange-800', headerBg: 'bg-orange-200/50', bg: 'bg-orange-50/50', border: 'border-orange-100' },
};

const COLOR_KEYS = Object.keys(BOARD_COLORS) as BoardColor[];

interface PersonalTask {
  id: string;
  content: string;
  columnId: string;
}

interface KanbanColumn {
  id: string;
  title: string;
  color: BoardColor;
  tasks: PersonalTask[];
}

const initialData: KanbanColumn[] = [
  { id: 'todo', title: 'To Do', color: 'gray', tasks: [] },
  { id: 'in-progress', title: 'In Progress', color: 'blue', tasks: [] },
  { id: 'done', title: 'Done', color: 'green', tasks: [] }
];

export const PersonalKanban = () => {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [addingToCol, setAddingToCol] = useState<string | null>(null);
  const [newTaskInput, setNewTaskInput] = useState('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const savedV2 = localStorage.getItem('taka_personal_tasks_v2');
    if (savedV2) {
      try {
        setColumns(JSON.parse(savedV2));
      } catch (e) {
        console.error(e);
        setColumns(initialData);
      }
    } else {
      const savedV1 = localStorage.getItem('taka_personal_tasks');
      if (savedV1) {
        try {
          const oldData: Record<string, any[]> = JSON.parse(savedV1);
          const migrated: KanbanColumn[] = initialData.map(col => ({
            ...col,
            tasks: (oldData[col.id] || []).map(t => ({
              id: t.id,
              content: t.content,
              columnId: col.id
            }))
          }));
          setColumns(migrated);
        } catch (e) {
          setColumns(initialData);
        }
      } else {
        setColumns(initialData);
      }
    }
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (isReady) {
      localStorage.setItem('taka_personal_tasks_v2', JSON.stringify(columns));
    }
  }, [columns, isReady]);

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    const { source, destination } = result;

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const newData = [...columns];
    const sourceColIdx = newData.findIndex(c => c.id === source.droppableId);
    const destColIdx = newData.findIndex(c => c.id === destination.droppableId);

    const sourceTasks = [...newData[sourceColIdx].tasks];
    const destTasks = source.droppableId === destination.droppableId ? sourceTasks : [...newData[destColIdx].tasks];

    const [removed] = sourceTasks.splice(source.index, 1);
    removed.columnId = destination.droppableId;
    destTasks.splice(destination.index, 0, removed);

    newData[sourceColIdx].tasks = sourceTasks;
    if (source.droppableId !== destination.droppableId) {
      newData[destColIdx].tasks = destTasks;
    }

    setColumns(newData);
  };

  const handleAddTask = (colId: string) => {
    if (!newTaskInput.trim()) {
      setAddingToCol(null);
      return;
    }

    const newTask: PersonalTask = {
      id: uuidv4(),
      content: newTaskInput.trim(),
      columnId: colId
    };

    setColumns(columns.map(c => {
      if (c.id === colId) {
        return { ...c, tasks: [...c.tasks, newTask] };
      }
      return c;
    }));
    
    setNewTaskInput('');
    setAddingToCol(null);
  };

  const handleDeleteTask = (colId: string, taskIdx: number) => {
    setColumns(columns.map(c => {
      if (c.id === colId) {
        const newTasks = [...c.tasks];
        newTasks.splice(taskIdx, 1);
        return { ...c, tasks: newTasks };
      }
      return c;
    }));
  };

  const addColumn = () => {
    const newCol: KanbanColumn = {
      id: uuidv4(),
      title: 'New List',
      color: 'gray',
      tasks: []
    };
    setColumns([...columns, newCol]);
  };

  const deleteColumn = (colId: string) => {
      setColumns(columns.filter(c => c.id !== colId));
  };

  const updateColumn = (colId: string, updates: Partial<KanbanColumn>) => {
      setColumns(columns.map(c => c.id === colId ? { ...c, ...updates } : c));
  };

  if (!isReady) return null;

  return (
    <div className="py-6">
      <div className="flex items-center gap-3 px-1 mb-4">
        <h2 className="text-lg font-bold text-[#1C1C1E]">Personal Board</h2>
        <Button onClick={addColumn} variant="outline" size="sm" className="h-7 w-7 p-0 rounded-full bg-white text-[#8E8E93] hover:text-[#1C1C1E] border-[#D1D1D6]">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto snap-x pb-6 no-scrollbar items-start">
          {columns.map((col) => {
            const styles = BOARD_COLORS[col.color];
            
            return (
              <div key={col.id} className={cn("rounded-3xl p-4 flex flex-col shrink-0 w-[85vw] sm:w-[320px] snap-start border border-[#D1D1D6]/40 min-h-[400px]", styles.bg, styles.border)}>
                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                     <Popover>
                        <PopoverTrigger asChild>
                           <button className={cn("text-xs font-bold uppercase tracking-wider px-2 py-1 rounded truncate max-w-[200px] hover:opacity-80 transition-opacity whitespace-nowrap", styles.headerBg, styles.headerText)}>
                             {col.title}
                           </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3 rounded-2xl shadow-xl border border-[#D1D1D6]/50 bg-white">
                           <div className="space-y-4">
                             <div>
                               <label className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-widest mb-1.5 block">List Name</label>
                               <Input 
                                 value={col.title}
                                 onChange={e => updateColumn(col.id, { title: e.target.value })}
                                 className="h-8 text-xs font-medium"
                               />
                             </div>
                             <div>
                               <label className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-widest mb-1.5 block">Color</label>
                               <div className="flex gap-1.5 flex-wrap">
                                 {COLOR_KEYS.map(colorKey => (
                                   <button
                                     key={colorKey}
                                     onClick={() => updateColumn(col.id, { color: colorKey })}
                                     className={cn(
                                       "w-6 h-6 rounded-full border border-black/10 transition-transform hover:scale-110",
                                       BOARD_COLORS[colorKey].bg,
                                       col.color === colorKey ? "ring-2 ring-black/30 ring-offset-1" : ""
                                     )}
                                   />
                                 ))}
                               </div>
                             </div>
                             <div className="pt-2 border-t border-[#F2F2F7]">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => deleteColumn(col.id)} 
                                  className="w-full text-red-500 hover:bg-red-50 hover:text-red-600 h-8 text-xs justify-start px-2"
                                >
                                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete List
                                </Button>
                             </div>
                           </div>
                        </PopoverContent>
                     </Popover>
                  </div>
                  <span className="text-[#8E8E93] text-xs font-bold bg-[#E5E5EA] px-2 py-0.5 rounded-full shrink-0">{col.tasks.length}</span>
                </div>

                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`flex-1 flex flex-col gap-2 min-h-[50px] transition-colors rounded-2xl ${snapshot.isDraggingOver ? 'bg-black/5' : ''}`}
                    >
                      {col.tasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white p-4 rounded-2xl shadow-sm border border-[#D1D1D6]/40 flex justify-between items-start group ${snapshot.isDragging ? 'shadow-lg rotate-2 scale-105' : ''}`}
                            >
                              <p className="text-sm font-medium text-[#1C1C1E] break-words flex-1 pr-2">{task.content}</p>
                              <button
                                onClick={() => handleDeleteTask(col.id, index)}
                                className="text-[#8E8E93] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

                {addingToCol === col.id ? (
                  <div className="mt-3 bg-white p-3 rounded-2xl border border-[#D1D1D6]/40 shadow-sm flex flex-col gap-2">
                    <Input 
                      autoFocus
                      placeholder="Enter task..."
                      value={newTaskInput}
                      onChange={(e) => setNewTaskInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddTask(col.id);
                        if (e.key === 'Escape') {
                           setAddingToCol(null);
                           setNewTaskInput('');
                        }
                      }}
                      className="text-sm border-none shadow-none focus-visible:ring-0 p-0 h-auto"
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <Button size="sm" onClick={() => handleAddTask(col.id)} className="bg-[#007AFF] hover:bg-[#007AFF]/90 h-8 rounded-xl flex-1">Add</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setAddingToCol(null); setNewTaskInput(''); }} className="h-8 rounded-xl text-red-500">Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingToCol(col.id)}
                    className="mt-3 flex items-center justify-center gap-2 p-3 text-[#8E8E93] hover:text-[#1C1C1E] hover:bg-white transition-colors rounded-2xl border border-transparent border-dashed hover:border-[#D1D1D6] font-medium text-sm"
                  >
                    <Plus className="w-4 h-4" /> Add Task
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
};
