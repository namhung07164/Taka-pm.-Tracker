import React, { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Trash2, GripVertical, KanbanSquare, CheckSquare, CalendarDays, Heading1, Circle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

type BoardColor = 'gray' | 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'orange';

const BOARD_COLORS: Record<BoardColor, { headerText: string, headerBg: string, bg: string, border: string }> = {
  gray: { headerText: 'text-gray-800 dark:text-gray-200', headerBg: 'bg-gray-200/50 dark:bg-gray-800/50', bg: 'bg-[#F2F2F7] dark:bg-[#1C1C1E]', border: 'border-gray-200 dark:border-gray-700' },
  blue: { headerText: 'text-blue-800 dark:text-blue-200', headerBg: 'bg-blue-200/50 dark:bg-blue-900/50', bg: 'bg-blue-50/50 dark:bg-blue-950/30', border: 'border-blue-100 dark:border-blue-900/50' },
  green: { headerText: 'text-green-800 dark:text-green-200', headerBg: 'bg-green-200/50 dark:bg-green-900/50', bg: 'bg-green-50/50 dark:bg-green-950/30', border: 'border-green-100 dark:border-green-900/50' },
  red: { headerText: 'text-red-800 dark:text-red-200', headerBg: 'bg-red-200/50 dark:bg-red-900/50', bg: 'bg-red-50/50 dark:bg-red-950/30', border: 'border-red-100 dark:border-red-900/50' },
  yellow: { headerText: 'text-yellow-800 dark:text-yellow-200', headerBg: 'bg-yellow-200/50 dark:bg-yellow-900/50', bg: 'bg-yellow-50/50 dark:bg-yellow-950/30', border: 'border-yellow-100 dark:border-yellow-900/50' },
  purple: { headerText: 'text-purple-800 dark:text-purple-200', headerBg: 'bg-purple-200/50 dark:bg-purple-900/50', bg: 'bg-purple-50/50 dark:bg-purple-950/30', border: 'border-purple-100 dark:border-purple-900/50' },
  orange: { headerText: 'text-orange-800 dark:text-orange-200', headerBg: 'bg-orange-200/50 dark:bg-orange-900/50', bg: 'bg-orange-50/50 dark:bg-orange-950/30', border: 'border-orange-100 dark:border-orange-900/50' },
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

const initialKanbanData: KanbanColumn[] = [
  { id: 'todo', title: 'To Do', color: 'gray', tasks: [] },
  { id: 'in-progress', title: 'In Progress', color: 'blue', tasks: [] },
  { id: 'done', title: 'Done', color: 'green', tasks: [] }
];

interface TodoItem {
  id: string;
  content: string;
  checked: boolean;
}

interface TodoColumn {
  id: string;
  title: string;
  color: BoardColor;
  todos: TodoItem[];
}

const initialTodoColumns: TodoColumn[] = [
  { id: 'mon', title: 'Monday', color: 'gray', todos: [] },
  { id: 'tue', title: 'Tuesday', color: 'gray', todos: [] },
  { id: 'wed', title: 'Wednesday', color: 'gray', todos: [] },
  { id: 'thu', title: 'Thursday', color: 'gray', todos: [] },
  { id: 'fri', title: 'Friday', color: 'gray', todos: [] },
  { id: 'sat', title: 'Saturday', color: 'gray', todos: [] },
  { id: 'sun', title: 'Sunday', color: 'gray', todos: [] },
];

interface NotionBlock {
  id: string;
  type: 'header' | 'todo';
  content: string;
  checked?: boolean;
}

const initialDailyData: NotionBlock[] = [
  { id: uuidv4(), type: 'header', content: '☀️ Morning' },
  { id: uuidv4(), type: 'todo', content: 'Check emails', checked: false },
  { id: uuidv4(), type: 'header', content: '🌤️ Afternoon' },
  { id: uuidv4(), type: 'todo', content: 'Team meeting', checked: false },
  { id: uuidv4(), type: 'header', content: '🌙 Evening' },
  { id: uuidv4(), type: 'todo', content: 'Plan for tomorrow', checked: false },
];

export const PersonalWorkspace = () => {
  const [view, setView] = useState<'kanban' | 'todo' | 'daily'>('kanban');
  
  // Kanban State
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [addingToCol, setAddingToCol] = useState<string | null>(null);
  const [newTaskInput, setNewTaskInput] = useState('');
  
  // Todo State
  const [todoColumns, setTodoColumns] = useState<TodoColumn[]>([]);
  const [addingToTodoCol, setAddingToTodoCol] = useState<string | null>(null);
  const [newTodoInput, setNewTodoInput] = useState('');
  
  const [isDraggingKanban, setIsDraggingKanban] = useState(false);
  const [isDraggingTodo, setIsDraggingTodo] = useState(false);
  
  // Daily Planner State
  const [dailyBlocks, setDailyBlocks] = useState<NotionBlock[]>([]);

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Load Kanban
    const savedV2 = localStorage.getItem('taka_personal_tasks_v2');
    if (savedV2) {
      try {
        setColumns(JSON.parse(savedV2));
      } catch (e) {
        setColumns(initialKanbanData);
      }
    } else {
      const savedV1 = localStorage.getItem('taka_personal_tasks');
      if (savedV1) {
        try {
          const oldData: Record<string, any[]> = JSON.parse(savedV1);
          const migrated: KanbanColumn[] = initialKanbanData.map(col => ({
            ...col,
            tasks: (oldData[col.id] || []).map(t => ({
              id: t.id,
              content: t.content,
              columnId: col.id
            }))
          }));
          setColumns(migrated);
        } catch (e) {
          setColumns(initialKanbanData);
        }
      } else {
        setColumns(initialKanbanData);
      }
    }

    // Load Todo
    const savedTodoV2 = localStorage.getItem('taka_personal_todo_v2');
    if (savedTodoV2) {
      try { setTodoColumns(JSON.parse(savedTodoV2)); } catch(e) { setTodoColumns(initialTodoColumns); }
    } else {
      setTodoColumns(initialTodoColumns);
    }

    // Load Daily
    const savedDaily = localStorage.getItem('taka_personal_daily');
    if (savedDaily) {
      try { setDailyBlocks(JSON.parse(savedDaily)); } catch(e) {}
    } else {
      setDailyBlocks(initialDailyData);
    }

    setIsReady(true);
  }, []);

  useEffect(() => {
    if (isReady) {
      localStorage.setItem('taka_personal_tasks_v2', JSON.stringify(columns));
      localStorage.setItem('taka_personal_todo_v2', JSON.stringify(todoColumns));
      localStorage.setItem('taka_personal_daily', JSON.stringify(dailyBlocks));
    }
  }, [columns, todoColumns, dailyBlocks, isReady]);

  // --- KANBAN LOGIC ---
  const onDragStartKanban = () => {
    setIsDraggingKanban(true);
  };

  const onDragEndKanban = (result: any) => {
    setIsDraggingKanban(false);
    if (!result.destination) return;
    const { source, destination } = result;

    if (destination.droppableId === 'kanban-trash') {
      const newData = [...columns];
      const sourceColIdx = newData.findIndex(c => c.id === source.droppableId);
      if (sourceColIdx !== -1) {
        const sourceTasks = [...newData[sourceColIdx].tasks];
        sourceTasks.splice(source.index, 1);
        newData[sourceColIdx].tasks = sourceTasks;
        setColumns(newData);
      }
      return;
    }

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

  // --- TODO COLUMNS LOGIC ---
  const onDragStartTodo = () => {
    setIsDraggingTodo(true);
  };

  const onDragEndTodo = (result: any) => {
    setIsDraggingTodo(false);
    if (!result.destination) return;
    const { source, destination } = result;

    if (destination.droppableId === 'todo-trash') {
      const newData = [...todoColumns];
      const sourceColIdx = newData.findIndex(c => c.id === source.droppableId);
      if (sourceColIdx !== -1) {
        const sourceTodos = [...newData[sourceColIdx].todos];
        sourceTodos.splice(source.index, 1);
        newData[sourceColIdx].todos = sourceTodos;
        setTodoColumns(newData);
      }
      return;
    }

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const newData = [...todoColumns];
    const sourceColIdx = newData.findIndex(c => c.id === source.droppableId);
    const destColIdx = newData.findIndex(c => c.id === destination.droppableId);

    const sourceTodos = [...newData[sourceColIdx].todos];
    const destTodos = source.droppableId === destination.droppableId ? sourceTodos : [...newData[destColIdx].todos];

    const [removed] = sourceTodos.splice(source.index, 1);
    destTodos.splice(destination.index, 0, removed);

    newData[sourceColIdx].todos = sourceTodos;
    if (source.droppableId !== destination.droppableId) {
      newData[destColIdx].todos = destTodos;
    }

    setTodoColumns(newData);
  };

  const handleAddTodo = (colId: string) => {
    if (!newTodoInput.trim()) {
      setAddingToTodoCol(null);
      return;
    }
    const newTodo: TodoItem = { id: uuidv4(), content: newTodoInput.trim(), checked: false };
    setTodoColumns(todoColumns.map(c => c.id === colId ? { ...c, todos: [...c.todos, newTodo] } : c));
    setNewTodoInput('');
    setAddingToTodoCol(null);
  };

  const handleDeleteTodo = (colId: string, todoIdx: number) => {
    setTodoColumns(todoColumns.map(c => {
      if (c.id === colId) {
        const newTodos = [...c.todos];
        newTodos.splice(todoIdx, 1);
        return { ...c, todos: newTodos };
      }
      return c;
    }));
  };

  const handleToggleTodo = (colId: string, todoIdx: number) => {
    setTodoColumns(todoColumns.map(c => {
      if (c.id === colId) {
        const newTodos = [...c.todos];
        newTodos[todoIdx].checked = !newTodos[todoIdx].checked;
        return { ...c, todos: newTodos };
      }
      return c;
    }));
  };

  const updateTodoColumn = (colId: string, updates: Partial<TodoColumn>) => {
    setTodoColumns(todoColumns.map(c => c.id === colId ? { ...c, ...updates } : c));
  };
  
  const deleteTodoColumn = (colId: string) => {
    setTodoColumns(todoColumns.filter(c => c.id !== colId));
  };

  const addTodoColumn = () => {
    const newCol: TodoColumn = { id: uuidv4(), title: 'New Day', color: 'gray', todos: [] };
    setTodoColumns([...todoColumns, newCol]);
  };

  // --- NOTION BLOCKS LOGIC ---
  const handleBlockChange = (blocks: NotionBlock[], setBlocks: any, id: string, content: string) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, content } : b));
  };

  const handleBlockToggle = (blocks: NotionBlock[], setBlocks: any, id: string) => {
    setBlocks(blocks.map(b => b.id === id && b.type === 'todo' ? { ...b, checked: !b.checked } : b));
  };

  const handleBlockKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, blocks: NotionBlock[], setBlocks: any, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const currentBlock = blocks[index];
      const newBlock: NotionBlock = {
        id: uuidv4(),
        type: currentBlock.type === 'header' ? 'todo' : currentBlock.type,
        content: '',
        checked: false
      };
      const newBlocks = [...blocks];
      newBlocks.splice(index + 1, 0, newBlock);
      setBlocks(newBlocks);
      
      // Focus will be handled by refs if we had them, but let's just let it be simple.
      setTimeout(() => {
        const inputs = document.querySelectorAll(`[data-block-input="${view}"]`);
        if (inputs[index + 1]) {
          (inputs[index + 1] as HTMLInputElement).focus();
        }
      }, 0);
    } else if (e.key === 'Backspace' && blocks[index].content === '') {
      e.preventDefault();
      if (blocks.length > 1) {
        const newBlocks = [...blocks];
        newBlocks.splice(index, 1);
        setBlocks(newBlocks);
        setTimeout(() => {
          const inputs = document.querySelectorAll(`[data-block-input="${view}"]`);
          if (inputs[index - 1]) {
            (inputs[index - 1] as HTMLInputElement).focus();
          }
        }, 0);
      }
    }
  };

  const turnIntoHeader = (blocks: NotionBlock[], setBlocks: any, index: number) => {
    const newBlocks = [...blocks];
    newBlocks[index].type = 'header';
    setBlocks(newBlocks);
  };

  const turnIntoTodo = (blocks: NotionBlock[], setBlocks: any, index: number) => {
    const newBlocks = [...blocks];
    newBlocks[index].type = 'todo';
    newBlocks[index].checked = false;
    setBlocks(newBlocks);
  };

  const deleteBlock = (blocks: NotionBlock[], setBlocks: any, index: number) => {
    if (blocks.length === 1) {
      setBlocks([{ id: uuidv4(), type: 'todo', content: '', checked: false }]);
      return;
    }
    const newBlocks = [...blocks];
    newBlocks.splice(index, 1);
    setBlocks(newBlocks);
  };

  if (!isReady) return null;

  return (
    <div className="py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-1 mb-6 gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <h2 className="text-lg font-bold text-[#1C1C1E] dark:text-[#F2F2F7]">Personal Workspace</h2>
          {view === 'kanban' && (
            <Button onClick={addColumn} variant="outline" size="sm" className="h-7 w-7 p-0 rounded-full bg-white dark:bg-[#1C1C1E] text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-[#F2F2F7] border-[#D1D1D6] dark:border-[#38383A]">
              <Plus className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="flex bg-[#E5E5EA]/60 dark:bg-[#1C1C1E] p-1 rounded-2xl w-full overflow-x-auto custom-scrollbar sm:w-fit shrink-0">
          <Button 
            onClick={() => setView('kanban')} 
            variant="ghost" 
            className={cn("h-8 rounded-xl px-2 xs:px-3 text-[11px] xs:text-xs font-semibold flex items-center justify-center gap-1.5 xs:gap-2 flex-1 sm:flex-none whitespace-nowrap min-w-fit", view === 'kanban' ? "bg-white dark:bg-[#2C2C2E] shadow-sm text-[#1C1C1E] dark:text-white" : "text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-[#F2F2F7]")}
          >
            <KanbanSquare className="w-3.5 h-3.5 xs:w-4 xs:h-4 shrink-0" /> Board
          </Button>
          <Button 
            onClick={() => setView('todo')} 
            variant="ghost" 
            className={cn("h-8 rounded-xl px-2 xs:px-3 text-[11px] xs:text-xs font-semibold flex items-center justify-center gap-1.5 xs:gap-2 flex-1 sm:flex-none whitespace-nowrap min-w-fit", view === 'todo' ? "bg-white dark:bg-[#2C2C2E] shadow-sm text-[#1C1C1E] dark:text-white" : "text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-[#F2F2F7]")}
          >
            <CheckSquare className="w-3.5 h-3.5 xs:w-4 xs:h-4 shrink-0" /> Todo Check
          </Button>
          <Button 
            onClick={() => setView('daily')} 
            variant="ghost" 
            className={cn("h-8 rounded-xl px-2 xs:px-3 text-[11px] xs:text-xs font-semibold flex items-center justify-center gap-1.5 xs:gap-2 flex-1 sm:flex-none whitespace-nowrap min-w-fit", view === 'daily' ? "bg-white dark:bg-[#2C2C2E] shadow-sm text-[#1C1C1E] dark:text-white" : "text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-[#F2F2F7]")}
          >
            <CalendarDays className="w-3.5 h-3.5 xs:w-4 xs:h-4 shrink-0" /> <span className="hidden xs:inline">Daily</span> Planner
          </Button>
        </div>
      </div>

      {view === 'kanban' && (
        <div className="relative">
          <DragDropContext onDragStart={onDragStartKanban} onDragEnd={onDragEndKanban}>
          <div className="flex gap-4 overflow-x-auto snap-x pb-6 custom-scrollbar items-start">
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
                                       title={colorKey}
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
                          // @ts-ignore
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`bg-white dark:bg-[#1C1C1E] p-3 sm:p-4 rounded-2xl shadow-sm border border-[#D1D1D6]/40 dark:border-[#38383A] flex justify-between items-start group select-none active:cursor-grabbing ${snapshot.isDragging ? 'shadow-lg rotate-2 scale-105 cursor-grabbing' : 'cursor-grab'}`}
                              >
                                <div 
                                  className="pt-1 pr-2 text-[#D1D1D6] dark:text-[#5C5C5E] hover:text-[#8E8E93] dark:hover:text-[#F2F2F7] transition-colors"
                                >
                                  <GripVertical className="w-4 h-4" />
                                </div>
                                <p className="text-sm font-medium text-[#1C1C1E] dark:text-[#F2F2F7] break-words flex-1 pr-2 pt-0.5">{task.content}</p>
                                <button
                                  onClick={() => handleDeleteTask(col.id, index)}
                                  className="text-[#8E8E93] hover:text-red-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0 pt-0.5"
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

            <div
              className={cn(
                "fixed bottom-10 left-1/2 -translate-x-1/2 w-64 h-24 transition-all duration-300 z-50",
                isDraggingKanban ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-10 pointer-events-none"
              )}
            >
              <Droppable droppableId="kanban-trash">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "w-full h-full rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all duration-200 shadow-2xl backdrop-blur-xl",
                      snapshot.isDraggingOver ? "bg-red-500/90 border-red-500 text-white scale-110" : "bg-white/95 border-red-500 text-red-500 scale-100"
                    )}
                  >
                    <Trash2 className="w-8 h-8 opacity-80" />
                    <span className="text-sm font-bold uppercase tracking-wider">Drop to Delete</span>
                    <div className="hidden">{provided.placeholder}</div>
                  </div>
                )}
              </Droppable>
            </div>
          </DragDropContext>
        </div>
      )}

      {view === 'todo' && (
        <div className="relative">
          <DragDropContext onDragStart={onDragStartTodo} onDragEnd={onDragEndTodo}>
            <div className="flex gap-4 overflow-x-auto snap-x pb-6 custom-scrollbar items-start">
              {todoColumns.map((col) => {
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
                                       onChange={e => updateTodoColumn(col.id, { title: e.target.value })}
                                       className="h-8 text-xs font-medium"
                                     />
                                   </div>
                                   <div>
                                     <label className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-widest mb-1.5 block">Color</label>
                                     <div className="flex gap-1.5 flex-wrap">
                                       {COLOR_KEYS.map(colorKey => (
                                         <button
                                           key={colorKey}
                                           onClick={() => updateTodoColumn(col.id, { color: colorKey })}
                                           className={cn(
                                             "w-6 h-6 rounded-full border border-black/10 transition-transform hover:scale-110",
                                             BOARD_COLORS[colorKey].bg,
                                             col.color === colorKey ? "ring-2 ring-black/30 ring-offset-1" : ""
                                           )}
                                           title={colorKey}
                                         />
                                       ))}
                                     </div>
                                   </div>
                                   <div className="pt-2 border-t border-[#F2F2F7]">
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => deleteTodoColumn(col.id)} 
                                        className="w-full text-red-500 hover:bg-red-50 hover:text-red-600 h-8 text-xs justify-start px-2"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete List
                                      </Button>
                                   </div>
                                 </div>
                              </PopoverContent>
                           </Popover>
                        </div>
                        <span className="text-[#8E8E93] text-xs font-bold bg-[#E5E5EA] px-2 py-0.5 rounded-full shrink-0">{col.todos.length}</span>
                     </div>
                     
                     <Droppable droppableId={col.id}>
                       {(provided, snapshot) => (
                         <div
                           {...provided.droppableProps}
                           ref={provided.innerRef}
                           className={`flex-1 flex flex-col gap-2 min-h-[50px] transition-colors rounded-2xl ${snapshot.isDraggingOver ? 'bg-black/5' : ''}`}
                         >
                            {col.todos.map((todo, index) => (
                              // @ts-ignore
                              <Draggable key={todo.id} draggableId={todo.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`bg-white dark:bg-[#1C1C1E] p-3 sm:p-4 rounded-2xl shadow-sm border border-[#D1D1D6]/40 dark:border-[#38383A] flex gap-3 items-start group select-none active:cursor-grabbing ${snapshot.isDragging ? 'shadow-lg rotate-2 scale-105 cursor-grabbing' : 'cursor-grab'}`}
                                  >
                                     <div 
                                       className="pt-1 text-[#D1D1D6] hover:text-[#8E8E93] transition-colors"
                                     >
                                       <GripVertical className="w-4 h-4" />
                                     </div>
                                     <button 
                                         onClick={() => handleToggleTodo(col.id, index)}
                                         className={cn("mt-0.5 shrink-0 transition-colors", todo.checked ? "text-[#007AFF]" : "text-[#D1D1D6] hover:text-[#8E8E93]")}
                                     >
                                        {todo.checked ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                     </button>
                                     <input 
                                        type="text"
                                        value={todo.content}
                                        onChange={(e) => {
                                           const newTodos = [...col.todos];
                                           newTodos[index].content = e.target.value;
                                           updateTodoColumn(col.id, { todos: newTodos });
                                        }}
                                        className={cn(
                                            "w-full bg-transparent border-none focus:outline-none focus:ring-0 px-0 rounded-none placeholder:text-[#D1D1D6] dark:placeholder-[#5C5C5E] text-sm font-medium leading-tight select-text cursor-text",
                                            todo.checked ? "text-[#8E8E93] dark:text-[#8E8E93] line-through decoration-[#D1D1D6] dark:decoration-[#5C5C5E] opacity-70" : "text-[#1C1C1E] dark:text-[#F2F2F7]"
                                        )}
                                     />
                                     <button
                                       onClick={() => handleDeleteTodo(col.id, index)}
                                       className="text-[#8E8E93] hover:text-red-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0 pt-0.5"
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
                     
                     {addingToTodoCol === col.id ? (
                        <div className="mt-3 bg-white p-3 rounded-2xl border border-[#D1D1D6]/40 shadow-sm flex flex-col gap-2">
                          <Input 
                            autoFocus
                            placeholder="Enter todo..."
                            value={newTodoInput}
                            onChange={(e) => setNewTodoInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddTodo(col.id);
                              if (e.key === 'Escape') {
                                 setAddingToTodoCol(null);
                                 setNewTodoInput('');
                              }
                            }}
                            className="text-sm border-none shadow-none focus-visible:ring-0 p-0 h-auto"
                          />
                          <div className="flex items-center gap-2 mt-2">
                            <Button size="sm" onClick={() => handleAddTodo(col.id)} className="bg-[#007AFF] hover:bg-[#007AFF]/90 h-8 rounded-xl flex-1">Add</Button>
                            <Button size="sm" variant="ghost" onClick={() => { setAddingToTodoCol(null); setNewTodoInput(''); }} className="h-8 rounded-xl text-red-500">Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingToTodoCol(col.id)}
                          className="mt-3 flex items-center justify-center gap-2 p-3 text-[#8E8E93] hover:text-[#1C1C1E] hover:bg-white transition-colors rounded-2xl border border-transparent border-dashed hover:border-[#D1D1D6] font-medium text-sm"
                        >
                          <Plus className="w-4 h-4" /> Add Todo
                        </button>
                      )}
                  </div>
                );
              })}
              
              <div className="shrink-0 pt-4">
                 <Button onClick={addTodoColumn} variant="outline" className="h-10 rounded-xl px-4 text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-[#F2F2F7] border-[#D1D1D6] dark:border-[#38383A] bg-white dark:bg-[#1C1C1E]">
                    <Plus className="w-4 h-4 mr-2" /> Add Column
                 </Button>
              </div>
            </div>

            <div
              className={cn(
                "fixed bottom-10 left-1/2 -translate-x-1/2 w-64 h-24 transition-all duration-300 z-50",
                isDraggingTodo ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-10 pointer-events-none"
              )}
            >
              <Droppable droppableId="todo-trash">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "w-full h-full rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all duration-200 shadow-2xl backdrop-blur-xl",
                      snapshot.isDraggingOver ? "bg-red-500/90 border-red-500 text-white scale-110" : "bg-white/95 border-red-500 text-red-500 scale-100"
                    )}
                  >
                    <Trash2 className="w-8 h-8 opacity-80" />
                    <span className="text-sm font-bold uppercase tracking-wider">Drop to Delete</span>
                    <div className="hidden">{provided.placeholder}</div>
                  </div>
                )}
              </Droppable>
            </div>
          </DragDropContext>
        </div>
      )}

      {view === 'daily' && (
        <div className="bg-white dark:bg-[#1C1C1E] rounded-[2rem] border border-[#D1D1D6]/40 dark:border-[#38383A] p-6 sm:p-10 min-h-[60vh]">
           <div className="max-w-2xl mx-auto space-y-1">
             {dailyBlocks.map((block, index) => {
                const blocks = dailyBlocks;
                const setBlocks = setDailyBlocks;

                return (
                  <div key={block.id} className="group flex items-start -ml-8 hover:bg-[#F2F2F7]/50 dark:hover:bg-[#2C2C2E]/50 rounded-xl transition-colors">
                    <div className="w-8 flex items-center justify-center pt-2.5 sm:pt-3">
                       <Popover>
                          <PopoverTrigger asChild>
                            <button className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1 text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-[#F2F2F7] transition-all rounded">
                               <GripVertical className="w-4 h-4" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-48 p-2 rounded-xl dark:bg-[#1C1C1E]" align="start">
                             <div className="flex flex-col gap-1">
                               <Button variant="ghost" size="sm" className="justify-start h-8 text-xs font-medium dark:text-[#F2F2F7] dark:hover:bg-[#2C2C2E] dark:hover:text-white" onClick={() => turnIntoHeader(blocks, setBlocks, index)}>
                                 <Heading1 className="w-3.5 h-3.5 mr-2" /> Turn into Header
                               </Button>
                               <Button variant="ghost" size="sm" className="justify-start h-8 text-xs font-medium dark:text-[#F2F2F7] dark:hover:bg-[#2C2C2E] dark:hover:text-white" onClick={() => turnIntoTodo(blocks, setBlocks, index)}>
                                 <CheckSquare className="w-3.5 h-3.5 mr-2" /> Turn into Todo
                               </Button>
                               <div className="h-px bg-[#F2F2F7] dark:bg-[#38383A] my-1" />
                               <Button variant="ghost" size="sm" className="justify-start h-8 text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => deleteBlock(blocks, setBlocks, index)}>
                                 <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                               </Button>
                             </div>
                          </PopoverContent>
                       </Popover>
                    </div>

                    <div className="flex-1 flex gap-3 pb-1">
                      {block.type === 'todo' && (
                        <button 
                          aria-label="Toggle todo"
                          onClick={() => handleBlockToggle(blocks, setBlocks, block.id)}
                          className={cn("mt-2 shrink-0 transition-colors", block.checked ? "text-[#007AFF]" : "text-[#D1D1D6] dark:text-[#5C5C5E] hover:text-[#8E8E93]")}
                        >
                          {block.checked ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                        </button>
                      )}
                      <input 
                        data-block-input={view}
                        type="text"
                        value={block.content}
                        onChange={(e) => handleBlockChange(blocks, setBlocks, block.id, e.target.value)}
                        onKeyDown={(e) => handleBlockKeyDown(e, blocks, setBlocks, index)}
                        placeholder={block.type === 'header' ? 'Heading...' : 'To-do...'}
                        className={cn(
                          "w-full bg-transparent border-none focus:outline-none focus:ring-0 px-0 rounded-none placeholder:text-[#D1D1D6] dark:placeholder-[#5C5C5E]",
                          block.type === 'header' ? "text-xl font-bold py-2 mt-2 leading-relaxed" : "text-base py-1.5 font-medium leading-relaxed",
                          block.type === 'todo' && block.checked ? "text-[#8E8E93] line-through decoration-[#D1D1D6] dark:decoration-[#5C5C5E] opacity-70" : "text-[#1C1C1E] dark:text-[#F2F2F7]"
                        )}
                      />
                    </div>
                  </div>
                )
             })}

             {/* Click area to append at the end easily */}
             <div 
               className="h-24 w-full cursor-text" 
               onClick={() => {
                 const blocks = dailyBlocks;
                 const setBlocks = setDailyBlocks;
                 if (blocks.length === 0 || blocks[blocks.length - 1].content !== '') {
                   const newBlock: NotionBlock = { id: uuidv4(), type: 'todo', content: '', checked: false };
                   setBlocks([...blocks, newBlock]);
                   setTimeout(() => {
                     const inputs = document.querySelectorAll(`[data-block-input="${view}"]`);
                     if (inputs[inputs.length - 1]) (inputs[inputs.length - 1] as HTMLInputElement).focus();
                   }, 0)
                 } else {
                   const inputs = document.querySelectorAll(`[data-block-input="${view}"]`);
                   if (inputs[inputs.length - 1]) (inputs[inputs.length - 1] as HTMLInputElement).focus();
                 }
               }} 
             />
           </div>
        </div>
      )}
    </div>
  );
};
