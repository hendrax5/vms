'use client';

import { useState } from 'react';
import { Server, Database, Activity, Wifi, Box } from 'lucide-react';

export default function TenantColocation({ equipments }: { equipments: any[] }) {
    // Determine unique racks from the equipments
    const racksMap = new Map();
    equipments.forEach(eq => {
        if (!racksMap.has(eq.rackId)) {
            // we simulate a generic rack if rack data is limited
            racksMap.set(eq.rackId, { id: eq.rackId, name: eq.rack?.name || `Rack ID-${eq.rackId}`, capacity: 42, equipments: [] });
        }
        racksMap.get(eq.rackId).equipments.push(eq);
    });

    const racks = Array.from(racksMap.values());
    const [selectedRack, setSelectedRack] = useState(racks[0]?.id || null);

    const activeRack = racks.find(r => r.id === selectedRack);

    // Helpers to build 42U graph
    const renderRackU = () => {
        if (!activeRack) return null;
        let layout = [];
        
        let u = 42;
        while(u >= 1) {
            // Find if an equipment spans this U
            const eq = activeRack.equipments.find((e: any) => u >= e.uStart && u <= e.uEnd);
            
            if (eq) {
                // If this is the top U of the equipment, render the block
                if (u === eq.uEnd) {
                    const heightU = eq.uEnd - eq.uStart + 1;
                    layout.push(
                        <div key={`u-${u}-eq-${eq.id}`} style={{ height: `${heightU * 32}px` }} className="border-b border-l border-r border-slate-700 bg-slate-800 flex items-center relative overflow-hidden group">
                           <div className="absolute left-0 top-0 bottom-0 w-8 bg-slate-900 border-r border-slate-700 flex flex-col items-center justify-between py-1 text-[10px] text-slate-500 font-mono">
                               <span>{eq.uEnd}</span>
                               {heightU > 1 && <span>{eq.uStart}</span>}
                           </div>
                           <div className="ml-8 p-3 w-full flex justify-between items-center bg-gradient-to-r from-red-900/20 to-transparent">
                               <div>
                                   <p className="text-xs font-bold text-slate-200">{eq.name}</p>
                                   <p className="text-[10px] text-red-400 font-mono mt-0.5">{eq.equipmentType}</p>
                               </div>
                               <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                           </div>
                        </div>
                    );
                }
                // Skip the loop by the height of the equipment minus 1, because the loop always decrements by 1
                u -= 1;
            } else {
                // Empty Space
                layout.push(
                    <div key={`u-${u}-empty`} style={{ height: '32px' }} className="border-b border-l border-r border-slate-800 bg-slate-950 flex items-center group">
                        <div className="w-8 h-full bg-slate-900/50 border-r border-slate-800 flex items-center justify-center text-[10px] text-slate-600 font-mono">
                            {u}
                        </div>
                        <div className="ml-4 text-[10px] font-mono text-slate-700 uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                            Available Capacity
                        </div>
                    </div>
                );
                u -= 1;
            }
        }
        return layout;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-sm shadow-sm">
                <div>
                    <h3 className="font-bold text-slate-200 uppercase tracking-wide">Colocation Services</h3>
                    <p className="text-xs text-slate-500 mt-1">Cabinet Elevation & Space Utility mapping.</p>
                </div>
            </div>

            {racks.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 p-8 text-center rounded-sm">
                    <Box className="w-12 h-12 mx-auto text-slate-700 mb-4" />
                    <h4 className="text-slate-400 font-semibold mb-2">No active colocation infrastructure</h4>
                    <p className="text-sm text-slate-500">Contact your Account Manager to provision cabinets.</p>
                </div>
            ) : (
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Rack Selector & Specs */}
                    <div className="w-full lg:w-1/3 space-y-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-sm overflow-hidden">
                            <div className="bg-slate-950 p-4 border-b border-slate-800">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Deployed Cabinets</h4>
                            </div>
                            <div className="p-2 space-y-1">
                                {racks.map(rack => (
                                    <button 
                                        key={rack.id} 
                                        onClick={() => setSelectedRack(rack.id)}
                                        className={`w-full text-left px-4 py-3 text-sm font-semibold transition-colors flex justify-between items-center ${selectedRack === rack.id ? 'bg-red-950/30 border-l-2 border-red-500 text-slate-100' : 'bg-transparent border-l-2 border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Database className="w-4 h-4" />
                                            {rack.name}
                                        </div>
                                        <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-mono">{rack.equipments.length} Devices</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {activeRack && (
                            <div className="bg-slate-900 border border-slate-800 rounded-sm p-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Cabinet Details</h4>
                                <div className="space-y-3 font-mono text-xs">
                                     <div className="flex justify-between border-b border-slate-800 pb-2">
                                         <span className="text-slate-500">Identity</span>
                                         <span className="text-slate-200">{activeRack.name}</span>
                                     </div>
                                     <div className="flex justify-between border-b border-slate-800 pb-2">
                                         <span className="text-slate-500">Total Capacity</span>
                                         <span className="text-slate-200">{activeRack.capacity} U</span>
                                     </div>
                                     <div className="flex justify-between border-b border-slate-800 pb-2">
                                         <span className="text-slate-500">Power Circuit</span>
                                         <span className="text-emerald-400 flex items-center gap-1"><Activity className="w-3 h-3"/> Active (Redundant)</span>
                                     </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Rack Elevation Visualizer */}
                    <div className="w-full lg:w-2/3 bg-slate-900 border border-slate-800 rounded-sm p-6 flex flex-col items-center shadow-inner relative">
                         {/* Rack Header */}
                         <div className="w-full max-w-sm flex items-center justify-between mb-4">
                              <h3 className="font-bold text-slate-300 uppercase tracking-wider">Front Elevation</h3>
                              <span className="text-red-400 font-mono text-xs px-2 py-1 bg-red-950/40 border border-red-900/50 rounded-sm">
                                  {activeRack?.name}
                              </span>
                         </div>
                         
                         {/* Rack Frame */}
                         <div className="w-full max-w-sm bg-slate-950 border-4 border-slate-800 rounded-t-xl rounded-b-sm p-1 shadow-2xl relative">
                              <div className="border border-slate-700 w-full mb-2 h-4 bg-slate-800 rounded-sm flex items-center justify-center">
                                  <div className="w-16 h-1 rounded-full bg-slate-600"></div>
                              </div>
                              
                              <div className="bg-black border border-slate-800">
                                   {renderRackU()}
                              </div>
                         </div>
                    </div>
                </div>
            )}
        </div>
    );
}
