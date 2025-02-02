// src/components/game/AgentManager.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, Shield, Users, Clock, AlertCircle } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  role: string;
  stats: {
    aim: number;
    reaction: number;
    positioning: number;
    utility: number;
    leadership: number;
    clutch: number;
  };
}

interface TeamBalance {
  entry: number;
  support: number;
  tactical: number;
}

interface AgentManagerProps {
  onTeamReady: (team: { agents: Agent[]; balance: TeamBalance }) => void;
}

const ROLES = {
  'Entry Fragger': {
    icon: <Target className="w-4 h-4 text-red-400" />,
    description: 'First to engage, creates space for team',
    requirements: {
      aim: 0.8,
      reaction: 0.9,
      positioning: 0.7
    }
  },
  'Support': {
    icon: <Shield className="w-4 h-4 text-green-400" />,
    description: 'Provides utility and trades',
    requirements: {
      utility: 0.9,
      positioning: 0.8,
      clutch: 0.7
    }
  },
  'In-Game Leader': {
    icon: <Users className="w-4 h-4 text-yellow-400" />,
    description: 'Strategist and coordinator',
    requirements: {
      leadership: 0.9,
      utility: 0.7,
      positioning: 0.7
    }
  }
};

const AgentManager: React.FC<AgentManagerProps> = ({ onTeamReady }) => {
  const [selectedAgents, setSelectedAgents] = useState<Agent[]>([]);
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [teamBalance, setTeamBalance] = useState({
    entry: 0,
    support: 0,
    tactical: 0
  });

  useEffect(() => {
    // Generate some sample agents
    const sampleAgents = generateAvailableAgents();
    setAvailableAgents(sampleAgents);
  }, []);

  const generateAvailableAgents = (): Agent[] => {
    const names = [
      "Alex Storm", "Max Power", "Sam Swift", "Viktor Steel", "Olof Berg",
      "Denis Kraft", "Nikola King", "Jordan Hawk", "Casey Blade", "Sasha Frost"
    ];

    return names.map((name, index) => ({
      id: `agent-${index}`,
      name,
      role: Object.keys(ROLES)[index % Object.keys(ROLES).length],
      stats: {
        aim: 0.5 + Math.random() * 0.5,
        reaction: 0.5 + Math.random() * 0.5,
        positioning: 0.5 + Math.random() * 0.5,
        utility: 0.5 + Math.random() * 0.5,
        leadership: 0.5 + Math.random() * 0.5,
        clutch: 0.5 + Math.random() * 0.5
      }
    }));
  };

  const handleAgentSelect = (agent: Agent) => {
    if (selectedAgents.length >= 5) return;
    setSelectedAgents([...selectedAgents, agent]);
    setAvailableAgents(availableAgents.filter(a => a.id !== agent.id));
    updateTeamBalance([...selectedAgents, agent]);
  };

  const handleAgentRemove = (agent: Agent) => {
    setSelectedAgents(selectedAgents.filter(a => a.id !== agent.id));
    setAvailableAgents([...availableAgents, agent]);
    updateTeamBalance(selectedAgents.filter(a => a.id !== agent.id));
  };

  const updateTeamBalance = (agents: Agent[]) => {
    const balance = {
      entry: agents.filter(a => a.role === 'Entry Fragger').length,
      support: agents.filter(a => a.role === 'Support').length,
      tactical: agents.filter(a => a.role === 'In-Game Leader').length
    };
    setTeamBalance(balance);
  };

  const isTeamValid = () => {
    return (
      selectedAgents.length === 5 &&
      teamBalance.entry >= 1 &&
      teamBalance.support >= 2 &&
      teamBalance.tactical >= 1
    );
  };

  const getTeamStrength = () => {
    if (selectedAgents.length === 0) return 0;
    return Math.round(
      selectedAgents.reduce((sum, agent) => sum + 
        Object.values(agent.stats).reduce((a, b) => a + b) / 6, 0
      ) / selectedAgents.length * 100
    );
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Team Composition</h2>
        <div className="text-sm text-gray-400">
          Team Strength: {getTeamStrength()}%
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-bold mb-4">Selected Agents</h3>
          <div className="space-y-2">
            {selectedAgents.map(agent => (
              <Card key={agent.id} className="p-3 bg-gray-800">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {ROLES[agent.role].icon}
                    <div>
                      <div className="font-medium">{agent.name}</div>
                      <div className="text-sm text-gray-400">{agent.role}</div>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleAgentRemove(agent)}
                  >
                    Remove
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold mb-4">Team Balance</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-red-400" />
              <span>Entry Fragger: {teamBalance.entry}/1</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-400" />
              <span>Support: {teamBalance.support}/2</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-yellow-400" />
              <span>In-Game Leader: {teamBalance.tactical}/1</span>
            </div>
          </div>

          {!isTeamValid() && (
            <div className="mt-4 flex items-center gap-2 text-sm text-yellow-400">
              <AlertCircle className="w-4 h-4" />
              Team composition requirements not met
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-bold mb-4">Available Agents</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableAgents.map(agent => (
            <Card
              key={agent.id}
              className="p-3 bg-gray-800 cursor-pointer hover:bg-gray-700"
              onClick={() => handleAgentSelect(agent)}
            >
              <div className="flex items-center gap-2">
                {ROLES[agent.role].icon}
                <div>
                  <div className="font-medium">{agent.name}</div>
                  <div className="text-sm text-gray-400">{agent.role}</div>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                {Object.entries(agent.stats).map(([stat, value]) => (
                  <div key={stat} className="flex justify-between">
                    <span className="text-gray-400">{stat}:</span>
                    <span>{Math.round(value * 100)}%</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <Button
          onClick={() => onTeamReady({ agents: selectedAgents, balance: teamBalance })}
          disabled={!isTeamValid()}
          className="bg-green-600 hover:bg-green-700"
        >
          Confirm Team
        </Button>
      </div>
    </Card>
  );
};

export default AgentManager;