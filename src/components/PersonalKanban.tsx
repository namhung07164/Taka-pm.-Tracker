import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PersonalTask {
  id: string;
  content: string;
  status: 'todo' | 'in-progress' | 'done';
}

const initialData: Record<string, PersonalTask[]> = {
  'todo': [],
  'in-progress': [],
  'done': []
};

const columnTitles = {
  'todo': 'To Do',
  'in-progress': 'In Progress',
  'done': 'Done'
};

export const PersonalKanban = () => {
  const [columns, setColumns] = useState<Record<string, PersonalTask[]>>(initialData);
  const [newTaskInput, setNewTaskInput] = useState('');
  const [addingToCol, setAddingToCol] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('taka_personal_tasks');
    if (saved) {
      try {
        setColumns(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('taka_personal_tasks', JSON.stringify(columns));
  }, [columns]);

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    const { source, destination } = result;

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const sourceCol = [...columns[source.droppableId]];
    const destCol = source.droppableId === destination.droppableId ? sourceCol : [...columns[destination.droppableId]];
    
    const [removed] = sourceCol.splice(source.index, 1);
    removed.status = destination.droppableId as any;
    destCol.splice(destination.index, 0, removed);

    setColumns({
      ...columns,
      [source.droppableId]: sourceCol,
      [destination.droppableId]: destCol
    });
  };

  const handleAddTask = (colId: string) => {
    if (!newTaskInput.trim()) {
      setAddingToCol(null);
      return;
    }
    
    const newTask: PersonalTask = {
      id: Date.now().toString() + Math.random(),
      content: newTaskInput.trim(),
      status: colId as any
    };

    setColumns({
      ...columns,
      [colId]: [...columns[colId], newTask]
    });
    setNewTaskInput('');
    setAddingToCol(null);
  };

  const handleDeleteTask = (colId: string, idx: number) => {
    const newCol = [...columns[colId]];
    newCol.splice(idx, 1);
    setColumns({
      ...columns,
      [colId]: newCol
    });
  };

  return (
    <div className="py-6">
      <div className="flex items-center justify-between px-1 mb-4">
        <h2 className="text-lg font-bold text-[#1C1C1E]">Personal Board</h2>
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto snap-x pb-6 no-scrollbar items-start">
          {Object.keys(columns).map((colId) => (
            <div key={colId} className="bg-[#F2F2F7] rounded-3xl p-4 flex flex-col shrink-0 w-[85vw] sm:w-[320px] snap-start border border-[#D1D1D6]/40 min-h-[400px]">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="font-bold text-[#1C1C1E] uppercase tracking-wider text-xs">{columnTitles[colId as keyof typeof columnTitles]}</h3>
                <span className="text-[#8E8E93] text-xs font-bold bg-[#E5E5EA] px-2 py-0.5 rounded-full">{columns[colId].length}</span>
              </div>

              <Droppable droppableId={colId}>
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`flex-1 flex flex-col gap-2 min-h-[50px] transition-colors rounded-2xl ${snapshot.isDraggingOver ? 'bg-black/5' : ''}`}
                  >
                    {columns[colId].map((task, index) => (
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
                              onClick={() => handleDeleteTask(colId, index)}
                              className="text-[#8E8E93] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
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

              {addingToCol === colId ? (
                <div className="mt-3 bg-white p-3 rounded-2xl border border-[#D1D1D6]/40 shadow-sm flex flex-col gap-2">
                  <Input 
                    autoFocus
                    placeholder="Enter task..."
                    value={newTaskInput}
                    onChange={(e) => setNewTaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddTask(colId);
                      if (e.key === 'Escape') {
                         setAddingToCol(null);
                         setNewTaskInput('');
                      }
                    }}
                    className="text-sm border-none shadow-none focus-visible:ring-0 p-0 h-auto"
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <Button size="sm" onClick={() => handleAddTask(colId)} className="bg-[#007AFF] hover:bg-[#007AFF]/90 h-8 rounded-xl flex-1">Add</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setAddingToCol(null); setNewTaskInput(''); }} className="h-8 rounded-xl text-red-500">Cancel</Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingToCol(colId)}
                  className="mt-3 flex items-center justify-center gap-2 p-3 text-[#8E8E93] hover:text-[#1C1C1E] hover:bg-[#E5E5EA] transition-colors rounded-2xl border border-transparent border-dashed hover:border-[#D1D1D6] font-medium text-sm"
                >
                  <Plus className="w-4 h-4" /> Add Task
                </button>
              )}
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};
