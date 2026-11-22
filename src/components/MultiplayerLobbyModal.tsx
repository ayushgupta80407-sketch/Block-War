import React, { useEffect, useState } from 'react';
import { Globe, Play, Plus, RefreshCw, Users, WifiOff, X } from 'lucide-react';
import { ARENA_CATALOG } from '../game/catalog';
import { ArenaId, GameMode, MatchTeamMode, MultiplayerRoomInfo, PlayerProgress, TeamChoice } from '../game/types';

interface MultiplayerLobbyModalProps {
  open: boolean;
  progress: PlayerProgress;
  onClose: () => void;
  onStartOnlineMatch: (opts: {
    socket: WebSocket;
    localPlayerId: string;
    roomCode: string;
    arenaId: ArenaId;
    teamMode: MatchTeamMode;
    playerTeam: TeamChoice;
    gameMode: GameMode;
  }) => void;
  onStartOfflineSkirmish: (
    arenaId: ArenaId,
    teamMode: MatchTeamMode,
    playerTeam: TeamChoice,
    gameMode: GameMode
  ) => void;
}

export const MultiplayerLobbyModal: React.FC<MultiplayerLobbyModalProps> = ({
  open,
  progress,
  onClose,
  onStartOnlineMatch,
  onStartOfflineSkirmish,
}) => {
  const [rooms, setRooms] = useState<MultiplayerRoomInfo[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [selectedArena, setSelectedArena] = useState<ArenaId>(progress.equipped.arenaId);
  const [roomGameMode, setRoomGameMode] = useState<'multiplayer' | 'battle_royale'>('multiplayer');
  const [teamMode, setTeamMode] = useState<MatchTeamMode>('ffa');
  const [playerTeam, setPlayerTeam] = useState<TeamChoice>('blue');
  const [fillWithBots, setFillWithBots] = useState(true);
  const [status, setStatus] = useState<string>('Checking online server...');
  const [offlineFallback, setOfflineFallback] = useState(false);

  const loadRooms = async () => {
    try {
      const res = await fetch('/api/rooms');
      if (!res.ok) throw new Error('offline');
      const data = await res.json();
      setRooms(Array.isArray(data.rooms) ? data.rooms : []);
      setOfflineFallback(false);
      setStatus('Online WebSocket Server Ready');
    } catch {
      setOfflineFallback(true);
      setStatus('Offline Fallback Active — Instant Bot Arena Ready');
    }
  };

  useEffect(() => {
    if (open) {
      loadRooms();
    }
  }, [open]);

  if (!open) return null;

  const connectAndJoin = (action: 'create' | 'join', code?: string) => {
    try {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
      const timer = window.setTimeout(() => {
        ws.close();
        setOfflineFallback(true);
        onStartOfflineSkirmish(selectedArena, teamMode, playerTeam, roomGameMode);
      }, 2500);

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: action === 'create' ? 'create_room' : 'join_room',
            roomCode: code || joinCode.trim().toUpperCase(),
            arena: selectedArena,
            gameMode: roomGameMode,
            teamMode,
            playerTeam,
            fillWithBots,
            player: {
              name: progress.playerName,
              playerTag: progress.playerTag,
              level: progress.level,
              customization: progress.customization,
              gunId: progress.equipped.gunId,
              knifeId: progress.equipped.knifeId,
            },
          })
        );
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'room_joined') {
            clearTimeout(timer);
            onStartOnlineMatch({
              socket: ws,
              localPlayerId: msg.playerId,
              roomCode: msg.roomCode,
              arenaId: msg.arena || selectedArena,
              teamMode: msg.teamMode || teamMode,
              playerTeam: msg.team || playerTeam,
              gameMode: msg.gameMode || roomGameMode,
            });
          } else if (msg.type === 'error') {
            clearTimeout(timer);
            setStatus(msg.message || 'Could not join room.');
            ws.close();
          }
        } catch {
          // Ignore malformed packet
        }
      };

      ws.onerror = () => {
        clearTimeout(timer);
        setOfflineFallback(true);
        setStatus('WebSocket unavailable — launching local offline skirmish.');
      };
    } catch {
      setOfflineFallback(true);
      onStartOfflineSkirmish(selectedArena, teamMode, playerTeam, roomGameMode);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/70 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/40">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">BLOCK WAR MULTIPLAYER LOBBY</h2>
              <p className="text-xs text-slate-400">{status}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadRooms}
              className="rounded-xl border border-white/15 bg-slate-800 p-2 text-slate-300 hover:bg-slate-700"
              title="Refresh Rooms"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/15 bg-slate-800 p-2 text-slate-300 hover:bg-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-5 overflow-y-auto p-5 md:grid-cols-2">
          {/* Create Room */}
          <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-cyan-300">
              Host BLOCK WAR Match ({roomGameMode === 'battle_royale' ? '50 Fighters' : 'Up to 16 Fighters'})
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRoomGameMode('multiplayer')}
                className={`rounded-xl py-2 text-xs font-black ${
                  roomGameMode === 'multiplayer' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                Arena (16)
              </button>
              <button
                type="button"
                onClick={() => setRoomGameMode('battle_royale')}
                className={`rounded-xl py-2 text-xs font-black ${
                  roomGameMode === 'battle_royale' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300'
                }`}
              >
                Battle Royale (50)
              </button>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-300">Island Map</label>
              <select
                value={selectedArena}
                onChange={(e) => setSelectedArena(e.target.value as ArenaId)}
                className="w-full rounded-xl border border-white/15 bg-slate-800 px-3 py-2 text-xs font-bold text-white"
              >
                {ARENA_CATALOG.filter((a) => progress.unlockedArenas.includes(a.id)).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTeamMode('ffa')}
                className={`rounded-xl py-2 text-xs font-black ${
                  teamMode === 'ffa' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                }`}
              >
                Free For All
              </button>
              <button
                type="button"
                onClick={() => setTeamMode('team')}
                className={`rounded-xl py-2 text-xs font-black ${
                  teamMode === 'team' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                }`}
              >
                Team Battle
              </button>
            </div>

            {teamMode === 'team' && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPlayerTeam('blue')}
                  className={`rounded-xl py-1.5 text-xs font-black ${
                    playerTeam === 'blue' ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-sky-300'
                  }`}
                >
                  Join Blue Team
                </button>
                <button
                  type="button"
                  onClick={() => setPlayerTeam('red')}
                  className={`rounded-xl py-1.5 text-xs font-black ${
                    playerTeam === 'red' ? 'bg-rose-500 text-white' : 'bg-slate-800 text-rose-300'
                  }`}
                >
                  Join Red Team
                </button>
              </div>
            )}

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <input
                type="checkbox"
                checked={fillWithBots}
                onChange={(e) => setFillWithBots(e.target.checked)}
                className="rounded accent-cyan-400"
              />
              Fill remaining slots with smart AI Bots ({roomGameMode === 'battle_royale' ? '50' : '12–16'} fighters)
            </label>

            {offlineFallback ? (
              <button
                type="button"
                onClick={() => onStartOfflineSkirmish(selectedArena, teamMode, playerTeam, roomGameMode)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-2.5 text-xs font-black uppercase text-slate-950 hover:bg-amber-300"
              >
                <WifiOff className="h-4 w-4" /> Launch Offline Bot Match
              </button>
            ) : (
              <button
                type="button"
                onClick={() => connectAndJoin('create')}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 py-2.5 text-xs font-black uppercase text-white hover:brightness-110"
              >
                <Plus className="h-4 w-4" /> Create & Launch BLOCK WAR Room
              </button>
            )}
          </div>

          {/* Join Room */}
          <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-emerald-300">
              Join Room by Code
            </h3>

            <div className="flex gap-2">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ENTER CODE (e.g. A7K2)"
                maxLength={8}
                className="flex-1 rounded-xl border border-white/15 bg-slate-800 px-3 py-2 text-xs font-mono font-bold uppercase text-white"
              />
              <button
                type="button"
                onClick={() => connectAndJoin('join')}
                disabled={!joinCode.trim()}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black uppercase text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                Join
              </button>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-400">Active BLOCK WAR Rooms</div>
              {rooms.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-slate-500">
                  No open rooms right now — create one on the left!
                </div>
              ) : (
                rooms.map((r) => (
                  <div
                    key={r.code}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900 px-3 py-2"
                  >
                    <div>
                      <div className="text-xs font-black text-white">
                        Room #{r.code} · {r.hostName}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <Users className="h-3 w-3" /> {r.playerCount}/{r.maxPlayers} · {r.arena}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => connectAndJoin('join', r.code)}
                      className="flex items-center gap-1 rounded-lg bg-cyan-500 px-3 py-1.5 text-[11px] font-black text-slate-950 hover:bg-cyan-400"
                    >
                      <Play className="h-3 w-3" /> Join
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
